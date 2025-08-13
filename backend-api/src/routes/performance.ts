import { Router } from 'express';
import { Pool } from 'pg';
import { queryMonitor } from '../utils/queryMonitor';
import { connectionRetry } from '../utils/connectionRetry';

export function createPerformanceRoutes(pool: Pool): Router {
  const router = Router();

  // Get query performance metrics
  router.get('/performance/queries', async (req, res) => {
    try {
      const count = parseInt(req.query.count as string) || 10;
      
      const stats = queryMonitor.getQueryStats();
      const recentMetrics = queryMonitor.getRecentMetrics(count);
      const slowestQueries = queryMonitor.getSlowestQueries(count);
      
      res.json({
        summary: stats,
        recent_queries: recentMetrics.map(metric => ({
          query: metric.query,
          duration: metric.duration,
          timestamp: metric.timestamp,
          error: metric.error || null,
          status: metric.error ? 'failed' : 'success'
        })),
        slowest_queries: slowestQueries.map(metric => ({
          query: metric.query,
          duration: metric.duration,
          timestamp: metric.timestamp,
          error: metric.error || null,
          performance_impact: metric.duration > 5000 ? 'high' : metric.duration > 2000 ? 'medium' : 'low'
        }))
      });
      
    } catch (error) {
      req.log.error({ error }, 'Failed to fetch query performance metrics');
      res.status(500).json({ error: 'Failed to fetch performance metrics' });
    }
  });

  // Get database connection pool status
  router.get('/performance/pool', async (req, res) => {
    try {
      res.json({
        total_connections: pool.totalCount,
        idle_connections: pool.idleCount,
        waiting_clients: pool.waitingCount,
        pool_config: {
          max: pool.options.max,
          min: pool.options.min || 0,
          idle_timeout: pool.options.idleTimeoutMillis,
          connection_timeout: pool.options.connectionTimeoutMillis
        },
        pool_health: {
          utilization_percent: Math.round((pool.totalCount / (pool.options.max || 10)) * 100),
          available_connections: (pool.options.max || 10) - pool.totalCount,
          status: pool.waitingCount > 0 ? 'under_pressure' : pool.totalCount > (pool.options.max || 10) * 0.8 ? 'high_usage' : 'healthy'
        }
      });
      
    } catch (error) {
      req.log.error({ error }, 'Failed to fetch pool status');
      res.status(500).json({ error: 'Failed to fetch pool status' });
    }
  });

  // Test database connectivity and performance
  router.post('/performance/health-check', async (req, res) => {
    const startTime = Date.now();
    
    try {
      await connectionRetry.withConnection(
        pool,
        async (client) => {
          // Simple connectivity test
          await client.query('SELECT 1 as health_check');
          
          // Test basic table access
          const serviceCount = await client.query('SELECT COUNT(*) as count FROM services');
          const alertCount = await client.query('SELECT COUNT(*) as count FROM alert_incidents WHERE status = $1', ['firing']);
          
          return {
            services: parseInt(serviceCount.rows[0].count),
            active_alerts: parseInt(alertCount.rows[0].count)
          };
        },
        'health_check'
      );
      
      const duration = Date.now() - startTime;
      
      res.json({
        status: 'healthy',
        response_time_ms: duration,
        database_accessible: true,
        connection_pool_available: true,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      req.log.error({ error, duration }, 'Health check failed');
      
      res.status(503).json({
        status: 'unhealthy',
        response_time_ms: duration,
        database_accessible: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Force refresh materialized view cache
  router.post('/performance/refresh-cache', async (req, res) => {
    try {
      await connectionRetry.withConnection(
        pool,
        async (client) => {
          const startTime = Date.now();
          await client.query('SELECT refresh_services_overview_cache()');
          const duration = Date.now() - startTime;
          
          return { duration };
        },
        'refresh_cache'
      );
      
      res.json({
        status: 'success',
        message: 'Services overview cache refreshed',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      req.log.error({ error }, 'Failed to refresh cache');
      res.status(500).json({ 
        error: 'Failed to refresh cache',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get performance recommendations
  router.get('/performance/recommendations', async (req, res) => {
    try {
      const recommendations: Array<{
        type: string;
        severity: string;
        title: string;
        description: string;
        action: string;
      }> = [];
      const stats = queryMonitor.getQueryStats();
      
      // Analyze query performance
      if (stats.avgDuration > 2000) {
        recommendations.push({
          type: 'performance',
          severity: 'warning',
          title: 'Average query duration is high',
          description: `Average query time is ${Math.round(stats.avgDuration)}ms. Consider optimizing slow queries.`,
          action: 'Review slowest queries and add appropriate indexes'
        });
      }
      
      if (stats.slowQueries > stats.totalQueries * 0.1) {
        recommendations.push({
          type: 'performance',
          severity: 'critical',
          title: 'High percentage of slow queries',
          description: `${Math.round((stats.slowQueries / stats.totalQueries) * 100)}% of queries are slow.`,
          action: 'Immediate optimization needed - check database indexes and query patterns'
        });
      }
      
      if (stats.errors > 0) {
        recommendations.push({
          type: 'reliability',
          severity: 'warning',
          title: 'Query errors detected',
          description: `${stats.errors} query errors in recent history.`,
          action: 'Investigate failed queries and implement proper error handling'
        });
      }
      
      // Analyze connection pool
      const poolUtilization = (pool.totalCount / (pool.options.max || 10)) * 100;
      
      if (poolUtilization > 80) {
        recommendations.push({
          type: 'scaling',
          severity: 'warning',
          title: 'High connection pool utilization',
          description: `Pool utilization is ${Math.round(poolUtilization)}%.`,
          action: 'Consider increasing pool size or optimizing connection usage'
        });
      }
      
      if (pool.waitingCount > 0) {
        recommendations.push({
          type: 'scaling',
          severity: 'critical',
          title: 'Clients waiting for connections',
          description: `${pool.waitingCount} clients are waiting for database connections.`,
          action: 'Immediate action needed - increase pool size or investigate connection leaks'
        });
      }
      
      if (recommendations.length === 0) {
        recommendations.push({
          type: 'info',
          severity: 'info',
          title: 'Performance looks good',
          description: 'No performance issues detected based on current metrics.',
          action: 'Continue monitoring for any changes in performance patterns'
        });
      }
      
      res.json({
        total_recommendations: recommendations.length,
        critical_count: recommendations.filter(r => r.severity === 'critical').length,
        warning_count: recommendations.filter(r => r.severity === 'warning').length,
        recommendations,
        generated_at: new Date().toISOString()
      });
      
    } catch (error) {
      req.log.error({ error }, 'Failed to generate recommendations');
      res.status(500).json({ error: 'Failed to generate performance recommendations' });
    }
  });

  // Clear query metrics (for testing/debugging)
  router.delete('/performance/metrics', async (req, res) => {
    try {
      queryMonitor.clearMetrics();
      
      res.json({
        status: 'success',
        message: 'Query metrics cleared',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      req.log.error({ error }, 'Failed to clear metrics');
      res.status(500).json({ error: 'Failed to clear metrics' });
    }
  });

  return router;
}