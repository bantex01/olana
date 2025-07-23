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
        console.log(`✓ ${alert.serviceNamespace}::${alert.serviceName} [${alert.severity}] ${alert.message.substring(0, 50)}...`);
      });

     const client = await pool.connect();
      let servicesCreated = 0;
      let servicesUpdated = 0;
      const alertResults = [];
      
      try {
        await client.query('BEGIN');
        
        // Process each alert: ensure service exists, then create/update alert
        for (const alert of parsedAlerts) {
          // Step 1: Ensure service exists
          const serviceResult = await ensureServiceExists(client, alert);
          if (serviceResult.created) {
            servicesCreated++;
          } else if (serviceResult.existed) {
            servicesUpdated++;
          }
          
          // Step 2: Process the alert
          const alertResult = await processAlert(client, alert);
          alertResults.push(alertResult);
          
          console.log(`Processed alert: ${alert.serviceNamespace}::${alert.serviceName} [${alert.severity}] - ${alertResult.action} (ID: ${alertResult.alertId})`);
        }
        
        const alertSummary = summarizeAlertProcessing(alertResults);
        
        console.log(`=== PROCESSING SUMMARY ===`);
        console.log(`Services auto-created: ${servicesCreated}`);
        console.log(`Existing services updated: ${servicesUpdated}`);
        console.log(`Alerts created: ${alertSummary.created}`);
        console.log(`Alerts updated: ${alertSummary.updated}`);
        console.log(`Alerts resolved: ${alertSummary.resolved}`);
        console.log(`Total alerts processed: ${alertSummary.totalProcessed}`);
        
        await client.query('COMMIT');
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Alert processing failed:', error);
        throw error;
      } finally {
        client.release();
      }

      const alertSummary = summarizeAlertProcessing(alertResults);

      res.json({ 
        status: "ok", 
        message: `Successfully processed ${parsedAlerts.length} alerts`,
        parsed: parsedAlerts.length,
        servicesCreated,
        servicesUpdated,
        processed: alertSummary.totalProcessed,
        alerts: {
          created: alertSummary.created,
          updated: alertSummary.updated,
          resolved: alertSummary.resolved
        }
      });

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