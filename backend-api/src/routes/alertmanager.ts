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

      console.log('=== ALERTMANAGER WEBHOOK RECEIVED ===');
      console.log('Payload:', JSON.stringify(req.body, null, 2));

      // Basic payload validation
      if (!req.body || !Array.isArray(req.body.alerts)) {
        return res.status(400).json({ 
          error: "Invalid Alertmanager webhook payload - missing alerts array" 
        });
      }

      const webhook = req.body as AlertmanagerWebhook;
      const { alerts } = webhook;

      // Parse the webhook payload with enhanced validation
      const parsedAlerts = parseAlertmanagerWebhook(webhook, config.defaultNamespace);

      console.log(`=== VALIDATION SUMMARY ===`);
      console.log(`Total alerts received: ${alerts.length}`);
      console.log(`Successfully parsed: ${parsedAlerts.length}`);
      console.log(`Failed validation: ${alerts.length - parsedAlerts.length}`);

      if (parsedAlerts.length === 0) {
        return res.status(400).json({
          error: "No valid alerts found in payload",
          details: "All alerts failed validation - check logs for specific errors",
          totalReceived: alerts.length,
          validParsed: 0
        });
      }

      console.log(`Validated alerts ready for processing:`);
      parsedAlerts.forEach((alert: ParsedAlert) => {
        console.log(`✓ ${alert.serviceNamespace}::${alert.serviceName} [${alert.severity}] ${alert.status} - ${alert.message.substring(0, 50)}...`);
      });

      const client = await pool.connect();
      let servicesCreated = 0;
      let servicesUpdated = 0;
      const alertResults = [];
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

            const serviceResult = await ensureServiceExists(client, alert, alertLabels);
            if (serviceResult.created) {
              servicesCreated++;
              console.log(`Service created from alert: ${alert.serviceNamespace}::${alert.serviceName}`, {
                tagChanges: serviceResult.tagChanges
              });
            } else if (serviceResult.existed) {
              servicesUpdated++;
              if (serviceResult.tagChanges.length > 0) {
                console.log(`Service tags updated from alert: ${alert.serviceNamespace}::${alert.serviceName}`, {
                  tagChanges: serviceResult.tagChanges
                });
              }
            }
            
            // Step 2: Process the alert using NEW incident system
            const alertResult = await processAlert(client, alert);
            alertResults.push(alertResult);
            
            console.log(`Processed alert: ${alert.serviceNamespace}::${alert.serviceName} [${alert.severity}] ${alert.status} - ${alertResult.action} (Incident: ${alertResult.incidentId}, Event: ${alertResult.eventId})`);
            
          } catch (error) {
            processingErrors++;
            console.error('Alert processing failed for individual alert:', {
              service: `${alert.serviceNamespace}::${alert.serviceName}`,
              severity: alert.severity,
              status: alert.status,
              message: alert.message.substring(0, 100),
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            
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
        
        console.log(`=== PROCESSING SUMMARY ===`);
        console.log(`Services auto-created: ${servicesCreated}`);
        console.log(`Existing services updated: ${servicesUpdated}`);
        console.log(`Incidents created: ${alertSummary.created}`);
        console.log(`Incidents updated: ${alertSummary.updated}`);
        console.log(`Incidents resolved: ${alertSummary.resolved}`);
        console.log(`Incidents reactivated: ${alertSummary.reactivated}`);
        console.log(`Total incidents affected: ${alertSummary.totalIncidents}`);
        console.log(`Total events created: ${alertSummary.totalEvents}`);
        if (processingErrors > 0) {
          console.log(`Processing errors: ${processingErrors}`);
        }
        
        await client.query('COMMIT');
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Alert processing failed:', error);
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

      res.json(responseData);

    } catch (error) {
      console.error('Alertmanager webhook error:', error);
      res.status(500).json({ 
        error: "Failed to process Alertmanager webhook",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}