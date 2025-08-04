import { Router } from 'express';
import { Pool } from 'pg';

export function createServicesRoutes(pool: Pool): Router {
    const router = Router();

    router.get("/services/overview", async (req, res) => {
        const client = await pool.connect();
        
        try {
            // Get service discovery & health summary
            const discoveryResult = await client.query(`
            SELECT 
                COUNT(*) as total_services,
                COUNT(*) FILTER (WHERE last_seen > NOW() - INTERVAL '24 hours') as active_services,
                COUNT(*) FILTER (WHERE last_seen < NOW() - INTERVAL '7 days') as stale_services,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as recently_discovered,
                COUNT(*) FILTER (WHERE team = 'unknown' OR environment = 'unknown') as missing_metadata,
                COUNT(DISTINCT service_namespace) as total_namespaces,
                COUNT(DISTINCT environment) as total_environments
            FROM services
            `);

            // Get environment breakdown
            const environmentResult = await client.query(`
            SELECT 
                environment,
                COUNT(*) as service_count
            FROM services
            GROUP BY environment
            ORDER BY service_count DESC
            `);

            // Get namespace breakdown
            const namespaceResult = await client.query(`
            SELECT 
                service_namespace,
                COUNT(*) as service_count
            FROM services
            GROUP BY service_namespace
            ORDER BY service_count DESC
            LIMIT 10
            `);

            // Get dependency insights
            const dependencyResult = await client.query(`
            WITH service_dependency_counts AS (
                SELECT 
                from_service_namespace,
                from_service_name,
                COUNT(*) as outgoing_deps
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
            SELECT 
                ds.total_dependencies,
                ds.services_with_deps,
                ds.max_dependencies,
                iso.isolated_count,
                (SELECT COUNT(*) FROM services) as total_services
            FROM dependency_stats ds, isolated_services iso
            `);

            // Get most connected services
            const connectedServicesResult = await client.query(`
            SELECT 
                s.service_namespace || '::' || s.service_name as service,
                s.team,
                s.component_type,
                COALESCE(dep_counts.total_deps, 0) as dependency_count
            FROM services s
            LEFT JOIN (
                SELECT 
                from_service_namespace,
                from_service_name,
                COUNT(*) as total_deps
                FROM service_dependencies
                GROUP BY from_service_namespace, from_service_name
            ) dep_counts ON s.service_namespace = dep_counts.from_service_namespace 
                        AND s.service_name = dep_counts.from_service_name
            ORDER BY dependency_count DESC
            LIMIT 10
            `);

            // Get enrichment statistics
            const enrichmentResult = await client.query(`
            SELECT 
                COUNT(*) FILTER (WHERE external_calls != '[]'::jsonb) as services_with_external_calls,
                COUNT(*) FILTER (WHERE database_calls != '[]'::jsonb) as services_with_db_calls,
                COUNT(*) FILTER (WHERE rpc_calls != '[]'::jsonb) as services_with_rpc_calls,
                COUNT(*) as total_services
            FROM services
            `);

            // Get alert correlation data
            const alertsResult = await client.query(`
            SELECT 
                COUNT(DISTINCT i.service_namespace || '::' || i.service_name) as services_with_alerts,
                COUNT(*) FILTER (WHERE i.severity = 'critical') as critical_alerts,
                COUNT(*) FILTER (WHERE i.severity = 'warning') as warning_alerts,
                COUNT(*) FILTER (WHERE i.severity = 'fatal') as fatal_alerts
            FROM alert_incidents i
            WHERE i.status = 'firing'
            `);

            // Get tag coverage statistics
            const tagResult = await client.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE array_length(tags, 1) > 0) as services_with_tags,
                    COUNT(*) FILTER (WHERE 'alertmanager-created' = ANY(tags)) as alertmanager_created,
                    COUNT(*) as total_services
                FROM services
                `);

                // Get unique tags count separately
                const uniqueTagsResult = await client.query(`
                SELECT COUNT(DISTINCT tag) as unique_tags
                FROM (
                    SELECT unnest(tags) as tag
                    FROM services
                    WHERE array_length(tags, 1) > 0
                ) t
                `);

            // Get recent activity
            const recentResult = await client.query(`
            SELECT 
                service_namespace || '::' || service_name as service,
                team,
                environment,
                last_seen,
                created_at,
                CASE 
                WHEN created_at > NOW() - INTERVAL '24 hours' THEN 'new'
                WHEN last_seen > NOW() - INTERVAL '1 hour' THEN 'updated'
                ELSE 'seen'
                END as activity_type
            FROM services
            WHERE last_seen > NOW() - INTERVAL '24 hours'
            ORDER BY last_seen DESC
            LIMIT 20
            `);

            const discovery = discoveryResult.rows[0];
            const dependency = dependencyResult.rows[0];
            const enrichment = enrichmentResult.rows[0];
            const alerts = alertsResult.rows[0];
            const tags = tagResult.rows[0];
            const uniqueTags = uniqueTagsResult.rows[0];

            res.json({
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
            }))
            });

        } catch (error) {
            console.error('Services overview error:', error);
            res.status(500).json({ error: "Failed to fetch services overview" });
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

  return router;
}    