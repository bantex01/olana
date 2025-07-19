import { Router } from 'express';
import { Pool } from 'pg';

type Alert = {
  service_namespace: string;
  service_name: string;
  instance_id?: string;
  severity: "fatal" | "critical" | "warning" | "none";
  message: string;
  alert_source?: string;
  external_alert_id?: string;
};

export function createAlertsRoutes(pool: Pool): Router {
  const router = Router();

  router.patch("/alerts/:alertId/resolve", async (req, res) => {
  const client = await pool.connect();
  
  try {
    const alertId = parseInt(req.params.alertId);
    
    await client.query(`
      UPDATE alerts 
      SET status = 'resolved', resolved_at = NOW()
      WHERE id = $1 AND status = 'firing'
    `, [alertId]);
    
    res.json({ status: "ok" });
    
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({ error: "Failed to resolve alert" });
  } finally {
    client.release();
  }
});

  return router;
}