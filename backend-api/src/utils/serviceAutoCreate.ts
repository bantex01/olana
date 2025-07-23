import { Pool, PoolClient } from 'pg';
import { ParsedAlert } from './alertmanager';

export interface AutoCreatedService {
  service_namespace: string;
  service_name: string;
  environment: string;
  team: string;
  component_type: string;
  tags: string[];
  created_from_alert: boolean;
}

export async function ensureServiceExists(
  client: PoolClient,
  alert: ParsedAlert
): Promise<{ existed: boolean; created: boolean }> {
  try {
    // Check if service already exists
    const existsResult = await client.query(`
      SELECT service_namespace, service_name, created_at 
      FROM services 
      WHERE service_namespace = $1 AND service_name = $2
    `, [alert.serviceNamespace, alert.serviceName]);

    if (existsResult.rows.length > 0) {
      // Service exists, just update last_seen
      await client.query(`
        UPDATE services 
        SET last_seen = NOW()
        WHERE service_namespace = $1 AND service_name = $2
      `, [alert.serviceNamespace, alert.serviceName]);

      console.log(`Service exists: ${alert.serviceNamespace}::${alert.serviceName}`);
      return { existed: true, created: false };
    }

    // Service doesn't exist, create it
    const newService = createServiceFromAlert(alert);
    
    await client.query(`
      INSERT INTO services (
        service_namespace, 
        service_name, 
        environment, 
        team, 
        component_type, 
        tags, 
        last_seen,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    `, [
      newService.service_namespace,
      newService.service_name,
      newService.environment,
      newService.team,
      newService.component_type,
      newService.tags
    ]);

    console.log(`Auto-created service: ${alert.serviceNamespace}::${alert.serviceName}`);
    return { existed: false, created: true };

  } catch (error) {
    console.error('Error ensuring service exists:', error);
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
    tags: generateTagsFromAlert(alert),
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

function generateTagsFromAlert(alert: ParsedAlert): string[] {
  const tags: string[] = [];
  
  // Add source tag
  tags.push('alertmanager-created');
  
  // Add severity-based tag
  if (alert.severity === 'critical' || alert.severity === 'fatal') {
    tags.push('high-priority');
  }
  
  // Only add environment tag if explicitly identifiable (not 'unknown')
  const environment = inferEnvironmentFromNamespace(alert.serviceNamespace);
  if (environment !== 'unknown') {
    tags.push(environment);
  }
  
  // Add component type tag
  const componentType = inferComponentTypeFromServiceName(alert.serviceName);
  if (componentType !== 'service') {
    tags.push(componentType);
  }
  
  return tags;
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