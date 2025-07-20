export interface ServiceCleanupConfig {
  ttlHours: number;
  intervalHours: number;
  enabled: boolean;
  maxServicesPerRun: number;
  dryRun: boolean;
}

export function getCleanupConfig(): ServiceCleanupConfig {
  return {
    ttlHours: parseFloat(process.env.SERVICE_TTL_HOURS || '168'), // 7 days default
    intervalHours: parseFloat(process.env.CLEANUP_INTERVAL_HOURS || '24'), // Daily default
    enabled: process.env.ENABLE_AUTO_CLEANUP !== 'false', // Default enabled
    maxServicesPerRun: parseInt(process.env.MAX_SERVICES_TO_DELETE_PER_RUN || '1000'),
    dryRun: process.env.CLEANUP_DRY_RUN === 'true' // Default false
  };
}