import React, { useEffect } from 'react';
import { Typography, Table, Tag, Alert as AntAlert, Spin, Space, Button } from 'antd';
import { AlertOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useIncidents } from '../../hooks/useIncidents';
import type { Alert, ServiceGroup } from '../../types';
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
    fetchAlerts(filters, sortConfig);
  }, 30000);

  return () => clearInterval(interval);
}, [filters, sortConfig]);

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
  const getSeverityProps = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'fatal':
        return { color: 'black' };
      case 'critical':
        return { color: 'red' };
      case 'warning':
        return { color: 'orange' };
      default:
        return { color: 'blue' };
    }
  };

  // Table columns configuration
  const serviceColumns = [
    {
      title: 'Service',
      key: 'service',
      render: (record: ServiceGroup) => (
        <div>
          <strong>{record.serviceKey}</strong>
        </div>
      ),
    },
    {
      title: 'Highest Severity',
      key: 'severity',
      render: (record: ServiceGroup) => {
        const { color } = getSeverityProps(record.highestSeverity);
        return (
          <Tag color={color} icon={<AlertOutlined />}>
            {record.highestSeverity.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Alert Count',
      dataIndex: 'alertCount',
      key: 'alertCount',
      render: (count: number) => (
        <Tag color="blue">{count}</Tag>
      ),
    },
    {
      title: 'Longest Duration',
      key: 'duration',
      render: (record: ServiceGroup) => {
        if (record.longestDuration === 0) {
          return <span style={{ color: '#999' }}>Unknown</span>;
        }
        const duration = Math.floor(record.longestDuration / 1000 / 60);
        return (
          <span>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {duration < 60 ? `${duration}m` : `${Math.floor(duration / 60)}h ${duration % 60}m`}
          </span>
        );
      },
    },
    {
      title: 'Latest Activity',
      key: 'latestActivity',
      render: (record: ServiceGroup) => {
        if (!record.latestActivity) {
          return <span style={{ color: '#999' }}>Unknown</span>;
        }
        const timeAgo = Math.floor((Date.now() - new Date(record.latestActivity).getTime()) / 1000 / 60);
        return (
          <span>
            {timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ago`}
          </span>
        );
      },
    },
  ];


  if (error) {
    return (
      <div>
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
        searchTerm={filters.search || ''}
        availableNamespaces={availableNamespaces}
        onSeverityChange={handleSeverityChange}
        onNamespaceChange={handleNamespaceChange}
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