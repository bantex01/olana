import { Router } from 'express';
import { Pool } from 'pg';

export function createHealthRoutes(pool: Pool): Router {
  const router = Router();

  router.get("/health", async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: "healthy", database: "connected" });
    } catch (error) {
        res.status(500).json({ status: "unhealthy", database: "disconnected" });
    }
  });

  return router;
}