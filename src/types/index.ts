export type Alert = {
  alert_id: number;
  service_namespace: string;
  service_name: string;
  instance_id: string;
  severity: 'fatal' | 'critical' | 'warning' | 'none';
  message: string;
  status: 'firing' | 'resolved';
  count: number;
  first_seen: string;
  last_seen: string;
  created_at: string;
  resolved_at: string | null;
  alert_source: string;
  external_alert_id: string;
};

export type Node = {
  id: string;
  label: string;
  color?: string;
  shape?: string;
  size?: number;
  team?: string;
  component_type?: string;
  environment?: string;
  nodeType?: string;
  tags?: string[];
  tagSources?: Record<string, string>;
  alertCount?: number;  // Added for backend-computed alert counts
  highestSeverity?: string;  // Added for backend-computed severity
  external_calls?: Array<{host: string; method?: string; path?: string; count: number}>;
  database_calls?: Array<{system: string; name?: string; host?: string; operation?: string; count: number}>;
  rpc_calls?: Array<{service: string; method?: string; count: number}>;
};

export type Edge = {
  id?: string;
  from: string;
  to: string;
  color?: any;
  width?: number;
  edgeType?: string;
  dashes?: boolean;
};

export type GraphFilters = {
  tags?: string[];
  namespaces?: string[];
  teams?: string[];
  severities?: string[];
  environments?: string[];
};

export type ServiceGroup = {
  serviceKey: string;
  serviceNamespace: string;
  serviceName: string;
  alerts: Alert[];
  alertCount: number;
  highestSeverity: string;
  latestActivity: string;
  longestDuration: number;
};

  // Service Detail Types
  export interface ServiceDependency {
    namespace: string;
    name: string;
    type: string;
    first_seen: string;
    last_seen: string;
  }

  export interface ServiceAlertHistory {
    date: string;
    alert_count: number;
    critical_count: number;
    warning_count: number;
    fatal_count?: number;
  }

  export interface ServiceMetrics {
    dependency_count: number;
    incoming_dependency_count: number;
    outgoing_dependency_count: number;
    current_alert_count: number;
    critical_alert_count: number;
    external_calls_count: number;
    database_calls_count: number;
    rpc_calls_count: number;
  }

  export interface ServiceDetail {
    namespace: string;
    name: string;
    environment: string;
    team: string;
    component_type: string;
    created_at: string;
    last_seen: string;
    tags: Record<string, string>;
    tag_sources: Record<string, string>;
    external_calls: Record<string, any>;
    database_calls: Record<string, any>;
    rpc_calls: Record<string, any>;
    uptime_days: number | null;
  }

  export interface ServiceDetailResponse {
    service: ServiceDetail;
    dependencies: {
      incoming: ServiceDependency[];
      outgoing: ServiceDependency[];
    };
    alerts: {
      current: Alert[];
      history: ServiceAlertHistory[];
    };
    metrics: ServiceMetrics;
  }

  // API Service for fetching service details
  export interface ServiceDetailAPI {
    getServiceDetail: (namespace: string, name: string) => Promise<ServiceDetailResponse>;
  }

  // Service Summary for catalog/listing
  export interface ServiceSummary {
    namespace: string;
    name: string;
    environment: string;
    team: string;
    component_type: string;
    created_at: string;
    last_seen: string;
    tags: Record<string, string>;
    current_alert_count: number;
    critical_alert_count: number;
    dependency_count: number;
    uptime_days: number | null;
  }

  // Services list response
  export interface ServicesListResponse {
    services: ServiceSummary[];
    filters: {
      environments: string[];
      namespaces: string[];
      teams: string[];
    };
    total: number;
  }
