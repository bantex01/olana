import { Router } from 'express';
import { Pool } from 'pg';

type GraphFilters = {
  tags?: string[];
  namespaces?: string[];
  teams?: string[];
  severities?: string[];
  environments?: string[];
};

export function createGraphRoutes(pool: Pool): Router {
  const router = Router();

  // UPDATED: Generate graph data using natural keys
    router.get("/graph", async (req, res) => {
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
            s.tag_sources,
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
        // Build alert query with service filter using incident tables
        const serviceConditions = servicesResult.rows.map((_, index) => 
            `(i.service_namespace = $${index * 2 + 1} AND i.service_name = $${index * 2 + 2})`
        ).join(' OR ');
        
        let alertParams = servicesResult.rows.flatMap(s => [s.service_namespace, s.service_name]);
        let alertQuery = `
            SELECT 
            i.service_namespace,
            i.service_name,
            i.severity,
            COUNT(*) as alert_count
            FROM alert_incidents i
            WHERE i.status = 'firing' AND (${serviceConditions})
        `;
        
        // Add severity filter if present
        if (filters.severities && filters.severities.length > 0) {
            const severityStartIndex = alertParams.length + 1;
            if (filters.severities.length === 1) {
            alertQuery += ` AND i.severity = $${severityStartIndex}`;
            alertParams.push(filters.severities[0]);
            } else {
            const placeholders = filters.severities.map((_item: string, index: number) => `$${severityStartIndex + index}`).join(', ');
            alertQuery += ` AND i.severity IN (${placeholders})`;
            alertParams.push(...filters.severities);
            }
        }
        
        alertQuery += ` GROUP BY i.service_namespace, i.service_name, i.severity`;
        
        console.log('Alert query (incident-based):', alertQuery);
        console.log('Alert params:', alertParams);
        
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
            
            // Parse tag sources if present
            let tagSources = {};
            try {
                tagSources = typeof service.tag_sources === 'string' ? 
                JSON.parse(service.tag_sources) : 
                service.tag_sources || {};
            } catch (e) {
                console.warn('Failed to parse tag_sources for service', serviceNodeId);
            }
            
            nodes.push({
                id: serviceNodeId,
                label: service.service_name,
                shape: "box",
                color: "#D3D3D3",
                team: service.team,
                environment: service.environment,
                component_type: service.component_type,
                tags: service.tags || [],
                tagSources: tagSources, // NEW: Include tag source information
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


  return router;
}