import { Router } from 'express';
import { Pool } from 'pg';
import ServiceCleanup from '../services/ServiceCleanup';
import { getServiceCreationStats } from '../utils/serviceAutoCreate';

type CleanupConfig = {
  ttlHours: number;
  intervalHours: number;
  enabled: boolean;
  maxServicesPerRun: number;
  dryRun: boolean;
};

export function createAdminRoutes(pool: Pool, serviceCleanup: ServiceCleanup, cleanupConfig: CleanupConfig): Router {
  const router = Router();

    router.get("/metrics/cleanup", async (req, res) => {
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
    router.post("/admin/cleanup/run", async (req, res) => {
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
    router.get("/admin/cleanup/preview", async (req, res) => {
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
    router.post("/admin/cleanup/orphaned-dependencies", async (req, res) => {
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

      router.get("/admin/alertmanager/status", async (req, res) => {
    try {
      const serviceStats = await getServiceCreationStats(pool);
      
      res.json({
        webhook: {
          enabled: cleanupConfig.enabled, // This should reference alertmanager config if available
          endpoint: "/webhooks/alertmanager"
        },
        services: serviceStats,
        integration: {
          status: "active",
          lastProcessed: null // Could track this in future
        }
      });
    } catch (error) {
      console.error('Alertmanager status error:', error);
      res.status(500).json({ error: "Failed to fetch alertmanager status" });
    }
  });

  // Get incident system health and statistics
  router.get("/admin/incidents/health", async (req, res) => {
    try {
      const client = await pool.connect();
      
      try {
        // Get system health metrics
        const healthResult = await client.query(`
          SELECT 
            (SELECT COUNT(*) FROM alert_incidents) as total_incidents,
            (SELECT COUNT(*) FROM alert_incidents WHERE status = 'firing') as active_incidents,
            (SELECT COUNT(*) FROM alert_events) as total_events,
            (SELECT COUNT(DISTINCT alert_fingerprint) FROM alert_incidents) as unique_alert_types,
            (SELECT COUNT(DISTINCT service_namespace || '::' || service_name) FROM alert_incidents) as affected_services,
            (SELECT MIN(incident_start) FROM alert_incidents) as oldest_incident,
            (SELECT MAX(incident_start) FROM alert_incidents) as newest_incident
        `);

        // Get table sizes
        const sizeResult = await client.query(`
          SELECT 
            pg_size_pretty(pg_total_relation_size('alert_incidents')) as incidents_table_size,
            pg_size_pretty(pg_total_relation_size('alert_events')) as events_table_size,
            pg_size_pretty(pg_total_relation_size('alert_incidents') + pg_total_relation_size('alert_events')) as total_size
        `);

        // Get recent activity
        const activityResult = await client.query(`
          SELECT 
            COUNT(*) FILTER (WHERE incident_start >= NOW() - INTERVAL '1 hour') as incidents_last_hour,
            COUNT(*) FILTER (WHERE incident_start >= NOW() - INTERVAL '24 hours') as incidents_last_day,
            COUNT(*) FILTER (WHERE incident_start >= NOW() - INTERVAL '7 days') as incidents_last_week
          FROM alert_incidents
        `);

        const health = healthResult.rows[0];
        const sizes = sizeResult.rows[0];
        const activity = activityResult.rows[0];

        res.json({
          status: "healthy",
          system_health: {
            total_incidents: parseInt(health.total_incidents),
            active_incidents: parseInt(health.active_incidents),
            total_events: parseInt(health.total_events),
            unique_alert_types: parseInt(health.unique_alert_types),
            affected_services: parseInt(health.affected_services),
            oldest_incident: health.oldest_incident,
            newest_incident: health.newest_incident
          },
          storage: {
            incidents_table_size: sizes.incidents_table_size,
            events_table_size: sizes.events_table_size,
            total_size: sizes.total_size
          },
          activity: {
            incidents_last_hour: parseInt(activity.incidents_last_hour),
            incidents_last_day: parseInt(activity.incidents_last_day),
            incidents_last_week: parseInt(activity.incidents_last_week)
          },
          timestamp: new Date().toISOString()
        });

      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('Incident health check error:', error);
      res.status(500).json({ error: "Failed to check incident system health" });
    }
  });

  // Clean up old alert events (maintenance operation)
  router.post("/admin/incidents/cleanup", async (req, res) => {
    try {
      const client = await pool.connect();
      const daysOld = parseInt(req.body.days_old as string) || 90;
      
      try {
        await client.query('BEGIN');
        
        // Call the cleanup function
        const result = await client.query('SELECT cleanup_old_alert_events()');
        const deletedCount = result.rows[0].cleanup_old_alert_events;
        
        // Also clean up very old resolved incidents if requested
        if (req.body.cleanup_old_incidents === true) {
          const incidentResult = await client.query(`
            DELETE FROM alert_incidents 
            WHERE status = 'resolved' 
              AND incident_end < NOW() - INTERVAL '${daysOld} days'
          `);
          
          await client.query('COMMIT');
          
          res.json({
            status: "ok",
            message: "Cleanup completed successfully",
            events_deleted: deletedCount,
            incidents_deleted: incidentResult.rowCount || 0,
            cleanup_criteria: `older than ${daysOld} days`
          });
        } else {
          await client.query('COMMIT');
          
          res.json({
            status: "ok", 
            message: "Event cleanup completed successfully",
            events_deleted: deletedCount,
            cleanup_criteria: `older than ${daysOld} days`
          });
        }

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('Incident cleanup error:', error);
      res.status(500).json({ error: "Failed to cleanup old incidents" });
    }
  });

  // Refresh analytics materialized view
  router.post("/admin/incidents/refresh-analytics", async (req, res) => {
    try {
      const client = await pool.connect();
      
      try {
        await client.query('REFRESH MATERIALIZED VIEW alert_analytics_hourly');
        
        res.json({
          status: "ok",
          message: "Analytics materialized view refreshed successfully",
          timestamp: new Date().toISOString()
        });

      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('Analytics refresh error:', error);
      res.status(500).json({ error: "Failed to refresh analytics" });
    }
  });

  return router;
}