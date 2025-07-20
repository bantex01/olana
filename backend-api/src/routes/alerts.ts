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

// UPDATED: Get all active alerts using natural keys
router.get("/alerts", async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('=== ALERTS REQUEST ===');
    console.log('Query params:', req.query);
    
    // Parse filters
    const filters: any = {};
    if (req.query.tags) filters.tags = (req.query.tags as string).split(',');
    if (req.query.namespaces) filters.namespaces = (req.query.namespaces as string).split(',');
    if (req.query.severities) filters.severities = (req.query.severities as string).split(',');

    // Get services that match our filters first (if any filters applied)
    let serviceFilters = '';
    let serviceParams: any[] = [];
    
    if (filters.tags || filters.namespaces) {
      let serviceWhereConditions: string[] = [];

      // Add tags filter if present
      if (filters.tags && filters.tags.length > 0) {
        serviceWhereConditions.push('s.tags && $1');
        serviceParams.push(filters.tags);
      }

      // Add namespace filter if present
      if (filters.namespaces && filters.namespaces.length > 0) {
        const startIndex = serviceParams.length + 1;
        if (filters.namespaces.length === 1) {
          serviceWhereConditions.push(`s.service_namespace = $${startIndex}`);
          serviceParams.push(filters.namespaces[0]);
        } else {
          const placeholders = filters.namespaces.map((_item: string, index: number) => `$${startIndex + index}`).join(', ');
          serviceWhereConditions.push(`s.service_namespace IN (${placeholders})`);
          serviceParams.push(...filters.namespaces);
        }
      }

      if (serviceWhereConditions.length > 0) {
        serviceFilters = `AND EXISTS (
          SELECT 1 FROM services s 
          WHERE s.service_namespace = a.service_namespace 
            AND s.service_name = a.service_name 
            AND ${serviceWhereConditions.join(' AND ')}
        )`;
      }
    }

    // Build main alerts query
    let alertQuery = `
      SELECT 
        a.id,
        a.service_namespace,
        a.service_name,
        a.instance_id,
        a.severity,
        a.message,
        a.status,
        a.count,
        a.first_seen,
        a.last_seen,
        a.created_at,
        a.resolved_at
      FROM alerts a
      WHERE a.status = 'firing'
      ${serviceFilters}
    `;
    
    let params = [...serviceParams];

    // Add severity filter if present
    if (filters.severities && filters.severities.length > 0) {
      const severityStartIndex = params.length + 1;
      if (filters.severities.length === 1) {
        alertQuery += ` AND a.severity = $${severityStartIndex}`;
        params.push(filters.severities[0]);
      } else {
        const placeholders = filters.severities.map((_item: string, index: number) => `$${severityStartIndex + index}`).join(', ');
        alertQuery += ` AND a.severity IN (${placeholders})`;
        params.push(...filters.severities);
      }
    }

    alertQuery += ` ORDER BY a.last_seen DESC`;

    console.log('Alert query:', alertQuery);
    console.log('Alert params:', params);
    
    const alertsResult = await client.query(alertQuery, params);
    
    const alerts = alertsResult.rows.map((row: any) => ({
      alert_id: row.id,
      service_namespace: row.service_namespace,
      service_name: row.service_name,
      instance_id: row.instance_id,
      severity: row.severity,
      message: row.message,
      status: row.status,
      count: row.count,
      first_seen: row.first_seen,
      last_seen: row.last_seen,
      created_at: row.created_at,
      resolved_at: row.resolved_at
    }));
    
    console.log(`Returning ${alerts.length} alerts`);
    res.json(alerts);
    
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({ error: "Failed to fetch alerts" });
  } finally {
    client.release();
  }
});


  return router;
}