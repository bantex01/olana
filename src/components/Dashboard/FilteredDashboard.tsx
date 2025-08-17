import React, { useEffect, useState, useCallback } from 'react';
import { Row, Col, Card, Statistic, Alert, Collapse } from 'antd';
import { 
  AlertOutlined, 
  ExclamationCircleOutlined,
  NodeIndexOutlined,
  BugOutlined,
  ForkOutlined,
  FilterOutlined,
  ClockCircleOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { AlertsFilters } from '../Incidents/AlertsFilters';
import { DashboardServiceMap } from './DashboardServiceMap';
import { AlertTimeChart } from './AlertTimeChart';
import { API_BASE_URL } from '../../utils/api';
import { logger } from '../../utils/logger';
import type { Alert as AlertType, Node, Edge, GraphFilters } from '../../types';


interface DashboardData {
  activeAlerts: AlertType[];
  systemHealth: {
    totalServices: number;
    servicesWithIssues: number;
    totalAlertsLast24h: number;
    totalOpenAlerts: number;
  };
  loading: boolean;
  error: string | null;
}

interface FilteredDashboardProps {
  onLastUpdatedChange: (date: Date) => void;
}

export const FilteredDashboard: React.FC<FilteredDashboardProps> = ({ onLastUpdatedChange }) => {
  const [data, setData] = useState<DashboardData>({
    activeAlerts: [],
    systemHealth: {
      totalServices: 0,
      servicesWithIssues: 0,
      totalAlertsLast24h: 0,
      totalOpenAlerts: 0
    },
    loading: true,
    error: null
  });

  // Filter states
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [selectedNamespaces, setSelectedNamespaces] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [availableNamespaces, setAvailableNamespaces] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [includeDependentNamespaces, setIncludeDependentNamespaces] = useState<boolean>(false);
  const [showFullChain, setShowFullChain] = useState<boolean>(false);

  // Graph state
  const [graphNodes, setGraphNodes] = useState<Node[]>([]);
  const [graphEdges, setGraphEdges] = useState<Edge[]>([]);
  const [allAlerts, setAllAlerts] = useState<AlertType[]>([]); // All alerts for pulsing

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());





  // Fetch dashboard data with filters applied
  const fetchDashboardData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Build filters directly here to avoid dependency issues
      const filters: GraphFilters = {
        namespaces: selectedNamespaces.length > 0 ? selectedNamespaces : undefined,
        severities: selectedSeverities.length > 0 ? selectedSeverities : undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        search: searchTerm.trim() !== '' ? searchTerm.trim() : undefined,
      };

      // Build alert query
      const params = new URLSearchParams();
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
      const alertQuery = params.toString() ? `?${params.toString()}` : '';
      
      // Fetch filtered alerts for metrics
      const alertsUrl = `${API_BASE_URL}/alerts${alertQuery}`;
      const alertsResponse = await fetch(alertsUrl);
      const activeAlerts = await alertsResponse.json();

      // Fetch ALL alerts for service map pulsing (unfiltered)
      const allAlertsResponse = await fetch(`${API_BASE_URL}/alerts`);
      const allAlerts = await allAlertsResponse.json();

      // Fetch analytics for 24h data (filtered)
      const analyticsUrl = `${API_BASE_URL}/alerts/analytics?hours=24${alertQuery.replace('?', '&')}`;
      const analyticsResponse = await fetch(analyticsUrl);
      const analyticsData = await analyticsResponse.json();

      // Fetch graph data to get total services count (filtered)
      const graphParams = new URLSearchParams();
      if (filters.namespaces && filters.namespaces.length > 0) {
        graphParams.append('namespaces', filters.namespaces.join(','));
        if (includeDependentNamespaces) {
          graphParams.append('includeDependents', 'true');
        }
      }
      if (showFullChain) {
        graphParams.append('showFullChain', 'true');
      }
      if (filters.severities && filters.severities.length > 0) {
        graphParams.append('severities', filters.severities.join(','));
      }
      if (filters.tags && filters.tags.length > 0) {
        graphParams.append('tags', filters.tags.join(','));
      }
      if (filters.search && filters.search.trim() !== '') {
        graphParams.append('search', filters.search.trim());
      }
      const graphQueryString = graphParams.toString();
      const graphUrl = `${API_BASE_URL}/graph${graphQueryString ? `?${graphQueryString}` : ''}`;
      
      const graphResponse = await fetch(graphUrl);
      const graphData = await graphResponse.json();
      const nodes = graphData.nodes || [];
      setGraphNodes(nodes);
      setGraphEdges(graphData.edges || []);
      
      const totalServices = nodes.filter((n: Node) => n.nodeType === 'service').length;

      // Calculate services with issues (unique services that have active alerts)
      const servicesWithIssues = new Set(
        activeAlerts.map((alert: AlertType) => `${alert.service_namespace}::${alert.service_name}`)
      ).size;

      setData({
        activeAlerts,
        systemHealth: {
          totalServices,
          servicesWithIssues,
          totalAlertsLast24h: analyticsData.summary?.total_incidents || 0,
          totalOpenAlerts: activeAlerts.length
        },
        loading: false,
        error: null
      });

      // Store all alerts separately for service map pulsing
      setAllAlerts(allAlerts);

      // Update last updated timestamp
      const now = new Date();
      setLastUpdated(now);
      onLastUpdatedChange(now);

    } catch (error) {
      logger.error('Failed to fetch dashboard data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load dashboard data'
      }));
    }
  }, [selectedNamespaces, selectedSeverities, selectedTags, searchTerm, includeDependentNamespaces, showFullChain, onLastUpdatedChange]);

  // Fetch available namespaces for filter dropdown
  const fetchAvailableNamespaces = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/graph`);
      const graphData = await response.json();
      const namespaces = [...new Set(
        graphData.nodes
          ?.filter((n: Node) => n.nodeType === 'service')
          ?.map((n: Node) => n.id.split('::')[0]) || []
      )].sort() as string[];
      setAvailableNamespaces(namespaces);
    } catch (error) {
      logger.error('Failed to fetch namespaces:', error);
    }
  };

  // Fetch available tags for filter dropdown
  const fetchAvailableTags = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/tags`);
      const data = await response.json();
      setAvailableTags((data.tags as string[]) || []);
    } catch (error) {
      logger.error('Failed to fetch tags:', error);
    }
  };

  // Filter handlers
  const handleSeverityChange = (severities: string[]) => {
    setSelectedSeverities(severities);
  };

  const handleNamespaceChange = (namespaces: string[]) => {
    setSelectedNamespaces(namespaces);
  };

  const handleTagsChange = (tags: string[]) => {
    setSelectedTags(tags);
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  const handleClearAll = () => {
    setSelectedSeverities([]);
    setSelectedNamespaces([]);
    setSelectedTags([]);
    setSearchTerm('');
    setIncludeDependentNamespaces(false);
    setShowFullChain(false);
  };

  // Initial data fetch and setup intervals
  useEffect(() => {
    fetchAvailableNamespaces();
    fetchAvailableTags();
  }, []);

  useEffect(() => {
    fetchDashboardData();
    // Only refresh when filters change, not on a timer
  }, [selectedNamespaces, selectedSeverities, selectedTags, searchTerm, includeDependentNamespaces, showFullChain]);

  if (data.error) {
    return (
      <Alert
        message="Error Loading Dashboard"
        description={data.error}
        type="error"
        showIcon
        action={
          <button onClick={fetchDashboardData}>Retry</button>
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
                  ({selectedSeverities.length + selectedNamespaces.length + selectedTags.length + (searchTerm.trim() !== '' ? 1 : 0)} active filters)
                </span>
              </div>
            ),
            children: (
              <AlertsFilters
                selectedSeverities={selectedSeverities}
                selectedNamespaces={selectedNamespaces}
                selectedTags={selectedTags}
                searchTerm={searchTerm}
                availableNamespaces={availableNamespaces}
                availableTags={availableTags}
                onSeverityChange={handleSeverityChange}
                onNamespaceChange={handleNamespaceChange}
                onTagsChange={handleTagsChange}
                onSearchChange={handleSearchChange}
                onClearAll={handleClearAll}
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
          <Card size="small">
            <Statistic
              title="Total Services"
              value={data.systemHealth.totalServices}
              prefix={<NodeIndexOutlined />}
              valueStyle={{ color: '#1890ff', fontSize: '20px' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Services with Issues"
              value={data.systemHealth.servicesWithIssues}
              prefix={<BugOutlined />}
              valueStyle={{ color: data.systemHealth.servicesWithIssues > 0 ? '#faad14' : '#52c41a', fontSize: '20px' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Open Alerts (24h)"
              value={data.systemHealth.totalAlertsLast24h}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#722ed1', fontSize: '20px' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Open Alerts"
              value={data.systemHealth.totalOpenAlerts}
              prefix={<AlertOutlined />}
              valueStyle={{ color: data.systemHealth.totalOpenAlerts > 0 ? '#cf1322' : '#52c41a', fontSize: '20px' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Placeholder MTTA/MTTR Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="MTTA (Mean Time to Acknowledge)"
              value="12.5"
              suffix="min"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#52c41a', fontSize: '20px' }}
            />
            <div style={{ 
              fontSize: '11px', 
              color: '#a0a6b8', 
              fontStyle: 'italic',
              marginTop: '4px' 
            }}>
              Placeholder data only
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="MTTA (Last 24h)"
              value="8.2"
              suffix="min"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#52c41a', fontSize: '20px' }}
            />
            <div style={{ 
              fontSize: '11px', 
              color: '#a0a6b8', 
              fontStyle: 'italic',
              marginTop: '4px' 
            }}>
              Placeholder data only
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="MTTR (Mean Time to Resolve)"
              value="45.8"
              suffix="min"
              prefix={<HistoryOutlined />}
              valueStyle={{ color: '#1890ff', fontSize: '20px' }}
            />
            <div style={{ 
              fontSize: '11px', 
              color: '#a0a6b8', 
              fontStyle: 'italic',
              marginTop: '4px' 
            }}>
              Placeholder data only
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="MTTR (Last 24h)"
              value="32.1"
              suffix="min"
              prefix={<HistoryOutlined />}
              valueStyle={{ color: '#1890ff', fontSize: '20px' }}
            />
            <div style={{ 
              fontSize: '11px', 
              color: '#a0a6b8', 
              fontStyle: 'italic',
              marginTop: '4px' 
            }}>
              Placeholder data only
            </div>
          </Card>
        </Col>
      </Row>

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
                  ({data.systemHealth.totalServices} services • {graphNodes.filter(n => n.nodeType === 'namespace').length} namespaces)
                </span>
              </div>
            ),
            children: (
              <DashboardServiceMap
                alerts={allAlerts}
                nodes={graphNodes}
                edges={graphEdges}
                loading={data.loading}
                totalServices={data.systemHealth.totalServices}
                lastUpdated={lastUpdated}
                includeDependentNamespaces={includeDependentNamespaces}
                showFullChain={showFullChain}
                onRefresh={fetchDashboardData}
                onIncludeDependentNamespacesChange={setIncludeDependentNamespaces}
                onShowFullChainChange={setShowFullChain}
              />
            ),
          },
        ]}
        defaultActiveKey={['service-map']}
        size="large"
        style={{ marginTop: '8px' }}
      />
    </div>
  );
};