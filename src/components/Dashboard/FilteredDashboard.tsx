import React, { useEffect, useCallback } from 'react';
import { Row, Col, Alert, Collapse } from 'antd';
import { 
  ForkOutlined,
  FilterOutlined,
  AlertOutlined
} from '@ant-design/icons';
import { AlertsFilters } from '../Incidents/AlertsFilters';
import { ServiceMap } from '../ServiceMap';
import { AlertTimeChart } from './AlertTimeChart';
import { useFilterState } from '../../hooks/useFilterState';
import { useServiceMapData } from '../../hooks/useServiceMapData';
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



interface FilteredDashboardProps {
  onLastUpdatedChange: (date: Date) => void;
}

export const FilteredDashboard: React.FC<FilteredDashboardProps> = ({ onLastUpdatedChange }) => {
  // Use reusable filter state hook
  const { state: filterState, actions: filterActions, helpers: filterHelpers } = useFilterState();
  
  // Use reusable service map data hook
  const { data, serviceMapData, fetchData, refreshData } = useServiceMapData();





  // Fetch data using the reusable hook
  const handleFetchData = async () => {
    const filters = filterHelpers.buildGraphFilters();
    const options = {
      includeDependentNamespaces: filterState.includeDependentNamespaces,
      showFullChain: filterState.showFullChain
    };
    
    await fetchData(filters, options);
    
    // Update last updated timestamp
    const now = new Date();
    onLastUpdatedChange(now);
  };


  // Memoize the fetch function to prevent infinite loops
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
    
    await fetchData(filters, options);
    
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
    onLastUpdatedChange
  ]);

  // Fetch data when filters change
  useEffect(() => {
    memoizedFetchData();
  }, [memoizedFetchData]);

  if (data.error) {
    return (
      <Alert
        message="Error Loading Dashboard"
        description={data.error}
        type="error"
        showIcon
        action={
          <button onClick={handleFetchData}>Retry</button>
        }
      />
    );
  }

  return (
    <div>
      {/* Filters - Collapsible at top */}
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

      {/* System Overview Cards underneath filters */}
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
            value="12.5" 
            loading={data.loading} 
            isPlaceholder={true} 
          />
        </Col>
        <Col span={6}>
          <MTTALast24hCard 
            value="8.2" 
            loading={data.loading} 
            isPlaceholder={true} 
          />
        </Col>
        <Col span={6}>
          <MTTRCard 
            value="45.8" 
            loading={data.loading} 
            isPlaceholder={true} 
          />
        </Col>
        <Col span={6}>
          <MTTRLast24hCard 
            value="32.1" 
            loading={data.loading} 
            isPlaceholder={true} 
          />
        </Col>
      </Row>

      {/* Deployment & Events Cards */}
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

      {/* Recent Deployments Table */}
      <div style={{ marginBottom: 24 }}>
        <RecentDeploymentsTable 
          loading={data.loading} 
          isPlaceholder={true} 
        />
      </div>

      {/* Alert Timeline Chart - Choose version */}
      {/* Original SVG version (fixed aspect ratio): */}
      <AlertTimeChart loading={data.loading} />
      
      {/* Alternative Recharts version (recommended): */}
      {/* <AlertTimeChartRecharts loading={data.loading} /> */}

      {/* Enhanced Service Map - Collapsible */}
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
              <ServiceMap
                alerts={serviceMapData.allAlerts}
                nodes={serviceMapData.nodes}
                edges={serviceMapData.edges}
                loading={data.loading}
                totalServices={data.systemHealth.totalServices}
                lastUpdated={new Date()}
                includeDependentNamespaces={filterState.includeDependentNamespaces}
                showFullChain={filterState.showFullChain}
                onRefresh={refreshData}
                onIncludeDependentNamespacesChange={filterActions.setIncludeDependentNamespaces}
                onShowFullChainChange={filterActions.setShowFullChain}
                config={{
                  height: '500px',
                  showControls: true,
                  showHeader: true,
                  showLegend: true,
                  enableFocusMode: true,
                  enableRefresh: true,
                  enableAutoRefresh: true
                }}
              />
            ),
          },
        ]}
        defaultActiveKey={['service-map']}
        size="large"
        style={{ marginTop: '8px' }}
      />

      {/* Alerts Summary Section - Collapsible */}
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
                {/* Alert Cards Row */}
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

                {/* Service Tables - Side by Side */}
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