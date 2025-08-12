import { Router } from 'express';
import { Pool } from 'pg';
import { AlertmanagerConfig } from '../config/alertmanager';
import { parseAlertmanagerWebhook, AlertmanagerWebhook, ParsedAlert } from '../utils/alertmanager';
import { ensureServiceExists } from '../utils/serviceAutoCreate';
import { processAlert, summarizeAlertProcessing } from '../utils/alertProcessing';

export function createAlertmanagerRoutes(pool: Pool, config: AlertmanagerConfig): Router {
  const router = Router();

  router.post("/webhooks/alertmanager", async (req, res) => {
    try {
      // Check if webhook is enabled
      if (!config.webhookEnabled) {
        return res.status(503).json({ 
          error: "Alertmanager webhook is disabled",
          enabled: false 
        });
      }

      req.log.info({ payload: req.body }, 'Alertmanager webhook received');

      // Basic payload validation
      if (!req.body || !Array.isArray(req.body.alerts)) {
        return res.status(400).json({ 
          error: "Invalid Alertmanager webhook payload - missing alerts array" 
        });
      }

      const webhook = req.body as AlertmanagerWebhook;
      const { alerts } = webhook;

      // Parse the webhook payload with enhanced validation
      const parsedAlerts = parseAlertmanagerWebhook(webhook, config.defaultNamespace, req.log);

      req.log.info({
        totalReceived: alerts.length,
        successfullyParsed: parsedAlerts.length,
        failedValidation: alerts.length - parsedAlerts.length
      }, 'Alert validation summary');

      if (parsedAlerts.length === 0) {
        return res.status(400).json({
          error: "No valid alerts found in payload",
          details: "All alerts failed validation - check logs for specific errors",
          totalReceived: alerts.length,
          validParsed: 0
        });
      }

      req.log.debug('Validated alerts ready for processing');
      parsedAlerts.forEach((alert: ParsedAlert) => {
        req.log.debug({
          serviceNamespace: alert.serviceNamespace,
          serviceName: alert.serviceName,
          severity: alert.severity,
          status: alert.status,
          messagePreview: alert.message.substring(0, 50)
        }, 'Validated alert ready for processing');
      });

      const client = await pool.connect();
      let servicesCreated = 0;
      let servicesUpdated = 0;
      const alertResults: any[] = [];
      let processingErrors = 0;
      
      try {
        await client.query('BEGIN');
        
        // Process each alert: ensure service exists, then create/update incident
        for (const alert of parsedAlerts) {
          try {
            // Step 1: Ensure service exists (same as before)
            const originalAlert = alerts.find(a => 
              a.labels.service_name === alert.serviceName || 
              a.labels.service === alert.serviceName || 
              a.labels.job === alert.serviceName
            );
            const alertLabels = originalAlert?.labels || {};

            const serviceResult = await ensureServiceExists(client, alert, alertLabels, req.log);
            if (serviceResult.created) {
              servicesCreated++;
              req.log.info({
                serviceNamespace: alert.serviceNamespace,
                serviceName: alert.serviceName,
                tagChanges: serviceResult.tagChanges
              }, 'Service created from alert');
            } else if (serviceResult.existed) {
              servicesUpdated++;
              if (serviceResult.tagChanges.length > 0) {
                req.log.info({
                  serviceNamespace: alert.serviceNamespace,
                  serviceName: alert.serviceName,
                  tagChanges: serviceResult.tagChanges
                }, 'Service tags updated from alert');
              }
            }
            
            // Step 2: Process the alert using NEW incident system
            const alertResult = await processAlert(client, alert, req.log);
            alertResults.push(alertResult);
            
            req.log.info({
              serviceNamespace: alert.serviceNamespace,
              serviceName: alert.serviceName,
              severity: alert.severity,
              status: alert.status,
              action: alertResult.action,
              incidentId: alertResult.incidentId,
              eventId: alertResult.eventId
            }, 'Alert processed successfully');
            
          } catch (error) {
            processingErrors++;
            req.log.error({
              service: `${alert.serviceNamespace}::${alert.serviceName}`,
              severity: alert.severity,
              status: alert.status,
              message: alert.message.substring(0, 100),
              error: error instanceof Error ? error.message : 'Unknown error'
            }, 'Alert processing failed for individual alert');
            
            // Add a failed result to track the issue but don't break the transaction
            alertResults.push({
              incidentId: -1,
              eventId: -1,
              action: 'created' as const,
              isNewIncident: false
            });
          }
        }
        
        const alertSummary = summarizeAlertProcessing(alertResults);
        
        req.log.info({
          servicesCreated,
          servicesUpdated,
          incidentsCreated: alertSummary.created,
          incidentsUpdated: alertSummary.updated,
          incidentsResolved: alertSummary.resolved,
          incidentsReactivated: alertSummary.reactivated,
          totalIncidents: alertSummary.totalIncidents,
          totalEvents: alertSummary.totalEvents,
          processingErrors
        }, 'Alert processing summary');
        
        await client.query('COMMIT');
        
      } catch (error) {
        await client.query('ROLLBACK');
        req.log.error({ error }, 'Alert processing failed');
        throw error;
      } finally {
        client.release();
      }

      const alertSummary = summarizeAlertProcessing(alertResults);

      const responseData = { 
        status: "ok", 
        message: `Successfully processed ${parsedAlerts.length} alerts`,
        parsed: parsedAlerts.length,
        servicesCreated,
        servicesUpdated,
        processed: alertSummary.totalProcessed,
        incidents: {
          created: alertSummary.created,
          updated: alertSummary.updated,
          resolved: alertSummary.resolved,
          reactivated: alertSummary.reactivated,
          totalIncidents: alertSummary.totalIncidents,
          totalEvents: alertSummary.totalEvents
        }
      };

      // Add processing errors to response if any occurred
      if (processingErrors > 0) {
        (responseData as any).processingErrors = processingErrors;
        (responseData as any).message += ` (${processingErrors} errors occurred - check logs)`;
      }

      return res.json(responseData);

    } catch (error) {
      req.log.error({ error }, 'Alertmanager webhook error');
      return res.status(500).json({ 
        error: "Failed to process Alertmanager webhook",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}