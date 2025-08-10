import { Router } from 'express';
import { Pool } from 'pg';

export function createTagsRoutes(pool: Pool): Router {
  const router = Router();

    router.get("/tags", async (req, res) => {
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
        req.log.error({ error }, 'Tags fetch failed');
        res.status(500).json({ error: "Failed to fetch tags" });
    } finally {
        client.release();
    }
    });

  return router;
}