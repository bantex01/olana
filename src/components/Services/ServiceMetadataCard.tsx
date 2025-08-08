import React, { useMemo } from 'react';
import { Card, Typography, Space, Progress, Row, Col, Tag, Tooltip, Avatar, Statistic, Divider } from 'antd';
import { 
  TeamOutlined, 
  EnvironmentOutlined, 
  TrophyOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  StarOutlined,
  GlobalOutlined,
  SettingOutlined,
  ExclamationCircleOutlined,
  CrownOutlined,
  FireOutlined
} from '@ant-design/icons';
import type { ServiceDetailResponse } from '../../types';

const { Text, Title } = Typography;

interface ServiceMetadataCardProps {
  serviceData: ServiceDetailResponse;
}

export const ServiceMetadataCard: React.FC<ServiceMetadataCardProps> = ({ serviceData }) => {
  const { service, metrics, alerts } = serviceData;
  
  // Calculate service maturity score
  const maturityMetrics = useMemo(() => {
    const factors = {
      hasTeam: service.team ? 20 : 0,
      hasEnvironment: service.environment ? 15 : 0,
      hasComponentType: service.component_type ? 10 : 0,
      hasTags: Object.keys(service.tags).length > 0 ? 15 : 0,
      hasUptime: service.uptime_days !== null ? 20 : 0,
      isStable: service.uptime_days !== null && service.uptime_days > 30 ? 20 : 0
    };
    
    const totalScore = Object.values(factors).reduce((sum, score) => sum + score, 0);
    
    return {
      score: totalScore,
      factors,
      level: totalScore >= 80 ? 'Excellent' : totalScore >= 60 ? 'Good' : totalScore >= 40 ? 'Fair' : 'Needs Attention'
    };
  }, [service]);
  
  // Determine service criticality based on various factors
  const serviceCriticality = useMemo(() => {
    const criticalityFactors = {
      alertCount: metrics.current_alert_count || 0,
      criticalAlerts: metrics.critical_alert_count || 0,
      dependencyCount: metrics.dependency_count || 0,
      hasTeam: service.team ? 1 : 0,
      isProduction: service.environment?.toLowerCase() === 'production' ? 1 : 0
    };
    
    let score = 0;
    score += criticalityFactors.alertCount > 0 ? 20 : 0;
    score += criticalityFactors.criticalAlerts > 0 ? 30 : 0;
    score += criticalityFactors.dependencyCount > 10 ? 20 : criticalityFactors.dependencyCount > 5 ? 10 : 0;
    score += criticalityFactors.hasTeam ? 15 : 0;
    score += criticalityFactors.isProduction ? 15 : 0;
    
    if (score >= 70) return { level: 'Critical', color: '#ff4d4f', icon: <FireOutlined /> };
    if (score >= 40) return { level: 'Important', color: '#faad14', icon: <ExclamationCircleOutlined /> };
    return { level: 'Standard', color: '#52c41a', icon: <CheckCircleOutlined /> };
  }, [service, metrics]);
  
  // Calculate monitoring coverage
  const monitoringCoverage = useMemo(() => {
    const coverage = {
      alerts: alerts.current.length > 0 ? 25 : 0,
      dependencies: metrics.dependency_count > 0 ? 25 : 0,
      calls: (metrics.external_calls_count + metrics.database_calls_count + metrics.rpc_calls_count) > 0 ? 25 : 0,
      metadata: Object.keys(service.tags).length > 0 ? 25 : 0
    };
    
    const totalCoverage = Object.values(coverage).reduce((sum, score) => sum + score, 0);
    
    return {
      percentage: totalCoverage,
      status: totalCoverage >= 75 ? 'Excellent' : totalCoverage >= 50 ? 'Good' : totalCoverage >= 25 ? 'Basic' : 'Limited'
    };
  }, [service, metrics, alerts.current]);
  
  // Get service age and activity status
  const serviceActivity = useMemo(() => {
    const created = new Date(service.created_at);
    const lastSeen = new Date(service.last_seen);
    const now = new Date();
    
    const ageInDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    const inactiveHours = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60));
    
    const activityStatus = inactiveHours < 1 ? 'Active' : inactiveHours < 24 ? 'Recent' : inactiveHours < 168 ? 'Stale' : 'Inactive';
    
    return {
      age: ageInDays,
      inactiveHours,
      status: activityStatus,
      color: activityStatus === 'Active' ? '#52c41a' : activityStatus === 'Recent' ? '#1890ff' : activityStatus === 'Stale' ? '#faad14' : '#ff4d4f'
    };
  }, [service]);
  
  // Get maturity color
  const getMaturityColor = (score: number) => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#1890ff';
    if (score >= 40) return '#faad14';
    return '#ff4d4f';
  };
  
  return (
    <Card 
      title={
        <Space>
          <InfoCircleOutlined style={{ color: '#1890ff' }} />
          <span>Service Metadata & Operations</span>
          <Tag color={serviceCriticality.color}>
            {serviceCriticality.icon}
            {serviceCriticality.level}
          </Tag>
        </Space>
      }
      size="small"
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* Service Overview Row */}
        <Row gutter={[16, 16]}>
          {/* Service Identity */}
          <Col span={12}>
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#fafafa', 
              borderRadius: '6px',
              border: '1px solid #f0f0f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <Avatar 
                  size={40}
                  style={{ 
                    backgroundColor: service.component_type === 'web-service' ? '#1890ff' :
                                    service.component_type === 'database' ? '#52c41a' :
                                    service.component_type === 'message-queue' ? '#faad14' : '#722ed1',
                    marginRight: '12px'
                  }}
                >
                  {service.name.substring(0, 2).toUpperCase()}
                </Avatar>
                <div>
                  <Text strong style={{ fontSize: '14px', display: 'block' }}>{service.name}</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>{service.namespace}</Text>
                </div>
              </div>
              
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>Environment</Text>
                  <Tag color="blue">{service.environment || 'Unknown'}</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>Component Type</Text>
                  <Tag color="purple">{service.component_type || 'Unknown'}</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>Activity</Text>
                  <Tag color={serviceActivity.color}>{serviceActivity.status}</Tag>
                </div>
              </Space>
            </div>
          </Col>
          
          {/* Ownership & Team */}
          <Col span={12}>
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#fafafa', 
              borderRadius: '6px',
              border: '1px solid #f0f0f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <TeamOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                <Text strong style={{ fontSize: '14px' }}>Ownership</Text>
              </div>
              
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {service.team ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                      <CrownOutlined style={{ color: '#faad14', fontSize: '12px', marginRight: '6px' }} />
                      <Text strong style={{ fontSize: '13px' }}>{service.team}</Text>
                    </div>
                    <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>Responsible Team</Text>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '8px' }}>
                    <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: '16px', marginBottom: '4px' }} />
                    <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                      No team assigned
                    </Text>
                  </div>
                )}
                
                <Divider style={{ margin: '6px 0' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>Service Age</Text>
                  <Text style={{ fontSize: '12px', fontWeight: 'bold' }}>
                    {serviceActivity.age} days
                  </Text>
                </div>
                
                {service.uptime_days !== null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>Uptime</Text>
                    <Text style={{ fontSize: '12px', fontWeight: 'bold', color: '#52c41a' }}>
                      {service.uptime_days} days
                    </Text>
                  </div>
                )}
              </Space>
            </div>
          </Col>
        </Row>
        
        {/* Service Maturity & Monitoring */}
        <Row gutter={[16, 16]}>
          {/* Service Maturity */}
          <Col span={12}>
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#fafafa', 
              borderRadius: '6px',
              border: '1px solid #f0f0f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <Space>
                  <TrophyOutlined style={{ color: '#faad14' }} />
                  <Text strong style={{ fontSize: '14px' }}>Service Maturity</Text>
                </Space>
                <Tag color={getMaturityColor(maturityMetrics.score)}>
                  {maturityMetrics.level}
                </Tag>
              </div>
              
              <Progress 
                percent={maturityMetrics.score} 
                showInfo={false}
                strokeColor={getMaturityColor(maturityMetrics.score)}
                trailColor="#f0f0f0"
                size="small"
                style={{ marginBottom: '12px' }}
              />
              
              <Space direction="vertical" size={2} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>Configuration</Text>
                  <Text style={{ fontSize: '11px', color: maturityMetrics.factors.hasTeam + maturityMetrics.factors.hasEnvironment > 20 ? '#52c41a' : '#faad14' }}>
                    {maturityMetrics.factors.hasTeam + maturityMetrics.factors.hasEnvironment > 20 ? 'Complete' : 'Partial'}
                  </Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>Documentation</Text>
                  <Text style={{ fontSize: '11px', color: maturityMetrics.factors.hasTags ? '#52c41a' : '#ff4d4f' }}>
                    {maturityMetrics.factors.hasTags ? 'Tagged' : 'Missing'}
                  </Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>Stability</Text>
                  <Text style={{ fontSize: '11px', color: maturityMetrics.factors.isStable ? '#52c41a' : '#faad14' }}>
                    {maturityMetrics.factors.isStable ? 'Stable' : 'Developing'}
                  </Text>
                </div>
              </Space>
            </div>
          </Col>
          
          {/* Monitoring Coverage */}
          <Col span={12}>
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#fafafa', 
              borderRadius: '6px',
              border: '1px solid #f0f0f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <Space>
                  <SafetyOutlined style={{ color: '#1890ff' }} />
                  <Text strong style={{ fontSize: '14px' }}>Monitoring Coverage</Text>
                </Space>
                <Tag color={monitoringCoverage.percentage >= 75 ? 'green' : monitoringCoverage.percentage >= 50 ? 'blue' : 'orange'}>
                  {monitoringCoverage.status}
                </Tag>
              </div>
              
              <Progress 
                percent={monitoringCoverage.percentage} 
                showInfo={false}
                strokeColor={monitoringCoverage.percentage >= 75 ? '#52c41a' : monitoringCoverage.percentage >= 50 ? '#1890ff' : '#faad14'}
                trailColor="#f0f0f0"
                size="small"
                style={{ marginBottom: '12px' }}
              />
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: alerts.current.length > 0 ? '#52c41a' : '#d9d9d9',
                    marginRight: '6px'
                  }} />
                  <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>Alerts</Text>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: metrics.dependency_count > 0 ? '#52c41a' : '#d9d9d9',
                    marginRight: '6px'
                  }} />
                  <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>Dependencies</Text>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: (metrics.external_calls_count + metrics.database_calls_count + metrics.rpc_calls_count) > 0 ? '#52c41a' : '#d9d9d9',
                    marginRight: '6px'
                  }} />
                  <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>Tracing</Text>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: Object.keys(service.tags).length > 0 ? '#52c41a' : '#d9d9d9',
                    marginRight: '6px'
                  }} />
                  <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>Metadata</Text>
                </div>
              </div>
            </div>
          </Col>
        </Row>
        
        {/* Operational Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '16px',
          padding: '16px',
          backgroundColor: '#f6f8fa',
          borderRadius: '6px',
          border: '1px solid #e8e8e8'
        }}>
          <Statistic
            title="Criticality"
            value={serviceCriticality.level}
            valueStyle={{ 
              color: serviceCriticality.color,
              fontSize: '16px'
            }}
            prefix={serviceCriticality.icon}
          />
          
          <Statistic
            title="Maturity Score"
            value={`${maturityMetrics.score}%`}
            valueStyle={{ 
              color: getMaturityColor(maturityMetrics.score),
              fontSize: '16px'
            }}
            prefix={<StarOutlined />}
          />
          
          <Statistic
            title="Dependencies"
            value={metrics.dependency_count}
            valueStyle={{ 
              color: metrics.dependency_count > 10 ? '#faad14' : '#52c41a',
              fontSize: '16px'
            }}
            prefix={<GlobalOutlined />}
          />
          
          <Statistic
            title="Active Alerts"
            value={metrics.current_alert_count || 0}
            valueStyle={{ 
              color: metrics.current_alert_count > 0 ? '#ff4d4f' : '#52c41a',
              fontSize: '16px'
            }}
            prefix={<AlertOutlined />}
          />
        </div>
      </Space>
    </Card>
  );
};