import { PoolClient } from 'pg';
import { ParsedAlert } from './alertmanager';
import { processIncident, ProcessedAlert, IncidentProcessingResult } from './incidentProcessing';
import { Logger } from './logger';

export interface AlertProcessingResult {
  incidentId: number;
  eventId: number;
  action: 'created' | 'updated' | 'resolved' | 'reactivated';
  isNewIncident: boolean;
  incidentDuration?: number;
}

/**
 * Process a single alert using the new incident-based system
 */
export async function processAlert(
  client: PoolClient,
  alert: ParsedAlert,
  logger: Logger
): Promise<AlertProcessingResult> {
  try {
    // Convert ParsedAlert to ProcessedAlert format
    const processedAlert: ProcessedAlert = {
      serviceNamespace: alert.serviceNamespace,
      serviceName: alert.serviceName,
      instanceId: alert.instanceId,
      severity: alert.severity,
      message: alert.message,
      status: alert.status,
      alertSource: 'alertmanager',
      externalAlertId: alert.externalAlertId,
      eventTime: alert.status === 'resolved' && alert.endsAt ? alert.endsAt : alert.startsAt,
      eventData: {
        starts_at: alert.startsAt.toISOString(),
        ends_at: alert.endsAt?.toISOString() || null,
        external_alert_id: alert.externalAlertId
      }
    };

    // Process using the incident system
    const result = await processIncident(client, processedAlert, logger);

    // Map incident result to legacy alert result format
    return mapIncidentResultToAlertResult(result);

  } catch (error) {
    logger.error({ error }, 'Error processing alert');
    throw error;
  }
}

/**
 * Process a manual alert (from POST /alerts endpoint)
 */
export async function processManualAlert(
  client: PoolClient,
  alertData: {
    service_namespace: string;
    service_name: string;
    instance_id?: string;
    severity: 'fatal' | 'critical' | 'warning' | 'none';
    message: string;
    alert_source?: string;
    external_alert_id?: string;
  },
  logger: Logger
): Promise<AlertProcessingResult> {
  try {
    const processedAlert: ProcessedAlert = {
      serviceNamespace: alertData.service_namespace,
      serviceName: alertData.service_name,
      instanceId: alertData.instance_id || '',
      severity: alertData.severity,
      message: alertData.message,
      status: 'firing', // Manual alerts are always firing when created
      alertSource: alertData.alert_source || 'manual',
      externalAlertId: alertData.external_alert_id,
      eventTime: new Date(),
      eventData: {
        created_via: 'manual_api',
        api_timestamp: new Date().toISOString()
      }
    };

    const result = await processIncident(client, processedAlert, logger);
    return mapIncidentResultToAlertResult(result);

  } catch (error) {
    logger.error({ error }, 'Error processing manual alert');
    throw error;
  }
}

/**
 * Resolve a manual alert (from PATCH /alerts/:id/resolve endpoint)
 */
export async function resolveManualAlert(
  client: PoolClient,
  incidentId: number,
  logger: Logger
): Promise<AlertProcessingResult> {
  try {
    // Get the incident details
    const incidentResult = await client.query(`
      SELECT 
        service_namespace,
        service_name,
        instance_id,
        severity,
        message,
        status,
        alert_source,
        external_alert_id,
        incident_start
      FROM alert_incidents 
      WHERE id = $1
    `, [incidentId]);

    if (incidentResult.rows.length === 0) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    const incident = incidentResult.rows[0];

    if (incident.status === 'resolved') {
      throw new Error(`Incident ${incidentId} is already resolved`);
    }

    // Create resolve alert
    const processedAlert: ProcessedAlert = {
      serviceNamespace: incident.service_namespace,
      serviceName: incident.service_name,
      instanceId: incident.instance_id,
      severity: incident.severity,
      message: incident.message,
      status: 'resolved',
      alertSource: incident.alert_source,
      externalAlertId: incident.external_alert_id,
      eventTime: new Date(),
      eventData: {
        resolved_via: 'manual_api',
        api_timestamp: new Date().toISOString(),
        original_incident_start: incident.incident_start
      }
    };

    const result = await processIncident(client, processedAlert, logger);
    return mapIncidentResultToAlertResult(result);

  } catch (error) {
    logger.error({ error }, 'Error resolving manual alert');
    throw error;
  }
}

/**
 * Map incident processing result to legacy alert result format
 */
function mapIncidentResultToAlertResult(
  incidentResult: IncidentProcessingResult
): AlertProcessingResult {
  // Map incident actions to legacy alert actions
  let action: AlertProcessingResult['action'];
  
  switch (incidentResult.action) {
    case 'incident_created':
      action = 'created';
      break;
    case 'incident_updated':
      action = 'updated';
      break;
    case 'incident_resolved':
      action = 'resolved';
      break;
    case 'incident_reactivated':
      action = 'reactivated';
      break;
    default:
      action = 'updated';
  }

  return {
    incidentId: incidentResult.incidentId,
    eventId: incidentResult.eventId,
    action,
    isNewIncident: incidentResult.isNewIncident,
    incidentDuration: incidentResult.incidentDuration
  };
}

/**
 * Summarize multiple alert processing results
 */
export function summarizeAlertProcessing(results: AlertProcessingResult[]): {
  created: number;
  updated: number;
  resolved: number;
  reactivated: number;
  totalProcessed: number;
  totalIncidents: number;
  totalEvents: number;
} {
  const summary = {
    created: 0,
    updated: 0,
    resolved: 0,
    reactivated: 0,
    totalProcessed: results.length,
    totalIncidents: 0,
    totalEvents: results.length
  };

  const uniqueIncidents = new Set<number>();

  results.forEach(result => {
    uniqueIncidents.add(result.incidentId);
    
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
      case 'reactivated':
        summary.reactivated++;
        break;
    }
  });

  summary.totalIncidents = uniqueIncidents.size;

  return summary;
}