import React, { useEffect, useRef, useState } from 'react';
import { Typography, Alert as AntAlert, Spin, Space, Button } from 'antd';
import { useIncidents } from '../../hooks/useIncidents';
import { logger } from '../../utils/logger';
import { AlertsFilters } from './AlertsFilters';
import { ServiceRow } from './ServiceRow';
import { ExpandedAlerts } from './ExpandedAlerts';
import { SortControls } from './SortControls';
import { CheckCircleOutlined, SearchOutlined } from '@ant-design/icons';

const { Title } = Typography;

export const IncidentsPage: React.FC = () => {
  const { 
    alerts, 
    serviceGroups, 
    availableNamespaces,
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
    updateSort
  } = useIncidents();
  
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const scrollPositionRef = useRef<number>(0);
  const isAutoRefreshRef = useRef<boolean>(false);
  const pageContainerRef = useRef<HTMLDivElement>(null);

// Capture scroll position before auto-refresh
const captureScrollPosition = () => {
  const scrollTop = pageContainerRef.current ? 
    pageContainerRef.current.scrollTop : 
    (window.pageYOffset || document.documentElement.scrollTop);
  
  scrollPositionRef.current = scrollTop;
  logger.debug('🔍 Captured scroll position:', scrollTop);
};

// Restore scroll position after auto-refresh
const restoreScrollPosition = () => {
  if (isAutoRefreshRef.current) {
    logger.debug('🔄 Attempting to restore scroll position:', scrollPositionRef.current);
    
    setTimeout(() => {
      if (pageContainerRef.current) {
        logger.debug('📦 Using container scroll');
        pageContainerRef.current.scrollTop = scrollPositionRef.current;
      } else {
        logger.debug('🌐 Using window scroll');
        window.scrollTo(0, scrollPositionRef.current);
      }
      isAutoRefreshRef.current = false;
      logger.debug('✅ Scroll restoration complete');
    }, 10);
  }
};

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only trigger if not typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
        return;
      }
      
      switch (event.key) {
        case 'r':
        case 'R':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            fetchAlerts(filters, sortConfig);
          }
          break;
        case 'c':
        case 'C':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleClearAll();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [filters, sortConfig]);

useEffect(() => {
  fetchNamespaces();
  fetchAlerts();
}, []);

useEffect(() => {
  const interval = setInterval(() => {
    // Mark this as auto-refresh and capture scroll position
    isAutoRefreshRef.current = true;
    captureScrollPosition();
    setIsBackgroundRefreshing(true);
    fetchAlerts(filters, sortConfig);
  }, 30000);

  return () => clearInterval(interval);
}, [filters, sortConfig]);

useEffect(() => {
  if (isAutoRefreshRef.current && !loading) {
    restoreScrollPosition();
    setTimeout(() => {
      setIsBackgroundRefreshing(false);
    }, 1000); // Show indicator for 1 second
  }
}, [loading, serviceGroups]);

// Restore scroll position after data updates (for auto-refresh only)
useEffect(() => {
  if (isAutoRefreshRef.current && !loading) {
    restoreScrollPosition();
  }
}, [loading, serviceGroups]);

 // Filter handlers
const handleSeverityChange = (severities: string[]) => {
  updateFilters({
    ...filters,
    severities,
  });
};

const handleNamespaceChange = (namespaces: string[]) => {
  updateFilters({
    ...filters,
    namespaces,
  });
};

const handleSearchChange = (search: string) => {
  updateFilters({
    ...filters,
    search,
  });
};

const handleClearAll = () => {
  clearFilters();
};

  // Get severity color and props



  if (error) {
    return (
      <div ref={pageContainerRef}>  {/* Add ref here */}
        <Title level={2}>Alerts Management</Title>
        <div style={{ 
          padding: '40px',
          textAlign: 'center',
          backgroundColor: 'white',
          borderRadius: '6px',
          border: '1px solid #f5222d'
        }}>
          <AntAlert
            message="Error Loading Alerts"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: '16px' }}
          />
          <Button 
            type="primary" 
            onClick={() => fetchAlerts(filters, sortConfig)}
            loading={loading}
          >
            Retry Loading
          </Button>
        </div>
      </div>
    );
  }

    const EmptyAllAlerts = () => (
    <div style={{ 
      textAlign: 'center', 
      padding: '60px 40px',
      color: '#52c41a',
      backgroundColor: 'white',
      borderRadius: '6px',
      border: '1px solid #b7eb8f'
    }}>
      <CheckCircleOutlined style={{ fontSize: '48px', marginBottom: '16px', color: '#52c41a' }} />
      <Title level={4} style={{ color: '#52c41a', marginBottom: '8px' }}>
        All Systems Operational
      </Title>
      <div style={{ color: '#8c8c8c', fontSize: '14px' }}>
        No active alerts found across all services
      </div>
    </div>
  );

  const EmptyFilteredAlerts = () => (
    <div style={{ 
      textAlign: 'center', 
      padding: '60px 40px',
      color: '#8c8c8c',
      backgroundColor: 'white',
      borderRadius: '6px',
      border: '1px solid #f0f0f0'
    }}>
      <SearchOutlined style={{ fontSize: '48px', marginBottom: '16px', color: '#d9d9d9' }} />
      <Title level={4} style={{ color: '#8c8c8c', marginBottom: '8px' }}>
        No Alerts Match Current Filters
      </Title>
      <div style={{ marginBottom: '16px', fontSize: '14px' }}>
        Try adjusting your search criteria or clearing filters
      </div>
      <Button onClick={handleClearAll}>
        Clear All Filters
      </Button>
    </div>
  );

  return (
    <div>
      <Title level={2}>Alerts Management</Title>
      
      <AlertsFilters
        selectedSeverities={filters.severities || []}
        selectedNamespaces={filters.namespaces || []}
        selectedTags={[]}
        searchTerm={filters.search || ''}
        availableNamespaces={availableNamespaces}
        availableTags={[]}
        onSeverityChange={handleSeverityChange}
        onNamespaceChange={handleNamespaceChange}
        onTagsChange={() => {}} 
        onSearchChange={handleSearchChange}
        onClearAll={handleClearAll}
      />
      
      {loading ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '80px 40px',
          backgroundColor: 'white',
          borderRadius: '6px',
          border: '1px solid #f0f0f0'
        }}>
          <Spin size="large" />
          <div style={{ 
            marginTop: '16px', 
            color: '#595959',
            fontSize: '14px'
          }}>
            Loading alerts and service data...
          </div>
        </div>
      ) : (
        <div>
          {/* Summary stats */}
      <div style={{ 
            marginBottom: '16px', 
            padding: '12px', 
            backgroundColor: '#f0f2f5', 
            borderRadius: '6px'
          }}>
           <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap',
              gap: '16px',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Space size="large" wrap>
                <span>
                  <strong>{serviceGroups.length}</strong> services with alerts
                </span>
                <span>
                  <strong>{alerts.length}</strong> total alerts
                </span>
                {isBackgroundRefreshing && (
                  <span style={{ color: '#1890ff', fontSize: '12px' }}>
                    🔄 Refreshing...
                  </span>
                )}
              </Space>
              
              <Space size="small" wrap>
                <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Loading...'}
                </span>
                <span style={{ fontSize: '11px', color: '#8c8c8c' }}>
                  (Auto-refreshes every 30s)
                </span>
              </Space>
            </div>
          </div>

        {/* Sort controls - only show if we have data */}
          {serviceGroups.length > 0 && (
            <SortControls
              sortConfig={sortConfig}
              onSortChange={updateSort}
            />
          )}

          {/* Service rows */}
            <div style={{ backgroundColor: 'white' }}>
            {serviceGroups.length > 0 ? (
              <>
                {/* Show count if many services */}
                {serviceGroups.length > 20 && (
                  <div style={{
                    padding: '8px 16px',
                    backgroundColor: '#e6f7ff',
                    border: '1px solid #91d5ff',
                    borderRadius: '6px 6px 0 0',
                    fontSize: '12px',
                    color: '#0050b3'
                  }}>
                    <strong>Performance Note:</strong> Showing {serviceGroups.length} services. 
                    Consider using filters to reduce the list for better performance.
                  </div>
                )}
                
                {serviceGroups.map((serviceGroup) => (
                  <div key={serviceGroup.serviceKey}>
                    <ServiceRow 
                      serviceGroup={serviceGroup}
                      isExpanded={isServiceExpanded(serviceGroup.serviceKey)}
                      onToggleExpand={toggleServiceExpansion}
                    />
                    {isServiceExpanded(serviceGroup.serviceKey) && (
                      <ExpandedAlerts serviceGroup={serviceGroup} />
                    )}
                  </div>
                ))}
              </>
            ) : (
              // Show appropriate empty state
              alerts.length === 0 ? <EmptyAllAlerts /> : <EmptyFilteredAlerts />
            )}
          </div>

                    {/* Help section */}
          <div style={{
            marginTop: '24px',
            padding: '12px 16px',
            backgroundColor: '#f6f8fa',
            borderRadius: '6px',
            border: '1px solid #d0d7de',
            fontSize: '12px',
            color: '#656d76'
          }}>
            <Space split={<span style={{ color: '#d0d7de' }}>•</span>} wrap>
              <span><strong>Tip:</strong> Click service rows to expand individual alerts</span>
              <span><strong>Keyboard:</strong> Ctrl+R to refresh, Ctrl+C to clear filters</span>
              <span><strong>Auto-refresh:</strong> Data updates every 30 seconds</span>
              <span><strong>Search:</strong> Searches both service names and alert messages</span>
            </Space>
          </div>
        </div>
      )}
    </div>

    

  );
};