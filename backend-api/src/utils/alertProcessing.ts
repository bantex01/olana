import { PoolClient } from 'pg';
import { ParsedAlert } from './alertmanager';

export interface AlertProcessingResult {
  alertId: number;
  isNewAlert: boolean;
  count: number;
  action: 'created' | 'updated' | 'resolved';
}

export async function processAlert(
  client: PoolClient,
  alert: ParsedAlert
): Promise<AlertProcessingResult> {
  try {
    if (alert.status === 'resolved') {
      return await resolveAlert(client, alert);
    } else {
      return await createOrUpdateAlert(client, alert);
    }
  } catch (error) {
    console.error('Error processing alert:', error);
    throw error;
  }
}

async function createOrUpdateAlert(
  client: PoolClient,
  alert: ParsedAlert
): Promise<AlertProcessingResult> {
  // Insert or update alert using existing deduplication logic
  const result = await client.query(`
    INSERT INTO alerts (
      service_namespace, 
      service_name, 
      instance_id, 
      severity, 
      message, 
      alert_source, 
      external_alert_id, 
      count, 
      first_seen, 
      last_seen,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8, $8, 'firing')
    ON CONFLICT (service_namespace, service_name, instance_id, severity, message)
    DO UPDATE SET 
      count = alerts.count + 1,
      last_seen = $8,
      status = 'firing',
      alert_source = CASE 
        WHEN EXCLUDED.alert_source IS NOT NULL THEN EXCLUDED.alert_source 
        ELSE alerts.alert_source 
      END,
      external_alert_id = CASE 
        WHEN EXCLUDED.external_alert_id IS NOT NULL THEN EXCLUDED.external_alert_id 
        ELSE alerts.external_alert_id 
      END
    RETURNING id, count, (count = 1) as is_new_alert
  `, [
    alert.serviceNamespace,
    alert.serviceName,
    alert.instanceId,
    alert.severity,
    alert.message,
    'alertmanager',
    alert.externalAlertId,
    alert.startsAt
  ]);

  const row = result.rows[0];
  
  return {
    alertId: row.id,
    isNewAlert: row.is_new_alert,
    count: row.count,
    action: row.is_new_alert ? 'created' : 'updated'
  };
}

async function resolveAlert(
  client: PoolClient,
  alert: ParsedAlert
): Promise<AlertProcessingResult> {
  // Try to resolve matching alert by finding it first, then updating
  const findResult = await client.query(`
    SELECT id, count
    FROM alerts 
    WHERE service_namespace = $1 
      AND service_name = $2 
      AND instance_id = $3 
      AND severity = $4 
      AND message = $5
      AND status = 'firing'
    ORDER BY last_seen DESC
    LIMIT 1
  `, [
    alert.serviceNamespace,
    alert.serviceName,
    alert.instanceId,
    alert.severity,
    alert.message
  ]);

  if (findResult.rows.length === 0) {
    // No matching firing alert found, log and create a resolved alert record
    console.warn(`No matching firing alert found to resolve for ${alert.serviceNamespace}::${alert.serviceName} - ${alert.message}`);
    
    // Create a resolved alert record for tracking purposes
    const createResult = await client.query(`
      INSERT INTO alerts (
        service_namespace, 
        service_name, 
        instance_id, 
        severity, 
        message, 
        alert_source, 
        external_alert_id, 
        count, 
        first_seen, 
        last_seen,
        status,
        resolved_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8, $8, 'resolved', $9)
      RETURNING id, count
    `, [
      alert.serviceNamespace,
      alert.serviceName,
      alert.instanceId,
      alert.severity,
      alert.message,
      'alertmanager',
      alert.externalAlertId,
      alert.startsAt,
      alert.endsAt || new Date()
    ]);

    return {
      alertId: createResult.rows[0].id,
      isNewAlert: true,
      count: 1,
      action: 'resolved'
    };
  }

  // Update the found alert to resolved status
  const alertId = findResult.rows[0].id;
  const count = findResult.rows[0].count;
  
  await client.query(`
    UPDATE alerts 
    SET status = 'resolved', 
        resolved_at = $1,
        last_seen = $1
    WHERE id = $2
  `, [alert.endsAt || new Date(), alertId]);

  return {
    alertId: alertId,
    isNewAlert: false,
    count: count,
    action: 'resolved'
  };
}

export function summarizeAlertProcessing(results: AlertProcessingResult[]): {
  created: number;
  updated: number;
  resolved: number;
  totalProcessed: number;
} {
  const summary = {
    created: 0,
    updated: 0,
    resolved: 0,
    totalProcessed: results.length
  };

  results.forEach(result => {
    switch (result.action) {
      case 'created':
        summary.created++;
        break;
      case 'updated':
        summary.updated++;
        break;
      case 'resolved':
        summary.resolved++;
        break;
    }
  });

  return summary;
}