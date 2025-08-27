import { useState, useCallback } from 'react';
import { message } from 'antd';
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

// Calculate MTTA (Mean Time to Acknowledge)
// For operationally useful metrics, includes time that unacknowledged alerts have been waiting
const calculateMTTA = (alerts: Alert[]): number => {
  // Filter out alerts without first_seen timestamp
  const validAlerts = alerts.filter(alert => alert.first_seen);
  
  if (validAlerts.length === 0) return 0;
  
  const totalTime = validAlerts.reduce((total, alert) => {
    const firstSeen = new Date(alert.first_seen).getTime();
    const endTime = alert.acknowledged_at 
      ? new Date(alert.acknowledged_at).getTime()  // Time when acknowledged
      : Date.now();                                // Still waiting (current time)
    return total + (endTime - firstSeen);
  }, 0);
  
  return totalTime / validAlerts.length / 1000 / 60; // Convert to minutes
};

// Calculate MTTR (Mean Time to Resolve)
const calculateMTTR = (alerts: Alert[]): number => {
  const resolvedAlerts = alerts.filter(alert => 
    alert.resolved_at && alert.first_seen
  );
  
  if (resolvedAlerts.length === 0) return 0;
  
  const totalResolveTime = resolvedAlerts.reduce((total, alert) => {
    const firstSeen = new Date(alert.first_seen).getTime();
    const resolvedAt = new Date(alert.resolved_at!).getTime();
    return total + (resolvedAt - firstSeen);
  }, 0);
  
  return totalResolveTime / resolvedAlerts.length / 1000 / 60; // Convert to minutes
};

export interface PerformanceMetrics {
  mtta: number; // in minutes
  mttr: number; // in minutes
}

export interface UseServiceHealthReturn {
  serviceGroups: ServiceGroup[];
  performanceMetrics: PerformanceMetrics;
  loading: boolean;
  error: string | null;
  acknowledgingAlerts: Set<number>;
  resolvingAlerts: Set<number>;
  fetchServiceGroups: (filters: GraphFilters) => Promise<void>;
  acknowledgeAlert: (alertId: number) => Promise<void>;
  resolveAlert: (alertId: number) => Promise<void>;
  lastUpdated: Date | null;
}

export const useServiceHealth = (): UseServiceHealthReturn => {
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);
  const [allAlerts, setAllAlerts] = useState<Alert[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({ mtta: 0, mttr: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acknowledgingAlerts, setAcknowledgingAlerts] = useState<Set<number>>(new Set());
  const [resolvingAlerts, setResolvingAlerts] = useState<Set<number>>(new Set());
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
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const alertData: Alert[] = await response.json();
      
      // Store all alerts for metrics calculation
      setAllAlerts(alertData);
      
      // Calculate performance metrics from all alerts
      const mtta = calculateMTTA(alertData);
      const mttr = calculateMTTR(alertData);
      setPerformanceMetrics({ mtta, mttr });
      
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

  const acknowledgeAlert = useCallback(async (alertId: number) => {
    try {
      setAcknowledgingAlerts(prev => new Set(prev).add(alertId));
      
      const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/acknowledge`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          acknowledged_by: 'Current User' // This would come from auth context in real app
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Update the alert in state
      setAllAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.alert_id === alertId 
            ? { 
                ...alert, 
                acknowledged_at: result.acknowledgmentTime, 
                acknowledged_by: 'Current User' 
              }
            : alert
        )
      );

      // Update service groups to reflect acknowledgment
      setServiceGroups(prevGroups => 
        prevGroups.map(group => ({
          ...group,
          alerts: group.alerts.map(alert => 
            alert.alert_id === alertId 
              ? { 
                  ...alert, 
                  acknowledged_at: result.acknowledgmentTime, 
                  acknowledged_by: 'Current User' 
                }
              : alert
          )
        }))
      );

      // Recalculate performance metrics
      const updatedAlerts = allAlerts.map(alert => 
        alert.alert_id === alertId 
          ? { ...alert, acknowledged_at: result.acknowledgmentTime, acknowledged_by: 'default_user' }
          : alert
      );
      const mtta = calculateMTTA(updatedAlerts);
      const mttr = calculateMTTR(updatedAlerts);
      setPerformanceMetrics({ mtta, mttr });

      message.success('Alert acknowledged successfully');
      logger.info(`Alert ${alertId} acknowledged successfully`);

    } catch (error) {
      logger.error(`Failed to acknowledge alert ${alertId}:`, error);
      message.error('Failed to acknowledge alert. Please try again.');
    } finally {
      setAcknowledgingAlerts(prev => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  }, [allAlerts]);

  const resolveAlert = useCallback(async (alertId: number) => {
    try {
      setResolvingAlerts(prev => new Set(prev).add(alertId));
      
      const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();
      
      // Remove the resolved alert from state since Service Health only shows open alerts
      setAllAlerts(prevAlerts => 
        prevAlerts.filter(alert => alert.alert_id !== alertId)
      );

      // Remove the resolved alert from service groups
      setServiceGroups(prevGroups => 
        prevGroups.map(group => ({
          ...group,
          alerts: group.alerts.filter(alert => alert.alert_id !== alertId),
          alertCount: group.alerts.filter(alert => alert.alert_id !== alertId).length
        })).filter(group => group.alertCount > 0) // Remove service groups with no alerts
      );

      // Recalculate performance metrics after removing resolved alert
      const updatedAlerts = allAlerts.filter(alert => alert.alert_id !== alertId);
      const mtta = calculateMTTA(updatedAlerts);
      const mttr = calculateMTTR(updatedAlerts);
      setPerformanceMetrics({ mtta, mttr });

      message.success('Alert resolved successfully');
      logger.info(`Alert ${alertId} resolved successfully`);

    } catch (error) {
      logger.error(`Failed to resolve alert ${alertId}:`, error);
      message.error('Failed to resolve alert. Please try again.');
    } finally {
      setResolvingAlerts(prev => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  }, [allAlerts]);

  return {
    serviceGroups,
    performanceMetrics,
    loading,
    error,
    acknowledgingAlerts,
    resolvingAlerts,
    fetchServiceGroups,
    acknowledgeAlert,
    resolveAlert,
    lastUpdated,
  };
};