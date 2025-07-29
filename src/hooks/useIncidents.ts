import { useState } from 'react';
import type { Alert, ServiceGroup } from '../types';
import { API_BASE_URL } from '../utils/api';

export type SortOption = 'service' | 'severity' | 'alertCount' | 'duration' | 'activity';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortOption;
  direction: SortDirection;
}

export interface IncidentFilters {
  severities?: string[];
  namespaces?: string[];
  search?: string;
}

// Service grouping utility function
const groupAlertsByService = (alerts: Alert[]): ServiceGroup[] => {
  const grouped = alerts.reduce((acc, alert) => {
    const serviceKey = `${alert.service_namespace}::${alert.service_name}`;
    
    if (!acc[serviceKey]) {
      acc[serviceKey] = {
        serviceKey,
        serviceNamespace: alert.service_namespace,
        serviceName: alert.service_name,
        alerts: [],
        alertCount: 0,
        highestSeverity: 'none',
        latestActivity: '',
        longestDuration: 0,
      };
    }
    
    acc[serviceKey].alerts.push(alert);
    acc[serviceKey].alertCount += 1;
    
    // Calculate highest severity (fatal > critical > warning > none)
    const severityRank = { fatal: 1, critical: 2, warning: 3, none: 4 };
    const currentSevRank = severityRank[acc[serviceKey].highestSeverity as keyof typeof severityRank] || 5;
    const alertSevRank = severityRank[alert.severity as keyof typeof severityRank] || 5;
    
    if (alertSevRank < currentSevRank) {
      acc[serviceKey].highestSeverity = alert.severity;
    }
    
    // Track latest activity - fix for undefined values
    if (alert.last_seen) {
      if (!acc[serviceKey].latestActivity || new Date(alert.last_seen) > new Date(acc[serviceKey].latestActivity)) {
        acc[serviceKey].latestActivity = alert.last_seen;
      }
    }
    
    // Track longest duration - fix for undefined values
    if (alert.first_seen) {
      const alertDuration = Date.now() - new Date(alert.first_seen).getTime();
      if (alertDuration > acc[serviceKey].longestDuration) {
        acc[serviceKey].longestDuration = alertDuration;
      }
    }
    
    return acc;
  }, {} as Record<string, ServiceGroup>);
  
  return Object.values(grouped);
};

export const useIncidents = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);
  const [availableNamespaces, setAvailableNamespaces] = useState<string[]>([]);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<IncidentFilters>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'severity', direction: 'asc' });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch available namespaces
  const fetchNamespaces = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/graph`);
      const data = await response.json();
      const namespaces = [...new Set(
        data.nodes
          ?.filter((node: any) => node.nodeType === 'namespace')
          ?.map((node: any) => node.id as string) || []
      )].sort() as string[];
      setAvailableNamespaces(namespaces);
    } catch (err) {
      console.error('Failed to fetch namespaces:', err);
    }
  };

  const fetchAlerts = async (currentFilters: IncidentFilters = {}, currentSort?: SortConfig) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      
      // Add severity filter
      if (currentFilters.severities && currentFilters.severities.length > 0) {
        params.append('severities', currentFilters.severities.join(','));
      }
      
      // Add namespace filter
      if (currentFilters.namespaces && currentFilters.namespaces.length > 0) {
        params.append('namespaces', currentFilters.namespaces.join(','));
      }
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      const response = await fetch(`${API_BASE_URL}/alerts${queryString}`);
      const alertData: Alert[] = await response.json();
      
      // Apply client-side search filter
      let filteredAlerts = alertData;
      if (currentFilters.search && currentFilters.search.trim() !== '') {
        const searchTerm = currentFilters.search.toLowerCase();
        filteredAlerts = alertData.filter(alert => 
          `${alert.service_namespace}::${alert.service_name}`.toLowerCase().includes(searchTerm) ||
          alert.message.toLowerCase().includes(searchTerm)
        );
      }
      
      setAlerts(filteredAlerts);
      
      // Group alerts by service
      const grouped = groupAlertsByService(filteredAlerts);
      const sortToUse = currentSort || sortConfig;
      const sortedGroups = sortServiceGroups(grouped, sortToUse);
      setServiceGroups(sortedGroups);
      
      // Update last updated timestamp
      setLastUpdated(new Date());
      
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setError('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  // Add sorting function
  const sortServiceGroups = (groups: ServiceGroup[], config: SortConfig): ServiceGroup[] => {
    return [...groups].sort((a, b) => {
      let comparison = 0;
      
      switch (config.field) {
        case 'service':
          comparison = a.serviceKey.localeCompare(b.serviceKey);
          break;
        case 'severity':
          const severityRank = { fatal: 1, critical: 2, warning: 3, none: 4 };
          const aRank = severityRank[a.highestSeverity as keyof typeof severityRank] || 5;
          const bRank = severityRank[b.highestSeverity as keyof typeof severityRank] || 5;
          comparison = aRank - bRank;
          break;
        case 'alertCount':
          comparison = a.alertCount - b.alertCount;
          break;
        case 'duration':
          comparison = a.longestDuration - b.longestDuration;
          break;
        case 'activity':
          const aTime = a.latestActivity ? new Date(a.latestActivity).getTime() : 0;
          const bTime = b.latestActivity ? new Date(b.latestActivity).getTime() : 0;
          comparison = aTime - bTime;
          break;
      }
      
      return config.direction === 'desc' ? -comparison : comparison;
    });
  };

  // Update sorting
  const updateSort = (field: SortOption) => {
    const newDirection: SortDirection = sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    const newSortConfig: SortConfig = { field, direction: newDirection };
    setSortConfig(newSortConfig);
    
    // Re-sort existing groups
    const sortedGroups = sortServiceGroups(serviceGroups, newSortConfig);
    setServiceGroups(sortedGroups);
  };

  const updateFilters = (newFilters: IncidentFilters) => {
    setFilters(newFilters);
    fetchAlerts(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters = {};
    setFilters(emptyFilters);
    fetchAlerts(emptyFilters);
  };

  const toggleServiceExpansion = (serviceKey: string) => {
    setExpandedServices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceKey)) {
        newSet.delete(serviceKey);
      } else {
        newSet.add(serviceKey);
      }
      return newSet;
    });
  };

  const isServiceExpanded = (serviceKey: string) => {
    return expandedServices.has(serviceKey);
  };

    return {
    alerts,
    serviceGroups,
    availableNamespaces,
    expandedServices,
    loading,
    error,
    filters,
    sortConfig,
    lastUpdated,
    fetchAlerts,
    fetchNamespaces,
    updateFilters,
    clearFilters,
    toggleServiceExpansion,
    isServiceExpanded,
    updateSort,
  };
};
