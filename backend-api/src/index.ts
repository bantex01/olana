import dotenv from "dotenv";
import path from "path";
import { createDatabasePool } from './config/database';
import { createExpressApp } from './config/server';
import { getCleanupConfig } from './config/cleanup';
import { setupGracefulShutdown } from './utils/shutdown';
import { createHealthRoutes } from './routes/health';
import ServiceCleanup from './services/ServiceCleanup';
import { createTagsRoutes } from './routes/tags';
import { createNamespaceDepsRoutes } from './routes/namespaceDeps';
import { createAlertsRoutes } from './routes/alerts';
import { createServicesRoutes } from './routes/services';
import { createTelemetryRoutes } from './routes/telemetry';
import { createGraphRoutes } from './routes/graph';
import { createAdminRoutes } from './routes/admin';
import { createPerformanceRoutes } from './routes/performance';
import { getAlertmanagerConfig } from './config/alertmanager';
import { createAlertmanagerRoutes } from './routes/alertmanager';
import { logger } from './utils/logger';
import { requestTracingMiddleware } from './middleware/requestTracing';


// Load environment variables
//dotenv.config();

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = createDatabasePool();
const app = createExpressApp();
const cleanupConfig = getCleanupConfig();

const serviceCleanup = new ServiceCleanup(pool, cleanupConfig);
const alertmanagerConfig = getAlertmanagerConfig();

// Add request tracing middleware
app.use(requestTracingMiddleware);

app.use(createHealthRoutes(pool));
app.use(createAlertmanagerRoutes(pool, alertmanagerConfig));
app.use(createTagsRoutes(pool));
app.use(createNamespaceDepsRoutes(pool));
app.use(createAlertsRoutes(pool));
app.use(createServicesRoutes(pool));
app.use(createTelemetryRoutes(pool));
app.use(createGraphRoutes(pool));
app.use(createAdminRoutes(pool, serviceCleanup, cleanupConfig));
app.use(createPerformanceRoutes(pool));

setupGracefulShutdown(pool, serviceCleanup);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  
  // Log database connection details
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbName = process.env.DB_NAME || 'alert_hub';
  const dbUser = process.env.DB_USER || 'postgres';
  const poolMax = process.env.DB_POOL_MAX || '15';
  
  logger.info({
    host: dbHost,
    database: dbName,
    user: dbUser,
    pool_max: poolMax,
    ssl: process.env.DB_SSL === 'true'
  }, 'Database connection configured');
  
  logger.info('Database connection pool initialized');
  logger.info('Natural key linking schema active');

  logger.info({
    enabled: alertmanagerConfig.webhookEnabled,
    defaultNamespace: alertmanagerConfig.defaultNamespace,
    endpoint: `http://localhost:${PORT}/webhooks/alertmanager`
  }, 'Alertmanager webhook configuration');
  
  // Start ServiceCleanup after server is running
  logger.info('Starting ServiceCleanup...');
  serviceCleanup.start();
  
  // Log cleanup configuration
  logger.info({
    enabled: cleanupConfig.enabled,
    ttlHours: cleanupConfig.ttlHours,
    intervalHours: cleanupConfig.intervalHours,
    maxServicesPerRun: cleanupConfig.maxServicesPerRun,
    dryRun: cleanupConfig.dryRun
  }, 'ServiceCleanup configuration');
});

const alertConfig = getAlertmanagerConfig();
logger.info({
  allowedLabels: alertConfig.tagConfig.allowedLabels,
  prefixPatterns: alertConfig.tagConfig.prefixPatterns,
  maxTagsPerAlert: alertConfig.tagConfig.maxTagsPerAlert
}, 'Alertmanager tag config loaded');

// Temporary test - remove after verification
import { upsertService } from './utils/serviceManager';

logger.info('Service manager utility loaded successfully');
