import express from "express";
import cors from "cors";
import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";
import { createHealthRoutes } from './routes/health';
import ServiceCleanup from './services/ServiceCleanup';
import { createTagsRoutes } from './routes/tags';
import { createNamespaceDepsRoutes } from './routes/namespaceDeps';
import { createAlertsRoutes } from './routes/alerts';
import { createServicesRoutes } from './routes/services';

// Load environment variables
//dotenv.config();

dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alert_hub',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const cleanupConfig = {
  ttlHours: parseFloat(process.env.SERVICE_TTL_HOURS || '168'), // 7 days default
  intervalHours: parseFloat(process.env.CLEANUP_INTERVAL_HOURS || '24'), // Daily default
  enabled: process.env.ENABLE_AUTO_CLEANUP !== 'false', // Default enabled
  maxServicesPerRun: parseInt(process.env.MAX_SERVICES_TO_DELETE_PER_RUN || '1000'),
  dryRun: process.env.CLEANUP_DRY_RUN === 'true' // Default false
};

// Initialize ServiceCleanup (but don't start yet)
const serviceCleanup = new ServiceCleanup(pool, cleanupConfig);

app.use(createHealthRoutes(pool));
app.use(createTagsRoutes(pool));
app.use(createNamespaceDepsRoutes(pool));
app.use(createAlertsRoutes(pool));
app.use(createServicesRoutes(pool));

type Telemetry = {
  service_namespace: string;
  service_name: string;
  environment: string;
  team: string;
  component_type: string;
  depends_on: { service_namespace: string; service_name: string }[];
  tags?: string[];
  
  // Enrichment fields
  external_calls?: { host: string; method?: string; path?: string; count: number }[];
  database_calls?: { system: string; name?: string; host?: string; operation?: string; count: number }[];
  rpc_calls?: { service: string; method?: string; count: number }[];
};

type Alert = {
  service_namespace: string;
  service_name: string;
  instance_id?: string;
  severity: "fatal" | "critical" | "warning" | "none";
  message: string;
  alert_source?: string;
  external_alert_id?: string;
};

type GraphFilters = {
  tags?: string[];
  namespaces?: string[];
  teams?: string[];
  severities?: string[];
  environments?: string[];
};

// UPDATED: Upsert service and update dependencies using natural keys
app.post("/telemetry", async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const t = req.body as Telemetry;
    
    // Upsert service using natural key
    await client.query(`
      INSERT INTO services (service_namespace, service_name, environment, team, component_type, tags, external_calls, database_calls, rpc_calls, last_seen)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (service_namespace, service_name)
      DO UPDATE SET 
        environment = EXCLUDED.environment,
        team = EXCLUDED.team,
        component_type = EXCLUDED.component_type,
        tags = EXCLUDED.tags,
        external_calls = EXCLUDED.external_calls,
        database_calls = EXCLUDED.database_calls,
        rpc_calls = EXCLUDED.rpc_calls,
        last_seen = NOW()
    `, [t.service_namespace, t.service_name, t.environment, t.team, t.component_type, 
        t.tags || [], 
        JSON.stringify(t.external_calls || []), 
        JSON.stringify(t.database_calls || []), 
        JSON.stringify(t.rpc_calls || [])]);
    
    // Clear existing dependencies for this service using natural key
    await client.query(`
      DELETE FROM service_dependencies 
      WHERE from_service_namespace = $1 AND from_service_name = $2
    `, [t.service_namespace, t.service_name]);
    
    // Insert new dependencies using natural keys
    for (const dep of t.depends_on) {
      // Ensure target service exists (upsert with minimal data)
      await client.query(`
        INSERT INTO services (service_namespace, service_name, last_seen)
        VALUES ($1, $2, NOW())
        ON CONFLICT (service_namespace, service_name)
        DO UPDATE SET last_seen = NOW()
      `, [dep.service_namespace, dep.service_name]);
      
      // Create dependency using natural keys
      await client.query(`
        INSERT INTO service_dependencies (from_service_namespace, from_service_name, to_service_namespace, to_service_name, last_seen)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (from_service_namespace, from_service_name, to_service_namespace, to_service_name)
        DO UPDATE SET last_seen = NOW()
      `, [t.service_namespace, t.service_name, dep.service_namespace, dep.service_name]);
    }
    
    await client.query('COMMIT');
    res.json({ status: "ok" });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Telemetry error:', error);
    res.status(500).json({ error: "Failed to process telemetry" });
  } finally {
    client.release();
  }
});

// Service Cleanup Metrics Endpoint
app.get("/metrics/cleanup", async (req, res) => {
  try {
    const metrics = serviceCleanup.getMetrics();
    const stats = await serviceCleanup.getCleanupStats();
    
    res.json({
      metrics,
      stats,
      config: {
        ttlHours: cleanupConfig.ttlHours,
        intervalHours: cleanupConfig.intervalHours,
        enabled: cleanupConfig.enabled,
        maxServicesPerRun: cleanupConfig.maxServicesPerRun,
        dryRun: cleanupConfig.dryRun
      }
    });
  } catch (error) {
    console.error('Cleanup metrics error:', error);
    res.status(500).json({ error: "Failed to fetch cleanup metrics" });
  }
});

// Manual Cleanup Trigger Endpoint (for testing/emergency use)
app.post("/admin/cleanup/run", async (req, res) => {
  try {
    if (!cleanupConfig.enabled) {
      return res.status(400).json({ error: "Cleanup is disabled" });
    }
    
    const result = await serviceCleanup.runCleanup();
    
    res.json({
      status: "ok",
      message: "Manual cleanup completed",
      result
    });
  } catch (error) {
    console.error('Manual cleanup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Manual cleanup failed: ${errorMessage}` });
  }
});

// Get Stale Services Preview Endpoint
app.get("/admin/cleanup/preview", async (req, res) => {
  try {
    const staleServices = await serviceCleanup.getStaleServices();
    
    res.json({
      count: staleServices.length,
      services: staleServices,
      config: {
        ttlHours: cleanupConfig.ttlHours,
        maxServicesPerRun: cleanupConfig.maxServicesPerRun
      }
    });
  } catch (error) {
    console.error('Stale services preview error:', error);
    res.status(500).json({ error: "Failed to fetch stale services preview" });
  }
});

// Cleanup Orphaned Dependencies Endpoint
app.post("/admin/cleanup/orphaned-dependencies", async (req, res) => {
  try {
    const deletedCount = await serviceCleanup.cleanupOrphanedDependencies();
    
    res.json({
      status: "ok",
      message: `Cleaned up ${deletedCount} orphaned dependencies`,
      deletedCount
    });
  } catch (error) {
    console.error('Orphaned dependencies cleanup error:', error);
    res.status(500).json({ error: "Failed to cleanup orphaned dependencies" });
  }
});

// UPDATED: Generate graph data using natural keys
app.get("/graph", async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('=== GRAPH REQUEST ===');
    console.log('Query params:', req.query);
    
    // Parse query filters
    const filters: GraphFilters = {};
    if (req.query.tags) filters.tags = (req.query.tags as string).split(',');
    if (req.query.namespaces) filters.namespaces = (req.query.namespaces as string).split(',');
    if (req.query.severities) filters.severities = (req.query.severities as string).split(',');
    
    const includeDependents = req.query.includeDependents === 'true';
    console.log('Include dependents:', includeDependents);

    // If namespace filtering is active and includeDependents is true, expand the namespace list
    let finalNamespaces = filters.namespaces || [];
    
    if (includeDependents && filters.namespaces && filters.namespaces.length > 0) {
      console.log('Expanding namespaces with dependencies...');
      console.log('Original namespaces:', filters.namespaces);
      
      // Get all namespace dependencies
      const namespaceDepsResult = await client.query(`
        SELECT from_namespace, to_namespace 
        FROM namespace_dependencies
      `);
      
      const dependencyMap = new Map<string, Set<string>>();
      const reverseDependencyMap = new Map<string, Set<string>>();
      
      // Build dependency maps
      namespaceDepsResult.rows.forEach((row: any) => {
        // Forward dependencies (from -> to)
        if (!dependencyMap.has(row.from_namespace)) {
          dependencyMap.set(row.from_namespace, new Set());
        }
        dependencyMap.get(row.from_namespace)!.add(row.to_namespace);
        
        // Reverse dependencies (to <- from)
        if (!reverseDependencyMap.has(row.to_namespace)) {
          reverseDependencyMap.set(row.to_namespace, new Set());
        }
        reverseDependencyMap.get(row.to_namespace)!.add(row.from_namespace);
      });
      
      console.log('Dependency map:', Object.fromEntries(dependencyMap));
      console.log('Reverse dependency map:', Object.fromEntries(reverseDependencyMap));
      
      // Expand namespaces by following dependencies
      const expandedNamespaces = new Set(filters.namespaces);
      
      // Add all namespaces that the selected ones depend on (downstream dependencies)
      filters.namespaces.forEach(ns => {
        const dependencies = dependencyMap.get(ns);
        if (dependencies) {
          dependencies.forEach(dep => expandedNamespaces.add(dep));
        }
      });
      
      // Add all namespaces that depend on the selected ones (upstream dependencies - blast radius)
      filters.namespaces.forEach(ns => {
        const dependents = reverseDependencyMap.get(ns);
        if (dependents) {
          dependents.forEach(dep => expandedNamespaces.add(dep));
        }
      });
      
      finalNamespaces = Array.from(expandedNamespaces);
      console.log('Expanded namespaces:', finalNamespaces);
    }

    // Start with all services, then filter
    let servicesQuery = `
      SELECT 
        s.service_namespace,
        s.service_name,
        s.environment,
        s.team,
        s.component_type,
        s.tags,
        s.external_calls,
        s.database_calls,
        s.rpc_calls
      FROM services s
    `;

    let whereConditions: string[] = [];
    let params: any[] = [];

    // Add tags filter if present
    if (filters.tags && filters.tags.length > 0) {
      whereConditions.push('s.tags && $1');
      params.push(filters.tags);
    }

    // Add namespace filter (using finalNamespaces which includes expanded ones)
    if (finalNamespaces.length > 0) {
      const startIndex = params.length + 1;
      if (finalNamespaces.length === 1) {
        whereConditions.push(`s.service_namespace = $${startIndex}`);
        params.push(finalNamespaces[0]);
      } else {
        // Multiple namespaces - build IN clause manually
        const placeholders = finalNamespaces.map((_item: string, index: number) => `$${startIndex + index}`).join(', ');
        whereConditions.push(`s.service_namespace IN (${placeholders})`);
        params.push(...finalNamespaces);
      }
    }

    // Add WHERE clause if we have conditions
    if (whereConditions.length > 0) {
      servicesQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    servicesQuery += ` ORDER BY s.service_namespace, s.service_name`;

    console.log('Services query:', servicesQuery);
    console.log('Services params:', params);

    // Execute services query
    const servicesResult = await client.query(servicesQuery, params);
    console.log('Found services:', servicesResult.rows.length);

    // Get dependencies using natural keys
    let dependenciesResult = { rows: [] };
    if (servicesResult.rows.length > 0) {
      // Build condition to match any service in our result set
      const serviceConditions = servicesResult.rows.map((_, index) => 
        `(sd.from_service_namespace = $${index * 4 + 1} AND sd.from_service_name = $${index * 4 + 2}) OR ` +
        `(sd.to_service_namespace = $${index * 4 + 3} AND sd.to_service_name = $${index * 4 + 4})`
      ).join(' OR ');
      
      const serviceParams = servicesResult.rows.flatMap(s => [s.service_namespace, s.service_name, s.service_namespace, s.service_name]);
      
      dependenciesResult = await client.query(`
        SELECT 
          sd.from_service_namespace || '::' || sd.from_service_name as from_service,
          sd.to_service_namespace || '::' || sd.to_service_name as to_service
        FROM service_dependencies sd
        WHERE ${serviceConditions}
      `, serviceParams);
    }

    // Get namespace dependencies (for ALL namespaces in the result, not just filtered ones)
    const namespaceDepsResult = await client.query(`
      SELECT from_namespace, to_namespace, dependency_type, description
      FROM namespace_dependencies
      ORDER BY from_namespace, to_namespace
    `);

    // Get alerts using natural keys
    let alertsResult = { rows: [] };
    if (servicesResult.rows.length > 0) {
      // Build alert query with service filter
      const serviceConditions = servicesResult.rows.map((_, index) => 
        `(a.service_namespace = $${index * 2 + 1} AND a.service_name = $${index * 2 + 2})`
      ).join(' OR ');
      
      let alertParams = servicesResult.rows.flatMap(s => [s.service_namespace, s.service_name]);
      let alertQuery = `
        SELECT 
          a.service_namespace,
          a.service_name,
          a.severity,
          COUNT(*) as alert_count
        FROM alerts a
        WHERE a.status = 'firing' AND (${serviceConditions})
      `;
      
      // Add severity filter if present
      if (filters.severities && filters.severities.length > 0) {
        const severityStartIndex = alertParams.length + 1;
        if (filters.severities.length === 1) {
          alertQuery += ` AND a.severity = $${severityStartIndex}`;
          alertParams.push(filters.severities[0]);
        } else {
          const placeholders = filters.severities.map((_item: string, index: number) => `$${severityStartIndex + index}`).join(', ');
          alertQuery += ` AND a.severity IN (${placeholders})`;
          alertParams.push(...filters.severities);
        }
      }
      
      alertQuery += ` GROUP BY a.service_namespace, a.service_name, a.severity`;
      
      alertsResult = await client.query(alertQuery, alertParams);
    }

    // Build alert maps for node coloring
    const alertCount = new Map<string, number>();
    const highestSeverity = new Map<string, string>();
    const servicesWithFilteredAlerts = new Set<string>();

    const severityRank = {
      fatal: 1,
      critical: 2,
      warning: 3,
      none: 4,
    };

    alertsResult.rows.forEach((alert: any) => {
      const serviceKey = `${alert.service_namespace}::${alert.service_name}`;
      
      servicesWithFilteredAlerts.add(serviceKey);
      alertCount.set(serviceKey, (alertCount.get(serviceKey) || 0) + parseInt(alert.alert_count));

      const current = highestSeverity.get(serviceKey);
      if (!current || severityRank[alert.severity as keyof typeof severityRank] < severityRank[current as keyof typeof severityRank]) {
        highestSeverity.set(serviceKey, alert.severity);
      }
    });

    const nodes: any[] = [];
    const edges: any[] = [];
    const seen = new Set<string>();

    // Create service and namespace nodes
    const namespaces = new Set<string>();
    
    servicesResult.rows.forEach((service: any) => {
      const nsNodeId = service.service_namespace;
      const serviceNodeId = `${service.service_namespace}::${service.service_name}`;
      
      // If severity filtering is active, only show services that have matching alerts
      if (filters.severities && filters.severities.length > 0) {
        const hasMatchingAlerts = servicesWithFilteredAlerts.has(serviceNodeId);
        if (!hasMatchingAlerts) {
          return; // Skip this service
        }
      }
      
      namespaces.add(service.service_namespace);
      
      // Create namespace node
      if (!seen.has(nsNodeId)) {
        nodes.push({
          id: nsNodeId,
          label: service.service_namespace,
          color: "#888",
          shape: "ellipse",
          nodeType: "namespace"
        });
        seen.add(nsNodeId);
      }
      
      // Create service node with tags and alert info
      if (!seen.has(serviceNodeId)) {
        const serviceAlertCount = alertCount.get(serviceNodeId) || 0;
        const serviceHighestSeverity = highestSeverity.get(serviceNodeId) || "none";
        
        nodes.push({
          id: serviceNodeId,
          label: service.service_name,
          shape: "box",
          color: "#D3D3D3",
          team: service.team,
          environment: service.environment,
          component_type: service.component_type,
          tags: service.tags || [],
          nodeType: "service",
          alertCount: serviceAlertCount,
          highestSeverity: serviceHighestSeverity,
          external_calls: typeof service.external_calls === 'string' ? JSON.parse(service.external_calls) : service.external_calls,
          database_calls: typeof service.database_calls === 'string' ? JSON.parse(service.database_calls) : service.database_calls,
          rpc_calls: typeof service.rpc_calls === 'string' ? JSON.parse(service.rpc_calls) : service.rpc_calls,
        });
        
        // Add edge from namespace to service
        edges.push({ from: nsNodeId, to: serviceNodeId });
        seen.add(serviceNodeId);
      }
    });

    // Create service dependency edges
    dependenciesResult.rows.forEach((dep: any) => {
      const edgeId = `${dep.from_service}-->${dep.to_service}`;
      
      if (!edges.find(e => e.id === edgeId)) {
        edges.push({
          id: edgeId,
          from: dep.from_service,
          to: dep.to_service,
          color: { color: "#2B7CE9" },
          width: 2,
          arrows: { to: { enabled: true }, from: { enabled: false } },
          title: "service dependency",
          edgeType: "service"
        });
      }
    });

    // Create namespace dependency edges (only for namespaces that are in our result)
    namespaceDepsResult.rows.forEach((dep: any) => {
      if (namespaces.has(dep.from_namespace) && namespaces.has(dep.to_namespace)) {
        const edgeId = `${dep.from_namespace}==>${dep.to_namespace}`;
        
        if (!edges.find(e => e.id === edgeId)) {
          edges.push({
            id: edgeId,
            from: dep.from_namespace,
            to: dep.to_namespace,
            color: { color: "#2B7CE9" },
            width: 3,
            dashes: true,
            arrows: { to: { enabled: true }, from: { enabled: false } },
            title: `namespace dependency: ${dep.description || dep.dependency_type}`,
            edgeType: "namespace"
          });
        }
      }
    });
    
    console.log(`Returning ${nodes.length} nodes, ${edges.length} edges`);
    res.json({ 
      nodes, 
      edges, 
      filters: filters,
      expandedNamespaces: includeDependents ? finalNamespaces : undefined
    });
    
  } catch (error) {
    console.error('Graph error:', error);
    res.status(500).json({ error: "Failed to generate graph" });
  } finally {
    client.release();
  }
});

// UPDATED: Get all active alerts using natural keys
app.get("/alerts", async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('=== ALERTS REQUEST ===');
    console.log('Query params:', req.query);
    
    // Parse filters
    const filters: any = {};
    if (req.query.tags) filters.tags = (req.query.tags as string).split(',');
    if (req.query.namespaces) filters.namespaces = (req.query.namespaces as string).split(',');
    if (req.query.severities) filters.severities = (req.query.severities as string).split(',');

    // Get services that match our filters first (if any filters applied)
    let serviceFilters = '';
    let serviceParams: any[] = [];
    
    if (filters.tags || filters.namespaces) {
      let serviceWhereConditions: string[] = [];

      // Add tags filter if present
      if (filters.tags && filters.tags.length > 0) {
        serviceWhereConditions.push('s.tags && $1');
        serviceParams.push(filters.tags);
      }

      // Add namespace filter if present
      if (filters.namespaces && filters.namespaces.length > 0) {
        const startIndex = serviceParams.length + 1;
        if (filters.namespaces.length === 1) {
          serviceWhereConditions.push(`s.service_namespace = $${startIndex}`);
          serviceParams.push(filters.namespaces[0]);
        } else {
          const placeholders = filters.namespaces.map((_item: string, index: number) => `$${startIndex + index}`).join(', ');
          serviceWhereConditions.push(`s.service_namespace IN (${placeholders})`);
          serviceParams.push(...filters.namespaces);
        }
      }

      if (serviceWhereConditions.length > 0) {
        serviceFilters = `AND EXISTS (
          SELECT 1 FROM services s 
          WHERE s.service_namespace = a.service_namespace 
            AND s.service_name = a.service_name 
            AND ${serviceWhereConditions.join(' AND ')}
        )`;
      }
    }

    // Build main alerts query
    let alertQuery = `
      SELECT 
        a.id,
        a.service_namespace,
        a.service_name,
        a.instance_id,
        a.severity,
        a.message,
        a.status,
        a.count,
        a.first_seen,
        a.last_seen,
        a.created_at,
        a.resolved_at
      FROM alerts a
      WHERE a.status = 'firing'
      ${serviceFilters}
    `;
    
    let params = [...serviceParams];

    // Add severity filter if present
    if (filters.severities && filters.severities.length > 0) {
      const severityStartIndex = params.length + 1;
      if (filters.severities.length === 1) {
        alertQuery += ` AND a.severity = $${severityStartIndex}`;
        params.push(filters.severities[0]);
      } else {
        const placeholders = filters.severities.map((_item: string, index: number) => `$${severityStartIndex + index}`).join(', ');
        alertQuery += ` AND a.severity IN (${placeholders})`;
        params.push(...filters.severities);
      }
    }

    alertQuery += ` ORDER BY a.last_seen DESC`;

    console.log('Alert query:', alertQuery);
    console.log('Alert params:', params);
    
    const alertsResult = await client.query(alertQuery, params);
    
    const alerts = alertsResult.rows.map((row: any) => ({
      alert_id: row.id,
      service_namespace: row.service_namespace,
      service_name: row.service_name,
      instance_id: row.instance_id,
      severity: row.severity,
      message: row.message,
      status: row.status,
      count: row.count,
      first_seen: row.first_seen,
      last_seen: row.last_seen,
      created_at: row.created_at,
      resolved_at: row.resolved_at
    }));
    
    console.log(`Returning ${alerts.length} alerts`);
    res.json(alerts);
    
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({ error: "Failed to fetch alerts" });
  } finally {
    client.release();
  }
});

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  
  // Stop ServiceCleanup first
  console.log('Stopping ServiceCleanup...');
  await serviceCleanup.stop();
  
  // Then close database pool
  console.log('Closing database connection pool...');
  await pool.end();
  
  console.log('Shutdown complete');
  process.exit(0);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Database connection pool initialized');
  console.log('Natural key linking schema active');
  
  // Start ServiceCleanup after server is running
  console.log('Starting ServiceCleanup...');
  serviceCleanup.start();
  
  // Log cleanup configuration
  console.log('ServiceCleanup configuration:', {
    enabled: cleanupConfig.enabled,
    ttlHours: cleanupConfig.ttlHours,
    intervalHours: cleanupConfig.intervalHours,
    maxServicesPerRun: cleanupConfig.maxServicesPerRun,
    dryRun: cleanupConfig.dryRun
  });
});