import express from "express";
import cors from "cors";
import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";
import { createHealthRoutes } from './routes/health';
import ServiceCleanup from './services/ServiceCleanup';
import { createTagsRoutes } from './routes/tags';
import { createNamespaceDepsRoutes } from './routes/namespaceDeps';
import { createAlertsRoutes } from './routes/alerts';
import { createServicesRoutes } from './routes/services';
import { createTelemetryRoutes } from './routes/telemetry';
import { createGraphRoutes } from './routes/graph';

// Load environment variables
//dotenv.config();

dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alert_hub',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const cleanupConfig = {
  ttlHours: parseFloat(process.env.SERVICE_TTL_HOURS || '168'), // 7 days default
  intervalHours: parseFloat(process.env.CLEANUP_INTERVAL_HOURS || '24'), // Daily default
  enabled: process.env.ENABLE_AUTO_CLEANUP !== 'false', // Default enabled
  maxServicesPerRun: parseInt(process.env.MAX_SERVICES_TO_DELETE_PER_RUN || '1000'),
  dryRun: process.env.CLEANUP_DRY_RUN === 'true' // Default false
};

// Initialize ServiceCleanup (but don't start yet)
const serviceCleanup = new ServiceCleanup(pool, cleanupConfig);

app.use(createHealthRoutes(pool));
app.use(createTagsRoutes(pool));
app.use(createNamespaceDepsRoutes(pool));
app.use(createAlertsRoutes(pool));
app.use(createServicesRoutes(pool));
app.use(createTelemetryRoutes(pool));
app.use(createGraphRoutes(pool));

// Service Cleanup Metrics Endpoint
app.get("/metrics/cleanup", async (req, res) => {
  try {
    const metrics = serviceCleanup.getMetrics();
    const stats = await serviceCleanup.getCleanupStats();
    
    res.json({
      metrics,
      stats,
      config: {
        ttlHours: cleanupConfig.ttlHours,
        intervalHours: cleanupConfig.intervalHours,
        enabled: cleanupConfig.enabled,
        maxServicesPerRun: cleanupConfig.maxServicesPerRun,
        dryRun: cleanupConfig.dryRun
      }
    });
  } catch (error) {
    console.error('Cleanup metrics error:', error);
    res.status(500).json({ error: "Failed to fetch cleanup metrics" });
  }
});

// Manual Cleanup Trigger Endpoint (for testing/emergency use)
app.post("/admin/cleanup/run", async (req, res) => {
  try {
    if (!cleanupConfig.enabled) {
      return res.status(400).json({ error: "Cleanup is disabled" });
    }
    
    const result = await serviceCleanup.runCleanup();
    
    res.json({
      status: "ok",
      message: "Manual cleanup completed",
      result
    });
  } catch (error) {
    console.error('Manual cleanup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Manual cleanup failed: ${errorMessage}` });
  }
});

// Get Stale Services Preview Endpoint
app.get("/admin/cleanup/preview", async (req, res) => {
  try {
    const staleServices = await serviceCleanup.getStaleServices();
    
    res.json({
      count: staleServices.length,
      services: staleServices,
      config: {
        ttlHours: cleanupConfig.ttlHours,
        maxServicesPerRun: cleanupConfig.maxServicesPerRun
      }
    });
  } catch (error) {
    console.error('Stale services preview error:', error);
    res.status(500).json({ error: "Failed to fetch stale services preview" });
  }
});

// Cleanup Orphaned Dependencies Endpoint
app.post("/admin/cleanup/orphaned-dependencies", async (req, res) => {
  try {
    const deletedCount = await serviceCleanup.cleanupOrphanedDependencies();
    
    res.json({
      status: "ok",
      message: `Cleaned up ${deletedCount} orphaned dependencies`,
      deletedCount
    });
  } catch (error) {
    console.error('Orphaned dependencies cleanup error:', error);
    res.status(500).json({ error: "Failed to cleanup orphaned dependencies" });
  }
});

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  
  // Stop ServiceCleanup first
  console.log('Stopping ServiceCleanup...');
  await serviceCleanup.stop();
  
  // Then close database pool
  console.log('Closing database connection pool...');
  await pool.end();
  
  console.log('Shutdown complete');
  process.exit(0);
});

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