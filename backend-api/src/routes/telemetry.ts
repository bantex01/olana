import { Router } from 'express';
import { Pool } from 'pg';

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

  // UPDATED: Upsert service and update dependencies using natural keys
    router.post("/telemetry", async (req, res) => {
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

  return router;
}  