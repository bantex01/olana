import React, { useEffect, useCallback } from 'react';
import { Row, Col, Alert, Collapse } from 'antd';
import { 
  ForkOutlined,
  FilterOutlined,
  AlertOutlined
} from '@ant-design/icons';
import { AlertsFilters } from '../Incidents/AlertsFilters';
import { ServiceMapEasy } from '../ServiceMap';
import { AlertTimeline } from '../Charts';
import { useFilterState } from '../../hooks/useFilterState';
import { useServiceMapData } from '../../hooks/useServiceMapData';
import { useAnalytics } from '../../hooks/useAnalytics';
import {
  TotalServicesCard,
  ServicesWithIssuesCard,
  OpenAlertsLast24hCard,
  TotalOpenAlertsCard,
  FatalAlertsCard,
  CriticalAlertsCard,
  WarningAlertsCard,
  DeploymentsLast24hCard,
  RecentDeploymentsCard,
  EventsLast24hCard,
  RecentEventsCard,
  MTTACard,
  MTTALast24hCard,
  MTTRCard,
  MTTRLast24hCard
} from '../Cards';
import { ServiceAlertSummaryTable } from '../Common/ServiceAlertSummaryTable';
import { ServicePerformanceTable } from '../Common/ServicePerformanceTable';
import { RecentDeploymentsTable } from '../Common/RecentDeploymentsTable';


interface MissionControlProps {
  onLastUpdatedChange: (date: Date) => void;
}

export const MissionControl: React.FC<MissionControlProps> = ({ onLastUpdatedChange }) => {
  // Use reusable filter state hook
  const { state: filterState, actions: filterActions, helpers: filterHelpers } = useFilterState();
  
  // Use reusable service map data hook (for accessing system stats)
  const { data, serviceMapData, fetchData } = useServiceMapData();
  
  // Use analytics hook for global performance metrics
  const { data: analytics24h, loading: analytics24hLoading, fetchAnalytics: fetchAnalytics24h } = useAnalytics();
  const { data: analyticsOverall, loading: analyticsOverallLoading, fetchAnalytics: fetchAnalyticsOverall } = useAnalytics();

  // Memoize the fetch function to prevent infinite loops (EXACTLY like original)
  const memoizedFetchData = useCallback(async () => {
    const filters = {
      namespaces: filterState.selectedNamespaces.length > 0 ? filterState.selectedNamespaces : undefined,
      severities: filterState.selectedSeverities.length > 0 ? filterState.selectedSeverities : undefined,
      tags: filterState.selectedTags.length > 0 ? filterState.selectedTags : undefined,
      search: filterState.searchTerm.trim() !== '' ? filterState.searchTerm.trim() : undefined,
    };
    const options = {
      includeDependentNamespaces: filterState.includeDependentNamespaces,
      showFullChain: filterState.showFullChain
    };
    
    // Fetch all data in parallel
    await Promise.all([
      fetchData(filters, options),
      fetchAnalytics24h(filters, 24),
      fetchAnalyticsOverall(filters, 87600) // 10 years for "overall" metrics (whole DB)
    ]);
    
    // Update last updated timestamp
    const now = new Date();
    onLastUpdatedChange(now);
  }, [
    filterState.selectedNamespaces, 
    filterState.selectedSeverities, 
    filterState.selectedTags, 
    filterState.searchTerm, 
    filterState.includeDependentNamespaces, 
    filterState.showFullChain,
    fetchData,
    fetchAnalytics24h,
    fetchAnalyticsOverall,
    onLastUpdatedChange
  ]);

  // Fetch data when filters change (EXACTLY like original)
  useEffect(() => {
    memoizedFetchData();
  }, [memoizedFetchData]);

  // Handle refresh callback
  const handleRefresh = useCallback(async () => {
    await memoizedFetchData();
  }, [memoizedFetchData]);

  // Handle toggle changes from ServiceMap
  const handleToggleChange = useCallback((_includeDependentNamespaces: boolean, _showFullChain: boolean) => {
    // ServiceMapEasy handles the data fetching automatically, no manual sync needed
  }, []);

  // Build filters for ServiceMapEasy (exactly like original Mission Control)
  const filters = {
    namespaces: filterState.selectedNamespaces.length > 0 ? filterState.selectedNamespaces : undefined,
    severities: filterState.selectedSeverities.length > 0 ? filterState.selectedSeverities : undefined,
    tags: filterState.selectedTags.length > 0 ? filterState.selectedTags : undefined,
    search: filterState.searchTerm.trim() !== '' ? filterState.searchTerm.trim() : undefined,
  };

  if (data.error) {
    return (
      <Alert
        message="Error Loading Dashboard"
        description={data.error}
        type="error"
        showIcon
        action={
          <button onClick={handleRefresh}>Retry</button>
        }
      />
    );
  }

  return (
    <div>

      {/* Filters - Collapsible at top (EXACTLY like original) */}
      <Collapse
        items={[
          {
            key: 'filters',
            label: (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FilterOutlined style={{ color: '#1890ff' }} />
                <span style={{ fontWeight: 'bold' }}>Filters & Search</span>
                <span style={{ 
                  fontSize: '12px', 
                  color: '#666', 
                  fontWeight: 'normal',
                  marginLeft: '8px'
                }}>
                  ({filterHelpers.getActiveFilterCount()} active filters)
                </span>
              </div>
            ),
            children: (
              <AlertsFilters
                selectedSeverities={filterState.selectedSeverities}
                selectedNamespaces={filterState.selectedNamespaces}
                selectedTags={filterState.selectedTags}
                searchTerm={filterState.searchTerm}
                availableNamespaces={filterState.availableNamespaces}
                availableTags={filterState.availableTags}
                onSeverityChange={filterActions.handleSeverityChange}
                onNamespaceChange={filterActions.handleNamespaceChange}
                onTagsChange={filterActions.handleTagsChange}
                onSearchChange={filterActions.handleSearchChange}
                onClearAll={filterActions.handleClearAll}
              />
            ),
          },
        ]}
        defaultActiveKey={['filters']}
        size="large"
        style={{ marginBottom: '24px' }}
      />

      {/* System Overview Cards underneath filters (EXACTLY like original) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <TotalServicesCard 
            value={data.systemHealth.totalServices} 
            loading={data.loading} 
          />
        </Col>
        <Col span={6}>
          <ServicesWithIssuesCard 
            value={data.systemHealth.servicesWithIssues} 
            loading={data.loading} 
          />
        </Col>
        <Col span={6}>
          <OpenAlertsLast24hCard 
            value={data.systemHealth.totalAlertsLast24h} 
            loading={data.loading} 
          />
        </Col>
        <Col span={6}>
          <TotalOpenAlertsCard 
            value={data.systemHealth.totalOpenAlerts} 
            loading={data.loading} 
          />
        </Col>
      </Row>

      {/* Performance Metrics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <MTTACard 
            value={analyticsOverall?.mtta?.average_minutes ? analyticsOverall.mtta.average_minutes.toFixed(1) : "0"} 
            loading={data.loading || analyticsOverallLoading} 
            isPlaceholder={!analyticsOverall?.mtta?.average_minutes} 
          />
        </Col>
        <Col span={6}>
          <MTTALast24hCard 
            value={analytics24h?.mtta?.average_minutes ? analytics24h.mtta.average_minutes.toFixed(1) : "0"} 
            loading={data.loading || analytics24hLoading} 
            isPlaceholder={!analytics24h?.mtta?.average_minutes} 
          />
        </Col>
        <Col span={6}>
          <MTTRCard 
            value={analyticsOverall?.mttr?.average_minutes ? analyticsOverall.mttr.average_minutes.toFixed(1) : "0"} 
            loading={data.loading || analyticsOverallLoading} 
            isPlaceholder={!analyticsOverall?.mttr?.average_minutes} 
          />
        </Col>
        <Col span={6}>
          <MTTRLast24hCard 
            value={analytics24h?.mttr?.average_minutes ? analytics24h.mttr.average_minutes.toFixed(1) : "0"} 
            loading={data.loading || analytics24hLoading} 
            isPlaceholder={!analytics24h?.mttr?.average_minutes} 
          />
        </Col>
      </Row>

      {/* Deployment & Events Cards (EXACTLY like original) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <DeploymentsLast24hCard 
            value="12" 
            loading={data.loading} 
            isPlaceholder={true} 
          />
        </Col>
        <Col span={6}>
          <RecentDeploymentsCard 
            value="10" 
            loading={data.loading} 
            isPlaceholder={true} 
          />
        </Col>
        <Col span={6}>
          <EventsLast24hCard 
            value="24" 
            loading={data.loading} 
            isPlaceholder={true} 
          />
        </Col>
        <Col span={6}>
          <RecentEventsCard 
            value="8" 
            loading={data.loading} 
            isPlaceholder={true} 
          />
        </Col>
      </Row>

      {/* Recent Deployments Table (EXACTLY like original) */}
      <div style={{ marginBottom: 24 }}>
        <RecentDeploymentsTable 
          loading={data.loading} 
          isPlaceholder={true} 
        />
      </div>

      {/* Alert Timeline Chart - Professional Recharts Implementation */}
      <AlertTimeline
        filters={filters}
        config={{
          height: '300px',
          showStyleSelector: true,
          showRefresh: true,
          timeRange: 24,
          refreshInterval: 0
        }}
        loading={data.loading}
        onRefresh={handleRefresh}
      />
      
      {/* Enhanced Service Map - Using ServiceMapEasy (REPLACES original complex setup) */}
      <Collapse
        items={[
          {
            key: 'service-map',
            label: (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ForkOutlined style={{ color: '#1890ff' }} />
                <span style={{ fontWeight: 'bold' }}>Service Dependencies Map</span>
                <span style={{ 
                  fontSize: '12px', 
                  color: '#666', 
                  fontWeight: 'normal',
                  marginLeft: '8px'
                }}>
                  ({data.systemHealth.totalServices} services • {serviceMapData.nodes.filter(n => n.nodeType === 'namespace').length} namespaces)
                </span>
              </div>
            ),
            children: (
              <ServiceMapEasy
                  filters={filters}
                  config={{
                    height: '500px',
                    showControls: true,
                    showHeader: true,
                    showLegend: true,
                    enableFocusMode: true,
                    enableRefresh: true,
                    enableAutoRefresh: true,
                    defaultLayout: 'static'
                  }}
                  onRefresh={handleRefresh}
                  onToggleChange={handleToggleChange}
                />
            ),
          },
        ]}
        defaultActiveKey={['service-map']}
        size="large"
        style={{ marginTop: '8px' }}
      />

      {/* Alerts Summary Section - Collapsible (EXACTLY like original) */}
      <Collapse
        items={[
          {
            key: 'alerts-summary',
            label: (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertOutlined style={{ color: '#1890ff' }} />
                <span style={{ fontWeight: 'bold' }}>Alerts Summary</span>
                <span style={{ 
                  fontSize: '12px', 
                  color: '#666', 
                  fontWeight: 'normal',
                  marginLeft: '8px'
                }}>
                  ({data.systemHealth.totalOpenAlerts} total alerts • {data.systemHealth.servicesWithIssues} services affected)
                </span>
              </div>
            ),
            children: (
              <div>
                {/* Alert Cards Row (EXACTLY like original) */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  <Col span={6}>
                    <TotalOpenAlertsCard 
                      value={data.systemHealth.totalOpenAlerts} 
                      loading={data.loading}
                      openCount={data.alertBreakdown.fatal.open + data.alertBreakdown.critical.open + data.alertBreakdown.warning.open}
                      acknowledgedCount={data.alertBreakdown.fatal.acknowledged + data.alertBreakdown.critical.acknowledged + data.alertBreakdown.warning.acknowledged}
                      showBreakdown={true}
                    />
                  </Col>
                  <Col span={6}>
                    <FatalAlertsCard 
                      openCount={data.alertBreakdown.fatal.open}
                      acknowledgedCount={data.alertBreakdown.fatal.acknowledged}
                      loading={data.loading}
                    />
                  </Col>
                  <Col span={6}>
                    <CriticalAlertsCard 
                      openCount={data.alertBreakdown.critical.open}
                      acknowledgedCount={data.alertBreakdown.critical.acknowledged}
                      loading={data.loading}
                    />
                  </Col>
                  <Col span={6}>
                    <WarningAlertsCard 
                      openCount={data.alertBreakdown.warning.open}
                      acknowledgedCount={data.alertBreakdown.warning.acknowledged}
                      loading={data.loading}
                    />
                  </Col>
                </Row>

                {/* Service Tables - Side by Side (EXACTLY like original) */}
                <Row gutter={24}>
                  <Col span={12}>
                    <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '16px' }}>
                      Alert Summary
                    </div>
                    <ServiceAlertSummaryTable 
                      alerts={data.activeAlerts} 
                      loading={data.loading} 
                    />
                  </Col>
                  <Col span={12}>
                    <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '16px' }}>
                      Performance Metrics
                    </div>
                    <ServicePerformanceTable 
                      serviceNodes={serviceMapData.nodes}
                      loading={data.loading} 
                    />
                  </Col>
                </Row>
              </div>
            ),
          },
        ]}
        defaultActiveKey={['alerts-summary']}
        size="large"
        style={{ marginTop: '8px' }}
      />
    </div>
  );
};