import { validateAlertLabels, validateParsedAlert, sanitizeParsedAlert } from './validation';

export interface AlertmanagerAlert {
  status: 'firing' | 'resolved';
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: string;
  endsAt: string;
  generatorURL?: string;
}

export interface AlertmanagerWebhook {
  receiver: string;
  status: 'firing' | 'resolved';
  alerts: AlertmanagerAlert[];
  groupLabels: Record<string, string>;
  commonLabels: Record<string, string>;
  commonAnnotations: Record<string, string>;
  externalURL: string;
}

export interface ParsedAlert {
  serviceName: string;
  serviceNamespace: string;
  instanceId: string;
  severity: 'fatal' | 'critical' | 'warning' | 'none';
  message: string;
  status: 'firing' | 'resolved';
  externalAlertId: string;
  startsAt: Date;
  endsAt?: Date;
}

export function parseAlertmanagerAlert(
  alert: AlertmanagerAlert, 
  defaultNamespace: string
): ParsedAlert | null {
  const { labels, annotations, status, startsAt, endsAt } = alert;

  // Pre-validate labels
  const labelValidation = validateAlertLabels(labels);
  if (!labelValidation.isValid) {
    console.warn('Alert failed label validation:', labelValidation.errors);
    return null;
  }

  // Log warnings
  if (labelValidation.warnings.length > 0) {
    console.warn('Alert label warnings:', labelValidation.warnings);
  }

  // Extract required service_name with fallback priority
  const serviceName = labels.service_name || labels.service || labels.job;
  if (!serviceName) {
    console.warn('Alert missing required service identifier:', Object.keys(labels));
    return null;
  }

  // Extract optional service_namespace with fallback, ensure not empty
  let serviceNamespace = labels.service_namespace || labels.namespace || defaultNamespace;
  if (!serviceNamespace || serviceNamespace.trim() === '') {
    serviceNamespace = defaultNamespace;
    console.log(`Using default namespace '${defaultNamespace}' for service '${serviceName}'`);
  }

  // Extract instance ID with fallback
  const instanceId = labels.service_instance || labels.instance || '';

  // Extract and map severity with fallback
  const severity = mapSeverity(labels.severity || 'warning');

  // Extract message from annotations or labels with fallback
  const message = extractMessage(annotations, labels);

  // Create external alert ID from labels
  const externalAlertId = createExternalAlertId(labels);

  // Create parsed alert
  const parsedAlert: ParsedAlert = {
    serviceName,
    serviceNamespace,
    instanceId,
    severity,
    message,
    status,
    externalAlertId,
    startsAt: new Date(startsAt),
    endsAt: endsAt && endsAt !== '0001-01-01T00:00:00Z' ? new Date(endsAt) : undefined
  };

  // Validate parsed alert
  const validation = validateParsedAlert(parsedAlert);
  if (!validation.isValid) {
    console.warn('Parsed alert failed validation:', validation.errors);
    return null;
  }

  // Log warnings
  if (validation.warnings.length > 0) {
    console.warn('Parsed alert warnings:', validation.warnings);
  }

  // Sanitize and return
  return sanitizeParsedAlert(parsedAlert);
}

function mapSeverity(alertmanagerSeverity: string): 'fatal' | 'critical' | 'warning' | 'none' {
  const severity = alertmanagerSeverity.toLowerCase();
  
  switch (severity) {
    case 'critical':
      return 'critical';
    case 'warning':
      return 'warning';
    case 'fatal':
    case 'emergency':
      return 'fatal';
    case 'info':
    case 'none':
      return 'none';
    default:
      return 'warning'; // Default fallback
  }
}

function extractMessage(annotations: Record<string, string>, labels: Record<string, string>): string {
  // Priority order for message extraction
  return annotations.summary || 
         annotations.description || 
         annotations.message ||
         labels.alertname ||
         labels.alert ||
         'Alertmanager alert';
}

function createExternalAlertId(labels: Record<string, string>): string {
  // Create a unique ID from key labels
  const alertname = labels.alertname || labels.alert || 'unknown';
  const instance = labels.instance || labels.service_instance || 'unknown';
  const timestamp = Date.now();
  
  return `alertmanager-${alertname}-${instance}-${timestamp}`;
}

export function parseAlertmanagerWebhook(
  webhook: AlertmanagerWebhook,
  defaultNamespace: string
): ParsedAlert[] {
  const parsedAlerts: ParsedAlert[] = [];

  for (const alert of webhook.alerts) {
    const parsed = parseAlertmanagerAlert(alert, defaultNamespace);
    if (parsed) {
      parsedAlerts.push(parsed);
    } else {
      console.warn('Skipped alert due to missing required fields');
    }
  }

  console.log(`Parsed ${parsedAlerts.length} of ${webhook.alerts.length} alerts`);
  return parsedAlerts;
}