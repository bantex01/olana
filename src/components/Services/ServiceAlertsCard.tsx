import React, { useMemo } from 'react';
import { Card, Typography, Space, Tag, Empty, Badge, Row, Col, Divider } from 'antd';
import { AlertOutlined, CheckCircleOutlined, ExclamationCircleOutlined, WarningOutlined } from '@ant-design/icons';
import type { ServiceDetailResponse, Alert } from '../../types';
import { AlertItem } from '../Alerts/AlertItem';

const { Text, Title } = Typography;

interface ServiceAlertsCardProps {
  serviceData: ServiceDetailResponse;
}

export const ServiceAlertsCard: React.FC<ServiceAlertsCardProps> = ({ serviceData }) => {
  const { service, alerts } = serviceData;
  
  // Filter alerts for this specific service
  const serviceAlerts = useMemo(() => {
    return alerts.current.filter(alert => 
      alert.service_namespace === service.namespace && 
      alert.service_name === service.name
    );
  }, [alerts.current, service.namespace, service.name]);
  
  // Group alerts by status and severity
  const alertGroups = useMemo(() => {
    const groups = {
      firing: serviceAlerts.filter(alert => alert.status === 'firing'),
      resolved: serviceAlerts.filter(alert => alert.status === 'resolved')
    };
    
    // Group firing alerts by severity
    const firingBySeverity = {
      fatal: groups.firing.filter(alert => alert.severity === 'fatal'),
      critical: groups.firing.filter(alert => alert.severity === 'critical'),
      warning: groups.firing.filter(alert => alert.severity === 'warning'),
      none: groups.firing.filter(alert => alert.severity === 'none')
    };
    
    return {
      ...groups,
      firingBySeverity,
      totalFiring: groups.firing.length,
      totalResolved: groups.resolved.length,
      totalAlerts: serviceAlerts.length
    };
  }, [serviceAlerts]);
  
  // Get severity color and icon
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'fatal':
        return { color: '#000000', icon: <ExclamationCircleOutlined />, bg: '#fff1f0' };
      case 'critical':
        return { color: '#ff4d4f', icon: <ExclamationCircleOutlined />, bg: '#fff1f0' };
      case 'warning':
        return { color: '#faad14', icon: <WarningOutlined />, bg: '#fffbe6' };
      case 'none':
        return { color: '#1890ff', icon: <AlertOutlined />, bg: '#f0f9ff' };
      default:
        return { color: '#8c8c8c', icon: <AlertOutlined />, bg: '#fafafa' };
    }
  };
  
  // Calculate alert statistics
  const alertStats = useMemo(() => {
    if (alertGroups.totalAlerts === 0) {
      return { status: 'healthy', message: 'No active alerts' };
    }
    
    if (alertGroups.firingBySeverity.fatal.length > 0) {
      return { status: 'fatal', message: `${alertGroups.firingBySeverity.fatal.length} fatal alert(s)` };
    }
    
    if (alertGroups.firingBySeverity.critical.length > 0) {
      return { status: 'critical', message: `${alertGroups.firingBySeverity.critical.length} critical alert(s)` };
    }
    
    if (alertGroups.firingBySeverity.warning.length > 0) {
      return { status: 'warning', message: `${alertGroups.firingBySeverity.warning.length} warning alert(s)` };
    }
    
    if (alertGroups.totalFiring > 0) {
      return { status: 'info', message: `${alertGroups.totalFiring} active alert(s)` };
    }
    
    return { status: 'resolved', message: 'All alerts resolved' };
  }, [alertGroups]);
  
  const statusStyle = getSeverityStyle(alertStats.status);
  
  return (
    <Card 
      title={
        <Space>
          <AlertOutlined style={{ color: '#1890ff' }} />
          <span>Active Alerts</span>
          {alertGroups.totalFiring > 0 ? (
            <Tag color={statusStyle.color}>{alertGroups.totalFiring} active</Tag>
          ) : (
            <Tag color="green" icon={<CheckCircleOutlined />}>All Clear</Tag>
          )}
        </Space>
      }
      size="small"
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* Alert Summary */}
        <Row gutter={[8, 8]}>
          <Col span={6} style={{ textAlign: 'center' }}>
            <div style={{ 
              padding: '8px',
              backgroundColor: alertGroups.firingBySeverity.fatal.length > 0 ? '#fff1f0' : '#fafafa',
              borderRadius: '4px',
              border: `1px solid ${alertGroups.firingBySeverity.fatal.length > 0 ? '#ffccc7' : '#f0f0f0'}`
            }}>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: 'bold', 
                color: alertGroups.firingBySeverity.fatal.length > 0 ? '#000000' : '#8c8c8c'
              }}>
                {alertGroups.firingBySeverity.fatal.length}
              </div>
              <div style={{ fontSize: '10px', color: '#8c8c8c' }}>Fatal</div>
            </div>
          </Col>
          
          <Col span={6} style={{ textAlign: 'center' }}>
            <div style={{ 
              padding: '8px',
              backgroundColor: alertGroups.firingBySeverity.critical.length > 0 ? '#fff1f0' : '#fafafa',
              borderRadius: '4px',
              border: `1px solid ${alertGroups.firingBySeverity.critical.length > 0 ? '#ffccc7' : '#f0f0f0'}`
            }}>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: 'bold', 
                color: alertGroups.firingBySeverity.critical.length > 0 ? '#ff4d4f' : '#8c8c8c'
              }}>
                {alertGroups.firingBySeverity.critical.length}
              </div>
              <div style={{ fontSize: '10px', color: '#8c8c8c' }}>Critical</div>
            </div>
          </Col>
          
          <Col span={6} style={{ textAlign: 'center' }}>
            <div style={{ 
              padding: '8px',
              backgroundColor: alertGroups.firingBySeverity.warning.length > 0 ? '#fffbe6' : '#fafafa',
              borderRadius: '4px',
              border: `1px solid ${alertGroups.firingBySeverity.warning.length > 0 ? '#ffe58f' : '#f0f0f0'}`
            }}>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: 'bold', 
                color: alertGroups.firingBySeverity.warning.length > 0 ? '#faad14' : '#8c8c8c'
              }}>
                {alertGroups.firingBySeverity.warning.length}
              </div>
              <div style={{ fontSize: '10px', color: '#8c8c8c' }}>Warning</div>
            </div>
          </Col>
          
          <Col span={6} style={{ textAlign: 'center' }}>
            <div style={{ 
              padding: '8px',
              backgroundColor: alertGroups.firingBySeverity.none.length > 0 ? '#f0f9ff' : '#fafafa',
              borderRadius: '4px',
              border: `1px solid ${alertGroups.firingBySeverity.none.length > 0 ? '#91d5ff' : '#f0f0f0'}`
            }}>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: 'bold', 
                color: alertGroups.firingBySeverity.none.length > 0 ? '#1890ff' : '#8c8c8c'
              }}>
                {alertGroups.firingBySeverity.none.length}
              </div>
              <div style={{ fontSize: '10px', color: '#8c8c8c' }}>Info</div>
            </div>
          </Col>
        </Row>
        
        {/* Active Alerts List */}
        {alertGroups.totalFiring > 0 ? (
          <div>
            <Text strong style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>
              Firing Alerts ({alertGroups.totalFiring})
            </Text>
            
            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto',
              border: '1px solid #f0f0f0',
              borderRadius: '6px',
              backgroundColor: '#fafafa'
            }}>
              {/* Fatal Alerts */}
              {alertGroups.firingBySeverity.fatal.length > 0 && (
                <div style={{ padding: '12px', backgroundColor: '#fff1f0', marginBottom: '4px' }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#000000', 
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    lineHeight: '18px',
                    height: 'auto',
                    overflow: 'visible'
                  }}>
                    Fatal ({alertGroups.firingBySeverity.fatal.length})
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px' }}>
                    {alertGroups.firingBySeverity.fatal.map((alert, idx) => (
                      <AlertItem key={`fatal-${idx}`} alert={alert} />
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Critical Alerts */}
              {alertGroups.firingBySeverity.critical.length > 0 && (
                <div style={{ padding: '12px', backgroundColor: '#fff1f0', marginBottom: '4px' }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#ff4d4f', 
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    lineHeight: '18px',
                    height: 'auto',
                    overflow: 'visible'
                  }}>
                    Critical ({alertGroups.firingBySeverity.critical.length})
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px' }}>
                    {alertGroups.firingBySeverity.critical.map((alert, idx) => (
                      <AlertItem key={`critical-${idx}`} alert={alert} />
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Warning Alerts */}
              {alertGroups.firingBySeverity.warning.length > 0 && (
                <div style={{ padding: '12px', backgroundColor: '#fffbe6', marginBottom: '4px' }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#faad14', 
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    lineHeight: '18px',
                    height: 'auto',
                    overflow: 'visible'
                  }}>
                    Warning ({alertGroups.firingBySeverity.warning.length})
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px' }}>
                    {alertGroups.firingBySeverity.warning.map((alert, idx) => (
                      <AlertItem key={`warning-${idx}`} alert={alert} />
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Info Alerts */}
              {alertGroups.firingBySeverity.none.length > 0 && (
                <div style={{ padding: '12px', backgroundColor: '#f0f9ff', marginBottom: '4px' }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#1890ff', 
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    lineHeight: '18px',
                    height: 'auto',
                    overflow: 'visible'
                  }}>
                    Info ({alertGroups.firingBySeverity.none.length})
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px' }}>
                    {alertGroups.firingBySeverity.none.map((alert, idx) => (
                      <AlertItem key={`info-${idx}`} alert={alert} />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Space direction="vertical" size={4}>
                  <Text style={{ color: '#52c41a', fontSize: '16px', fontWeight: 'bold' }}>
                    All Clear!
                  </Text>
                  <Text type="secondary" style={{ fontSize: '14px' }}>
                    This service has no active alerts
                  </Text>
                </Space>
              }
            />
          </div>
        )}
        
        {/* Recently Resolved Alerts (if any) */}
        {alertGroups.totalResolved > 0 && (
          <>
            <Divider style={{ margin: '8px 0' }} />
            <div>
              <Text strong style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                Recently Resolved ({alertGroups.totalResolved})
              </Text>
              <div style={{ 
                maxHeight: '150px', 
                overflowY: 'auto',
                border: '1px solid #f0f0f0',
                borderRadius: '6px',
                backgroundColor: '#f6ffed',
                padding: '8px'
              }}>
                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                  {alertGroups.resolved.map((alert, idx) => (
                    <AlertItem key={`resolved-${idx}`} alert={alert} />
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
        
        {/* Service Alert Summary */}
        <div style={{ 
          backgroundColor: '#f9f9f9', 
          padding: '8px', 
          borderRadius: '4px',
          border: '1px solid #f0f0f0'
        }}>
          <Text style={{ fontSize: '11px', color: '#595959' }}>
            <strong>{service.name}</strong> • {service.namespace} • 
            {alertGroups.totalFiring === 0 ? (
              <span style={{ color: '#52c41a' }}> ✓ No active alerts</span>
            ) : (
              <span style={{ color: statusStyle.color }}>
                {' '}⚠ {alertGroups.totalFiring} active alert{alertGroups.totalFiring > 1 ? 's' : ''}
              </span>
            )}
            {alertGroups.totalResolved > 0 && (
              <span style={{ color: '#8c8c8c' }}>
                {' '}• {alertGroups.totalResolved} recently resolved
              </span>
            )}
          </Text>
        </div>
      </Space>
    </Card>
  );
};