import { Pool, PoolClient } from 'pg';

export interface ServiceCleanupConfig {
  ttlHours: number;
  intervalHours: number;
  enabled: boolean;
  maxServicesPerRun: number;
  dryRun?: boolean;
}

export interface CleanupMetrics {
  lastRunTime: Date | null;
  lastRunDuration: number;
  servicesDeleted: number;
  dependenciesDeleted: number;
  totalRuns: number;
  totalServicesDeleted: number;
  totalDependenciesDeleted: number;
  lastError: string | null;
  isRunning: boolean;
  nextRunTime: Date | null;
}

export interface CleanupResult {
  servicesDeleted: number;
  dependenciesDeleted: number;
  duration: number;
  staleServices: Array<{
    service_namespace: string;
    service_name: string;
    last_seen: Date;
    days_stale: number;
  }>;
}

export default class ServiceCleanup {
  private pool: Pool;
  private config: ServiceCleanupConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private metrics: CleanupMetrics;

  constructor(pool: Pool, config: ServiceCleanupConfig) {
    this.pool = pool;
    this.config = config;
    this.metrics = {
      lastRunTime: null,
      lastRunDuration: 0,
      servicesDeleted: 0,
      dependenciesDeleted: 0,
      totalRuns: 0,
      totalServicesDeleted: 0,
      totalDependenciesDeleted: 0,
      lastError: null,
      isRunning: false,
      nextRunTime: null
    };

    this.log('ServiceCleanup initialized', {
      ttlHours: config.ttlHours,
      intervalHours: config.intervalHours,
      enabled: config.enabled,
      maxServicesPerRun: config.maxServicesPerRun,
      dryRun: config.dryRun || false
    });
  }

  /**
   * Start the cleanup service with periodic execution
   */
  start(): void {
    if (!this.config.enabled) {
      this.log('ServiceCleanup start requested but disabled by configuration');
      return;
    }

    if (this.intervalId) {
      this.log('ServiceCleanup already running');
      return;
    }

    const intervalMs = this.config.intervalHours * 60 * 60 * 1000;
    
    this.log('Starting ServiceCleanup', {
      intervalHours: this.config.intervalHours,
      intervalMs,
      nextRunIn: `${this.config.intervalHours} hours`
    });

    // Set next run time
    this.metrics.nextRunTime = new Date(Date.now() + intervalMs);

    // Schedule periodic cleanup
    this.intervalId = setInterval(async () => {
      await this.runCleanup();
    }, intervalMs);

    // Optionally run immediately on startup (uncomment if desired)
    // setTimeout(() => this.runCleanup(), 5000); // 5 second delay on startup
  }

  /**
   * Stop the cleanup service
   */
  async stop(): Promise<void> {
    this.log('Stopping ServiceCleanup');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.metrics.nextRunTime = null;
    }

    // Wait for current run to complete if running
    while (this.isRunning) {
      this.log('Waiting for current cleanup run to complete...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.log('ServiceCleanup stopped');
  }

  /**
   * Get current cleanup metrics
   */
  getMetrics(): CleanupMetrics {
    return { ...this.metrics };
  }

  /**
   * Get list of stale services without deleting them
   */
  async getStaleServices(): Promise<Array<{
    service_namespace: string;
    service_name: string;
    last_seen: Date;
    days_stale: number;
  }>> {
    const client = await this.pool.connect();
    
    try {
      const cutoffTime = new Date(Date.now() - (this.config.ttlHours * 60 * 60 * 1000));
      
      const result = await client.query(`
        SELECT 
          service_namespace,
          service_name,
          last_seen,
          EXTRACT(EPOCH FROM (NOW() - last_seen)) / 86400 as days_stale
        FROM services
        WHERE last_seen < $1
        ORDER BY last_seen ASC
        LIMIT $2
      `, [cutoffTime, this.config.maxServicesPerRun]);

      return result.rows.map(row => ({
        service_namespace: row.service_namespace,
        service_name: row.service_name,
        last_seen: new Date(row.last_seen),
        days_stale: Math.floor(parseFloat(row.days_stale))
      }));

    } finally {
      client.release();
    }
  }

  /**
   * Run cleanup immediately (can be called manually)
   */
  async runCleanup(): Promise<CleanupResult> {
    if (this.isRunning) {
      throw new Error('Cleanup is already running');
    }

    if (!this.config.enabled) {
      throw new Error('Cleanup is disabled');
    }

    this.isRunning = true;
    this.metrics.isRunning = true;
    this.metrics.lastError = null;

    const startTime = Date.now();
    let result: CleanupResult;

    try {
      this.log('Starting cleanup run', {
        ttlHours: this.config.ttlHours,
        maxServicesPerRun: this.config.maxServicesPerRun,
        dryRun: this.config.dryRun || false
      });

      result = await this.performCleanup();

      // Update metrics
      this.metrics.lastRunTime = new Date(startTime);
      this.metrics.lastRunDuration = Date.now() - startTime;
      this.metrics.servicesDeleted = result.servicesDeleted;
      this.metrics.dependenciesDeleted = result.dependenciesDeleted;
      this.metrics.totalRuns++;
      this.metrics.totalServicesDeleted += result.servicesDeleted;
      this.metrics.totalDependenciesDeleted += result.dependenciesDeleted;
      
      // Set next run time
      if (this.intervalId) {
        this.metrics.nextRunTime = new Date(Date.now() + (this.config.intervalHours * 60 * 60 * 1000));
      }

      this.log('Cleanup run completed', {
        duration: result.duration,
        servicesDeleted: result.servicesDeleted,
        dependenciesDeleted: result.dependenciesDeleted,
        staleServicesFound: result.staleServices.length
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.metrics.lastError = errorMessage;
      this.log('Cleanup run failed', { error: errorMessage });
      throw error;

    } finally {
      this.isRunning = false;
      this.metrics.isRunning = false;
    }
  }

  /**
   * Perform the actual cleanup operations
   */
  private async performCleanup(): Promise<CleanupResult> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      const startTime = Date.now();
      const cutoffTime = new Date(Date.now() - (this.config.ttlHours * 60 * 60 * 1000));

      // Find stale services
      const staleServicesResult = await client.query(`
        SELECT 
          service_namespace,
          service_name,
          last_seen,
          EXTRACT(EPOCH FROM (NOW() - last_seen)) / 86400 as days_stale
        FROM services
        WHERE last_seen < $1
        ORDER BY last_seen ASC
        LIMIT $2
      `, [cutoffTime, this.config.maxServicesPerRun]);

      const staleServices = staleServicesResult.rows.map(row => ({
        service_namespace: row.service_namespace,
        service_name: row.service_name,
        last_seen: new Date(row.last_seen),
        days_stale: Math.floor(parseFloat(row.days_stale))
      }));

      if (staleServices.length === 0) {
        await client.query('COMMIT');
        return {
          servicesDeleted: 0,
          dependenciesDeleted: 0,
          duration: Date.now() - startTime,
          staleServices: []
        };
      }

      this.log(`Found ${staleServices.length} stale services`, {
        oldestService: staleServices[0],
        cutoffTime: cutoffTime.toISOString()
      });

      let servicesDeleted = 0;
      let dependenciesDeleted = 0;

      if (!this.config.dryRun) {
        // Delete service dependencies first (cascading cleanup)
        for (const service of staleServices) {
          // Delete dependencies where this service is the source
          const depFromResult = await client.query(`
            DELETE FROM service_dependencies 
            WHERE from_service_namespace = $1 AND from_service_name = $2
          `, [service.service_namespace, service.service_name]);

          // Delete dependencies where this service is the target
          const depToResult = await client.query(`
            DELETE FROM service_dependencies 
            WHERE to_service_namespace = $1 AND to_service_name = $2
          `, [service.service_namespace, service.service_name]);

          dependenciesDeleted += depFromResult.rowCount || 0;
          dependenciesDeleted += depToResult.rowCount || 0;

          this.log(`Cleaned dependencies for service`, {
            service: `${service.service_namespace}::${service.service_name}`,
            dependenciesFromDeleted: depFromResult.rowCount || 0,
            dependenciesToDeleted: depToResult.rowCount || 0
          });
        }

        // Delete the stale services
        for (const service of staleServices) {
          const serviceResult = await client.query(`
            DELETE FROM services 
            WHERE service_namespace = $1 AND service_name = $2
          `, [service.service_namespace, service.service_name]);

          servicesDeleted += serviceResult.rowCount || 0;

          this.log(`Deleted stale service`, {
            service: `${service.service_namespace}::${service.service_name}`,
            lastSeen: service.last_seen.toISOString(),
            daysStale: service.days_stale
          });
        }

        await client.query('COMMIT');
        this.log('Cleanup transaction committed');

      } else {
        await client.query('ROLLBACK');
        this.log('DRY RUN: Would have deleted services and dependencies', {
          servicesWouldDelete: staleServices.length,
          oldestStaleService: staleServices[0]
        });
      }

      return {
        servicesDeleted,
        dependenciesDeleted,
        duration: Date.now() - startTime,
        staleServices
      };

    } catch (error) {
      await client.query('ROLLBACK');
      this.log('Cleanup transaction rolled back due to error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;

    } finally {
      client.release();
    }
  }

  /**
   * Clean up orphaned dependencies (dependencies pointing to non-existent services)
   */
  async cleanupOrphanedDependencies(): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        DELETE FROM service_dependencies sd
        WHERE NOT EXISTS (
          SELECT 1 FROM services s 
          WHERE s.service_namespace = sd.to_service_namespace 
          AND s.service_name = sd.to_service_name
        )
        OR NOT EXISTS (
          SELECT 1 FROM services s 
          WHERE s.service_namespace = sd.from_service_namespace 
          AND s.service_name = sd.from_service_name
        )
      `);

      const deletedCount = result.rowCount || 0;
      
      if (deletedCount > 0) {
        this.log(`Cleaned up ${deletedCount} orphaned dependencies`);
      }

      return deletedCount;

    } finally {
      client.release();
    }
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<{
    totalServices: number;
    staleServices: number;
    totalDependencies: number;
    orphanedDependencies: number;
    oldestService: { service: string; last_seen: Date; days_stale: number } | null;
  }> {
    const client = await this.pool.connect();
    
    try {
      const cutoffTime = new Date(Date.now() - (this.config.ttlHours * 60 * 60 * 1000));

      // Get total services count
      const totalServicesResult = await client.query('SELECT COUNT(*) as count FROM services');
      const totalServices = parseInt(totalServicesResult.rows[0].count);

      // Get stale services count
      const staleServicesResult = await client.query(
        'SELECT COUNT(*) as count FROM services WHERE last_seen < $1',
        [cutoffTime]
      );
      const staleServices = parseInt(staleServicesResult.rows[0].count);

      // Get total dependencies count
      const totalDepsResult = await client.query('SELECT COUNT(*) as count FROM service_dependencies');
      const totalDependencies = parseInt(totalDepsResult.rows[0].count);

      // Get orphaned dependencies count
      const orphanedDepsResult = await client.query(`
        SELECT COUNT(*) as count FROM service_dependencies sd
        WHERE NOT EXISTS (
          SELECT 1 FROM services s 
          WHERE s.service_namespace = sd.to_service_namespace 
          AND s.service_name = sd.to_service_name
        )
        OR NOT EXISTS (
          SELECT 1 FROM services s 
          WHERE s.service_namespace = sd.from_service_namespace 
          AND s.service_name = sd.from_service_name
        )
      `);
      const orphanedDependencies = parseInt(orphanedDepsResult.rows[0].count);

      // Get oldest service
      const oldestServiceResult = await client.query(`
        SELECT 
          service_namespace || '::' || service_name as service,
          last_seen,
          EXTRACT(EPOCH FROM (NOW() - last_seen)) / 86400 as days_stale
        FROM services 
        ORDER BY last_seen ASC 
        LIMIT 1
      `);

      let oldestService: { service: string; last_seen: Date; days_stale: number } | null = null;
      if (oldestServiceResult.rows.length > 0) {
        const row = oldestServiceResult.rows[0];
        oldestService = {
          service: row.service,
          last_seen: new Date(row.last_seen),
          days_stale: Math.floor(parseFloat(row.days_stale))
        };
      }

      return {
        totalServices,
        staleServices,
        totalDependencies,
        orphanedDependencies,
        oldestService
      };

    } finally {
      client.release();
    }
  }

  /**
   * Logging helper
   */
  private log(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      service: 'ServiceCleanup',
      message,
      ...data
    };
    
    console.log(`[${timestamp}] ServiceCleanup: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}