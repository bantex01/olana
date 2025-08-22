import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { Collapse, Alert, Row, Col, Space } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import { AlertsFilters } from '../Incidents/AlertsFilters';
import { useFilterState } from '../../hooks/useFilterState';
import { useServiceMapData } from '../../hooks/useServiceMapData';
import { useServiceHealth } from '../../hooks/useServiceHealth';
import { ArrangeByControl, SortByControl, AckFilter } from '../Controls';
import type { AckFilterOption } from '../Controls/AckFilter';
import { ServicesList } from '../Services/ServicesList';
import { calculateMTTA } from '../../utils/mttaCalculations';
import {
  ServicesWithIssuesCard,
  TotalOpenAlertsCard,
  UnacknowledgedAlertsCard,
  TotalDurationOpenCard,
  FatalAlertsCard,
  CriticalAlertsCard,
  WarningAlertsCard,
  MTTACard
} from '../Cards';


export const ServiceHealth: React.FC = () => {
  // Use reusable filter state hook
  const { state: filterState, actions: filterActions, helpers: filterHelpers } = useFilterState();
  
  // Use reusable service map data hook  
  const { data, fetchData } = useServiceMapData();
  
  // Use service health hook for service groups
  const { 
    serviceGroups, 
    //performanceMetrics, 
    loading: servicesLoading, 
    error: servicesError, 
    acknowledgingAlerts,
    fetchServiceGroups,
    acknowledgeAlert
  } = useServiceHealth();

  // Acknowledgment filter state
  const [ackFilter, setAckFilter] = useState<AckFilterOption>('all');

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
    
    // Fetch both dashboard data and service groups in parallel
    await Promise.all([
      fetchData(filters, options),
      fetchServiceGroups(filters)
    ]);
  }, [
    filterState.selectedNamespaces, 
    filterState.selectedSeverities, 
    filterState.selectedTags, 
    filterState.searchTerm, 
    filterState.includeDependentNamespaces, 
    filterState.showFullChain,
    fetchData,
    fetchServiceGroups
  ]);

  // Fetch data when filters change
  useEffect(() => {
    memoizedFetchData();
  }, [memoizedFetchData]);

  // Apply acknowledgment filter to service groups
  const filteredServiceGroups = useMemo(() => {
    if (ackFilter === 'all') {
      return serviceGroups;
    }

    return serviceGroups.filter(serviceGroup => {
      const acknowledgedCount = serviceGroup.alerts.filter(alert => alert.acknowledged_at).length;
      const totalCount = serviceGroup.alerts.length;

      if (ackFilter === 'acknowledged') {
        return acknowledgedCount > 0; // Has at least one acknowledged alert
      } else if (ackFilter === 'unacknowledged') {
        return acknowledgedCount < totalCount; // Has at least one unacknowledged alert
      }

      return true;
    });
  }, [serviceGroups, ackFilter]);

  // Handle retry on error
  const handleRetry = async () => {
    await memoizedFetchData();
  };


  // Calculate card metrics from filtered data
  const calculateMetrics = () => {
    const alerts = data.activeAlerts || [];
    
    // Count alerts by severity
    const fatalAlerts = alerts.filter(alert => alert.severity === 'fatal').length;
    const criticalAlerts = alerts.filter(alert => alert.severity === 'critical').length;
    const warningAlerts = alerts.filter(alert => alert.severity === 'warning').length;
    
    // Calculate unacknowledged alerts using acknowledgment data
    const unacknowledgedAlerts = alerts.filter(alert => alert.status === 'firing' && !alert.acknowledged_at).length;
    
    // Calculate total duration open for all active alerts
    const totalDurationOpen = alerts.reduce((total, alert) => {
      if (alert.first_seen) {
        const duration = Date.now() - new Date(alert.first_seen).getTime();
        return total + duration;
      }
      return total;
    }, 0);

    // Calculate contextual MTTA from filtered alerts visible on page
    const allVisibleAlerts = serviceGroups.flatMap(group => group.alerts);
    const contextualMTTA = calculateMTTA(allVisibleAlerts);

    return {
      servicesWithIssues: data.systemHealth.servicesWithIssues,
      totalOpenAlerts: data.systemHealth.totalOpenAlerts,
      unacknowledgedAlerts,
      totalDurationOpen,
      fatalAlerts,
      criticalAlerts,
      warningAlerts,
      contextualMTTA
    };
  };

  const metrics = calculateMetrics();

  if (data.error || servicesError) {
    return (
      <Alert
        message="Error Loading Service Health"
        description={data.error || servicesError}
        type="error"
        showIcon
        action={
          <button onClick={handleRetry}>Retry</button>
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
          }
        ]}
        style={{ marginBottom: '24px' }}
      />

      {/* System Overview Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <TotalOpenAlertsCard 
            value={metrics.totalOpenAlerts} 
            loading={data.loading} 
          />
        </Col>
        <Col span={8}>
          <ServicesWithIssuesCard 
            value={metrics.servicesWithIssues} 
            loading={data.loading} 
          />
        </Col>
        <Col span={8}>
          <UnacknowledgedAlertsCard 
            value={metrics.unacknowledgedAlerts} 
            loading={data.loading} 
          />
        </Col>
      </Row>

      {/* Performance Metrics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <TotalDurationOpenCard 
            value={metrics.totalDurationOpen} 
            loading={data.loading} 
          />
        </Col>
        <Col span={12}>
          <MTTACard 
            value={metrics.contextualMTTA > 0 ? metrics.contextualMTTA.toFixed(1) : "0"} 
            loading={data.loading || servicesLoading} 
            isPlaceholder={metrics.contextualMTTA === 0} 
          />
        </Col>
      </Row>

      {/* Alert Severity Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <FatalAlertsCard 
            openCount={data.alertBreakdown.fatal.open}
            acknowledgedCount={data.alertBreakdown.fatal.acknowledged}
            loading={data.loading} 
          />
        </Col>
        <Col span={8}>
          <CriticalAlertsCard 
            openCount={data.alertBreakdown.critical.open}
            acknowledgedCount={data.alertBreakdown.critical.acknowledged}
            loading={data.loading} 
          />
        </Col>
        <Col span={8}>
          <WarningAlertsCard 
            openCount={data.alertBreakdown.warning.open}
            acknowledgedCount={data.alertBreakdown.warning.acknowledged}
            loading={data.loading} 
          />
        </Col>
      </Row>


      {/* Arrangement and Sorting Controls */}
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        padding: '20px',
        borderRadius: '6px',
        border: '1px solid var(--border)',
        marginBottom: '16px'
      }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
            <ArrangeByControl
              value={filterState.arrangement}
              onChange={filterActions.handleArrangementChange}
              disabled={data.loading || servicesLoading}
            />
            
            <div style={{ flex: 1 }}>
              <SortByControl
                sortConfig={filterState.sortConfig}
                onSortChange={filterActions.handleSortChange}
                availableOptions={['severity', 'alertCount', 'duration', 'activity', 'mtta', 'service', 'namespace']}
                disabled={data.loading || servicesLoading}
              />
            </div>
          </div>

          <AckFilter
            value={ackFilter}
            onChange={setAckFilter}
            disabled={data.loading || servicesLoading}
          />
        </Space>
      </div>

      {/* Services List with Expandable Drill-Downs */}
      <ServicesList
        key="services-list" // Maintain component identity across re-renders
        serviceGroups={filteredServiceGroups}
        arrangement={filterState.arrangement}
        sortConfig={filterState.sortConfig}
        loading={servicesLoading}
        onAcknowledgeAlert={acknowledgeAlert}
        acknowledgingAlerts={acknowledgingAlerts}
      />
    </div>
  );
};