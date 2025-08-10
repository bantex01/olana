import { Router } from 'express';
import { Pool } from 'pg';

type NamespaceDependency = {
  from_namespace: string;
  to_namespace: string;
  created_by?: string;
  dependency_type?: string;
  description?: string;
};

export function createNamespaceDepsRoutes(pool: Pool): Router {
  const router = Router();


        router.post("/namespace-dependencies", async (req, res) => {
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
            req.log.error({ error }, 'Namespace dependency creation failed');
            res.status(500).json({ error: "Failed to create namespace dependency" });
        } finally {
            client.release();
        }
        });

        router.get("/namespace-dependencies", async (req, res) => {
        const client = await pool.connect();
        
        try {
            const result = await client.query(`
            SELECT id, from_namespace, to_namespace, created_by, dependency_type, description, created_at, updated_at
            FROM namespace_dependencies
            ORDER BY from_namespace, to_namespace
            `);
            
            res.json(result.rows);
            
        } catch (error) {
            req.log.error({ error }, 'Namespace dependencies fetch failed');
            res.status(500).json({ error: "Failed to fetch namespace dependencies" });
        } finally {
            client.release();
        }
        });

        router.delete("/namespace-dependencies/:id", async (req, res) => {
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
            
            return res.json({ 
            status: "ok", 
            deleted: result.rows[0]
            });
            
        } catch (error) {
            req.log.error({ error }, 'Namespace dependency deletion failed');
            return res.status(500).json({ error: "Failed to delete namespace dependency" });
        } finally {
            client.release();
        }
        });
    return router;    
}