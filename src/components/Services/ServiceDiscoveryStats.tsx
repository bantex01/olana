import React from 'react';
import { Row, Col, Card, Statistic, Progress, Alert } from 'antd';
import { 
  NodeIndexOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  PlusCircleOutlined,
  WarningOutlined,
  AppstoreOutlined,
  GlobalOutlined
} from '@ant-design/icons';

interface ServiceDiscoveryStatsProps {
  summary: {
    total_services: number;
    active_services: number;
    stale_services: number;
    recently_discovered: number;
    missing_metadata: number;
    total_namespaces: number;
    total_environments: number;
  };
  environments: Array<{ environment: string; service_count: number }>;
  namespaces: Array<{ namespace: string; service_count: number }>;
}

export const ServiceDiscoveryStats: React.FC<ServiceDiscoveryStatsProps> = ({
  summary,
  environments,
  namespaces
}) => {
  // Calculate health percentage
  const healthPercentage = summary.total_services > 0 
    ? Math.round(((summary.total_services - summary.stale_services - summary.missing_metadata) / summary.total_services) * 100)
    : 100;

  const getHealthColor = (percentage: number) => {
    if (percentage >= 90) return '#52c41a';
    if (percentage >= 70) return '#faad14';
    return '#ff4d4f';
  };

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Main Statistics Row */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Services"
              value={summary.total_services}
              prefix={<NodeIndexOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Services (24h)"
              value={summary.active_services}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
              suffix={`/ ${summary.total_services}`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Recently Discovered"
              value={summary.recently_discovered}
              prefix={<PlusCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Service Health"
              value={healthPercentage}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: getHealthColor(healthPercentage) }}
            />
            <Progress 
              percent={healthPercentage} 
              strokeColor={getHealthColor(healthPercentage)}
              size="small"
              showInfo={false}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Issues and Organization Row */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Stale Services (7d+)"
              value={summary.stale_services}
              prefix={<WarningOutlined />}
              valueStyle={{ color: summary.stale_services > 0 ? '#faad14' : '#52c41a' }}
            />
            {summary.stale_services > 0 && (
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                Services not seen in 7+ days
              </div>
            )}
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Missing Metadata"
              value={summary.missing_metadata}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: summary.missing_metadata > 0 ? '#ff4d4f' : '#52c41a' }}
            />
            {summary.missing_metadata > 0 && (
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                Services with unknown team/environment
              </div>
            )}
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Row>
              <Col span={12}>
                <Statistic
                  title="Namespaces"
                  value={summary.total_namespaces}
                  prefix={<AppstoreOutlined />}
                  valueStyle={{ color: '#1890ff', fontSize: 24 }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Environments"
                  value={summary.total_environments}
                  prefix={<GlobalOutlined />}
                  valueStyle={{ color: '#13c2c2', fontSize: 24 }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Distribution Details */}
      <Row gutter={16}>
        <Col span={12}>
          <Card 
            title="Services by Environment" 
            size="small"
            style={{ height: 200 }}
          >
            <div style={{ maxHeight: 120, overflowY: 'auto' }}>
              {environments.map((env, index) => (
                <div key={env.environment} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginBottom: 8,
                  padding: '4px 8px',
                  backgroundColor: index % 2 === 0 ? '#fafafa' : 'transparent',
                  borderRadius: 4
                }}>
                  <span style={{ fontWeight: env.environment === 'unknown' ? 'bold' : 'normal' }}>
                    {env.environment}
                    {env.environment === 'unknown' && <WarningOutlined style={{ marginLeft: 4, color: '#faad14' }} />}
                  </span>
                  <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                    {env.service_count}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card 
            title="Top Namespaces" 
            size="small"
            style={{ height: 200 }}
          >
            <div style={{ maxHeight: 120, overflowY: 'auto' }}>
              {namespaces.map((ns, index) => (
                <div key={ns.namespace} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginBottom: 8,
                  padding: '4px 8px',
                  backgroundColor: index % 2 === 0 ? '#fafafa' : 'transparent',
                  borderRadius: 4
                }}>
                  <span>{ns.namespace}</span>
                  <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                    {ns.service_count}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Health Alerts */}
      {(summary.stale_services > 0 || summary.missing_metadata > 0) && (
        <Row style={{ marginTop: 16 }}>
          <Col span={24}>
            <Alert
              message="Service Health Issues Detected"
              description={
                <div>
                  {summary.stale_services > 0 && (
                    <div>• {summary.stale_services} services haven't been seen in 7+ days</div>
                  )}
                  {summary.missing_metadata > 0 && (
                    <div>• {summary.missing_metadata} services are missing team or environment metadata</div>
                  )}
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    Consider reviewing these services for cleanup or proper instrumentation.
                  </div>
                </div>
              }
              type="warning"
              showIcon
              style={{ backgroundColor: '#fffbe6' }}
            />
          </Col>
        </Row>
      )}
    </div>
  );
};