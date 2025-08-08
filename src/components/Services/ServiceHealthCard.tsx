import React from 'react';
import { Card, Statistic, Progress, Typography, Space, Tag, Tooltip } from 'antd';
import { AlertOutlined, CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { ServiceDetailResponse } from '../../types';

const { Text } = Typography;

interface ServiceHealthCardProps {
  serviceData: ServiceDetailResponse;
}

export const ServiceHealthCard: React.FC<ServiceHealthCardProps> = ({ serviceData }) => {
  const { service, alerts, metrics } = serviceData;
  
  // Calculate alert-free days
  const calculateAlertFreeDays = () => {
    if (!alerts.history || alerts.history.length === 0) {
      const serviceAge = Math.floor(
        (new Date().getTime() - new Date(service.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      return serviceAge;
    }

    const mostRecentAlert = alerts.history[0];
    if (!mostRecentAlert || !mostRecentAlert.resolved_at) {
      return 0; // Currently has active alerts
    }

    return Math.floor(
      (new Date().getTime() - new Date(mostRecentAlert.resolved_at).getTime()) / (1000 * 60 * 60 * 24)
    );
  };

  // Calculate health score (0-100)
  const calculateHealthScore = () => {
    let score = 100;
    
    // Deduct points for current alerts
    if (metrics.critical_alert_count > 0) score -= 40;
    else if (metrics.current_alert_count > 0) score -= 20;
    
    // Factor in alert-free days (bonus for longer periods)
    const alertFreeDays = calculateAlertFreeDays();
    if (alertFreeDays < 1) score -= 30;
    else if (alertFreeDays < 7) score -= 10;
    else if (alertFreeDays >= 30) score += 5;
    
    return Math.max(0, Math.min(100, score));
  };

  // Get severity breakdown
  const getSeverityBreakdown = () => {
    const critical = metrics.critical_alert_count || 0;
    const warning = (metrics.current_alert_count || 0) - critical;
    
    return { critical, warning, total: metrics.current_alert_count || 0 };
  };

  const alertFreeDays = calculateAlertFreeDays();
  const healthScore = calculateHealthScore();
  const severityBreakdown = getSeverityBreakdown();

  // Determine health status color and text
  const getHealthStatus = () => {
    if (severityBreakdown.critical > 0) {
      return { color: '#ff4d4f', text: 'Critical Issues', icon: <CloseCircleOutlined /> };
    } else if (severityBreakdown.warning > 0) {
      return { color: '#faad14', text: 'Active Alerts', icon: <ExclamationCircleOutlined /> };
    } else if (healthScore >= 90) {
      return { color: '#52c41a', text: 'Excellent', icon: <CheckCircleOutlined /> };
    } else if (healthScore >= 70) {
      return { color: '#1890ff', text: 'Good', icon: <CheckCircleOutlined /> };
    } else {
      return { color: '#faad14', text: 'Fair', icon: <ExclamationCircleOutlined /> };
    }
  };

  const healthStatus = getHealthStatus();

  return (
    <Card 
      title={
        <Space>
          <AlertOutlined style={{ color: healthStatus.color }} />
          <span>Service Health</span>
        </Space>
      }
      size="small"
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* Overall Health Score */}
        <div style={{ textAlign: 'center' }}>
          <Progress
            type="circle"
            percent={healthScore}
            size={80}
            strokeColor={
              healthScore >= 90 ? '#52c41a' :
              healthScore >= 70 ? '#1890ff' :
              healthScore >= 50 ? '#faad14' : '#ff4d4f'
            }
            format={() => (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{healthScore}</div>
                <div style={{ fontSize: '10px', color: '#8c8c8c' }}>Score</div>
              </div>
            )}
          />
          <div style={{ marginTop: '8px' }}>
            <Space>
              {healthStatus.icon}
              <Text style={{ color: healthStatus.color, fontWeight: 'bold' }}>
                {healthStatus.text}
              </Text>
            </Space>
          </div>
        </div>

        {/* Current Alerts */}
        <div>
          <Statistic
            title="Current Alerts"
            value={severityBreakdown.total}
            valueStyle={{ 
              color: severityBreakdown.critical > 0 ? '#ff4d4f' : 
                     severityBreakdown.total > 0 ? '#faad14' : '#52c41a',
              fontSize: '24px'
            }}
          />
          
          {severityBreakdown.total > 0 && (
            <div style={{ marginTop: '8px' }}>
              <Space wrap>
                {severityBreakdown.critical > 0 && (
                  <Tag color="error">
                    {severityBreakdown.critical} Critical
                  </Tag>
                )}
                {severityBreakdown.warning > 0 && (
                  <Tag color="warning">
                    {severityBreakdown.warning} Warning
                  </Tag>
                )}
              </Space>
            </div>
          )}
        </div>

        {/* Alert-Free Days */}
        <div>
          <Statistic
            title="Alert-Free Days"
            value={alertFreeDays}
            suffix="days"
            valueStyle={{ 
              color: alertFreeDays >= 30 ? '#52c41a' :
                     alertFreeDays >= 7 ? '#1890ff' :
                     alertFreeDays >= 1 ? '#faad14' : '#ff4d4f',
              fontSize: '24px'
            }}
          />
          <div style={{ marginTop: '4px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {alertFreeDays === 0 ? 'Currently has active alerts' :
               alertFreeDays === 1 ? 'Since yesterday' :
               alertFreeDays < 7 ? 'Less than a week' :
               alertFreeDays < 30 ? 'Less than a month' :
               'Excellent stability'}
            </Text>
          </div>
        </div>

        {/* Severity Indicators */}
        {severityBreakdown.total > 0 && (
          <div>
            <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
              Alert Breakdown:
            </Text>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Tooltip title="Critical alerts require immediate attention">
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  padding: '4px 8px',
                  backgroundColor: severityBreakdown.critical > 0 ? '#fff2f0' : '#f0f0f0',
                  borderRadius: '4px',
                  border: `1px solid ${severityBreakdown.critical > 0 ? '#ffccc7' : '#d9d9d9'}`
                }}>
                  <div style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: '#ff4d4f' 
                  }} />
                  <Text style={{ fontSize: '12px' }}>
                    Critical: {severityBreakdown.critical}
                  </Text>
                </div>
              </Tooltip>

              <Tooltip title="Warning alerts should be monitored">
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  padding: '4px 8px',
                  backgroundColor: severityBreakdown.warning > 0 ? '#fffbe6' : '#f0f0f0',
                  borderRadius: '4px',
                  border: `1px solid ${severityBreakdown.warning > 0 ? '#ffe58f' : '#d9d9d9'}`
                }}>
                  <div style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: '#faad14' 
                  }} />
                  <Text style={{ fontSize: '12px' }}>
                    Warning: {severityBreakdown.warning}
                  </Text>
                </div>
              </Tooltip>
            </div>
          </div>
        )}
      </Space>
    </Card>
  );
};