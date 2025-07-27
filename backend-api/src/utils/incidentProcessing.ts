import { PoolClient } from 'pg';
import { 
  generateAlertFingerprint, 
  validateAlertIdentity, 
  extractAlertIdentity,
  createAlertDisplayId,
  AlertIdentity 
} from './alertFingerprinting';

export interface ProcessedAlert {
  serviceNamespace: string;
  serviceName: string;
  instanceId: string;
  severity: 'fatal' | 'critical' | 'warning' | 'none';
  message: string;
  status: 'firing' | 'resolved';
  alertSource: string;
  externalAlertId?: string;
  eventTime: Date;
  eventData?: Record<string, any>;
}

export interface IncidentProcessingResult {
  incidentId: number;
  eventId: number;
  action: 'incident_created' | 'incident_updated' | 'incident_resolved' | 'incident_reactivated';
  isNewIncident: boolean;
  incidentDuration?: number; // in milliseconds, if resolved
  eventType: 'fired' | 'resolved' | 'updated';
}

/**
 * Main entry point for processing alerts using the incident-based system
 */
export async function processIncident(
  client: PoolClient,
  alert: ProcessedAlert
): Promise<IncidentProcessingResult> {
  try {
    // Extract and validate alert identity
    const identity = extractAlertIdentity(alert);
    const validation = validateAlertIdentity(identity);
    
    if (!validation.isValid) {
      throw new Error(`Invalid alert identity: ${validation.errors.join(', ')}`);
    }

    // Generate fingerprint for incident grouping
    const fingerprint = generateAlertFingerprint(identity);
    const displayId = createAlertDisplayId(identity);

    console.log('Processing incident', {
      displayId,
      fingerprint,
      status: alert.status,
      eventTime: alert.eventTime.toISOString()
    });

    if (alert.status === 'firing') {
      return await handleFiringAlert(client, alert, fingerprint, displayId);
    } else if (alert.status === 'resolved') {
      return await handleResolvedAlert(client, alert, fingerprint, displayId);
    } else {
      throw new Error(`Unknown alert status: ${alert.status}`);
    }

  } catch (error) {
    console.error('Error processing incident:', error);
    throw error;
  }
}

/**
 * Handle a firing alert - either create new incident or reactivate resolved one
 */
async function handleFiringAlert(
  client: PoolClient,
  alert: ProcessedAlert,
  fingerprint: string,
  displayId: string
): Promise<IncidentProcessingResult> {
  
  // Check for existing incident with this fingerprint
  const existingResult = await client.query(`
    SELECT id, status, incident_start, incident_end, updated_at
    FROM alert_incidents 
    WHERE alert_fingerprint = $1 
    ORDER BY incident_start DESC 
    LIMIT 1
  `, [fingerprint]);

  if (existingResult.rows.length === 0) {
    // No existing incident - create new one
    return await createNewIncident(client, alert, fingerprint, displayId);
  }

  const existingIncident = existingResult.rows[0];
  
  if (existingIncident.status === 'firing') {
    // Incident already firing - add update event
    return await addIncidentEvent(
      client, 
      existingIncident.id, 
      'updated', 
      alert, 
      displayId,
      'incident_updated'
    );
  } else {
    // Previous incident was resolved - create new incident for this occurrence
    // This enables proper timeline tracking: alert can fire → resolve → fire again
    return await createNewIncident(client, alert, fingerprint, displayId);
  }
}

/**
 * Handle a resolved alert - resolve the current firing incident
 */
async function handleResolvedAlert(
  client: PoolClient,
  alert: ProcessedAlert,
  fingerprint: string,
  displayId: string
): Promise<IncidentProcessingResult> {
  
  // Find the currently firing incident for this fingerprint
  const firingResult = await client.query(`
    SELECT id, incident_start, status
    FROM alert_incidents 
    WHERE alert_fingerprint = $1 AND status = 'firing'
    ORDER BY incident_start DESC 
    LIMIT 1
  `, [fingerprint]);

  if (firingResult.rows.length === 0) {
    // No firing incident found - create a resolved incident for tracking
    console.warn(`No firing incident found for resolved alert: ${displayId}`);
    return await createResolvedIncident(client, alert, fingerprint, displayId);
  }

  const firingIncident = firingResult.rows[0];
  const incidentStart = new Date(firingIncident.incident_start);
  const incidentDuration = alert.eventTime.getTime() - incidentStart.getTime();

  // Resolve the incident
  await client.query(`
    UPDATE alert_incidents 
    SET status = 'resolved', 
        incident_end = $1,
        updated_at = $1
    WHERE id = $2
  `, [alert.eventTime, firingIncident.id]);

  // Add resolved event
  const eventResult = await addIncidentEvent(
    client,
    firingIncident.id,
    'resolved',
    alert,
    displayId,
    'incident_resolved'
  );

  console.log(`Resolved incident ${firingIncident.id}`, {
    displayId,
    duration: `${Math.round(incidentDuration / 1000)}s`
  });

  return {
    ...eventResult,
    incidentDuration
  };
}

/**
 * Create a new incident and initial fire event
 */
async function createNewIncident(
  client: PoolClient,
  alert: ProcessedAlert,
  fingerprint: string,
  displayId: string
): Promise<IncidentProcessingResult> {
  
  // Create the incident record
  const incidentResult = await client.query(`
    INSERT INTO alert_incidents (
      service_namespace,
      service_name,
      instance_id,
      severity,
      message,
      alert_fingerprint,
      incident_start,
      status,
      alert_source,
      external_alert_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'firing', $8, $9)
    RETURNING id
  `, [
    alert.serviceNamespace,
    alert.serviceName,
    alert.instanceId,
    alert.severity,
    alert.message,
    fingerprint,
    alert.eventTime,
    alert.alertSource,
    alert.externalAlertId
  ]);

  const incidentId = incidentResult.rows[0].id;

  // Create the initial fire event
  const eventResult = await addIncidentEvent(
    client,
    incidentId,
    'fired',
    alert,
    displayId,
    'incident_created'
  );

  console.log(`Created new incident ${incidentId}`, { displayId });

  return {
    ...eventResult,
    isNewIncident: true
  };
}

/**
 * Create a resolved incident (for when we receive a resolve without seeing the fire)
 */
async function createResolvedIncident(
  client: PoolClient,
  alert: ProcessedAlert,
  fingerprint: string,
  displayId: string
): Promise<IncidentProcessingResult> {
  
  // Estimate incident start time (assume it started 1 minute before resolve)
  const estimatedStart = new Date(alert.eventTime.getTime() - 60000);

  // Create resolved incident
  const incidentResult = await client.query(`
    INSERT INTO alert_incidents (
      service_namespace,
      service_name,
      instance_id,
      severity,
      message,
      alert_fingerprint,
      incident_start,
      incident_end,
      status,
      alert_source,
      external_alert_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'resolved', $9, $10)
    RETURNING id
  `, [
    alert.serviceNamespace,
    alert.serviceName,
    alert.instanceId,
    alert.severity,
    alert.message,
    fingerprint,
    estimatedStart,
    alert.eventTime,
    alert.alertSource,
    alert.externalAlertId
  ]);

  const incidentId = incidentResult.rows[0].id;

  // Create the resolve event
  const eventResult = await addIncidentEvent(
    client,
    incidentId,
    'resolved',
    alert,
    displayId,
    'incident_created'
  );

  console.log(`Created resolved incident ${incidentId} (orphaned resolve)`, { displayId });

  return {
    ...eventResult,
    isNewIncident: true,
    incidentDuration: 60000 // Estimated 1 minute
  };
}

/**
 * Add an event to an existing incident
 */
async function addIncidentEvent(
  client: PoolClient,
  incidentId: number,
  eventType: 'fired' | 'resolved' | 'updated',
  alert: ProcessedAlert,
  displayId: string,
  action: IncidentProcessingResult['action']
): Promise<IncidentProcessingResult> {
  
  // Prepare event data
  const eventData = {
    alert_source: alert.alertSource,
    external_alert_id: alert.externalAlertId,
    event_timestamp: alert.eventTime.toISOString(),
    ...alert.eventData
  };

  // Insert the event
  const eventResult = await client.query(`
    INSERT INTO alert_events (
      incident_id,
      event_type,
      event_time,
      event_data
    )
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `, [incidentId, eventType, alert.eventTime, JSON.stringify(eventData)]);

  const eventId = eventResult.rows[0].id;

  console.log(`Added ${eventType} event ${eventId} to incident ${incidentId}`, { displayId });

  return {
    incidentId,
    eventId,
    action,
    isNewIncident: false,
    eventType
  };
}

/**
 * Get incident statistics for reporting
 */
export async function getIncidentStats(
  client: PoolClient,
  timeRangeHours: number = 24
): Promise<{
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  avgDurationMinutes: number;
  mostFrequentAlerts: Array<{ fingerprint: string; count: number; service: string }>;
}> {
  const cutoff = new Date(Date.now() - (timeRangeHours * 60 * 60 * 1000));

  // Get basic counts
  const countsResult = await client.query(`
    SELECT 
      COUNT(*) as total_incidents,
      COUNT(*) FILTER (WHERE status = 'firing') as active_incidents,
      COUNT(*) FILTER (WHERE status = 'resolved') as resolved_incidents
    FROM alert_incidents 
    WHERE incident_start >= $1
  `, [cutoff]);

  // Get average duration for resolved incidents
  const durationResult = await client.query(`
    SELECT AVG(EXTRACT(EPOCH FROM (incident_end - incident_start)) / 60) as avg_duration_minutes
    FROM alert_incidents 
    WHERE status = 'resolved' 
      AND incident_start >= $1 
      AND incident_end IS NOT NULL
  `, [cutoff]);

  // Get most frequent alerts
  const frequentResult = await client.query(`
    SELECT 
      alert_fingerprint,
      COUNT(*) as incident_count,
      service_namespace || '::' || service_name as service,
      severity,
      message
    FROM alert_incidents 
    WHERE incident_start >= $1
    GROUP BY alert_fingerprint, service_namespace, service_name, severity, message
    ORDER BY incident_count DESC 
    LIMIT 10
  `, [cutoff]);

  const counts = countsResult.rows[0];
  const avgDuration = durationResult.rows[0]?.avg_duration_minutes || 0;

  return {
    totalIncidents: parseInt(counts.total_incidents),
    activeIncidents: parseInt(counts.active_incidents),
    resolvedIncidents: parseInt(counts.resolved_incidents),
    avgDurationMinutes: Math.round(parseFloat(avgDuration)),
    mostFrequentAlerts: frequentResult.rows.map(row => ({
      fingerprint: row.alert_fingerprint,
      count: parseInt(row.incident_count),
      service: row.service
    }))
  };
}