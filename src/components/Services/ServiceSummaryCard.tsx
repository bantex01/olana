import React from 'react';
import { Card, Typography, Space, Tag, Avatar, Row, Col, Statistic } from 'antd';
import {
  AlertOutlined,
  DatabaseOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import type { ServiceSummary } from '../../types';

const { Text } = Typography;

interface ServiceSummaryCardProps {
  service: ServiceSummary;
  onSelect?: () => void;
  selected?: boolean;
}

export const ServiceSummaryCard: React.FC<ServiceSummaryCardProps> = ({
  service,
  onSelect,
  selected = false
}) => {
  // Get service activity status
  const getActivityStatus = () => {
    const now = new Date();
    const lastSeen = new Date(service.last_seen);
    const hoursInactive = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60));
    
    if (hoursInactive < 1) return { status: 'Active', color: '#52c41a' };
    if (hoursInactive < 24) return { status: 'Recent', color: '#1890ff' };
    if (hoursInactive < 168) return { status: 'Stale', color: '#faad14' };
    return { status: 'Inactive', color: '#ff4d4f' };
  };

  // Get health status based on alerts
  const getHealthStatus = () => {
    if (service.critical_alert_count > 0) {
      return { status: 'Critical', color: '#ff4d4f', icon: <ExclamationCircleOutlined /> };
    }
    if (service.current_alert_count > 0) {
      return { status: 'Warning', color: '#faad14', icon: <AlertOutlined /> };
    }
    return { status: 'Healthy', color: '#52c41a', icon: <CheckCircleOutlined /> };
  };

  const activityStatus = getActivityStatus();
  const healthStatus = getHealthStatus();

  return (
    <Card
      hoverable
      onClick={onSelect}
      style={{
        marginBottom: '12px',
        border: selected ? '2px solid #1890ff' : '1px solid #f0f0f0',
        boxShadow: selected ? '0 4px 12px rgba(24, 144, 255, 0.15)' : undefined,
        cursor: onSelect ? 'pointer' : 'default'
      }}
      bodyStyle={{ padding: '16px' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        {/* Service Avatar */}
        <Avatar
          size={48}
          style={{
            backgroundColor: service.component_type === 'web-service' ? '#1890ff' :
                            service.component_type === 'database' ? '#52c41a' :
                            service.component_type === 'message-queue' ? '#faad14' : '#722ed1',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {service.name.substring(0, 2).toUpperCase()}
        </Avatar>

        {/* Main Service Info */}
        <div style={{ flex: 1 }}>
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <Text strong style={{ fontSize: '16px', display: 'block' }}>
                {service.name}
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {service.namespace}
              </Text>
            </div>
            
            {/* Health Status */}
            <Tag
              color={healthStatus.color}
              icon={healthStatus.icon}
              style={{ marginLeft: '8px' }}
            >
              {healthStatus.status}
            </Tag>
          </div>

          {/* Service Details Row */}
          <Space direction="vertical" size={4} style={{ width: '100%', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              {service.environment && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <EnvironmentOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
                  <Tag color="blue">{service.environment}</Tag>
                </div>
              )}
              
              {service.team && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <TeamOutlined style={{ color: '#52c41a', fontSize: '12px' }} />
                  <Tag color="green">{service.team}</Tag>
                </div>
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ClockCircleOutlined style={{ color: activityStatus.color, fontSize: '12px' }} />
                <Tag color={activityStatus.color}>{activityStatus.status}</Tag>
              </div>
            </div>
          </Space>

          {/* Metrics Row */}
          <Row gutter={[16, 8]}>
            <Col span={6}>
              <Statistic
                title="Alerts"
                value={service.current_alert_count}
                valueStyle={{ 
                  fontSize: '14px', 
                  color: service.current_alert_count > 0 ? '#ff4d4f' : '#8c8c8c' 
                }}
                prefix={<AlertOutlined style={{ fontSize: '12px' }} />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Dependencies"
                value={service.dependency_count}
                valueStyle={{ 
                  fontSize: '14px', 
                  color: service.dependency_count > 0 ? '#1890ff' : '#8c8c8c' 
                }}
                prefix={<DatabaseOutlined style={{ fontSize: '12px' }} />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Uptime"
                value={service.uptime_days !== null ? `${service.uptime_days}d` : 'N/A'}
                valueStyle={{ fontSize: '14px', color: '#52c41a' }}
                prefix={<ClockCircleOutlined style={{ fontSize: '12px' }} />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Tags"
                value={Object.keys(service.tags).length}
                valueStyle={{ fontSize: '14px', color: '#722ed1' }}
              />
            </Col>
          </Row>

          {/* Tags Preview */}
          {Object.keys(service.tags).length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <Space size={4} wrap>
                {Object.entries(service.tags).slice(0, 3).map(([key, _value]) => (
                  <Tag key={key} style={{ fontSize: '10px' }}>
                    {key}
                  </Tag>
                ))}
                {Object.keys(service.tags).length > 3 && (
                  <Tag style={{ fontSize: '10px' }}>
                    +{Object.keys(service.tags).length - 3} more
                  </Tag>
                )}
              </Space>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};