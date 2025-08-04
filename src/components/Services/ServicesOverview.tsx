import React, { useState, useEffect } from 'react';
import { Typography, Spin, Alert, Button, Space } from 'antd';
import { ReloadOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../../utils/api';
import { ServiceDiscoveryStats } from './ServiceDiscoveryStats';
import { ServiceRelationshipInsights } from './ServiceRelationshipInsights';
import { ServiceQualityMetrics } from './ServiceQualityMetrics';
import { RecentActivity } from './RecentActivity';

const { Title } = Typography;

interface OverviewData {
  summary: any;
  environments: any[];
  namespaces: any[];
  dependencies: any;
  most_connected: any[];
  enrichment: any;
  alerts: any;
  tags: any;
  recent_activity: any[];
}

export const ServicesOverview: React.FC = () => {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchOverviewData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/services/overview`);
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }
      
      const overviewData = await response.json();
      setData(overviewData);
      setLastUpdated(new Date());
      
    } catch (err) {
      console.error('Failed to fetch services overview:', err);
      setError('Failed to load services overview data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchOverviewData(true);
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#8c8c8c' }}>
          Loading services overview...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Services Overview"
        description={error}
        type="error"
        showIcon
        action={
          <Button onClick={() => fetchOverviewData()} loading={loading}>
            Retry
          </Button>
        }
      />
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#8c8c8c' }}>
        No data available
      </div>
    );
  }

  return (
    <div>
      {/* Header with refresh controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 24
      }}>
        <Title level={2} style={{ margin: 0 }}>
          Services Overview
        </Title>
        
        <Space>
          {lastUpdated && (
            <div style={{ 
              fontSize: 12, 
              color: '#8c8c8c',
              display: 'flex',
              alignItems: 'center'
            }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={refreshing}
            type="default"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Space>
      </div>

      {/* Overview Components */}
      <ServiceDiscoveryStats 
        summary={data.summary}
        environments={data.environments}
        namespaces={data.namespaces}
      />

      <ServiceRelationshipInsights 
        dependencies={data.dependencies}
        mostConnected={data.most_connected}
      />

      <ServiceQualityMetrics 
        alerts={data.alerts}
        enrichment={data.enrichment}
        tags={data.tags}
        totalServices={data.summary.total_services}
      />

      <RecentActivity 
        recentActivity={data.recent_activity}
      />

      {/* Footer with helpful information */}
      <div style={{
        marginTop: 24,
        padding: '16px 20px',
        backgroundColor: '#f6f8fa',
        borderRadius: '6px',
        border: '1px solid #d0d7de',
        fontSize: '12px',
        color: '#656d76'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
          📊 Services Overview Dashboard
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <strong>Service Discovery:</strong> Real-time tracking of all discovered services and their health
          </div>
          <div>
            <strong>Relationships:</strong> Dependency mapping and connectivity analysis
          </div>
          <div>
            <strong>Quality Metrics:</strong> Alert status, instrumentation coverage, and tag management
          </div>
          <div>
            <strong>Activity:</strong> Recent service discoveries and updates (24h window)
          </div>
        </div>
        <div style={{ marginTop: 8, fontStyle: 'italic' }}>
          💡 Use the refresh button to get the latest data. Consider investigating services with missing metadata or high alert counts.
        </div>
      </div>
    </div>
  );
};