export interface AlertmanagerConfig {
  defaultNamespace: string;
  webhookEnabled: boolean;
}

export function getAlertmanagerConfig(): AlertmanagerConfig {
  return {
    defaultNamespace: process.env.ALERTMANAGER_DEFAULT_NAMESPACE || 'default',
    webhookEnabled: process.env.ALERTMANAGER_WEBHOOK_ENABLED !== 'false'
  };
}