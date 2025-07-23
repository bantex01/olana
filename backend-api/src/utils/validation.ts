import { ParsedAlert } from './alertmanager';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationConfig {
  requiredLabels: string[];
  allowedSeverities: string[];
  maxMessageLength: number;
  maxInstanceIdLength: number;
}

export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  requiredLabels: ['service_name'], // Only service_name is truly required
  allowedSeverities: ['fatal', 'critical', 'warning', 'none'],
  maxMessageLength: 1000,
  maxInstanceIdLength: 255
};

export function validateParsedAlert(
  alert: ParsedAlert, 
  config: ValidationConfig = DEFAULT_VALIDATION_CONFIG
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate service name
  if (!alert.serviceName || alert.serviceName.trim() === '') {
    errors.push('service_name is required and cannot be empty');
  } else if (alert.serviceName.length > 255) {
    errors.push('service_name exceeds maximum length of 255 characters');
  }

  // Validate service namespace
  if (!alert.serviceNamespace || alert.serviceNamespace.trim() === '') {
    warnings.push('service_namespace is empty, using default');
  } else if (alert.serviceNamespace.length > 255) {
    errors.push('service_namespace exceeds maximum length of 255 characters');
  }

  // Validate severity
  if (!config.allowedSeverities.includes(alert.severity)) {
    errors.push(`Invalid severity '${alert.severity}'. Allowed: ${config.allowedSeverities.join(', ')}`);
  }

  // Validate message
  if (!alert.message || alert.message.trim() === '') {
    warnings.push('Alert message is empty or missing');
  } else if (alert.message.length > config.maxMessageLength) {
    warnings.push(`Message truncated to ${config.maxMessageLength} characters`);
  }

  // Validate instance ID length
  if (alert.instanceId.length > config.maxInstanceIdLength) {
    errors.push(`instance_id exceeds maximum length of ${config.maxInstanceIdLength} characters`);
  }

  // Validate status
  if (!['firing', 'resolved'].includes(alert.status)) {
    errors.push(`Invalid status '${alert.status}'. Must be 'firing' or 'resolved'`);
  }

  // Validate timestamps
  if (alert.endsAt && alert.endsAt <= alert.startsAt) {
    warnings.push('Alert end time is before or equal to start time');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function sanitizeParsedAlert(alert: ParsedAlert): ParsedAlert {
  return {
    ...alert,
    serviceName: alert.serviceName.trim(),
    serviceNamespace: alert.serviceNamespace.trim(),
    instanceId: alert.instanceId.trim(),
    message: alert.message.trim().substring(0, DEFAULT_VALIDATION_CONFIG.maxMessageLength),
    // Ensure external alert ID is reasonable length
    externalAlertId: alert.externalAlertId.substring(0, 255)
  };
}

export function validateAlertLabels(labels: Record<string, string>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for service identification
  const hasServiceName = labels.service_name || labels.service || labels.job;
  if (!hasServiceName) {
    errors.push('Missing required service identifier: must have service_name, service, or job label');
  }

  // Check for severity
  if (!labels.severity) {
    warnings.push('No severity label found, will default to "warning"');
  }

  // Check for instance information
  if (!labels.service_instance && !labels.instance) {
    warnings.push('No instance label found, instance_id will be empty');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}