import { useState, useCallback } from 'react';
import type { Alert, ServiceGroup } from '../types';
import { API_BASE_URL } from '../utils/api';
import { logger } from '../utils/logger';
import type { GraphFilters } from '../types';

// Service grouping utility function (reused from useIncidents)
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
    
    // Track latest activity
    if (alert.last_seen) {
      if (!acc[serviceKey].latestActivity || new Date(alert.last_seen) > new Date(acc[serviceKey].latestActivity)) {
        acc[serviceKey].latestActivity = alert.last_seen;
      }
    }
    
    // Track longest duration
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

export interface UseServiceHealthReturn {
  serviceGroups: ServiceGroup[];
  loading: boolean;
  error: string | null;
  fetchServiceGroups: (filters: GraphFilters) => Promise<void>;
  lastUpdated: Date | null;
}

export const useServiceHealth = (): UseServiceHealthReturn => {
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchServiceGroups = useCallback(async (filters: GraphFilters) => {
    try {
      setLoading(true);
      setError(null);
      
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
      
      const queryString = alertParams.toString() ? `?${alertParams.toString()}` : '';
      
      // Fetch alerts
      const response = await fetch(`${API_BASE_URL}/alerts${queryString}`);
      const alertData: Alert[] = await response.json();
      
      // Apply client-side search filter
      let filteredAlerts = alertData;
      if (filters.search && filters.search.trim() !== '') {
        const searchTerm = filters.search.toLowerCase();
        filteredAlerts = alertData.filter(alert => 
          `${alert.service_namespace}::${alert.service_name}`.toLowerCase().includes(searchTerm) ||
          alert.message.toLowerCase().includes(searchTerm)
        );
      }
      
      // Group alerts by service
      const grouped = groupAlertsByService(filteredAlerts);
      setServiceGroups(grouped);
      
      // Update last updated timestamp
      setLastUpdated(new Date());
      
    } catch (err) {
      logger.error('Failed to fetch service health data:', err);
      setError('Failed to load service health data');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    serviceGroups,
    loading,
    error,
    fetchServiceGroups,
    lastUpdated,
  };
};