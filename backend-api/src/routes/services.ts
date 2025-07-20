import { Router } from 'express';
import { Pool } from 'pg';

export function createServicesRoutes(pool: Pool): Router {
    const router = Router();

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