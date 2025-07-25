export interface AlertmanagerTagConfig {
  // Specific label names that should become tags
  allowedLabels: string[];
  
  // Label prefixes that should become tags (e.g., 'service_' matches 'service_team', 'service_owner')
  prefixPatterns: string[];
  
  // Maximum number of tags to extract from a single alert (prevent tag explosion)
  maxTagsPerAlert: number;
  
  // Whether to preserve the original label name as tag key or transform it
  preserveLabelNames: boolean;
}

export interface AlertmanagerConfig {
  defaultNamespace: string;
  webhookEnabled: boolean;
  tagConfig: AlertmanagerTagConfig;
}

export function getAlertmanagerConfig(): AlertmanagerConfig {
  // Parse allowed labels from comma-separated env var
  const allowedLabelsStr = process.env.ALERTMANAGER_ALLOWED_TAG_LABELS || 
    'team,component,owner,environment,cluster,region';
  const allowedLabels = allowedLabelsStr.split(',').map(label => label.trim()).filter(Boolean);

  // Parse prefix patterns from comma-separated env var
  const prefixPatternsStr = process.env.ALERTMANAGER_TAG_PREFIX_PATTERNS || 'service_,app_';
  const prefixPatterns = prefixPatternsStr.split(',').map(pattern => pattern.trim()).filter(Boolean);

  // Parse max tags limit
  const maxTagsPerAlert = parseInt(process.env.ALERTMANAGER_MAX_TAGS_FROM_ALERTS || '10');

  return {
    defaultNamespace: process.env.ALERTMANAGER_DEFAULT_NAMESPACE || 'default',
    webhookEnabled: process.env.ALERTMANAGER_WEBHOOK_ENABLED !== 'false',
    tagConfig: {
      allowedLabels,
      prefixPatterns,
      maxTagsPerAlert: isNaN(maxTagsPerAlert) ? 10 : maxTagsPerAlert,
      preserveLabelNames: process.env.ALERTMANAGER_PRESERVE_LABEL_NAMES !== 'false'
    }
  };
}

// Helper function to check if a label should become a tag
export function shouldLabelBecomeTag(
  labelName: string, 
  tagConfig: AlertmanagerTagConfig
): boolean {
  // Check exact matches first
  if (tagConfig.allowedLabels.includes(labelName)) {
    return true;
  }

  // Check prefix patterns
  for (const prefix of tagConfig.prefixPatterns) {
    if (labelName.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}

// Helper function to transform label name to tag name
export function labelNameToTagName(
  labelName: string, 
  labelValue: string,
  tagConfig: AlertmanagerTagConfig
): string {
  if (tagConfig.preserveLabelNames) {
    // Keep original label name: "team" -> "team:payments"
    return `${labelName}:${labelValue}`;
  } else {
    // For prefix patterns, might want to remove the prefix
    for (const prefix of tagConfig.prefixPatterns) {
      if (labelName.startsWith(prefix)) {
        const cleanName = labelName.substring(prefix.length);
        return `${cleanName}:${labelValue}`;
      }
    }
    
    // For allowed labels, keep the original format
    return `${labelName}:${labelValue}`;
  }
}