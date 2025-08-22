import { Router } from 'express';
import { Pool } from 'pg';
import { processManualAlert, resolveManualAlert, acknowledgeManualAlert } from '../utils/alertProcessing';
import { handleRouteError, handleClientError } from '../utils/errorHandler';

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

  // Resolve an alert by incident ID
  router.patch("/alerts/:incidentId/resolve", async (req, res) => {
    const client = await pool.connect();
    
    try {
      const incidentId = parseInt(req.params.incidentId);
      
      if (isNaN(incidentId)) {
        return handleClientError(res, "Invalid incident ID");
      }
      
      const result = await resolveManualAlert(client, incidentId, req.log);
      
      res.json({ 
        status: "ok",
        message: "Alert resolved successfully",
        incidentId: result.incidentId,
        eventId: result.eventId,
        action: result.action,
        duration: result.incidentDuration ? `${Math.round(result.incidentDuration / 1000)}s` : undefined
      });
      
    } catch (error) {
      const incidentId = parseInt(req.params.incidentId);
      handleRouteError(error, res, req.log, 'resolve alert', { incidentId });
    } finally {
      client.release();
    }
  });

  // Acknowledge an alert by incident ID
  router.patch("/alerts/:incidentId/acknowledge", async (req, res) => {
    const client = await pool.connect();
    
    try {
      const incidentId = parseInt(req.params.incidentId);
      
      if (isNaN(incidentId)) {
        return handleClientError(res, "Invalid incident ID");
      }
      
      const result = await acknowledgeManualAlert(client, incidentId, req.log);
      
      res.json({ 
        status: "ok",
        message: "Alert acknowledged successfully",
        incidentId: result.incidentId,
        eventId: result.eventId,
        acknowledgmentTime: new Date().toISOString()
      });
      
    } catch (error) {
      const incidentId = parseInt(req.params.incidentId);
      handleRouteError(error, res, req.log, 'acknowledge alert', { incidentId });
    } finally {
      client.release();
    }
  });

  // Create a new alert (fires immediately)
  router.post("/alerts", async (req, res) => {
    const client = await pool.connect();
    
    try {
      const alertData = req.body as Alert;
      
      // Validate required fields
      if (!alertData.service_namespace || !alertData.service_name || !alertData.message) {
        return handleClientError(res, "Missing required fields: service_namespace, service_name, and message are required");
      }
      
      await client.query('BEGIN');
      
      // Ensure the service exists (create if needed)
      await client.query(`
        INSERT INTO services (service_namespace, service_name, last_seen)
        VALUES ($1, $2, NOW())
        ON CONFLICT (service_namespace, service_name)
        DO UPDATE SET last_seen = NOW()
      `, [alertData.service_namespace, alertData.service_name]);
      
      // Process the alert using new incident system
      const result = await processManualAlert(client, alertData, req.log);
      
      await client.query('COMMIT');
      
      res.json({ 
        status: "ok", 
        message: result.isNewIncident ? "New alert incident created" : "Alert incident updated",
        incidentId: result.incidentId,
        eventId: result.eventId,
        action: result.action,
        isNewIncident: result.isNewIncident
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      const alertData = req.body as Alert;
      handleRouteError(error, res, req.log, 'create alert', { alertData });
    } finally {
      client.release();
    }
  });

// Get all active alerts (using new incident-based system) - FIXED VERSION
  router.get("/alerts", async (req, res) => {
    const client = await pool.connect();
    
    try {
      req.log.debug({ queryParams: req.query }, 'Fetching alerts');
      
      // Parse filters
      const filters: any = {};
      if (req.query.tags) filters.tags = (req.query.tags as string).split(',');
      if (req.query.namespaces) filters.namespaces = (req.query.namespaces as string).split(',');
      if (req.query.severities) filters.severities = (req.query.severities as string).split(',');
      if (req.query.search) filters.search = req.query.search as string;

      // Start building the query
      let alertQuery = `
        SELECT 
          i.id,
          i.service_namespace,
          i.service_name,
          i.instance_id,
          i.severity,
          i.message,
          i.status,
          i.incident_start as first_seen,
          COALESCE(i.incident_end, i.updated_at) as last_seen,
          i.created_at,
          i.incident_end as resolved_at,
          i.alert_source,
          i.external_alert_id,
          i.acknowledged_at,
          i.acknowledged_by,
          -- Calculate count from events
          (SELECT COUNT(*) FROM alert_events e WHERE e.incident_id = i.id AND e.event_type = 'fired') as count
        FROM alert_incidents i
      `;
      
      let whereConditions: string[] = [];
      let params: any[] = [];
      let paramIndex = 1;

      // Add status filter (only active incidents by default)
      whereConditions.push(`i.status = $${paramIndex}`);
      params.push('firing');
      paramIndex++;

      // Handle service filtering (tags, namespaces, and search)
      if (filters.tags || filters.namespaces || filters.search) {
        let serviceSubquery = `EXISTS (
          SELECT 1 FROM services s 
          WHERE s.service_namespace = i.service_namespace 
            AND s.service_name = i.service_name`;
        
        if (filters.tags && filters.tags.length > 0) {
          serviceSubquery += ` AND s.tags && $${paramIndex}`;
          params.push(filters.tags);
          paramIndex++;
        }

        if (filters.namespaces && filters.namespaces.length > 0) {
          if (filters.namespaces.length === 1) {
            serviceSubquery += ` AND s.service_namespace = $${paramIndex}`;
            params.push(filters.namespaces[0]);
            paramIndex++;
          } else {
            const placeholders = filters.namespaces.map(() => `$${paramIndex++}`).join(', ');
            serviceSubquery += ` AND s.service_namespace IN (${placeholders})`;
            params.push(...filters.namespaces);
          }
        }

        if (filters.search && filters.search.trim() !== '') {
          const searchTerm = `%${filters.search.trim()}%`;
          serviceSubquery += ` AND (s.service_namespace ILIKE $${paramIndex} OR s.service_name ILIKE $${paramIndex + 1})`;
          params.push(searchTerm, searchTerm);
          paramIndex += 2;
        }

        serviceSubquery += ')';
        whereConditions.push(serviceSubquery);
      }

      // Add severity filter if present
      if (filters.severities && filters.severities.length > 0) {
        if (filters.severities.length === 1) {
          whereConditions.push(`i.severity = $${paramIndex}`);
          params.push(filters.severities[0]);
          paramIndex++;
        } else {
          const placeholders = filters.severities.map(() => `$${paramIndex++}`).join(', ');
          whereConditions.push(`i.severity IN (${placeholders})`);
          params.push(...filters.severities);
        }
      }

      // Add WHERE clause
      if (whereConditions.length > 0) {
        alertQuery += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      alertQuery += ` ORDER BY i.incident_start DESC`;

      req.log.debug({ query: alertQuery, params, paramCount: params.length }, 'Executing alert query');
      
      const alertsResult = await client.query(alertQuery, params);
      
      // Format response to match legacy API format
      const alerts = alertsResult.rows.map((row: any) => ({
        alert_id: row.id, // Now returns incident ID instead of alert ID
        service_namespace: row.service_namespace,
        service_name: row.service_name,
        instance_id: row.instance_id,
        severity: row.severity,
        message: row.message,
        status: row.status,
        count: parseInt(row.count) || 1,
        first_seen: row.first_seen,
        last_seen: row.last_seen,
        created_at: row.created_at,
        resolved_at: row.resolved_at,
        alert_source: row.alert_source,
        external_alert_id: row.external_alert_id,
        acknowledged_at: row.acknowledged_at,
        acknowledged_by: row.acknowledged_by
      }));
      
      req.log.info({ alertCount: alerts.length }, 'Returning active incidents');
      res.json(alerts);
      
    } catch (error) {
      req.log.error({ error }, 'Alerts fetch error');
      res.status(500).json({ error: "Failed to fetch alerts" });
    } finally {
      client.release();
    }
  });
  
  router.get("/alerts/timeline/:namespace/:serviceName", async (req, res) => {
    const client = await pool.connect();
    
    try {
      const { namespace, serviceName } = req.params;
      const hours = parseInt(req.query.hours as string) || 24;
      const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
      
      req.log.debug({ namespace, serviceName, hours }, 'Getting timeline');
      
      const timelineResult = await client.query(`
        SELECT 
          i.id as incident_id,
          i.severity,
          i.message,
          i.incident_start,
          i.incident_end,
          i.status,
          i.alert_fingerprint,
          EXTRACT(EPOCH FROM (COALESCE(i.incident_end, NOW()) - i.incident_start)) as duration_seconds,
          -- Get all events for this incident
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'event_id', e.id,
                'event_type', e.event_type,
                'event_time', e.event_time,
                'event_data', e.event_data
              ) ORDER BY e.event_time
            ) FILTER (WHERE e.id IS NOT NULL),
            '[]'::json
          ) as events
        FROM alert_incidents i
        LEFT JOIN alert_events e ON i.id = e.incident_id
        WHERE i.service_namespace = $1 
          AND i.service_name = $2
          AND i.incident_start >= $3
        GROUP BY i.id, i.severity, i.message, i.incident_start, i.incident_end, i.status, i.alert_fingerprint
        ORDER BY i.incident_start DESC
      `, [namespace, serviceName, cutoff]);
      
      const timeline = timelineResult.rows.map((row: any) => ({
        incident_id: row.incident_id,
        severity: row.severity,
        message: row.message,
        incident_start: row.incident_start,
        incident_end: row.incident_end,
        status: row.status,
        duration_seconds: Math.round(parseFloat(row.duration_seconds)),
        duration_human: formatDuration(parseFloat(row.duration_seconds)),
        alert_fingerprint: row.alert_fingerprint,
        events: row.events
      }));
      
      res.json({
        service: `${namespace}::${serviceName}`,
        time_range_hours: hours,
        total_incidents: timeline.length,
        timeline
      });
      
    } catch (error) {
      const { namespace, serviceName } = req.params;
      handleRouteError(error, res, req.log, 'fetch timeline', { namespace, serviceName });
    } finally {
      client.release();
    }
  });

    router.get("/alerts/timeline/:namespace/:serviceName/detailed", async (req, res) => {
    const client = await pool.connect();
    
    try {
      const { namespace, serviceName } = req.params;
      const hours = parseInt(req.query.hours as string) || 24;
      const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
      
      req.log.debug({ namespace, serviceName, hours }, 'Getting detailed timeline');
      
      // Get incidents with enriched data
      const timelineResult = await client.query(`
        SELECT 
          i.id as incident_id,
          i.severity,
          i.message,
          i.incident_start,
          i.incident_end,
          i.status,
          i.alert_fingerprint,
          i.alert_source,
          i.external_alert_id,
          EXTRACT(EPOCH FROM (COALESCE(i.incident_end, NOW()) - i.incident_start)) as duration_seconds,
          -- Get all events for this incident
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'event_id', e.id,
                'event_type', e.event_type,
                'event_time', e.event_time,
                'event_data', e.event_data
              ) ORDER BY e.event_time
            ) FILTER (WHERE e.id IS NOT NULL),
            '[]'::json
          ) as events,
          -- Calculate time to next incident of same type
          LEAD(i.incident_start) OVER (
            PARTITION BY i.alert_fingerprint 
            ORDER BY i.incident_start
          ) as next_incident_start
        FROM alert_incidents i
        LEFT JOIN alert_events e ON i.id = e.incident_id
        WHERE i.service_namespace = $1 
          AND i.service_name = $2
          AND i.incident_start >= $3
        GROUP BY i.id, i.severity, i.message, i.incident_start, i.incident_end, 
                 i.status, i.alert_fingerprint, i.alert_source, i.external_alert_id
        ORDER BY i.incident_start DESC
      `, [namespace, serviceName, cutoff]);

      // Get summary statistics for this service
      const statsResult = await client.query(`
        SELECT 
          COUNT(*) as total_incidents,
          COUNT(*) FILTER (WHERE status = 'firing') as active_incidents,
          COUNT(DISTINCT alert_fingerprint) as unique_alert_types,
          AVG(EXTRACT(EPOCH FROM (incident_end - incident_start)) / 60) FILTER (WHERE incident_end IS NOT NULL) as avg_duration_minutes,
          MAX(incident_start) as most_recent_incident
        FROM alert_incidents
        WHERE service_namespace = $1 
          AND service_name = $2
          AND incident_start >= $3
      `, [namespace, serviceName, cutoff]);

      const timeline = timelineResult.rows.map((row: any) => {
        const durationSeconds = parseFloat(row.duration_seconds);
        const nextIncidentStart = row.next_incident_start;
        let timeToNext: number | null = null;
        
        if (nextIncidentStart && row.incident_end) {
          timeToNext = Math.round(
            (new Date(nextIncidentStart).getTime() - new Date(row.incident_end).getTime()) / 1000
          );
        }

        return {
          incident_id: row.incident_id,
          severity: row.severity,
          message: row.message,
          incident_start: row.incident_start,
          incident_end: row.incident_end,
          status: row.status,
          alert_source: row.alert_source,
          external_alert_id: row.external_alert_id,
          duration_seconds: Math.round(durationSeconds),
          duration_human: formatDuration(durationSeconds),
          time_to_next_seconds: timeToNext,
          time_to_next_human: timeToNext ? formatDuration(timeToNext) : null,
          alert_fingerprint: row.alert_fingerprint,
          events: row.events,
          event_count: Array.isArray(row.events) ? row.events.length : 0
        };
      });

      const stats = statsResult.rows[0];

      res.json({
        service: `${namespace}::${serviceName}`,
        time_range_hours: hours,
        summary: {
          total_incidents: parseInt(stats.total_incidents),
          active_incidents: parseInt(stats.active_incidents),
          unique_alert_types: parseInt(stats.unique_alert_types),
          avg_duration_minutes: stats.avg_duration_minutes ? Math.round(parseFloat(stats.avg_duration_minutes)) : null,
          most_recent_incident: stats.most_recent_incident
        },
        timeline
      });
      
    } catch (error) {
      const { namespace, serviceName } = req.params;
      handleRouteError(error, res, req.log, 'fetch detailed timeline', { namespace, serviceName });
    } finally {
      client.release();
    }
  });

  // Get alert analytics and statistics
  router.get("/alerts/analytics", async (req, res) => {
    const client = await pool.connect();
    
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
      
      req.log.debug({ hours }, 'Getting analytics');
      
      // Basic incident counts
      const countsResult = await client.query(`
        SELECT 
          COUNT(*) as total_incidents,
          COUNT(*) FILTER (WHERE status = 'firing') as active_incidents,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved_incidents,
          COUNT(DISTINCT service_namespace || '::' || service_name) as affected_services,
          COUNT(DISTINCT alert_fingerprint) as unique_alert_types
        FROM alert_incidents 
        WHERE incident_start >= $1
      `, [cutoff]);

      // MTTR (Mean Time To Resolution) calculation
      const mttrResult = await client.query(`
        SELECT 
          AVG(EXTRACT(EPOCH FROM (incident_end - incident_start)) / 60) as avg_resolution_minutes,
          MIN(EXTRACT(EPOCH FROM (incident_end - incident_start)) / 60) as fastest_resolution_minutes,
          MAX(EXTRACT(EPOCH FROM (incident_end - incident_start)) / 60) as slowest_resolution_minutes,
          COUNT(*) as resolved_count
        FROM alert_incidents 
        WHERE status = 'resolved' 
          AND incident_start >= $1 
          AND incident_end IS NOT NULL
      `, [cutoff]);

      // MTTA (Mean Time To Acknowledge) calculation
      const mttaResult = await client.query(`
        SELECT 
          AVG(EXTRACT(EPOCH FROM (acknowledged_at - incident_start)) / 60) as avg_acknowledgment_minutes,
          MIN(EXTRACT(EPOCH FROM (acknowledged_at - incident_start)) / 60) as fastest_acknowledgment_minutes,
          MAX(EXTRACT(EPOCH FROM (acknowledged_at - incident_start)) / 60) as slowest_acknowledgment_minutes,
          COUNT(*) as acknowledged_count
        FROM alert_incidents 
        WHERE acknowledged_at IS NOT NULL
          AND incident_start >= $1
      `, [cutoff]);

      // Most frequent alerts
      const frequentAlertsResult = await client.query(`
        SELECT 
          service_namespace || '::' || service_name as service,
          severity,
          message,
          COUNT(*) as incident_count,
          MAX(incident_start) as last_occurrence,
          -- Calculate frequency (incidents per hour)
          ROUND((COUNT(*)::decimal / $2), 2) as incidents_per_hour
        FROM alert_incidents 
        WHERE incident_start >= $1
        GROUP BY service_namespace, service_name, severity, message
        HAVING COUNT(*) > 1
        ORDER BY incident_count DESC 
        LIMIT 10
      `, [cutoff, hours]);

      // Severity breakdown
      const severityResult = await client.query(`
        SELECT 
          severity,
          COUNT(*) as count,
          COUNT(*) FILTER (WHERE status = 'firing') as active,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved
        FROM alert_incidents 
        WHERE incident_start >= $1
        GROUP BY severity
        ORDER BY 
          CASE severity 
            WHEN 'fatal' THEN 1 
            WHEN 'critical' THEN 2 
            WHEN 'warning' THEN 3 
            WHEN 'none' THEN 4 
          END
      `, [cutoff]);

      // Hourly incident distribution
      const hourlyResult = await client.query(`
        SELECT 
          DATE_TRUNC('hour', incident_start) as hour,
          COUNT(*) as incidents,
          COUNT(DISTINCT service_namespace || '::' || service_name) as services_affected
        FROM alert_incidents 
        WHERE incident_start >= $1
        GROUP BY DATE_TRUNC('hour', incident_start)
        ORDER BY hour DESC
        LIMIT 24
      `, [cutoff]);

      const counts = countsResult.rows[0];
      const mttr = mttrResult.rows[0];
      const mtta = mttaResult.rows[0];

      res.json({
        time_range_hours: hours,
        summary: {
          total_incidents: parseInt(counts.total_incidents),
          active_incidents: parseInt(counts.active_incidents),
          resolved_incidents: parseInt(counts.resolved_incidents),
          affected_services: parseInt(counts.affected_services),
          unique_alert_types: parseInt(counts.unique_alert_types)
        },
        mttr: {
          average_minutes: mttr.avg_resolution_minutes ? Math.round(parseFloat(mttr.avg_resolution_minutes)) : null,
          fastest_minutes: mttr.fastest_resolution_minutes ? Math.round(parseFloat(mttr.fastest_resolution_minutes)) : null,
          slowest_minutes: mttr.slowest_resolution_minutes ? Math.round(parseFloat(mttr.slowest_resolution_minutes)) : null,
          resolved_count: parseInt(mttr.resolved_count)
        },
        mtta: {
          average_minutes: mtta.avg_acknowledgment_minutes ? Math.round(parseFloat(mtta.avg_acknowledgment_minutes)) : null,
          fastest_minutes: mtta.fastest_acknowledgment_minutes ? Math.round(parseFloat(mtta.fastest_acknowledgment_minutes)) : null,
          slowest_minutes: mtta.slowest_acknowledgment_minutes ? Math.round(parseFloat(mtta.slowest_acknowledgment_minutes)) : null,
          acknowledged_count: parseInt(mtta.acknowledged_count)
        },
        most_frequent_alerts: frequentAlertsResult.rows.map(row => ({
          service: row.service,
          severity: row.severity,
          message: row.message.substring(0, 100) + (row.message.length > 100 ? '...' : ''),
          incident_count: parseInt(row.incident_count),
          incidents_per_hour: parseFloat(row.incidents_per_hour),
          last_occurrence: row.last_occurrence
        })),
        severity_breakdown: severityResult.rows.map(row => ({
          severity: row.severity,
          total: parseInt(row.count),
          active: parseInt(row.active),
          resolved: parseInt(row.resolved)
        })),
        hourly_distribution: hourlyResult.rows.map(row => ({
          hour: row.hour,
          incidents: parseInt(row.incidents),
          services_affected: parseInt(row.services_affected)
        }))
      });
      
    } catch (error) {
      req.log.error({ error }, 'Analytics error');
      res.status(500).json({ error: "Failed to fetch analytics" });
    } finally {
      client.release();
    }
  });

  // Get incident patterns (detect recurring issues)
  router.get("/alerts/patterns", async (req, res) => {
    const client = await pool.connect();
    
    try {
      const hours = parseInt(req.query.hours as string) || 168; // Default 7 days
      const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
      
      req.log.debug({ hours }, 'Analyzing patterns');
      
      // Find recurring alert patterns
      const patternsResult = await client.query(`
        WITH incident_gaps AS (
          SELECT 
            alert_fingerprint,
            service_namespace || '::' || service_name as service,
            severity,
            message,
            incident_start,
            LAG(incident_end) OVER (
              PARTITION BY alert_fingerprint 
              ORDER BY incident_start
            ) as prev_incident_end,
            EXTRACT(EPOCH FROM (
              incident_start - LAG(incident_end) OVER (
                PARTITION BY alert_fingerprint 
                ORDER BY incident_start
              )
            )) / 3600 as hours_between_incidents
          FROM alert_incidents
          WHERE incident_start >= $1
            AND status = 'resolved'
        ),
        pattern_analysis AS (
          SELECT 
            alert_fingerprint,
            service,
            severity,
            message,
            COUNT(*) as incident_count,
            AVG(hours_between_incidents) as avg_hours_between,
            MIN(hours_between_incidents) as min_hours_between,
            MAX(hours_between_incidents) as max_hours_between,
            -- Detect if this is a recurring pattern (multiple incidents with short gaps)
            CASE 
              WHEN COUNT(*) >= 3 AND AVG(hours_between_incidents) < 24 THEN 'frequent'
              WHEN COUNT(*) >= 2 AND AVG(hours_between_incidents) < 1 THEN 'flapping'
              WHEN COUNT(*) >= 2 THEN 'recurring'
              ELSE 'isolated'
            END as pattern_type
          FROM incident_gaps
          WHERE hours_between_incidents IS NOT NULL
          GROUP BY alert_fingerprint, service, severity, message
        )
        SELECT 
          service,
          severity,
          message,
          incident_count,
          pattern_type,
          ROUND(avg_hours_between::numeric, 2) as avg_hours_between,
          ROUND(min_hours_between::numeric, 2) as min_hours_between,
          ROUND(max_hours_between::numeric, 2) as max_hours_between
        FROM pattern_analysis
        WHERE pattern_type IN ('frequent', 'flapping', 'recurring')
        ORDER BY 
          CASE pattern_type 
            WHEN 'flapping' THEN 1 
            WHEN 'frequent' THEN 2 
            WHEN 'recurring' THEN 3 
          END,
          incident_count DESC
      `, [cutoff]);

      res.json({
        time_range_hours: hours,
        patterns_found: patternsResult.rows.length,
        patterns: patternsResult.rows.map(row => ({
          service: row.service,
          severity: row.severity,
          message: row.message.substring(0, 100) + (row.message.length > 100 ? '...' : ''),
          incident_count: parseInt(row.incident_count),
          pattern_type: row.pattern_type,
          avg_hours_between: parseFloat(row.avg_hours_between),
          min_hours_between: parseFloat(row.min_hours_between),
          max_hours_between: parseFloat(row.max_hours_between),
          recommendation: getPatternRecommendation(row.pattern_type, parseFloat(row.avg_hours_between))
        }))
      });
      
    } catch (error) {
      req.log.error({ error }, 'Pattern analysis error');
      res.status(500).json({ error: "Failed to analyze patterns" });
    } finally {
      client.release();
    }
  });

  // Get service-specific analytics (MTTA/MTTR)
  router.get("/alerts/analytics/service/:namespace/:serviceName", async (req, res) => {
    const client = await pool.connect();
    
    try {
      const { namespace, serviceName } = req.params;
      const hours = parseInt(req.query.hours as string) || 24;
      const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
      
      req.log.debug({ namespace, serviceName, hours }, 'Getting service analytics');
      
      // Use materialized view for efficient aggregation
      const analyticsResult = await client.query(`
        SELECT 
          SUM(incident_count) as total_incidents,
          SUM(resolved_count) as total_resolved,
          SUM(acknowledged_count) as total_acknowledged,
          -- Weighted average for MTTR (weight by resolved incidents)
          CASE 
            WHEN SUM(resolved_count) > 0 THEN
              SUM(avg_duration_minutes * resolved_count) / SUM(resolved_count)
            ELSE NULL
          END as avg_resolution_minutes,
          -- Weighted average for MTTA (weight by acknowledged incidents)
          CASE 
            WHEN SUM(acknowledged_count) > 0 THEN
              SUM(avg_acknowledgment_minutes * acknowledged_count) / SUM(acknowledged_count)
            ELSE NULL
          END as avg_acknowledgment_minutes
        FROM alert_analytics_hourly
        WHERE service_namespace = $1 
          AND service_name = $2
          AND hour >= $3
      `, [namespace, serviceName, cutoff]);

      // Get breakdown by severity
      const severityResult = await client.query(`
        SELECT 
          severity,
          SUM(incident_count) as incident_count,
          SUM(resolved_count) as resolved_count,
          SUM(acknowledged_count) as acknowledged_count,
          CASE 
            WHEN SUM(resolved_count) > 0 THEN
              SUM(avg_duration_minutes * resolved_count) / SUM(resolved_count)
            ELSE NULL
          END as avg_duration_minutes,
          CASE 
            WHEN SUM(acknowledged_count) > 0 THEN
              SUM(avg_acknowledgment_minutes * acknowledged_count) / SUM(acknowledged_count)
            ELSE NULL
          END as avg_acknowledgment_minutes
        FROM alert_analytics_hourly
        WHERE service_namespace = $1 
          AND service_name = $2
          AND hour >= $3
        GROUP BY severity
        ORDER BY 
          CASE severity 
            WHEN 'fatal' THEN 1 
            WHEN 'critical' THEN 2 
            WHEN 'warning' THEN 3 
            WHEN 'none' THEN 4 
          END
      `, [namespace, serviceName, cutoff]);

      const analytics = analyticsResult.rows[0];

      res.json({
        service: `${namespace}::${serviceName}`,
        time_range_hours: hours,
        summary: {
          total_incidents: parseInt(analytics.total_incidents) || 0,
          resolved_incidents: parseInt(analytics.total_resolved) || 0,
          acknowledged_incidents: parseInt(analytics.total_acknowledged) || 0,
          acknowledgment_rate: analytics.total_incidents > 0 ? 
            Math.round((analytics.total_acknowledged / analytics.total_incidents) * 100) : 0
        },
        mttr: {
          average_minutes: analytics.avg_resolution_minutes ? 
            Math.round(parseFloat(analytics.avg_resolution_minutes)) : null,
          resolved_count: parseInt(analytics.total_resolved) || 0
        },
        mtta: {
          average_minutes: analytics.avg_acknowledgment_minutes ? 
            Math.round(parseFloat(analytics.avg_acknowledgment_minutes)) : null,
          acknowledged_count: parseInt(analytics.total_acknowledged) || 0
        },
        severity_breakdown: severityResult.rows.map(row => ({
          severity: row.severity,
          incident_count: parseInt(row.incident_count),
          resolved_count: parseInt(row.resolved_count),
          acknowledged_count: parseInt(row.acknowledged_count),
          avg_resolution_minutes: row.avg_duration_minutes ? 
            Math.round(parseFloat(row.avg_duration_minutes)) : null,
          avg_acknowledgment_minutes: row.avg_acknowledgment_minutes ? 
            Math.round(parseFloat(row.avg_acknowledgment_minutes)) : null
        }))
      });
      
    } catch (error) {
      const { namespace, serviceName } = req.params;
      handleRouteError(error, res, req.log, 'fetch service analytics', { namespace, serviceName });
    } finally {
      client.release();
    }
  });

  // Get namespace-level aggregated analytics (MTTA/MTTR)
  router.get("/alerts/analytics/namespace/:namespace", async (req, res) => {
    const client = await pool.connect();
    
    try {
      const { namespace } = req.params;
      const hours = parseInt(req.query.hours as string) || 24;
      const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
      
      req.log.debug({ namespace, hours }, 'Getting namespace analytics');
      
      // Use materialized view for efficient aggregation
      const analyticsResult = await client.query(`
        SELECT 
          SUM(incident_count) as total_incidents,
          SUM(resolved_count) as total_resolved,
          SUM(acknowledged_count) as total_acknowledged,
          COUNT(DISTINCT service_name) as affected_services,
          -- Weighted average for MTTR
          CASE 
            WHEN SUM(resolved_count) > 0 THEN
              SUM(avg_duration_minutes * resolved_count) / SUM(resolved_count)
            ELSE NULL
          END as avg_resolution_minutes,
          -- Weighted average for MTTA
          CASE 
            WHEN SUM(acknowledged_count) > 0 THEN
              SUM(avg_acknowledgment_minutes * acknowledged_count) / SUM(acknowledged_count)
            ELSE NULL
          END as avg_acknowledgment_minutes
        FROM alert_analytics_hourly
        WHERE service_namespace = $1 
          AND hour >= $2
      `, [namespace, cutoff]);

      // Get top services by incident count
      const topServicesResult = await client.query(`
        SELECT 
          service_name,
          SUM(incident_count) as total_incidents,
          SUM(resolved_count) as total_resolved,
          SUM(acknowledged_count) as total_acknowledged,
          CASE 
            WHEN SUM(resolved_count) > 0 THEN
              SUM(avg_duration_minutes * resolved_count) / SUM(resolved_count)
            ELSE NULL
          END as avg_resolution_minutes,
          CASE 
            WHEN SUM(acknowledged_count) > 0 THEN
              SUM(avg_acknowledgment_minutes * acknowledged_count) / SUM(acknowledged_count)
            ELSE NULL
          END as avg_acknowledgment_minutes
        FROM alert_analytics_hourly
        WHERE service_namespace = $1 
          AND hour >= $2
        GROUP BY service_name
        HAVING SUM(incident_count) > 0
        ORDER BY SUM(incident_count) DESC
        LIMIT 10
      `, [namespace, cutoff]);

      // Get severity breakdown
      const severityResult = await client.query(`
        SELECT 
          severity,
          SUM(incident_count) as incident_count,
          SUM(resolved_count) as resolved_count,
          SUM(acknowledged_count) as acknowledged_count,
          CASE 
            WHEN SUM(resolved_count) > 0 THEN
              SUM(avg_duration_minutes * resolved_count) / SUM(resolved_count)
            ELSE NULL
          END as avg_duration_minutes,
          CASE 
            WHEN SUM(acknowledged_count) > 0 THEN
              SUM(avg_acknowledgment_minutes * acknowledged_count) / SUM(acknowledged_count)
            ELSE NULL
          END as avg_acknowledgment_minutes
        FROM alert_analytics_hourly
        WHERE service_namespace = $1 
          AND hour >= $2
        GROUP BY severity
        ORDER BY 
          CASE severity 
            WHEN 'fatal' THEN 1 
            WHEN 'critical' THEN 2 
            WHEN 'warning' THEN 3 
            WHEN 'none' THEN 4 
          END
      `, [namespace, cutoff]);

      const analytics = analyticsResult.rows[0];

      res.json({
        namespace: namespace,
        time_range_hours: hours,
        summary: {
          total_incidents: parseInt(analytics.total_incidents) || 0,
          resolved_incidents: parseInt(analytics.total_resolved) || 0,
          acknowledged_incidents: parseInt(analytics.total_acknowledged) || 0,
          affected_services: parseInt(analytics.affected_services) || 0,
          acknowledgment_rate: analytics.total_incidents > 0 ? 
            Math.round((analytics.total_acknowledged / analytics.total_incidents) * 100) : 0
        },
        mttr: {
          average_minutes: analytics.avg_resolution_minutes ? 
            Math.round(parseFloat(analytics.avg_resolution_minutes)) : null,
          resolved_count: parseInt(analytics.total_resolved) || 0
        },
        mtta: {
          average_minutes: analytics.avg_acknowledgment_minutes ? 
            Math.round(parseFloat(analytics.avg_acknowledgment_minutes)) : null,
          acknowledged_count: parseInt(analytics.total_acknowledged) || 0
        },
        top_services: topServicesResult.rows.map(row => ({
          service_name: row.service_name,
          incident_count: parseInt(row.total_incidents),
          resolved_count: parseInt(row.total_resolved),
          acknowledged_count: parseInt(row.total_acknowledged),
          avg_resolution_minutes: row.avg_resolution_minutes ? 
            Math.round(parseFloat(row.avg_resolution_minutes)) : null,
          avg_acknowledgment_minutes: row.avg_acknowledgment_minutes ? 
            Math.round(parseFloat(row.avg_acknowledgment_minutes)) : null
        })),
        severity_breakdown: severityResult.rows.map(row => ({
          severity: row.severity,
          incident_count: parseInt(row.incident_count),
          resolved_count: parseInt(row.resolved_count),
          acknowledged_count: parseInt(row.acknowledged_count),
          avg_resolution_minutes: row.avg_duration_minutes ? 
            Math.round(parseFloat(row.avg_duration_minutes)) : null,
          avg_acknowledgment_minutes: row.avg_acknowledgment_minutes ? 
            Math.round(parseFloat(row.avg_acknowledgment_minutes)) : null
        }))
      });
      
    } catch (error) {
      const { namespace } = req.params;
      handleRouteError(error, res, req.log, 'fetch namespace analytics', { namespace });
    } finally {
      client.release();
    }
  });

// Helper function for pattern recommendations
function getPatternRecommendation(patternType: string, avgHours: number): string {
  switch (patternType) {
    case 'flapping':
      return 'Alert is flapping - consider adjusting thresholds or adding hysteresis';
    case 'frequent':
      return `Alert occurs every ${avgHours.toFixed(1)}h on average - investigate root cause`;
    case 'recurring':
      return 'Alert recurs regularly - may indicate systemic issue requiring attention';
    default:
      return 'No specific recommendation';
  }
}

  return router;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}
