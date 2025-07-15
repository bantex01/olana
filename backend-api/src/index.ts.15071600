import express from "express";
import cors from "cors";
import { Pool } from "pg";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

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

type Telemetry = {
  service_namespace: string;
  service_name: string;
  environment: string;
  team: string;
  component_type: string;
  depends_on: { service_namespace: string; service_name: string }[];
  tags?: string[];
  
  // NEW: Add enrichment fields
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

type NamespaceDependency = {
  from_namespace: string;
  to_namespace: string;
  created_by?: string;
  dependency_type?: string;
  description?: string;
};

type GraphFilters = {
  tags?: string[];
  namespaces?: string[];
  teams?: string[];
  severities?: string[];
  environments?: string[];
};

// EXISTING: Upsert service and update dependencies (enhanced with tags)
app.post("/telemetry", async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const t = req.body as Telemetry;
    
    // Upsert service (now with tags support)
    const serviceResult = await client.query(`
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
      RETURNING id
    `, [t.service_namespace, t.service_name, t.environment, t.team, t.component_type, 
        t.tags || [], 
        JSON.stringify(t.external_calls || []), 
        JSON.stringify(t.database_calls || []), 
        JSON.stringify(t.rpc_calls || [])]);
    
    const serviceId = serviceResult.rows[0].id;
    
    // Clear existing dependencies for this service
    await client.query('DELETE FROM service_dependencies WHERE from_service_id = $1', [serviceId]);
    
    // Insert new dependencies
    for (const dep of t.depends_on) {
      // Find or create target service
      const targetResult = await client.query(`
        INSERT INTO services (service_namespace, service_name, last_seen)
        VALUES ($1, $2, NOW())
        ON CONFLICT (service_namespace, service_name)
        DO UPDATE SET last_seen = NOW()
        RETURNING id
      `, [dep.service_namespace, dep.service_name]);
      
      const targetServiceId = targetResult.rows[0].id;
      
      // Create dependency
      await client.query(`
        INSERT INTO service_dependencies (from_service_id, to_service_id, last_seen)
        VALUES ($1, $2, NOW())
        ON CONFLICT (from_service_id, to_service_id)
        DO UPDATE SET last_seen = NOW()
      `, [serviceId, targetServiceId]);
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

// EXISTING: Create new alert with deduplication
app.post("/alerts", async (req, res) => {
  const client = await pool.connect();
  
  try {
    const a = req.body as Alert;
    
    // Find the service
    const serviceResult = await client.query(
      'SELECT id FROM services WHERE service_namespace = $1 AND service_name = $2',
      [a.service_namespace, a.service_name]
    );
    
    let serviceId: number;
    
    if (serviceResult.rows.length === 0) {
      // Create service if it doesn't exist
      const newServiceResult = await client.query(`
        INSERT INTO services (service_namespace, service_name, last_seen)
        VALUES ($1, $2, NOW())
        RETURNING id
      `, [a.service_namespace, a.service_name]);
      
      serviceId = newServiceResult.rows[0].id;
    } else {
      serviceId = serviceResult.rows[0].id;
    }
    
    // Try to insert new alert, or increment count if duplicate exists
    const alertResult = await client.query(`
      INSERT INTO alerts (service_id, instance_id, severity, message, alert_source, external_alert_id, count, first_seen, last_seen)
      VALUES ($1, $2, $3, $4, $5, $6, 1, NOW(), NOW())
      ON CONFLICT (service_id, instance_id, severity, message)
      DO UPDATE SET 
        count = alerts.count + 1,
        last_seen = NOW(),
        status = 'firing',
        alert_source = CASE WHEN EXCLUDED.alert_source IS NOT NULL THEN EXCLUDED.alert_source ELSE alerts.alert_source END,
        external_alert_id = CASE WHEN EXCLUDED.external_alert_id IS NOT NULL THEN EXCLUDED.external_alert_id ELSE alerts.external_alert_id END
      RETURNING id, count, (count = 1) as is_new_alert
    `, [serviceId, a.instance_id || '', a.severity, a.message, a.alert_source || 'manual', a.external_alert_id]);
    
    const result = alertResult.rows[0];
    
    res.json({ 
      status: "ok", 
      alert_id: result.id,
      count: result.count,
      is_new_alert: result.is_new_alert,
      message: result.is_new_alert ? "New alert created" : `Alert count incremented to ${result.count}`
    });
    
  } catch (error) {
    console.error('Alert error:', error);
    res.status(500).json({ error: "Failed to create alert" });
  } finally {
    client.release();
  }
});

// CLEAN: Generate graph data with tag and namespace filtering + dependency expansion
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
        s.id,
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
    console.log('=== SERVICE DATA DEBUG ===');
    const serviceWithEnrichment = servicesResult.rows.find(s => 
      s.external_calls !== '[]' || s.database_calls !== '[]' || s.rpc_calls !== '[]'
    );
    if (serviceWithEnrichment) {
      console.log('Service with enrichment:', serviceWithEnrichment.service_name);
      console.log('External calls:', serviceWithEnrichment.external_calls);
      console.log('Database calls:', serviceWithEnrichment.database_calls); 
      console.log('RPC calls:', serviceWithEnrichment.rpc_calls);
    } else {
      console.log('No services found with enrichment data');
    }
    console.log('=========================');

    console.log('Found services:', servicesResult.rows.length);

    // Get service IDs for dependencies and alerts
    const serviceIds = servicesResult.rows.map(s => s.id);

    // Get dependencies - simplified
    let dependenciesResult = { rows: [] };
    if (serviceIds.length > 0) {
      // Simple approach - get all dependencies for these services
      dependenciesResult = await client.query(`
        SELECT 
          fs.service_namespace || '::' || fs.service_name as from_service,
          ts.service_namespace || '::' || ts.service_name as to_service
        FROM service_dependencies sd
        JOIN services fs ON sd.from_service_id = fs.id
        JOIN services ts ON sd.to_service_id = ts.id
        WHERE sd.from_service_id = ANY($1) OR sd.to_service_id = ANY($1)
      `, [serviceIds]);
    }

    // Get namespace dependencies (for ALL namespaces in the result, not just filtered ones)
    const namespaceDepsResult = await client.query(`
      SELECT from_namespace, to_namespace, dependency_type, description
      FROM namespace_dependencies
      ORDER BY from_namespace, to_namespace
    `);

    // Get alerts - simplified
    let alertsResult = { rows: [] };
    if (serviceIds.length > 0) {
      if (filters.severities && filters.severities.length > 0) {
        alertsResult = await client.query(`
          SELECT 
            s.service_namespace,
            s.service_name,
            a.severity,
            COUNT(*) as alert_count
          FROM alerts a
          JOIN services s ON a.service_id = s.id
          WHERE a.status = 'firing' 
            AND s.id = ANY($1)
            AND a.severity = ANY($2)
          GROUP BY s.service_namespace, s.service_name, a.severity
        `, [serviceIds, filters.severities]);
      } else {
        alertsResult = await client.query(`
          SELECT 
            s.service_namespace,
            s.service_name,
            a.severity,
            COUNT(*) as alert_count
          FROM alerts a
          JOIN services s ON a.service_id = s.id
          WHERE a.status = 'firing' 
            AND s.id = ANY($1)
          GROUP BY s.service_namespace, s.service_name, a.severity
        `, [serviceIds]);
      }
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
      
      // Create namespace node (treat all namespaces the same regardless of how they were included)
      if (!seen.has(nsNodeId)) {
        nodes.push({
          id: nsNodeId,
          label: service.service_namespace,
          color: "#888", // Same gray color for all namespaces
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


// CLEAN: Get all active alerts with comprehensive filtering
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

    // Get services that match our filters first
    let serviceQuery = `
      SELECT s.id
      FROM services s
    `;
    
    let serviceWhereConditions: string[] = [];
    let serviceParams: any[] = [];

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

    // Build service query
    if (serviceWhereConditions.length > 0) {
      serviceQuery += ` WHERE ${serviceWhereConditions.join(' AND ')}`;
    }

    console.log('Service filter query:', serviceQuery);
    console.log('Service filter params:', serviceParams);

    // Get filtered service IDs
    const serviceResult = await client.query(serviceQuery, serviceParams);
    const serviceIds = serviceResult.rows.map(row => row.id);

    console.log('Filtered service IDs:', serviceIds);

    // Now get alerts for those services
    let alertQuery = `
      SELECT 
        s.service_namespace,
        s.service_name,
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
      JOIN services s ON a.service_id = s.id
      WHERE a.status = 'firing'
    `;
    
    let params: any[] = [];

    // Filter by our service IDs if we have any filters
    if (serviceWhereConditions.length > 0) {
      if (serviceIds.length === 0) {
        // No services match filters, return empty
        res.json([]);
        return;
      } else {
        alertQuery += ` AND s.id = ANY($1)`;
        params.push(serviceIds);
      }
    }

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

// NEW: Tag management endpoints
app.put("/services/:namespace/:name/tags", async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { namespace, name } = req.params;
    const { tags } = req.body;
    
    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: "Tags must be an array" });
    }
    
    const result = await client.query(`
      UPDATE services 
      SET tags = $1, last_seen = NOW()
      WHERE service_namespace = $2 AND service_name = $3
      RETURNING id, tags
    `, [tags, namespace, name]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Service not found" });
    }
    
    res.json({ 
      status: "ok", 
      service: `${namespace}::${name}`,
      tags: result.rows[0].tags 
    });
    
  } catch (error) {
    console.error('Tag update error:', error);
    res.status(500).json({ error: "Failed to update tags" });
  } finally {
    client.release();
  }
});

app.get("/tags", async (req, res) => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT DISTINCT unnest(tags) as tag
      FROM services
      WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
      ORDER BY tag
    `);
    
    const tags = result.rows.map(row => row.tag);
    res.json({ tags });
    
  } catch (error) {
    console.error('Tags fetch error:', error);
    res.status(500).json({ error: "Failed to fetch tags" });
  } finally {
    client.release();
  }
});

// NEW: Namespace dependency management
app.post("/namespace-dependencies", async (req, res) => {
  const client = await pool.connect();
  
  try {
    const dep = req.body as NamespaceDependency;
    
    const result = await client.query(`
      INSERT INTO namespace_dependencies (from_namespace, to_namespace, created_by, dependency_type, description)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (from_namespace, to_namespace)
      DO UPDATE SET 
        created_by = EXCLUDED.created_by,
        dependency_type = EXCLUDED.dependency_type,
        description = EXCLUDED.description,
        updated_at = NOW()
      RETURNING id
    `, [dep.from_namespace, dep.to_namespace, dep.created_by || 'api', dep.dependency_type || 'manual', dep.description]);
    
    res.json({ 
      status: "ok", 
      dependency_id: result.rows[0].id,
      from: dep.from_namespace,
      to: dep.to_namespace
    });
    
  } catch (error) {
    console.error('Namespace dependency error:', error);
    res.status(500).json({ error: "Failed to create namespace dependency" });
  } finally {
    client.release();
  }
});

app.get("/namespace-dependencies", async (req, res) => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT id, from_namespace, to_namespace, created_by, dependency_type, description, created_at, updated_at
      FROM namespace_dependencies
      ORDER BY from_namespace, to_namespace
    `);
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('Namespace dependencies fetch error:', error);
    res.status(500).json({ error: "Failed to fetch namespace dependencies" });
  } finally {
    client.release();
  }
});

app.delete("/namespace-dependencies/:id", async (req, res) => {
  const client = await pool.connect();
  
  try {
    const dependencyId = parseInt(req.params.id);
    
    const result = await client.query(`
      DELETE FROM namespace_dependencies WHERE id = $1
      RETURNING from_namespace, to_namespace
    `, [dependencyId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Namespace dependency not found" });
    }
    
    res.json({ 
      status: "ok", 
      deleted: result.rows[0]
    });
    
  } catch (error) {
    console.error('Delete namespace dependency error:', error);
    res.status(500).json({ error: "Failed to delete namespace dependency" });
  } finally {
    client.release();
  }
});

// EXISTING: Resolve alerts
app.patch("/alerts/:alertId/resolve", async (req, res) => {
  const client = await pool.connect();
  
  try {
    const alertId = parseInt(req.params.alertId);
    
    await client.query(`
      UPDATE alerts 
      SET status = 'resolved', resolved_at = NOW()
      WHERE id = $1 AND status = 'firing'
    `, [alertId]);
    
    res.json({ status: "ok" });
    
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({ error: "Failed to resolve alert" });
  } finally {
    client.release();
  }
});

// EXISTING: Health check
app.get("/health", async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: "healthy", database: "connected" });
  } catch (error) {
    res.status(500).json({ status: "unhealthy", database: "disconnected" });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Database connection pool initialized');
  console.log('Phase 2A features enabled: Service tags, Namespace dependencies, Enhanced filtering');
});