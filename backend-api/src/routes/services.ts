import { Router } from 'express';
import { Pool } from 'pg';
import { queryMonitor } from '../utils/queryMonitor';

export function createServicesRoutes(pool: Pool): Router {
    const router = Router();

    router.get("/services/overview", async (req, res) => {
        const client = await pool.connect();
        
        try {
            // Check if we should use cached results
            const useFastMode = req.query.fast === 'true';
            
            if (useFastMode) {
                // Use materialized view for faster results
                const cacheResult = await queryMonitor.executeQuery(
                    client,
                    'SELECT * FROM services_overview_cache',
                    [],
                    'services_overview_cache_query'
                );
                
                if (cacheResult.rows.length > 0) {
                    const cache = cacheResult.rows[0];
                    
                    // Still need some dynamic data
                    const environmentResult = await queryMonitor.executeQuery(
                        client,
                        'SELECT environment, COUNT(*) as service_count FROM services GROUP BY environment ORDER BY service_count DESC',
                        [],
                        'environment_breakdown'
                    );
                    
                    const namespaceResult = await queryMonitor.executeQuery(
                        client,
                        'SELECT service_namespace, COUNT(*) as service_count FROM services GROUP BY service_namespace ORDER BY service_count DESC LIMIT 10',
                        [],
                        'namespace_breakdown'
                    );
                    
                    const connectedServicesResult = await queryMonitor.executeQuery(
                        client,
                        `SELECT 
                            s.service_namespace || '::' || s.service_name as service,
                            s.team,
                            s.component_type,
                            COALESCE(dep_counts.total_deps, 0) as dependency_count
                        FROM services s
                        LEFT JOIN (
                            SELECT from_service_namespace, from_service_name, COUNT(*) as total_deps
                            FROM service_dependencies
                            GROUP BY from_service_namespace, from_service_name
                        ) dep_counts ON s.service_namespace = dep_counts.from_service_namespace 
                                    AND s.service_name = dep_counts.from_service_name
                        ORDER BY dependency_count DESC LIMIT 10`,
                        [],
                        'most_connected_services'
                    );
                    
                    const uniqueTagsResult = await queryMonitor.executeQuery(
                        client,
                        'SELECT COUNT(DISTINCT tag) as unique_tags FROM (SELECT unnest(tags) as tag FROM services WHERE array_length(tags, 1) > 0) t',
                        [],
                        'unique_tags_count'
                    );
                    
                    const recentResult = await queryMonitor.executeQuery(
                        client,
                        `SELECT 
                            service_namespace || '::' || service_name as service,
                            team, environment, last_seen, created_at,
                            CASE 
                                WHEN created_at > NOW() - INTERVAL '24 hours' THEN 'new'
                                WHEN last_seen > NOW() - INTERVAL '1 hour' THEN 'updated'
                                ELSE 'seen'
                            END as activity_type
                        FROM services
                        WHERE last_seen > NOW() - INTERVAL '24 hours'
                        ORDER BY last_seen DESC LIMIT 20`,
                        [],
                        'recent_activity'
                    );
                    
                    return res.json({
                        summary: {
                            total_services: parseInt(cache.total_services),
                            active_services: parseInt(cache.active_services),
                            stale_services: parseInt(cache.stale_services),
                            recently_discovered: parseInt(cache.recently_discovered),
                            missing_metadata: parseInt(cache.missing_metadata),
                            total_namespaces: parseInt(cache.total_namespaces),
                            total_environments: parseInt(cache.total_environments)
                        },
                        environments: environmentResult.rows.map(row => ({
                            environment: row.environment,
                            service_count: parseInt(row.service_count)
                        })),
                        namespaces: namespaceResult.rows.map(row => ({
                            namespace: row.service_namespace,
                            service_count: parseInt(row.service_count)
                        })),
                        dependencies: {
                            total_dependencies: parseInt(cache.total_dependencies),
                            services_with_deps: parseInt(cache.services_with_deps),
                            isolated_services: parseInt(cache.isolated_services),
                            max_dependencies: parseInt(cache.max_dependencies),
                            dependency_coverage: parseInt(cache.dependency_coverage)
                        },
                        most_connected: connectedServicesResult.rows.map(row => ({
                            service: row.service,
                            team: row.team,
                            component_type: row.component_type,
                            dependency_count: parseInt(row.dependency_count)
                        })),
                        enrichment: {
                            services_with_external_calls: parseInt(cache.services_with_external_calls),
                            services_with_db_calls: parseInt(cache.services_with_db_calls),
                            services_with_rpc_calls: parseInt(cache.services_with_rpc_calls),
                            total_services: parseInt(cache.total_services)
                        },
                        alerts: {
                            services_with_alerts: parseInt(cache.services_with_alerts),
                            critical_alerts: parseInt(cache.critical_alerts),
                            warning_alerts: parseInt(cache.warning_alerts),
                            fatal_alerts: parseInt(cache.fatal_alerts)
                        },
                        tags: {
                            services_with_tags: parseInt(cache.services_with_tags),
                            alertmanager_created: parseInt(cache.alertmanager_created),
                            tag_coverage: parseInt(cache.tag_coverage),
                            unique_tags: parseInt(uniqueTagsResult.rows[0].unique_tags)
                        },
                        recent_activity: recentResult.rows.map(row => ({
                            service: row.service,
                            team: row.team,
                            environment: row.environment,
                            last_seen: row.last_seen,
                            created_at: row.created_at,
                            activity_type: row.activity_type
                        })),
                        _cache_used: true,
                        _cache_updated: cache.last_updated
                    });
                }
            }
            
            // Fallback to original queries (with monitoring)
            const discoveryResult = await queryMonitor.executeQuery(
                client,
                `SELECT 
                    COUNT(*) as total_services,
                    COUNT(*) FILTER (WHERE last_seen > NOW() - INTERVAL '24 hours') as active_services,
                    COUNT(*) FILTER (WHERE last_seen < NOW() - INTERVAL '7 days') as stale_services,
                    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as recently_discovered,
                    COUNT(*) FILTER (WHERE team = 'unknown' OR environment = 'unknown') as missing_metadata,
                    COUNT(DISTINCT service_namespace) as total_namespaces,
                    COUNT(DISTINCT environment) as total_environments
                FROM services`,
                [],
                'service_discovery_summary'
            );

            const environmentResult = await queryMonitor.executeQuery(
                client,
                'SELECT environment, COUNT(*) as service_count FROM services GROUP BY environment ORDER BY service_count DESC',
                [],
                'environment_breakdown'
            );

            const namespaceResult = await queryMonitor.executeQuery(
                client,
                'SELECT service_namespace, COUNT(*) as service_count FROM services GROUP BY service_namespace ORDER BY service_count DESC LIMIT 10',
                [],
                'namespace_breakdown'
            );

            const dependencyResult = await queryMonitor.executeQuery(
                client,
                `WITH service_dependency_counts AS (
                    SELECT from_service_namespace, from_service_name, COUNT(*) as outgoing_deps
                    FROM service_dependencies
                    GROUP BY from_service_namespace, from_service_name
                ),
                dependency_stats AS (
                    SELECT 
                        COUNT(*) as total_dependencies,
                        COUNT(DISTINCT from_service_namespace || '::' || from_service_name) as services_with_deps,
                        MAX(outgoing_deps) as max_dependencies
                    FROM service_dependency_counts
                ),
                isolated_services AS (
                    SELECT COUNT(*) as isolated_count
                    FROM services s
                    WHERE NOT EXISTS (
                        SELECT 1 FROM service_dependencies sd 
                        WHERE (sd.from_service_namespace = s.service_namespace AND sd.from_service_name = s.service_name)
                            OR (sd.to_service_namespace = s.service_namespace AND sd.to_service_name = s.service_name)
                    )
                )
                SELECT ds.total_dependencies, ds.services_with_deps, ds.max_dependencies, 
                       iso.isolated_count, (SELECT COUNT(*) FROM services) as total_services
                FROM dependency_stats ds, isolated_services iso`,
                [],
                'dependency_insights'
            );

            const connectedServicesResult = await queryMonitor.executeQuery(
                client,
                `SELECT 
                    s.service_namespace || '::' || s.service_name as service,
                    s.team, s.component_type, COALESCE(dep_counts.total_deps, 0) as dependency_count
                FROM services s
                LEFT JOIN (
                    SELECT from_service_namespace, from_service_name, COUNT(*) as total_deps
                    FROM service_dependencies
                    GROUP BY from_service_namespace, from_service_name
                ) dep_counts ON s.service_namespace = dep_counts.from_service_namespace 
                            AND s.service_name = dep_counts.from_service_name
                ORDER BY dependency_count DESC LIMIT 10`,
                [],
                'most_connected_services'
            );

            const enrichmentResult = await queryMonitor.executeQuery(
                client,
                `SELECT 
                    COUNT(*) FILTER (WHERE external_calls != '[]'::jsonb) as services_with_external_calls,
                    COUNT(*) FILTER (WHERE database_calls != '[]'::jsonb) as services_with_db_calls,
                    COUNT(*) FILTER (WHERE rpc_calls != '[]'::jsonb) as services_with_rpc_calls,
                    COUNT(*) as total_services
                FROM services`,
                [],
                'enrichment_statistics'
            );

            const alertsResult = await queryMonitor.executeQuery(
                client,
                `SELECT 
                    COUNT(DISTINCT i.service_namespace || '::' || i.service_name) as services_with_alerts,
                    COUNT(*) FILTER (WHERE i.severity = 'critical') as critical_alerts,
                    COUNT(*) FILTER (WHERE i.severity = 'warning') as warning_alerts,
                    COUNT(*) FILTER (WHERE i.severity = 'fatal') as fatal_alerts
                FROM alert_incidents i
                WHERE i.status = 'firing'`,
                [],
                'alert_correlation'
            );

            const tagResult = await queryMonitor.executeQuery(
                client,
                `SELECT 
                    COUNT(*) FILTER (WHERE array_length(tags, 1) > 0) as services_with_tags,
                    COUNT(*) FILTER (WHERE 'alertmanager-created' = ANY(tags)) as alertmanager_created,
                    COUNT(*) as total_services
                FROM services`,
                [],
                'tag_coverage'
            );

            const uniqueTagsResult = await queryMonitor.executeQuery(
                client,
                'SELECT COUNT(DISTINCT tag) as unique_tags FROM (SELECT unnest(tags) as tag FROM services WHERE array_length(tags, 1) > 0) t',
                [],
                'unique_tags_count'
            );

            const recentResult = await queryMonitor.executeQuery(
                client,
                `SELECT 
                    service_namespace || '::' || service_name as service,
                    team, environment, last_seen, created_at,
                    CASE 
                        WHEN created_at > NOW() - INTERVAL '24 hours' THEN 'new'
                        WHEN last_seen > NOW() - INTERVAL '1 hour' THEN 'updated'
                        ELSE 'seen'
                    END as activity_type
                FROM services
                WHERE last_seen > NOW() - INTERVAL '24 hours'
                ORDER BY last_seen DESC LIMIT 20`,
                [],
                'recent_activity'
            );

            const discovery = discoveryResult.rows[0];
            const dependency = dependencyResult.rows[0];
            const enrichment = enrichmentResult.rows[0];
            const alerts = alertsResult.rows[0];
            const tags = tagResult.rows[0];
            const uniqueTags = uniqueTagsResult.rows[0];

            return res.json({
            summary: {
                total_services: parseInt(discovery.total_services),
                active_services: parseInt(discovery.active_services),
                stale_services: parseInt(discovery.stale_services),
                recently_discovered: parseInt(discovery.recently_discovered),
                missing_metadata: parseInt(discovery.missing_metadata),
                total_namespaces: parseInt(discovery.total_namespaces),
                total_environments: parseInt(discovery.total_environments)
            },
            environments: environmentResult.rows.map(row => ({
                environment: row.environment,
                service_count: parseInt(row.service_count)
            })),
            namespaces: namespaceResult.rows.map(row => ({
                namespace: row.service_namespace,
                service_count: parseInt(row.service_count)
            })),
            dependencies: {
                total_dependencies: parseInt(dependency.total_dependencies),
                services_with_deps: parseInt(dependency.services_with_deps),
                isolated_services: parseInt(dependency.isolated_count),
                max_dependencies: parseInt(dependency.max_dependencies),
                dependency_coverage: Math.round((parseInt(dependency.services_with_deps) / parseInt(dependency.total_services)) * 100)
            },
            most_connected: connectedServicesResult.rows.map(row => ({
                service: row.service,
                team: row.team,
                component_type: row.component_type,
                dependency_count: parseInt(row.dependency_count)
            })),
            enrichment: {
                services_with_external_calls: parseInt(enrichment.services_with_external_calls),
                services_with_db_calls: parseInt(enrichment.services_with_db_calls),
                services_with_rpc_calls: parseInt(enrichment.services_with_rpc_calls),
                total_services: parseInt(enrichment.total_services)
            },
            alerts: {
                services_with_alerts: parseInt(alerts.services_with_alerts),
                critical_alerts: parseInt(alerts.critical_alerts),
                warning_alerts: parseInt(alerts.warning_alerts),
                fatal_alerts: parseInt(alerts.fatal_alerts)
            },
            tags: {
                services_with_tags: parseInt(tags.services_with_tags),
                alertmanager_created: parseInt(tags.alertmanager_created),
                tag_coverage: Math.round((parseInt(tags.services_with_tags) / parseInt(tags.total_services)) * 100),
                unique_tags: parseInt(uniqueTags.unique_tags)
            },
            recent_activity: recentResult.rows.map(row => ({
                service: row.service,
                team: row.team,
                environment: row.environment,
                last_seen: row.last_seen,
                created_at: row.created_at,
                activity_type: row.activity_type
            })),
            _cache_used: false
            });

        } catch (error) {
            req.log.error({ error }, 'Services overview failed');
            return res.status(500).json({ error: "Failed to fetch services overview" });
        } finally {
            client.release();
        }
    });


    router.put("/services/:namespace/:name/tags", async (req, res) => {
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
        RETURNING service_namespace, service_name, tags
        `, [tags, namespace, name]);
        
        if (result.rows.length === 0) {
        return res.status(404).json({ error: "Service not found" });
        }
        
        return res.json({ 
        status: "ok", 
        service: `${namespace}::${name}`,
        tags: result.rows[0].tags 
        });
        
    } catch (error) {
        const { namespace, name } = req.params;
        req.log.error({ error, namespace, name }, 'Tag update failed');
        return res.status(500).json({ error: "Failed to update tags" });
    } finally {
        client.release();
    }
    });

      router.get('/services/:namespace/:name', async (req, res) => {
    try {
      const { namespace, name } = req.params;

      // Get base service information
      const serviceQuery = `
        SELECT
          service_namespace,
          service_name,
          environment,
          team,
          component_type,
          created_at,
          last_seen,
          tags,
          external_calls,
          database_calls,
          rpc_calls,
          tag_sources
        FROM services
        WHERE service_namespace = $1 AND service_name = $2
      `;

      const serviceResult = await pool.query(serviceQuery, [namespace, name]);

      if (serviceResult.rows.length === 0) {
        return res.status(404).json({ error: 'Service not found' });
      }

      const service = serviceResult.rows[0];

      // Get service dependencies (both incoming and outgoing)
        const dependenciesQuery = `
            SELECT
            from_service_namespace as source_namespace,
            from_service_name as source_name,
            to_service_namespace as target_namespace,
            to_service_name as target_name,
            'service' as dependency_type,
            created_at as first_seen,
            last_seen
            FROM service_dependencies
            WHERE (from_service_namespace = $1 AND from_service_name = $2)
            OR (to_service_namespace = $1 AND to_service_name = $2)
        `;


      const dependenciesResult = await pool.query(dependenciesQuery, [namespace, name]);

      // Separate incoming and outgoing dependencies
        const incomingDeps = dependenciesResult.rows.filter(dep =>
            dep.target_namespace === namespace && dep.target_name === name
        );
        const outgoingDeps = dependenciesResult.rows.filter(dep =>
            dep.source_namespace === namespace && dep.source_name === name
        );

      // Get current alerts for this service
        const alertsQuery = `
            SELECT
            id,
            service_namespace,
            service_name,
            instance_id,
            severity,
            message,
            status,
            incident_start,
            incident_end,
            alert_source,
            external_alert_id,
            created_at,
            updated_at
            FROM alert_incidents
            WHERE service_namespace = $1 AND service_name = $2
            AND status = 'firing'
            ORDER BY incident_start DESC
        `;

      const alertsResult = await pool.query(alertsQuery, [namespace, name]);

      // Get alert history (last 30 days)
    const alertHistoryQuery = `
        SELECT
        DATE(incident_start) as date,
        COUNT(*) as alert_count,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count,
        COUNT(CASE WHEN severity = 'warning' THEN 1 END) as warning_count
        FROM alert_incidents
        WHERE service_namespace = $1 AND service_name = $2
        AND incident_start >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(incident_start)
        ORDER BY date DESC
    `;


      const alertHistoryResult = await pool.query(alertHistoryQuery, [namespace, name]);

      // Calculate service metrics
      const now = new Date();
      const uptime = service.created_at ?
    Math.floor((now.getTime() - new Date(service.created_at).getTime()) / (1000 * 60 * 60 * 24)) : null;

      const response = {
        service: {
          namespace: service.service_namespace,
          name: service.service_name,
          environment: service.environment,
          team: service.team,
          component_type: service.component_type,
          created_at: service.created_at,
          last_seen: service.last_seen,
        tags: service.tags ? service.tags.reduce((acc: Record<string, string>, tag: string) => {
            acc[tag] = tag; // Convert array to object format expected by frontend
            return acc;
        }, {}) : {},
        tag_sources: service.tag_sources || {},
          external_calls: service.external_calls || {},
          database_calls: service.database_calls || {},
          rpc_calls: service.rpc_calls || {},
          uptime_days: uptime
        },
        dependencies: {
          incoming: incomingDeps.map(dep => ({
            namespace: dep.source_namespace,
            name: dep.source_name,
            type: dep.dependency_type,
            first_seen: dep.first_seen,
            last_seen: dep.last_seen
          })),
          outgoing: outgoingDeps.map(dep => ({
            namespace: dep.target_namespace,
            name: dep.target_name,
            type: dep.dependency_type,
            first_seen: dep.first_seen,
            last_seen: dep.last_seen
          }))
        },
        alerts: {
          current: alertsResult.rows,
          history: alertHistoryResult.rows
        },
        metrics: {
          dependency_count: incomingDeps.length + outgoingDeps.length,
          incoming_dependency_count: incomingDeps.length,
          outgoing_dependency_count: outgoingDeps.length,
          current_alert_count: alertsResult.rows.length,
          critical_alert_count: alertsResult.rows.filter(a => a.severity === 'critical').length,
          external_calls_count: Object.keys(service.external_calls || {}).length,
          database_calls_count: Object.keys(service.database_calls || {}).length,
          rpc_calls_count: Object.keys(service.rpc_calls || {}).length
        }
      };

      return res.json(response);

    } catch (error) {
      const { namespace, name } = req.params;
      req.log.error({ error, namespace, name }, 'Service details fetch failed');
      return res.status(500).json({ error: 'Failed to fetch service details' });
    }
  });

  // Get all services with basic information for catalog/filtering
  router.get('/services', async (req, res) => {
    try {
      const { environment, namespace, team, search } = req.query;
      
      let query = `
        SELECT 
          s.service_namespace,
          s.service_name,
          s.environment,
          s.team,
          s.component_type,
          s.created_at,
          s.last_seen,
          s.tags,
          COUNT(DISTINCT ai.id) FILTER (WHERE ai.status = 'firing') as current_alert_count,
          COUNT(DISTINCT ai.id) FILTER (WHERE ai.status = 'firing' AND ai.severity = 'critical') as critical_alert_count,
          COUNT(DISTINCT sd_in.from_service_name) + COUNT(DISTINCT sd_out.to_service_name) as dependency_count
        FROM services s
        LEFT JOIN alert_incidents ai ON s.service_namespace = ai.service_namespace AND s.service_name = ai.service_name
        LEFT JOIN service_dependencies sd_in ON s.service_namespace = sd_in.to_service_namespace AND s.service_name = sd_in.to_service_name
        LEFT JOIN service_dependencies sd_out ON s.service_namespace = sd_out.from_service_namespace AND s.service_name = sd_out.from_service_name
        WHERE 1=1
      `;
      
      const queryParams: any[] = [];
      let paramIndex = 1;
      
      // Add filters
      if (environment) {
        query += ` AND s.environment = $${paramIndex}`;
        queryParams.push(environment);
        paramIndex++;
      }
      
      if (namespace) {
        query += ` AND s.service_namespace = $${paramIndex}`;
        queryParams.push(namespace);
        paramIndex++;
      }
      
      if (team) {
        query += ` AND s.team = $${paramIndex}`;
        queryParams.push(team);
        paramIndex++;
      }
      
      if (search) {
        query += ` AND (s.service_name ILIKE $${paramIndex} OR s.service_namespace ILIKE $${paramIndex})`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }
      
      query += `
        GROUP BY s.service_namespace, s.service_name, s.environment, s.team, s.component_type, s.created_at, s.last_seen, s.tags
        ORDER BY s.last_seen DESC
      `;
      
      const result = await pool.query(query, queryParams);
      
      const services = result.rows.map(row => ({
        namespace: row.service_namespace,
        name: row.service_name,
        environment: row.environment,
        team: row.team,
        component_type: row.component_type,
        created_at: row.created_at,
        last_seen: row.last_seen,
        tags: row.tags ? row.tags.reduce((acc: Record<string, string>, tag: string) => {
          acc[tag] = tag;
          return acc;
        }, {}) : {},
        current_alert_count: parseInt(row.current_alert_count) || 0,
        critical_alert_count: parseInt(row.critical_alert_count) || 0,
        dependency_count: parseInt(row.dependency_count) || 0,
        uptime_days: row.created_at ? 
          Math.floor((new Date().getTime() - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24)) : null
      }));
      
      // Also return filter options for UI
      const filtersQuery = `
        SELECT 
          ARRAY_AGG(DISTINCT environment ORDER BY environment) as environments,
          ARRAY_AGG(DISTINCT service_namespace ORDER BY service_namespace) as namespaces,
          ARRAY_AGG(DISTINCT team ORDER BY team) as teams
        FROM services
        WHERE environment IS NOT NULL AND service_namespace IS NOT NULL AND team IS NOT NULL
      `;
      
      const filtersResult = await pool.query(filtersQuery);
      
      return res.json({
        services,
        filters: filtersResult.rows[0] || { environments: [], namespaces: [], teams: [] },
        total: services.length
      });
      
    } catch (error) {
      req.log.error({ error }, 'Services list fetch failed');
      return res.status(500).json({ error: 'Failed to fetch services list' });
    }
  });

  return router;
}    