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


// Load environment variables
//dotenv.config();

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = createDatabasePool();
const app = createExpressApp();
const cleanupConfig = getCleanupConfig();

const serviceCleanup = new ServiceCleanup(pool, cleanupConfig);

app.use(createHealthRoutes(pool));
app.use(createTagsRoutes(pool));
app.use(createNamespaceDepsRoutes(pool));
app.use(createAlertsRoutes(pool));
app.use(createServicesRoutes(pool));
app.use(createTelemetryRoutes(pool));
app.use(createGraphRoutes(pool));
app.use(createAdminRoutes(pool, serviceCleanup, cleanupConfig));


setupGracefulShutdown(pool, serviceCleanup);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Database connection pool initialized');
  console.log('Natural key linking schema active');
  
  // Start ServiceCleanup after server is running
  console.log('Starting ServiceCleanup...');
  serviceCleanup.start();
  
  // Log cleanup configuration
  console.log('ServiceCleanup configuration:', {
    enabled: cleanupConfig.enabled,
    ttlHours: cleanupConfig.ttlHours,
    intervalHours: cleanupConfig.intervalHours,
    maxServicesPerRun: cleanupConfig.maxServicesPerRun,
    dryRun: cleanupConfig.dryRun
  });
});