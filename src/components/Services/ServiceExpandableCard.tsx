import React, { useState, useEffect } from 'react';
import { Card, Typography, Spin, Alert, Button, Space } from 'antd';
import { DownOutlined, UpOutlined, EyeOutlined, MinusOutlined } from '@ant-design/icons';
import type { ServiceSummary, ServiceDetailResponse } from '../../types';
import { ServiceSummaryCard } from './ServiceSummaryCard';
import { ServiceDetailPage } from './ServiceDetailPage';
import { API_BASE_URL } from '../../utils/api';

const { Text } = Typography;

interface ServiceExpandableCardProps {
  service: ServiceSummary;
  onRemove?: () => void;
  expanded?: boolean;
  onToggleExpanded?: () => void;
}

export const ServiceExpandableCard: React.FC<ServiceExpandableCardProps> = ({
  service,
  onRemove,
  expanded = false,
  onToggleExpanded
}) => {
  const [serviceDetail, setServiceDetail] = useState<ServiceDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch detailed service data when expanded
  useEffect(() => {
    if (expanded && !serviceDetail && !loading) {
      fetchServiceDetail();
    }
  }, [expanded, serviceDetail, loading]);

  const fetchServiceDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/services/${encodeURIComponent(service.namespace)}/${encodeURIComponent(service.name)}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch service details: ${response.status} ${response.statusText}`);
      }

      const data: ServiceDetailResponse = await response.json();
      setServiceDetail(data);
    } catch (err) {
      console.error('Error fetching service detail:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExpanded = () => {
    onToggleExpanded?.();
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Collapsed View */}
      <div style={{ position: 'relative' }}>
        <ServiceSummaryCard
          service={service}
          onSelect={handleToggleExpanded}
          selected={expanded}
        />
        
        {/* Action Buttons Overlay */}
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          gap: '8px',
          zIndex: 1
        }}>
          <Button
            size="small"
            type="text"
            icon={expanded ? <UpOutlined /> : <DownOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleExpanded();
            }}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid #d9d9d9'
            }}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </Button>
          
          {onRemove && (
            <Button
              size="small"
              type="text"
              danger
              icon={<MinusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid #d9d9d9'
              }}
            >
              Remove
            </Button>
          )}
        </div>
      </div>

      {/* Expanded View */}
      {expanded && (
        <div 
          style={{
            marginTop: '16px',
            borderLeft: '3px solid #1890ff',
            paddingLeft: '16px',
            backgroundColor: '#f8f9ff',
            borderRadius: '0 8px 8px 0',
            minHeight: '100px',
            transition: 'all 0.3s ease-in-out'
          }}
        >
          {loading && (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px' }}>
                <Text type="secondary">Loading detailed service information...</Text>
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: '24px' }}>
              <Alert
                message="Error Loading Service Details"
                description={error}
                type="error"
                showIcon
                action={
                  <Button size="small" onClick={fetchServiceDetail}>
                    Retry
                  </Button>
                }
              />
            </div>
          )}

          {serviceDetail && !loading && !error && (
            <div style={{ 
              padding: '24px',
              backgroundColor: 'white',
              borderRadius: '8px',
              margin: '16px 0',
              border: '1px solid #e8f4fd'
            }}>
              {/* Header with service name and actions */}
              <div style={{ 
                marginBottom: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '16px',
                borderBottom: '1px solid #f0f0f0'
              }}>
                <Space>
                  <EyeOutlined style={{ color: '#1890ff' }} />
                  <Text strong style={{ fontSize: '18px' }}>
                    Detailed View: {service.namespace}/{service.name}
                  </Text>
                </Space>
                
                <Button
                  size="small"
                  onClick={handleToggleExpanded}
                  icon={<UpOutlined />}
                >
                  Collapse
                </Button>
              </div>

              {/* Render the full ServiceDetailPage content inline */}
              <div style={{ 
                // Remove the padding and background from the embedded detail page
                '& .ant-card': { marginBottom: '16px' },
                '& .ant-card-body': { padding: '16px' }
              }}>
                <ServiceDetailInlineContent serviceData={serviceDetail} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Component to render ServiceDetailPage content without the navigation/header
const ServiceDetailInlineContent: React.FC<{ serviceData: ServiceDetailResponse }> = ({ serviceData }) => {
  // Import all the same components used in ServiceDetailPage
  const ServiceHealthCard = React.lazy(() => import('./ServiceHealthCard').then(module => ({ default: module.ServiceHealthCard })));
  const ServiceConnectivityCard = React.lazy(() => import('./ServiceConnectivityCard').then(module => ({ default: module.ServiceConnectivityCard })));
  const ServiceInstrumentationCard = React.lazy(() => import('./ServiceInstrumentationCard').then(module => ({ default: module.ServiceInstrumentationCard })));
  const ServiceActivityCard = React.lazy(() => import('./ServiceActivityCard').then(module => ({ default: module.ServiceActivityCard })));
  const ServiceDependencyMap = React.lazy(() => import('./ServiceDependencyMap').then(module => ({ default: module.ServiceDependencyMap })));
  const AlertTimeline = React.lazy(() => import('./AlertTimeline').then(module => ({ default: module.AlertTimeline })));
  const MTTRStatsCard = React.lazy(() => import('./MTTRStatsCard').then(module => ({ default: module.MTTRStatsCard })));
  const ServiceAlertsCard = React.lazy(() => import('./ServiceAlertsCard').then(module => ({ default: module.ServiceAlertsCard })));
  const ServiceActivityFeed = React.lazy(() => import('./ServiceActivityFeed').then(module => ({ default: module.ServiceActivityFeed })));
  const TechnicalDetailsTab = React.lazy(() => import('./TechnicalDetailsTab').then(module => ({ default: module.TechnicalDetailsTab })));
  const ServiceMetadataCard = React.lazy(() => import('./ServiceMetadataCard').then(module => ({ default: module.ServiceMetadataCard })));
  const ServiceConfigurationCard = React.lazy(() => import('./ServiceConfigurationCard').then(module => ({ default: module.ServiceConfigurationCard })));

  return (
    <React.Suspense fallback={<Spin />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Service Overview Card - simplified version */}
        <Card bodyStyle={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <Typography.Title level={4} style={{ margin: 0, marginBottom: '8px' }}>
                {serviceData.service.name}
              </Typography.Title>
              <Space wrap>
                <Typography.Text type="secondary">
                  {serviceData.service.namespace} • {serviceData.service.component_type || 'Unknown Type'}
                </Typography.Text>
                {serviceData.service.team && (
                  <Typography.Text type="secondary">Team: {serviceData.service.team}</Typography.Text>
                )}
              </Space>
            </div>
            <Typography.Text type="secondary">
              Last seen: {new Date(serviceData.service.last_seen).toLocaleString()}
            </Typography.Text>
          </div>
        </Card>

        {/* Quick Stats Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <ServiceHealthCard serviceData={serviceData} />
          <ServiceConnectivityCard serviceData={serviceData} />
          <ServiceInstrumentationCard serviceData={serviceData} />
          <ServiceActivityCard serviceData={serviceData} />
        </div>

        {/* Service Dependency Map */}
        <ServiceDependencyMap serviceData={serviceData} />

        {/* Alert Timeline & History */}
        <AlertTimeline serviceData={serviceData} />
        <MTTRStatsCard serviceData={serviceData} />
        <ServiceAlertsCard serviceData={serviceData} />

        {/* Activity & Technical Details */}
        <ServiceActivityFeed serviceData={serviceData} />
        <TechnicalDetailsTab serviceData={serviceData} />
        <ServiceMetadataCard serviceData={serviceData} />
        <ServiceConfigurationCard serviceData={serviceData} />
      </div>
    </React.Suspense>
  );
};