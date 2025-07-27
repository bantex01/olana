import crypto from 'crypto';

/**
 * Alert fingerprinting for incident grouping
 * 
 * Generates a unique fingerprint for alerts that should be grouped together.
 * Same fingerprint = same logical alert type that can have multiple incidents over time.
 */

export interface AlertIdentity {
  serviceNamespace: string;
  serviceName: string;
  instanceId: string;
  severity: string;
  message: string;
}

/**
 * Generate a fingerprint hash for alert grouping
 * 
 * This determines what constitutes "the same alert" - alerts with the same
 * fingerprint can have multiple incidents over time.
 * 
 * Note: Severity IS included in the fingerprint, so WARNING vs CRITICAL
 * are treated as different alert types (good for SLI burn rate alerts).
 */
export function generateAlertFingerprint(identity: AlertIdentity): string {
  const {
    serviceNamespace,
    serviceName,
    instanceId,
    severity,
    message
  } = identity;

  // Normalize inputs for consistent hashing
  const normalizedContent = [
    serviceNamespace.trim().toLowerCase(),
    serviceName.trim().toLowerCase(), 
    instanceId.trim().toLowerCase(),
    severity.trim().toLowerCase(),
    normalizeMessage(message)
  ].join('::');

  // Generate SHA256 hash and take first 64 characters for storage efficiency
  return crypto
    .createHash('sha256')
    .update(normalizedContent)
    .digest('hex')
    .substring(0, 64);
}

/**
 * Normalize alert message for consistent fingerprinting
 * 
 * This handles cases where Alertmanager might send slightly different
 * message formatting for the same underlying alert.
 */
function normalizeMessage(message: string): string {
  return message
    .trim()
    .toLowerCase()
    // Remove multiple whitespace
    .replace(/\s+/g, ' ')
    // Remove common variable parts that shouldn't affect grouping
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*?Z/g, '[TIMESTAMP]') // ISO timestamps
    .replace(/\d+(\.\d+)?%/g, '[PERCENTAGE]') // Percentages
    .replace(/\d+(\.\d+)?(ms|s|m|h|d)/g, '[DURATION]') // Durations
    .replace(/\d+(\.\d+)?(kb|mb|gb|tb)/gi, '[SIZE]') // File sizes
    .replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '[IP]') // IP addresses
    .replace(/\b\d+\b/g, '[NUMBER]'); // Generic numbers
}

/**
 * Create a human-readable identifier for debugging
 */
export function createAlertDisplayId(identity: AlertIdentity): string {
  const { serviceNamespace, serviceName, instanceId, severity, message } = identity;
  
  const instancePart = instanceId ? ` (${instanceId})` : '';
  const messagePart = message.length > 50 ? message.substring(0, 50) + '...' : message;
  
  return `${serviceNamespace}::${serviceName}${instancePart} [${severity}] ${messagePart}`;
}

/**
 * Validate alert identity before fingerprinting
 */
export function validateAlertIdentity(identity: AlertIdentity): { 
  isValid: boolean; 
  errors: string[] 
} {
  const errors: string[] = [];

  if (!identity.serviceNamespace || identity.serviceNamespace.trim() === '') {
    errors.push('service_namespace is required');
  }

  if (!identity.serviceName || identity.serviceName.trim() === '') {
    errors.push('service_name is required');
  }

  if (!identity.severity || identity.severity.trim() === '') {
    errors.push('severity is required');
  }

  const validSeverities = ['fatal', 'critical', 'warning', 'none'];
  if (identity.severity && !validSeverities.includes(identity.severity.toLowerCase())) {
    errors.push(`severity must be one of: ${validSeverities.join(', ')}`);
  }

  if (!identity.message || identity.message.trim() === '') {
    errors.push('message is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Extract alert identity from various input formats
 */
export function extractAlertIdentity(alert: {
  service_namespace?: string;
  service_name?: string;
  instance_id?: string;
  severity?: string;
  message?: string;
  // Also support ProcessedAlert format
  serviceNamespace?: string;
  serviceName?: string;
  instanceId?: string;
}): AlertIdentity {
  return {
    serviceNamespace: alert.serviceNamespace || alert.service_namespace || '',
    serviceName: alert.serviceName || alert.service_name || '',
    instanceId: alert.instanceId || alert.instance_id || '',
    severity: alert.severity || 'warning',
    message: alert.message || ''
  };
}