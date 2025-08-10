import { Router } from 'express';
import { Pool } from 'pg';
import { upsertService, ServiceUpdateData } from '../utils/serviceManager';

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

export function createTelemetryRoutes(pool: Pool): Router {
  const router = Router();

  // UPDATED: Upsert service and update dependencies using unified service manager
  router.post("/telemetry", async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const t = req.body as Telemetry;
      
      req.log.info({
        service: `${t.service_namespace}::${t.service_name}`,
        tagCount: t.tags?.length || 0,
        dependencyCount: t.depends_on?.length || 0,
        hasEnrichment: !!(t.external_calls?.length || t.database_calls?.length || t.rpc_calls?.length)
      }, 'Processing OTEL telemetry');

      // Convert telemetry data to ServiceUpdateData format
      const serviceUpdate: ServiceUpdateData = {
        service_namespace: t.service_namespace,
        service_name: t.service_name,
        environment: t.environment || 'unknown',
        team: t.team || 'unknown',
        component_type: t.component_type || 'service',
        tags: t.tags || [],
        external_calls: t.external_calls || [],
        database_calls: t.database_calls || [],
        rpc_calls: t.rpc_calls || [],
        source: 'otel'
      };

      // Use unified upsert with tag merging
      const upsertResult = await upsertService(client, serviceUpdate, req.log);
      
      req.log.info({
        service: `${t.service_namespace}::${t.service_name}`,
        created: upsertResult.created,
        updated: upsertResult.updated,
        tagChanges: upsertResult.tagChanges
      }, 'OTEL service upsert completed');

      // Handle service dependencies (unchanged logic)
      // Clear existing dependencies for this service using natural key
      await client.query(`
        DELETE FROM service_dependencies 
        WHERE from_service_namespace = $1 AND from_service_name = $2
      `, [t.service_namespace, t.service_name]);
      
      // Insert new dependencies using natural keys
      for (const dep of t.depends_on || []) {
        // Ensure target service exists (upsert with minimal data)
        const targetServiceUpdate: ServiceUpdateData = {
          service_namespace: dep.service_namespace,
          service_name: dep.service_name,
          source: 'otel'
        };
        
        await upsertService(client, targetServiceUpdate, req.log);
        
        // Create dependency using natural keys
        await client.query(`
          INSERT INTO service_dependencies (from_service_namespace, from_service_name, to_service_namespace, to_service_name, last_seen)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (from_service_namespace, from_service_name, to_service_namespace, to_service_name)
          DO UPDATE SET last_seen = NOW()
        `, [t.service_namespace, t.service_name, dep.service_namespace, dep.service_name]);
      }
      
      await client.query('COMMIT');
      
      res.json({ 
        status: "ok",
        service: `${t.service_namespace}::${t.service_name}`,
        created: upsertResult.created,
        tagChanges: upsertResult.tagChanges.length
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      req.log.error({ error }, 'Telemetry processing failed');
      res.status(500).json({ error: "Failed to process telemetry" });
    } finally {
      client.release();
    }
  });

  return router;
}