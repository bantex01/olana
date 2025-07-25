export type Alert = {
  service_namespace: string;
  service_name: string;
  instance_id?: string;
  severity: string;
  message: string;
  count?: number;
  first_seen?: string;
  last_seen?: string;
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