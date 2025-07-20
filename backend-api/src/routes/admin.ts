import { Router } from 'express';
import { Pool } from 'pg';
import ServiceCleanup from '../services/ServiceCleanup';

type CleanupConfig = {
  ttlHours: number;
  intervalHours: number;
  enabled: boolean;
  maxServicesPerRun: number;
  dryRun: boolean;
};

export function createAdminRoutes(pool: Pool, serviceCleanup: ServiceCleanup, cleanupConfig: CleanupConfig): Router {
  const router = Router();

    router.get("/metrics/cleanup", async (req, res) => {
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
    router.post("/admin/cleanup/run", async (req, res) => {
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
    router.get("/admin/cleanup/preview", async (req, res) => {
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
    router.post("/admin/cleanup/orphaned-dependencies", async (req, res) => {
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

  return router;
}