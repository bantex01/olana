import { Pool, PoolClient } from 'pg';
import { ParsedAlert } from './alertmanager';
import { getAlertmanagerConfig, shouldLabelBecomeTag, labelNameToTagName } from '../config/alertmanager';
import { ServiceUpdateData } from './serviceManager';
import { upsertService } from './serviceManager';
import { Logger } from './logger';

export interface AutoCreatedService {
  service_namespace: string;
  service_name: string;
  environment: string;
  team: string;
  component_type: string;
  tags: string[];
  tag_sources?: Record<string, string>; // Make it optional for backward compatibility
  created_from_alert: boolean;
}

export async function ensureServiceExists(
  client: PoolClient,
  alert: ParsedAlert,
  alertLabels: Record<string, string> = {},
  logger?: Logger
): Promise<{ existed: boolean; created: boolean; tagChanges: string[] }> {
  try {
    const logData = {
      service: `${alert.serviceNamespace}::${alert.serviceName}`,
      severity: alert.severity,
      labelsCount: Object.keys(alertLabels).length
    };
    if (logger) {
      logger.info(logData, 'Ensuring service exists from alert');
    } else {
      console.log('Ensuring service exists from alert', logData);
    }

    // Convert alert to ServiceUpdateData format
    const serviceUpdate = alertToServiceUpdateData(alert, alertLabels);
    
    // Use unified upsert with tag merging
    const upsertResult = await upsertService(client, serviceUpdate, logger);
    
    const completionData = {
      service: `${alert.serviceNamespace}::${alert.serviceName}`,
      created: upsertResult.created,
      updated: upsertResult.updated,
      tagChanges: upsertResult.tagChanges
    };
    if (logger) {
      logger.info(completionData, 'Alert-based service upsert completed');
    } else {
      console.log('Alert-based service upsert completed', completionData);
    }

    return {
      existed: !upsertResult.created,
      created: upsertResult.created,
      tagChanges: upsertResult.tagChanges
    };

  } catch (error) {
    if (logger) {
      logger.error({ error }, 'Error ensuring service exists');
    } else {
      console.error('Error ensuring service exists:', error);
    }
    throw error;
  }
}
function createServiceFromAlert(alert: ParsedAlert): AutoCreatedService {
  // Infer environment from namespace or default
  const environment = inferEnvironmentFromNamespace(alert.serviceNamespace);
  
  // Create basic service record with alert-derived metadata
  return {
    service_namespace: alert.serviceNamespace,
    service_name: alert.serviceName,
    environment: environment,
    team: 'unknown', // Will be filled in when services are properly instrumented
    component_type: inferComponentTypeFromServiceName(alert.serviceName),
    tags: generateTagsFromAlert(alert).tags,
    created_from_alert: true
  };
}

function createServiceFromAlertWithLabels(alert: ParsedAlert, alertLabels: Record<string, string>): AutoCreatedService & { tag_sources: Record<string, string> } {
  // Infer environment from namespace or default
  const environment = inferEnvironmentFromNamespace(alert.serviceNamespace);
  
  // Generate tags and tag sources using enhanced logic
  const { tags, tagSources } = generateTagsFromAlert(alert, alertLabels);
  
  // Create basic service record with alert-derived metadata
  return {
    service_namespace: alert.serviceNamespace,
    service_name: alert.serviceName,
    environment: environment,
    team: 'unknown', // Will be filled in when services are properly instrumented
    component_type: inferComponentTypeFromServiceName(alert.serviceName),
    tags: tags,
    tag_sources: tagSources,
    created_from_alert: true
  };
}

function inferEnvironmentFromNamespace(namespace: string): string {
  const lowerNamespace = namespace.toLowerCase();
  
  // Only return specific environment if explicitly named
  if (lowerNamespace.includes('prod') || lowerNamespace.includes('production')) {
    return 'production';
  }
  if (lowerNamespace.includes('stag') || lowerNamespace.includes('staging')) {
    return 'staging';
  }
  if (lowerNamespace.includes('dev') || lowerNamespace.includes('development')) {
    return 'development';
  }
  if (lowerNamespace.includes('test') || lowerNamespace.includes('testing')) {
    return 'testing';
  }
  
  // Default to unknown instead of assuming production
  return 'unknown';
}

function inferComponentTypeFromServiceName(serviceName: string): string {
  const lowerServiceName = serviceName.toLowerCase();
  
  // Database patterns
  if (lowerServiceName.includes('db') || 
      lowerServiceName.includes('database') || 
      lowerServiceName.includes('postgres') || 
      lowerServiceName.includes('mysql') || 
      lowerServiceName.includes('redis') || 
      lowerServiceName.includes('mongo')) {
    return 'database';
  }
  
  // Gateway/proxy patterns
  if (lowerServiceName.includes('gateway') || 
      lowerServiceName.includes('proxy') || 
      lowerServiceName.includes('nginx') || 
      lowerServiceName.includes('envoy')) {
    return 'gateway';
  }
  
  // Queue/messaging patterns
  if (lowerServiceName.includes('queue') || 
      lowerServiceName.includes('kafka') || 
      lowerServiceName.includes('rabbitmq') || 
      lowerServiceName.includes('message')) {
    return 'queue';
  }
  
  // Default to service
  return 'service';
}

function generateTagsFromAlert(alert: ParsedAlert, alertLabels: Record<string, string> = {}): { tags: string[], tagSources: Record<string, string> } {
  const tags: string[] = [];
  const tagSources: Record<string, string> = {};
  const config = getAlertmanagerConfig();
  
  // Always add the alertmanager-created tag
  tags.push('alertmanager-created');
  tagSources['alertmanager-created'] = 'alertmanager';
  
  // Add severity-based tag for high priority alerts
  if (alert.severity === 'critical' || alert.severity === 'fatal') {
    tags.push('high-priority');
    tagSources['high-priority'] = 'alertmanager';
  }
  
  // Only add environment tag if explicitly identifiable (not 'unknown')
  const environment = inferEnvironmentFromNamespace(alert.serviceNamespace);
  if (environment !== 'unknown') {
    tags.push(environment);
    tagSources[environment] = 'alertmanager';
  }
  
  // Add component type tag if not default 'service'
  const componentType = inferComponentTypeFromServiceName(alert.serviceName);
  if (componentType !== 'service') {
    tags.push(componentType);
    tagSources[componentType] = 'alertmanager';
  }

  // NEW: Extract tags from alert labels using allowlist
  let extractedCount = 0;
  for (const [labelName, labelValue] of Object.entries(alertLabels)) {
    // Check if we've hit the max tags limit
    if (extractedCount >= config.tagConfig.maxTagsPerAlert) {
      // Max tags limit reached - this is debug info only, no need to log
      break;
    }

    // Skip empty values
    if (!labelValue || labelValue.trim() === '') {
      continue;
    }

    // Check if this label should become a tag
    if (shouldLabelBecomeTag(labelName, config.tagConfig)) {
      const tagName = labelNameToTagName(labelName, labelValue.trim(), config.tagConfig);
      
      // Avoid duplicates
      if (!tags.includes(tagName)) {
        tags.push(tagName);
        tagSources[tagName] = 'alertmanager';
        extractedCount++;
        
        // Tag extracted successfully
      }
    } else {
      // Label not in allowlist - skipped
    }
  }

  // Tags generated from alert - debug info available if needed

  return { tags, tagSources };
}

export async function getServiceCreationStats(pool: Pool): Promise<{
  totalServices: number;
  alertCreatedServices: number;
  otelCreatedServices: number;
}> {
  const client = await pool.connect();
  
  try {
    // Get total services
    const totalResult = await client.query('SELECT COUNT(*) as count FROM services');
    const totalServices = parseInt(totalResult.rows[0].count);
    
    // Get alert-created services (those with alertmanager-created tag)
    const alertCreatedResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM services 
      WHERE 'alertmanager-created' = ANY(tags)
    `);
    const alertCreatedServices = parseInt(alertCreatedResult.rows[0].count);
    
    const otelCreatedServices = totalServices - alertCreatedServices;
    
    return {
      totalServices,
      alertCreatedServices,
      otelCreatedServices
    };
    
  } finally {
    client.release();
  }
}

/**
 * Convert parsed alert and labels to ServiceUpdateData format
 */
export function alertToServiceUpdateData(
  alert: ParsedAlert, 
  alertLabels: Record<string, string> = {}
): ServiceUpdateData {
  const { tags } = generateTagsFromAlert(alert, alertLabels);
  
  return {
    service_namespace: alert.serviceNamespace,
    service_name: alert.serviceName,
    environment: inferEnvironmentFromNamespace(alert.serviceNamespace),
    team: 'unknown', // Will be updated when proper instrumentation is added
    component_type: inferComponentTypeFromServiceName(alert.serviceName),
    tags: tags,
    source: 'alertmanager'
  };
}