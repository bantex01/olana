import React, { useState, useEffect } from 'react';
import { Card, Typography, Spin, Alert, Breadcrumb, Button, Tag, Space, Avatar, Row, Col, Statistic } from 'antd';
import { ArrowLeftOutlined, HomeOutlined, DatabaseOutlined, ClockCircleOutlined, TeamOutlined, SettingOutlined, EnvironmentOutlined, AlertOutlined, LinkOutlined, ApiOutlined } from '@ant-design/icons';
import type { ServiceDetailResponse } from '../../types';
import { API_BASE_URL } from '../../utils/api';
import { logger } from '../../utils/logger';
import { ServiceHealthCard } from './ServiceHealthCard';
import { ServiceConnectivityCard } from './ServiceConnectivityCard';
import { ServiceInstrumentationCard } from './ServiceInstrumentationCard';
import { ServiceActivityCard } from './ServiceActivityCard';
import { ServiceDependencyMap } from './ServiceDependencyMap';
import { AlertTimeline } from './AlertTimeline';
import { MTTRStatsCard } from './MTTRStatsCard';
import { ServiceAlertsCard } from './ServiceAlertsCard';
import { ServiceActivityFeed } from './ServiceActivityFeed';
import { TechnicalDetailsTab } from './TechnicalDetailsTab';
import { ServiceMetadataCard } from './ServiceMetadataCard';
import { ServiceConfigurationCard } from './ServiceConfigurationCard';

  const { Title } = Typography;

  interface ServiceDetailPageProps {
    namespace: string;
    name: string;
    onBack: () => void;
  }

  export const ServiceDetailPage: React.FC<ServiceDetailPageProps> = ({ 
    namespace, 
    name, 
    onBack 
  }) => {
    const [serviceData, setServiceData] = useState<ServiceDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch service detail data
    useEffect(() => {
      const fetchServiceDetail = async () => {
        try {
          setLoading(true);
          setError(null);

          const response = await fetch(`${API_BASE_URL}/services/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`);

          if (!response.ok) {
            throw new Error(`Failed to fetch service details: ${response.status} ${response.statusText}`);
          }

          const data: ServiceDetailResponse = await response.json();
          setServiceData(data);
        } catch (err) {
          logger.error('Error fetching service detail:', err);
          setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
          setLoading(false);
        }
      };

      fetchServiceDetail();
    }, [namespace, name]);

    // Auto-refresh every 30 seconds (following existing pattern)
    useEffect(() => {
      const interval = setInterval(() => {
        if (!loading) {
          const fetchServiceDetail = async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/services/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`);
              if (response.ok) {
                const data: ServiceDetailResponse = await response.json();
                setServiceData(data);
              }
            } catch (err) {
              logger.error('Error refreshing service detail:', err);
            }
          };
          fetchServiceDetail();
        }
      }, 30000);

      return () => clearInterval(interval);
    }, [namespace, name, loading]);

    // Loading state
    if (loading) {
      return (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Typography.Text type="secondary">Loading service details...</Typography.Text>
          </div>
        </div>
      );
    }

    // Error state
    if (error) {
      return (
        <div style={{ padding: '24px' }}>
          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Button 
              icon={<ArrowLeftOutlined />}
              onClick={onBack}
            >
              Back to Catalog
            </Button>
          </div>

          <Alert
            message="Error Loading Service Details"
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" danger onClick={() => window.location.reload()}>
                Retry
              </Button>
            }
          />
        </div>
      );
    }

    // No data state
    if (!serviceData) {
      return (
        <div style={{ padding: '24px' }}>
          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Button 
              icon={<ArrowLeftOutlined />}
              onClick={onBack}
            >
              Back to Catalog
            </Button>
          </div>

          <Alert
            message="Service Not Found"
            description={`No service data found for ${namespace}/${name}`}
            type="warning"
            showIcon
          />
        </div>
      );
    }

    return (
      <div style={{ padding: '24px' }}>
        {/* Navigation Breadcrumb */}
        <div style={{ marginBottom: '16px' }}>
          <Breadcrumb
            items={[
              {
                href: '#',
                title: (
                  <>
                    <HomeOutlined />
                    <span>Alert Hub</span>
                  </>
                ),
              },
              {
                href: '#',
                title: (
                  <>
                    <DatabaseOutlined />
                    <span>Service Catalog</span>
                  </>
                ),
                onClick: onBack,
              },
              {
                title: `${namespace}/${name}`,
              },
            ]}
          />
        </div>

        {/* Back Button and Page Title */}
        <div style={{
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Button 
              icon={<ArrowLeftOutlined />}
              onClick={onBack}
              type="default"
            >
              Back to Catalog
            </Button>
            <div>
              <Title level={2} style={{ margin: 0, marginBottom: '4px' }}>
                {serviceData.service.name}
              </Title>
              <Typography.Text type="secondary">
                {serviceData.service.namespace} • {serviceData.service.component_type || 'Unknown Type'}
                {serviceData.service.team && ` • Team: ${serviceData.service.team}`}
              </Typography.Text>
            </div>
          </div>

          <Typography.Text type="secondary">
            Last seen: {new Date(serviceData.service.last_seen).toLocaleString()}
          </Typography.Text>
        </div>

        {/* Main Content Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <Card
            style={{ marginBottom: 0 }}
            bodyStyle={{ padding: '24px' }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
            {/* Service Avatar and Primary Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '300px' }}>
                <Avatar 
                size={64}
                style={{ 
                    backgroundColor: serviceData.service.component_type === 'web-service' ? '#1890ff' :
                                    serviceData.service.component_type === 'database' ? '#52c41a' :
                                    serviceData.service.component_type === 'message-queue' ? '#faad14' : '#722ed1',
                    fontSize: '20px',
                    fontWeight: 'bold'
                }}
                >
                {serviceData.service.name.substring(0, 2).toUpperCase()}
                </Avatar>

                <div style={{ flex: 1 }}>
                <Title level={3} style={{ margin: 0, marginBottom: '8px' }}>
                    {serviceData.service.name}
                </Title>
                <Space direction="vertical" size={4}>
                    <Typography.Text type="secondary">
                    <strong>Namespace:</strong> {serviceData.service.namespace}
                    </Typography.Text>
                    <Typography.Text type="secondary">
                    <strong>Component Type:</strong> {serviceData.service.component_type || 'Unknown'}
                    </Typography.Text>
                </Space>
                </div>
            </div>

            {/* Service Metadata */}
            <div style={{ flex: 1, minWidth: '300px' }}>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {/* Environment and Team Row */}
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {serviceData.service.environment && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <EnvironmentOutlined style={{ color: '#1890ff' }} />
                        <Typography.Text>
                        <strong>Environment:</strong>
                        <Tag color="blue" style={{ marginLeft: '8px' }}>
                            {serviceData.service.environment}
                        </Tag>
                        </Typography.Text>
                    </div>
                    )}

                    {serviceData.service.team && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TeamOutlined style={{ color: '#52c41a' }} />
                        <Typography.Text>
                        <strong>Team:</strong>
                        <Tag color="green" style={{ marginLeft: '8px' }}>
                            {serviceData.service.team}
                        </Tag>
                        </Typography.Text>
                    </div>
                    )}
                </div>

                {/* Timestamps Row */}
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ClockCircleOutlined style={{ color: '#faad14' }} />
                    <Typography.Text type="secondary">
                        <strong>Created:</strong> {new Date(serviceData.service.created_at).toLocaleDateString()}
                    </Typography.Text>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ClockCircleOutlined style={{ color: '#52c41a' }} />
                    <Typography.Text type="secondary">
                        <strong>Last Seen:</strong> {new Date(serviceData.service.last_seen).toLocaleString()}
                    </Typography.Text>
                    </div>
                </div>

                {/* Uptime Display */}
                {serviceData.service.uptime_days !== null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SettingOutlined style={{ color: '#722ed1' }} />
                    <Typography.Text>
                        <strong>Uptime:</strong>
                        <Tag color="purple" style={{ marginLeft: '8px' }}>
                        {serviceData.service.uptime_days} days
                        </Tag>
                    </Typography.Text>
                    </div>
                )}

                {/* Service Tags */}
                {Object.keys(serviceData.service.tags).length > 0 && (
                    <div>
                    <Typography.Text strong style={{ display: 'block', marginBottom: '8px' }}>
                        Service Tags:
                    </Typography.Text>
                    <Space wrap>
                        {Object.entries(serviceData.service.tags).map(([key, value]) => (
                        <Tag key={key} style={{ marginBottom: '4px' }}>
                            <strong>{key}:</strong> {value}
                        </Tag>
                        ))}
                    </Space>
                    </div>
                )}
                </Space>
            </div>
            </div>
        </Card>

        {/* Step 6: Quick Stats Cards Row */}
        <Row gutter={[16, 16]} style={{ marginBottom: 0 }}>
            {/* Service Health Card - Enhanced with Phase 3 implementation */}
            <Col xs={24} sm={12} lg={6}>
                <ServiceHealthCard serviceData={serviceData} />
            </Col>

            {/* Service Connectivity Card - Enhanced with Phase 3 implementation */}
            <Col xs={24} sm={12} lg={6}>
                <ServiceConnectivityCard serviceData={serviceData} />
            </Col>

            {/* Service Instrumentation Card - Enhanced with Phase 3 implementation */}
            <Col xs={24} sm={12} lg={6}>
                <ServiceInstrumentationCard serviceData={serviceData} />
            </Col>

            {/* Service Activity Card - Enhanced with Phase 3 implementation */}
            <Col xs={24} sm={12} lg={6}>
                <ServiceActivityCard serviceData={serviceData} />
            </Col>
        </Row>

        {/* Phase 4: Enhanced Service Map - Step 11: ServiceDependencyMap Component */}
        <ServiceDependencyMap serviceData={serviceData} />

        {/* Phase 5: Alert Timeline & History - Step 14: AlertTimeline Component */}
        <AlertTimeline serviceData={serviceData} />

        {/* Phase 5: Alert Timeline & History - Step 15: MTTR Statistics Card */}
        <MTTRStatsCard serviceData={serviceData} />

        {/* Phase 5: Alert Timeline & History - Step 16: Service-Specific Active Alerts */}
        <ServiceAlertsCard serviceData={serviceData} />

        {/* Phase 6: Activity & Technical Details - Step 17: ServiceActivityFeed Component */}
        <ServiceActivityFeed serviceData={serviceData} />

        {/* Phase 6: Activity & Technical Details - Step 18: TechnicalDetailsTab Component */}
        <TechnicalDetailsTab serviceData={serviceData} />

        {/* Phase 6: Activity & Technical Details - Step 19: ServiceMetadataCard Component */}
        <ServiceMetadataCard serviceData={serviceData} />

        {/* Phase 6: Activity & Technical Details - Step 20: ServiceConfigurationCard Component */}
        <ServiceConfigurationCard serviceData={serviceData} />

        {/* Phase 6 Complete - All Activity & Technical Details implemented */}
        </div>
      </div>
    );
  };
