import { useState, useCallback } from 'react';
import { API_BASE_URL } from '../utils/api';
import { logger } from '../utils/logger';
import type { GraphFilters } from '../types';

export interface AnalyticsData {
  time_range_hours: number;
  summary: {
    total_incidents: number;
    active_incidents: number;
    resolved_incidents: number;
    affected_services: number;
    unique_alert_types: number;
  };
  mttr: {
    average_minutes: number | null;
    fastest_minutes: number | null;
    slowest_minutes: number | null;
    resolved_count: number;
  };
  mtta: {
    average_minutes: number | null;
    fastest_minutes: number | null;
    slowest_minutes: number | null;
    acknowledged_count: number;
  };
  most_frequent_alerts: Array<{
    service: string;
    severity: string;
    message: string;
    incident_count: number;
    incidents_per_hour: number;
    last_occurrence: string;
  }>;
  severity_breakdown: Array<{
    severity: string;
    total: number;
    active: number;
    resolved: number;
  }>;
  hourly_distribution: Array<{
    hour: string;
    incidents: number;
    services_affected: number;
  }>;
}

export interface UseAnalyticsResult {
  data: AnalyticsData | null;
  loading: boolean;
  error: string | null;
  fetchAnalytics: (filters?: GraphFilters, hours?: number) => Promise<void>;
}

export const useAnalytics = (): UseAnalyticsResult => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (filters: GraphFilters = {}, hours: number = 24) => {
    setLoading(true);
    setError(null);

    try {
      logger.debug('Fetching analytics', { filters, hours });

      // Build query parameters for filters
      const params = new URLSearchParams();
      params.append('hours', hours.toString());

      if (filters.namespaces && filters.namespaces.length > 0) {
        params.append('namespaces', filters.namespaces.join(','));
      }
      if (filters.severities && filters.severities.length > 0) {
        params.append('severities', filters.severities.join(','));
      }
      if (filters.tags && filters.tags.length > 0) {
        params.append('tags', filters.tags.join(','));
      }
      if (filters.search && filters.search.trim() !== '') {
        params.append('search', filters.search.trim());
      }

      const analyticsUrl = `${API_BASE_URL}/alerts/analytics?${params.toString()}`;
      logger.debug('Analytics URL', { url: analyticsUrl });

      const response = await fetch(analyticsUrl);
      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status} ${response.statusText}`);
      }

      const analyticsData: AnalyticsData = await response.json();
      logger.debug('Analytics data received', { 
        totalIncidents: analyticsData.summary?.total_incidents,
        mtta: analyticsData.mtta?.average_minutes,
        mttr: analyticsData.mttr?.average_minutes 
      });

      setData(analyticsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics data';
      logger.error('Analytics fetch error', { error: err, filters, hours });
      setError(errorMessage);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    loading,
    error,
    fetchAnalytics
  };
};