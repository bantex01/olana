import React, { useEffect, useCallback } from 'react';
import { ServiceMap } from './ServiceMap';
import { useServiceMapData } from '../../hooks/useServiceMapData';
import { useFilterState } from '../../hooks/useFilterState';

// Simple, clean interface - exactly what you wanted
export interface ServiceMapEasyProps {
  // Data source
  filters?: {
    namespaces?: string[];
    severities?: string[];
    tags?: string[];
    search?: string;
  };
  
  // Configuration
  config?: {
    height?: string;
    showControls?: boolean;
    showHeader?: boolean;
    showLegend?: boolean;
    enableFocusMode?: boolean;
    enableRefresh?: boolean;
    enableAutoRefresh?: boolean;
    defaultLayout?: 'hierarchical' | 'static' | 'clustered';
    defaultIncludeDependentNamespaces?: boolean;
    defaultShowFullChain?: boolean;
  };
  
  // Callbacks
  onRefresh?: () => void;
  onToggleChange?: (includeDependentNamespaces: boolean, showFullChain: boolean) => void;
}

/**
 * ServiceMapEasy - A plug-and-play service map component
 * 
 * Uses all the proven logic from Mission Control but packages it cleanly.
 * No more 17 props, complex setup, or hook management needed.
 * 
 * Usage:
 * <ServiceMapEasy 
 *   filters={{ namespaces: ['production'] }}
 *   config={{ height: '500px' }}
 * />
 */
export const ServiceMapEasy: React.FC<ServiceMapEasyProps> = ({
  filters = {},
  config = {},
  onRefresh,
  onToggleChange,
}) => {
  
  // Use the PROVEN hooks that work in Mission Control
  const { state: filterState, actions: filterActions } = useFilterState();
  const { data, serviceMapData, fetchData, refreshData } = useServiceMapData();

  // Set up the filters based on props (same logic as Mission Control)
  const memoizedFetchData = useCallback(async () => {
    const apiFilters = {
      namespaces: filters.namespaces || undefined,
      severities: filters.severities || undefined,
      tags: filters.tags || undefined,
      search: filters.search || undefined,
    };
    
    const options = {
      includeDependentNamespaces: config.defaultIncludeDependentNamespaces || filterState.includeDependentNamespaces,
      showFullChain: config.defaultShowFullChain || filterState.showFullChain
    };
    
    await fetchData(apiFilters, options);
  }, [
    JSON.stringify(filters), // Simple dependency
    config.defaultIncludeDependentNamespaces,
    config.defaultShowFullChain,
    filterState.includeDependentNamespaces,
    filterState.showFullChain,
    fetchData
  ]);

  // Fetch data when filters change (same as Mission Control)
  useEffect(() => {
    memoizedFetchData();
  }, [memoizedFetchData]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refreshData();
    onRefresh?.();
  }, [refreshData, onRefresh]);

  // Handle toggle changes
  const handleIncludeDependentNamespacesChange = useCallback((value: boolean) => {
    filterActions.setIncludeDependentNamespaces(value);
    onToggleChange?.(value, filterState.showFullChain);
  }, [filterActions, filterState.showFullChain, onToggleChange]);

  const handleShowFullChainChange = useCallback((value: boolean) => {
    filterActions.setShowFullChain(value);
    onToggleChange?.(filterState.includeDependentNamespaces, value);
  }, [filterActions, filterState.includeDependentNamespaces, onToggleChange]);

  // Use the EXACT same ServiceMap that works in Mission Control
  return (
    <ServiceMap
      alerts={serviceMapData.allAlerts}
      nodes={serviceMapData.nodes}
      edges={serviceMapData.edges}
      loading={data.loading}
      totalServices={data.systemHealth.totalServices}
      lastUpdated={new Date()}
      includeDependentNamespaces={filterState.includeDependentNamespaces}
      showFullChain={filterState.showFullChain}
      filters={filters}
      onRefresh={handleRefresh}
      onIncludeDependentNamespacesChange={handleIncludeDependentNamespacesChange}
      onShowFullChainChange={handleShowFullChainChange}
      config={{
        height: config.height || '400px',
        showControls: config.showControls !== false, // Default true
        showHeader: config.showHeader !== false,     // Default true
        showLegend: config.showLegend !== false,     // Default true
        enableFocusMode: config.enableFocusMode !== false,
        enableRefresh: config.enableRefresh !== false,
        enableAutoRefresh: config.enableAutoRefresh || false,
        defaultLayout: config.defaultLayout || 'hierarchical'
      }}
    />
  );
};