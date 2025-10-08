import { useState, useEffect, useCallback } from 'react';
import type { FilterState, AlertAnalyticsResponse, ProcessedTimelineData, TimelineDataPoint, TimelineEvent } from './types';

import { API_BASE_URL } from '../../../utils/api';

interface UseTimelineDataProps {
  filters?: FilterState;
  startDate?: Date;
  endDate?: Date;
  timeRange?: number; // hours - for backward compatibility
  refreshInterval?: number; // seconds, 0 = disabled
}

export const useTimelineData = ({ 
  filters = {}, 
  startDate,
  endDate,
  timeRange = 24, 
  refreshInterval = 0 
}: UseTimelineDataProps) => {
  const [data, setData] = useState<ProcessedTimelineData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchTimelineData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      // Use custom date range or fall back to timeRange hours
      if (startDate && endDate) {
        // Send actual start and end dates to the enhanced API
        params.append('startDate', startDate.toISOString());
        params.append('endDate', endDate.toISOString());
      } else {
        params.append('hours', timeRange.toString());
      }

      if (filters.namespaces && filters.namespaces.length > 0) {
        params.append('namespaces', filters.namespaces.join(','));
      }
      if (filters.severities && filters.severities.length > 0) {
        params.append('severities', filters.severities.join(','));
      }
      if (filters.tags && filters.tags.length > 0) {
        params.append('tags', filters.tags.join(','));
      }
      if (filters.search && filters.search.trim()) {
        params.append('search', filters.search.trim());
      }

      const response = await fetch(`${API_BASE_URL}/alerts/analytics?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const analyticsData: AlertAnalyticsResponse = await response.json();
      
      console.log('Raw API Response:', analyticsData);
      
      // Process the data for timeline display
      const calculatedTimeRange = startDate && endDate 
        ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))
        : timeRange;
      const processedData = processAnalyticsData(analyticsData, calculatedTimeRange, startDate, endDate);
      
      console.log('Processed Data:', processedData);
      
      setData(processedData);
      setLastUpdated(new Date());
      setError(null);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch timeline data';
      setError(errorMessage);
      console.error('Timeline data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [
    JSON.stringify(filters), 
    startDate?.getTime(), 
    endDate?.getTime(), 
    timeRange
  ]);

  // Initial data fetch
  useEffect(() => {
    fetchTimelineData();
  }, [fetchTimelineData]);

  // Auto-refresh setup
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchTimelineData, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [fetchTimelineData, refreshInterval]);

  const refresh = useCallback(() => {
    fetchTimelineData();
  }, [fetchTimelineData]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh
  };
};

// Transform analytics data into timeline format
function processAnalyticsData(
  analyticsData: AlertAnalyticsResponse, 
  timeRange: number = 24,
  startDate?: Date,
  endDate?: Date
): ProcessedTimelineData {
  // Generate complete time series with proper intervals
  const dataPoints = generateCompleteTimeSeries(analyticsData, timeRange, startDate, endDate);

  // Generate placeholder events based on high incident hours
  // TODO: Replace with real event data when available
  const events: TimelineEvent[] = generatePlaceholderEvents(dataPoints);

  // Calculate summary statistics
  const summary = {
    totalIncidents: analyticsData.summary.total_incidents,
    peakHour: findPeakHour(dataPoints),
    avgIncidentsPerHour: dataPoints.length > 0 
      ? analyticsData.summary.total_incidents / dataPoints.length 
      : 0
  };

  return {
    dataPoints,
    events,
    summary,
    aggregationInterval: analyticsData.aggregation_interval
  };
}

// Generate a complete time series with proper intervals
function generateCompleteTimeSeries(
  analyticsData: AlertAnalyticsResponse, 
  timeRange: number,
  customStartDate?: Date,
  customEndDate?: Date
): TimelineDataPoint[] {
  // Use custom dates if provided, otherwise fall back to timeRange
  const endTime = customEndDate || new Date();
  const startTime = customStartDate || new Date(endTime.getTime() - (timeRange * 60 * 60 * 1000));
  
  // Determine interval based on time range
  let intervalHours: number;
  if (timeRange <= 24) {
    intervalHours = 1; // Hourly for <= 24 hours
  } else if (timeRange <= 168) {
    intervalHours = 6; // 6-hour intervals for <= 7 days  
  } else {
    intervalHours = 24; // Daily for all longer ranges (30 days, 90 days, etc.)
  }
  
  // Create map of existing data points for quick lookup
  const dataMap = new Map<string, any>();
  
  // Helper function to round time to meaningful intervals
  const roundToInterval = (date: Date, intervalHours: number): Date => {
    const rounded = new Date(date);
    
    if (intervalHours === 24) {
      // Round to start of day (midnight UTC)
      rounded.setUTCHours(0, 0, 0, 0);
    } else {
      // For hourly/6-hourly, round to nearest interval
      const hours = Math.floor(rounded.getUTCHours() / intervalHours) * intervalHours;
      rounded.setUTCHours(hours, 0, 0, 0);
    }
    
    return rounded;
  };
  
  analyticsData.time_distribution.forEach(item => {
    const timeBucket = new Date(item.time_bucket);
    const roundedTime = roundToInterval(timeBucket, intervalHours);
    const key = roundedTime.toISOString();
    
    if (!dataMap.has(key)) {
      dataMap.set(key, {
        incidents: 0,
        services_affected: 0,
        fatal: 0,
        critical: 0,
        warning: 0,
        none: 0
      });
    }
    
    const existing = dataMap.get(key)!;
    existing.incidents += item.incidents;
    existing.services_affected = Math.max(existing.services_affected, item.services_affected);
    // Use real severity breakdown from API
    existing.fatal += item.fatal_count;
    existing.critical += item.critical_count;
    existing.warning += item.warning_count;
    existing.none += item.none_count;
  });
  
  // Generate complete time series
  const dataPoints: TimelineDataPoint[] = [];
  let currentTime = roundToInterval(startTime, intervalHours);
  
  while (currentTime <= endTime) {
    const key = currentTime.toISOString();
    const existing = dataMap.get(key);
    
    const incidents = existing?.incidents || 0;
    const servicesAffected = existing?.services_affected || 0;
    
    // Use real severity breakdown from the data
    const severityBreakdown = {
      fatal: existing?.fatal || 0,
      critical: existing?.critical || 0,
      warning: existing?.warning || 0,
      none: existing?.none || 0
    };
    
    dataPoints.push({
      timestamp: currentTime.toISOString(),
      hour: new Date(currentTime),
      incidents,
      services_affected: servicesAffected,
      severityBreakdown
    });
    
    // Increment by the interval
    if (intervalHours === 24) {
      currentTime.setUTCDate(currentTime.getUTCDate() + 1);
    } else {
      currentTime.setUTCHours(currentTime.getUTCHours() + intervalHours);
    }
  }
  
  return dataPoints;
}


// Find the hour with the most incidents
function findPeakHour(dataPoints: TimelineDataPoint[]): string {
  if (dataPoints.length === 0) return 'N/A';
  
  const peak = dataPoints.reduce((max, current) => 
    current.incidents > max.incidents ? current : max
  );
  
  return peak.hour.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}

// Generate placeholder events for high-incident periods
// TODO: Replace with real event data integration
function generatePlaceholderEvents(dataPoints: TimelineDataPoint[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const avgIncidents = dataPoints.reduce((sum, dp) => sum + dp.incidents, 0) / dataPoints.length;
  
  dataPoints.forEach(dp => {
    // Create events for hours with significantly higher than average incidents
    if (dp.incidents > avgIncidents * 1.5) {
      const severity = dp.severityBreakdown.fatal > 0 ? 'fatal' : 
                     dp.severityBreakdown.critical > 0 ? 'critical' : 'warning';
      
      events.push({
        timestamp: dp.hour,
        type: 'incident',
        severity,
        title: `High Alert Activity`,
        description: `${dp.incidents} incidents affecting ${dp.services_affected} services`,
        source: 'alertmanager'
      });
    }
  });

  return events;
}