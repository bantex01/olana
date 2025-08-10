import { PoolClient } from 'pg';
import { Logger } from './logger';

// Types for different service update sources
export type ServiceSource = 'otel' | 'alertmanager' | 'user';

// Priority order: user > alertmanager > otel
const SOURCE_PRIORITY: Record<ServiceSource, number> = {
  user: 3,
  alertmanager: 2,
  otel: 1
};

export interface ServiceUpdateData {
  service_namespace: string;
  service_name: string;
  environment?: string;
  team?: string;
  component_type?: string;
  tags?: string[];
  external_calls?: any[];
  database_calls?: any[];
  rpc_calls?: any[];
  source: ServiceSource;
}

export interface ServiceRecord {
  service_namespace: string;
  service_name: string;
  environment: string;
  team: string;
  component_type: string;
  tags: string[];
  tag_sources: Record<string, string>;
  external_calls: any[];
  database_calls: any[];
  rpc_calls: any[];
  created_at: Date;
  last_seen: Date;
}

/**
 * Unified service upsert function with intelligent tag merging
 * Handles priority resolution: user > alertmanager > otel
 */
export async function upsertService(
  client: PoolClient,
  updateData: ServiceUpdateData,
  logger?: Logger
): Promise<{ created: boolean; updated: boolean; tagChanges: string[] }> {
  const serviceKey = `${updateData.service_namespace}::${updateData.service_name}`;
  
  try {
    // Check if service exists
    const existingResult = await client.query(`
      SELECT 
        service_namespace, service_name, environment, team, component_type,
        tags, tag_sources, external_calls, database_calls, rpc_calls,
        created_at, last_seen
      FROM services 
      WHERE service_namespace = $1 AND service_name = $2
    `, [updateData.service_namespace, updateData.service_name]);

    if (existingResult.rows.length === 0) {
      // Service doesn't exist - create new one
      return await createNewService(client, updateData, logger);
    } else {
      // Service exists - merge and update
      const existing = existingResult.rows[0];
      return await updateExistingService(client, existing, updateData, logger);
    }

  } catch (error) {
    const errorData = {
      service: serviceKey,
      source: updateData.source,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    if (logger) {
      logger.error(errorData, 'Error upserting service');
    } else {
      console.error('Error upserting service:', errorData);
    }
    throw error;
  }
}

/**
 * Create a new service record
 */
async function createNewService(
  client: PoolClient,
  updateData: ServiceUpdateData,
  logger?: Logger
): Promise<{ created: boolean; updated: boolean; tagChanges: string[] }> {
  const serviceKey = `${updateData.service_namespace}::${updateData.service_name}`;
  
  // For new services, all provided tags get the source attribution
  const tagSources: Record<string, string> = {};
  const tags = updateData.tags || [];
  
  tags.forEach(tag => {
    tagSources[tag] = updateData.source;
  });

  const logData = {
    service: serviceKey,
    source: updateData.source,
    tags: tags,
    tagCount: tags.length
  };
  if (logger) {
    logger.info(logData, 'Creating new service');
  } else {
    console.log('Creating new service', logData);
  }

  await client.query(`
    INSERT INTO services (
      service_namespace, service_name, environment, team, component_type,
      tags, tag_sources, external_calls, database_calls, rpc_calls,
      last_seen, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
  `, [
    updateData.service_namespace,
    updateData.service_name,
    updateData.environment || 'unknown',
    updateData.team || 'unknown',
    updateData.component_type || 'service',
    tags,
    JSON.stringify(tagSources),
    JSON.stringify(updateData.external_calls || []),
    JSON.stringify(updateData.database_calls || []),
    JSON.stringify(updateData.rpc_calls || [])
  ]);

  return { 
    created: true, 
    updated: false, 
    tagChanges: tags.map(tag => `+${tag} (${updateData.source})`)
  };
}

/**
 * Update existing service with intelligent merging
 */
async function updateExistingService(
  client: PoolClient,
  existing: any,
  updateData: ServiceUpdateData,
  logger?: Logger
): Promise<{ created: boolean; updated: boolean; tagChanges: string[] }> {
  const serviceKey = `${updateData.service_namespace}::${updateData.service_name}`;
  
  // Parse existing tag sources
  const existingTagSources: Record<string, string> = 
    typeof existing.tag_sources === 'string' 
      ? JSON.parse(existing.tag_sources) 
      : existing.tag_sources || {};
  
  const existingTags: string[] = existing.tags || [];
  const newTags: string[] = updateData.tags || [];

  // Merge tags with priority resolution
  const { mergedTags, mergedTagSources, tagChanges } = mergeTagsWithPriority(
    existingTags,
    existingTagSources,
    newTags,
    updateData.source
  );

  // Determine what fields to update based on source priority and changes
  const updates = determineFieldUpdates(existing, updateData);

  const logData = {
    service: serviceKey,
    source: updateData.source,
    existingTagCount: existingTags.length,
    newTagCount: newTags.length,
    finalTagCount: mergedTags.length,
    tagChanges: tagChanges,
    fieldUpdates: Object.keys(updates)
  };
  if (logger) {
    logger.info(logData, 'Updating existing service');
  } else {
    console.log('Updating existing service', logData);
  }

  // Build dynamic update query
  const { query, params } = buildUpdateQuery(
    updateData.service_namespace,
    updateData.service_name,
    {
      ...updates,
      tags: mergedTags,
      tag_sources: JSON.stringify(mergedTagSources),
      last_seen: 'NOW()'
    }
  );

  await client.query(query, params);

  return { 
    created: false, 
    updated: true, 
    tagChanges 
  };
}

/**
 * Merge tags with priority resolution
 */
function mergeTagsWithPriority(
  existingTags: string[],
  existingTagSources: Record<string, string>,
  newTags: string[],
  newSource: ServiceSource
): {
  mergedTags: string[];
  mergedTagSources: Record<string, string>;
  tagChanges: string[];
} {
  const mergedTagSources = { ...existingTagSources };
  const tagSet = new Set<string>();
  const tagChanges: string[] = [];

  // Start with existing tags
  existingTags.forEach(tag => {
    tagSet.add(tag);
  });

  // Process new tags with priority logic
  newTags.forEach(tag => {
    const existingSource = existingTagSources[tag];
    
    if (!existingSource) {
      // New tag - just add it
      tagSet.add(tag);
      mergedTagSources[tag] = newSource;
      tagChanges.push(`+${tag} (${newSource})`);
      
    } else {
      // Tag exists - check priority
      const existingPriority = SOURCE_PRIORITY[existingSource as ServiceSource] || 0;
      const newPriority = SOURCE_PRIORITY[newSource];
      
      if (newPriority > existingPriority) {
        // New source has higher priority - update the source
        mergedTagSources[tag] = newSource;
        tagChanges.push(`~${tag} (${existingSource} → ${newSource})`);
      } else if (newPriority === existingPriority) {
        // Same priority - keep existing but note the refresh
        tagChanges.push(`=${tag} (${newSource} refresh)`);
      } else {
        // Lower priority - keep existing
        tagChanges.push(`-${tag} (${newSource} < ${existingSource})`);
      }
    }
  });

  // Remove tags that are no longer provided by their authoritative source
  // This handles cases where OTEL or alertmanager tags are removed upstream
  const tagsToRemove: string[] = [];
  existingTags.forEach(tag => {
    const tagSource = existingTagSources[tag];
    
    // If this tag came from the current update source but isn't in the new tags
    if (tagSource === newSource && !newTags.includes(tag)) {
      tagsToRemove.push(tag);
      tagSet.delete(tag);
      delete mergedTagSources[tag];
      tagChanges.push(`-${tag} (removed by ${newSource})`);
    }
  });

  return {
    mergedTags: Array.from(tagSet).sort(),
    mergedTagSources,
    tagChanges
  };
}

/**
 * Determine which fields should be updated based on source priority
 */
function determineFieldUpdates(
  existing: any,
  updateData: ServiceUpdateData
): Record<string, any> {
  const updates: Record<string, any> = {};

  // Always update these fields from any source (they're additive/latest-wins)
  if (updateData.external_calls !== undefined) {
    updates.external_calls = JSON.stringify(updateData.external_calls);
  }
  if (updateData.database_calls !== undefined) {
    updates.database_calls = JSON.stringify(updateData.database_calls);
  }
  if (updateData.rpc_calls !== undefined) {
    updates.rpc_calls = JSON.stringify(updateData.rpc_calls);
  }

  // For metadata fields, prefer higher priority sources
  // But allow any source to set 'unknown' values to something better
  
  if (updateData.environment && 
      (existing.environment === 'unknown' || updateData.source === 'user')) {
    updates.environment = updateData.environment;
  }

  if (updateData.team && 
      (existing.team === 'unknown' || updateData.source === 'user')) {
    updates.team = updateData.team;
  }

  if (updateData.component_type && 
      (existing.component_type === 'service' || updateData.source === 'user')) {
    updates.component_type = updateData.component_type;
  }

  return updates;
}

/**
 * Build dynamic UPDATE query
 */
function buildUpdateQuery(
  serviceNamespace: string,
  serviceName: string,
  updates: Record<string, any>
): { query: string; params: any[] } {
  const setClauses: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  // Add service identifiers as the last parameters
  const whereParams = [serviceNamespace, serviceName];

  for (const [field, value] of Object.entries(updates)) {
    if (value === 'NOW()') {
      setClauses.push(`${field} = NOW()`);
    } else {
      setClauses.push(`${field} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  const query = `
    UPDATE services 
    SET ${setClauses.join(', ')}
    WHERE service_namespace = $${paramIndex} AND service_name = $${paramIndex + 1}
  `;

  return {
    query,
    params: [...params, ...whereParams]
  };
}