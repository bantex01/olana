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

router.post("/alerts", async (req, res) => {
  const client = await pool.connect();
  
  try {
    const a = req.body as Alert;
    
    // Ensure the service exists (create if needed)
    await client.query(`
      INSERT INTO services (service_namespace, service_name, last_seen)
      VALUES ($1, $2, NOW())
      ON CONFLICT (service_namespace, service_name)
      DO UPDATE SET last_seen = NOW()
    `, [a.service_namespace, a.service_name]);
    
    // Insert or update alert using natural keys
    const alertResult = await client.query(`
      INSERT INTO alerts (service_namespace, service_name, instance_id, severity, message, alert_source, external_alert_id, count, first_seen, last_seen)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 1, NOW(), NOW())
      ON CONFLICT (service_namespace, service_name, instance_id, severity, message)
      DO UPDATE SET 
        count = alerts.count + 1,
        last_seen = NOW(),
        status = 'firing',
        alert_source = CASE WHEN EXCLUDED.alert_source IS NOT NULL THEN EXCLUDED.alert_source ELSE alerts.alert_source END,
        external_alert_id = CASE WHEN EXCLUDED.external_alert_id IS NOT NULL THEN EXCLUDED.external_alert_id ELSE alerts.external_alert_id END
      RETURNING id, count, (count = 1) as is_new_alert
    `, [a.service_namespace, a.service_name, a.instance_id || '', a.severity, a.message, a.alert_source || 'manual', a.external_alert_id]);
    
    const result = alertResult.rows[0];
    
    res.json({ 
      status: "ok", 
      alert_id: result.id,
      count: result.count,
      is_new_alert: result.is_new_alert,
      message: result.is_new_alert ? "New alert created" : `Alert count incremented to ${result.count}`
    });
    
  } catch (error) {
    console.error('Alert error:', error);
    res.status(500).json({ error: "Failed to create alert" });
  } finally {
    client.release();
  }
});

  return router;
}