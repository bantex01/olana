export type ChartStyle = 'area' | 'line' | 'bar' | 'stacked-area';

export type AlertSeverity = 'fatal' | 'critical' | 'warning' | 'none';

export type EventType = 'alert' | 'deployment' | 'maintenance' | 'incident';

export type EventSource = 'alertmanager' | 'github' | 'k8s' | 'manual';

export interface FilterState {
  namespaces?: string[];
  severities?: string[];
  tags?: string[];
  search?: string;
}

export interface TimelineDataPoint {
  timestamp: string;
  hour: Date;
  incidents: number;
  services_affected: number;
  severityBreakdown: {
    fatal: number;
    critical: number;
    warning: number;
    none: number;
  };
}

export interface TimelineEvent {
  timestamp: Date;
  type: EventType;
  severity?: AlertSeverity;
  title: string;
  description: string;
  source: EventSource;
  metadata?: Record<string, any>;
}

export interface AlertTimelineConfig {
  timeRange?: number; // hours, default 24
  chartStyle?: ChartStyle; // default 'area'
  height?: string; // default '300px'
  showStyleSelector?: boolean; // default true
  showRefresh?: boolean; // default true
  showEvents?: boolean; // default true
  refreshInterval?: number; // seconds, 0 = off
  eventSources?: EventType[]; // default ['alert']
}

export interface AlertTimelineProps {
  filters?: FilterState;
  config?: AlertTimelineConfig;
  loading?: boolean;
  onRefresh?: () => void;
}

export interface AlertAnalyticsResponse {
  time_range_hours: number;
  time_distribution: Array<{
    time_bucket: string;
    incidents: number;
    services_affected: number;
    fatal_count: number;
    critical_count: number;
    warning_count: number;
    none_count: number;
  }>;
  aggregation_interval: string; // 'minute', '5-minute', 'hourly', '6-hour', 'daily', 'weekly'
  summary: {
    total_incidents: number;
    active_incidents: number;
    resolved_incidents: number;
    affected_services: number;
  };
  severity_breakdown: Array<{
    severity: AlertSeverity;
    total: number;
    active: number;
    resolved: number;
  }>;
}

export interface ProcessedTimelineData {
  dataPoints: TimelineDataPoint[];
  events: TimelineEvent[];
  summary: {
    totalIncidents: number;
    peakHour: string;
    avgIncidentsPerHour: number;
  };
  aggregationInterval?: string;
}

export type RefreshInterval = 0 | 30 | 60 | 300 | 600; // 0=off, 30s, 1m, 5m, 10m

export interface ChartStyleOption {
  key: ChartStyle;
  label: string;
  icon: string;
  description: string;
}