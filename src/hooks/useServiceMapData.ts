import { useState, useCallback } from 'react';
import { API_BASE_URL } from '../utils/api';
import { logger } from '../utils/logger';
import type { Alert as AlertType, Node, Edge, GraphFilters } from '../types';

export interface AlertSeverityBreakdown {
  fatal: { open: number; acknowledged: number };
  critical: { open: number; acknowledged: number };
  warning: { open: number; acknowledged: number };
}

export interface DashboardData {
  activeAlerts: AlertType[];
  systemHealth: {
    totalServices: number;
    servicesWithIssues: number;
    totalAlertsLast24h: number;
    totalOpenAlerts: number;
  };
  alertBreakdown: AlertSeverityBreakdown;
  loading: boolean;
  error: string | null;
}

export interface ServiceMapData {
  nodes: Node[];
  edges: Edge[];
  allAlerts: AlertType[]; // Unfiltered alerts for pulsing
}

export interface UseServiceMapDataOptions {
  includeDependentNamespaces?: boolean;
  showFullChain?: boolean;
}

export interface UseServiceMapDataReturn {
  data: DashboardData;
  serviceMapData: ServiceMapData;
  fetchData: (filters: GraphFilters, options?: UseServiceMapDataOptions) => Promise<void>;
  refreshData: () => void;
}

export const useServiceMapData = (): UseServiceMapDataReturn => {
  const [data, setData] = useState<DashboardData>({
    activeAlerts: [],
    systemHealth: {
      totalServices: 0,
      servicesWithIssues: 0,
      totalAlertsLast24h: 0,
      totalOpenAlerts: 0
    },
    alertBreakdown: {
      fatal: { open: 0, acknowledged: 0 },
      critical: { open: 0, acknowledged: 0 },
      warning: { open: 0, acknowledged: 0 }
    },
    loading: true,
    error: null
  });

  const [serviceMapData, setServiceMapData] = useState<ServiceMapData>({
    nodes: [],
    edges: [],
    allAlerts: []
  });

  const [lastFilters, setLastFilters] = useState<GraphFilters>({});
  const [lastOptions, setLastOptions] = useState<UseServiceMapDataOptions>({});

  const fetchData = useCallback(async (filters: GraphFilters, options: UseServiceMapDataOptions = {}) => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));
      
      // Store filters and options for refresh
      setLastFilters(filters);
      setLastOptions(options);

      // Build alert query parameters
      const alertParams = new URLSearchParams();
      if (filters.namespaces && filters.namespaces.length > 0) {
        alertParams.append('namespaces', filters.namespaces.join(','));
      }
      if (filters.severities && filters.severities.length > 0) {
        alertParams.append('severities', filters.severities.join(','));
      }
      if (filters.tags && filters.tags.length > 0) {
        alertParams.append('tags', filters.tags.join(','));
      }
      if (filters.search && filters.search.trim() !== '') {
        alertParams.append('search', filters.search.trim());
      }
      const alertQuery = alertParams.toString() ? `?${alertParams.toString()}` : '';
      
      // Fetch filtered alerts for metrics
      const alertsUrl = `${API_BASE_URL}/alerts${alertQuery}`;
      const alertsResponse = await fetch(alertsUrl);
      const activeAlerts = await alertsResponse.json();

      // Fetch ALL alerts for service map pulsing (unfiltered)
      const allAlertsResponse = await fetch(`${API_BASE_URL}/alerts`);
      const allAlerts = await allAlertsResponse.json();

      // Fetch analytics for 24h data (filtered)
      const analyticsUrl = `${API_BASE_URL}/alerts/analytics?hours=24${alertQuery.replace('?', '&')}`;
      const analyticsResponse = await fetch(analyticsUrl);
      const analyticsData = await analyticsResponse.json();

      // Build graph query parameters
      const graphParams = new URLSearchParams();
      if (filters.namespaces && filters.namespaces.length > 0) {
        graphParams.append('namespaces', filters.namespaces.join(','));
        if (options.includeDependentNamespaces) {
          graphParams.append('includeDependents', 'true');
        }
      }
      if (options.showFullChain) {
        graphParams.append('showFullChain', 'true');
      }
      if (filters.severities && filters.severities.length > 0) {
        graphParams.append('severities', filters.severities.join(','));
      }
      if (filters.tags && filters.tags.length > 0) {
        graphParams.append('tags', filters.tags.join(','));
      }
      if (filters.search && filters.search.trim() !== '') {
        graphParams.append('search', filters.search.trim());
      }
      const graphQueryString = graphParams.toString();
      const graphUrl = `${API_BASE_URL}/graph${graphQueryString ? `?${graphQueryString}` : ''}`;
      
      // Fetch graph data
      const graphResponse = await fetch(graphUrl);
      const graphData = await graphResponse.json();
      const nodes = graphData.nodes || [];
      const edges = graphData.edges || [];
      
      const totalServices = nodes.filter((n: Node) => n.nodeType === 'service').length;

      // Calculate services with issues (unique services that have active alerts)
      const servicesWithIssues = new Set(
        activeAlerts.map((alert: AlertType) => `${alert.service_namespace}::${alert.service_name}`)
      ).size;

      // Calculate alert breakdown by severity and status
      const alertBreakdown: AlertSeverityBreakdown = {
        fatal: { open: 0, acknowledged: 0 },
        critical: { open: 0, acknowledged: 0 },
        warning: { open: 0, acknowledged: 0 }
      };

      activeAlerts.forEach((alert: AlertType) => {
        const severity = alert.severity as keyof AlertSeverityBreakdown;
        
        if (alertBreakdown[severity]) {
          // For now, all alerts are "open" since acknowledged status doesn't exist yet
          alertBreakdown[severity].open++;
          // acknowledged count stays at 0 until that status is implemented
        }
      });

      // Update dashboard data
      setData({
        activeAlerts,
        systemHealth: {
          totalServices,
          servicesWithIssues,
          totalAlertsLast24h: analyticsData.summary?.total_incidents || 0,
          totalOpenAlerts: activeAlerts.length
        },
        alertBreakdown,
        loading: false,
        error: null
      });

      // Update service map data
      setServiceMapData({
        nodes,
        edges,
        allAlerts
      });

    } catch (error) {
      logger.error('Failed to fetch service map data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load dashboard data'
      }));
    }
  }, []);

  const refreshData = useCallback(() => {
    if (Object.keys(lastFilters).length > 0 || Object.keys(lastOptions).length > 0) {
      fetchData(lastFilters, lastOptions);
    }
  }, [fetchData, lastFilters, lastOptions]);

  return {
    data,
    serviceMapData,
    fetchData,
    refreshData,
  };
};