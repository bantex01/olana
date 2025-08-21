import React from 'react';
import { Descriptions, Tag, Button, Space, Typography, Divider } from 'antd';
import { 
  ClusterOutlined, 
  CloudServerOutlined, 
  ClockCircleOutlined,
  AlertOutlined,
  BookOutlined,
  PlayCircleOutlined,
  ToolOutlined
} from '@ant-design/icons';
import type { ServiceGroup } from '../../types';

const { Text, Paragraph } = Typography;

interface ServiceDetailsPanelProps {
  serviceGroup: ServiceGroup;
}

export const ServiceDetailsPanel: React.FC<ServiceDetailsPanelProps> = ({ 
  serviceGroup 
}) => {
  // Format duration
  const formatDuration = (durationMs: number) => {
    if (durationMs === 0) return 'Unknown';
    const duration = Math.floor(durationMs / 1000 / 60);
    return duration < 60 ? `${duration}m` : `${Math.floor(duration / 60)}h ${duration % 60}m`;
  };

  // Format time ago
  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp) return 'Unknown';
    const timeAgo = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000 / 60);
    return timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ago`;
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'fatal': return 'black';
      case 'critical': return 'red';
      case 'warning': return 'orange';
      default: return 'blue';
    }
  };

  return (
    <div style={{ color: 'var(--text-primary)' }}>
      
      {/* Service Overview */}
      <Descriptions 
        size="small" 
        column={1}
        style={{ marginBottom: '20px' }}
      >
        <Descriptions.Item label="Namespace">
          <Tag icon={<ClusterOutlined />} color="blue">
            {serviceGroup.serviceNamespace}
          </Tag>
        </Descriptions.Item>
        
        <Descriptions.Item label="Service Name">
          <Tag icon={<CloudServerOutlined />} color="green">
            {serviceGroup.serviceName}
          </Tag>
        </Descriptions.Item>
        
        <Descriptions.Item label="Current Status">
          <Tag 
            icon={<AlertOutlined />} 
            color={getSeverityColor(serviceGroup.highestSeverity)}
          >
            {serviceGroup.highestSeverity.toUpperCase()}
          </Tag>
        </Descriptions.Item>
        
        <Descriptions.Item label="Alert Count">
          <Text strong style={{ color: 'var(--text-primary)' }}>
            {serviceGroup.alertCount}
          </Text>
        </Descriptions.Item>
        
        <Descriptions.Item label="Longest Running">
          <Text style={{ color: 'var(--text-secondary)' }}>
            <ClockCircleOutlined style={{ marginRight: '4px' }} />
            {formatDuration(serviceGroup.longestDuration)}
          </Text>
        </Descriptions.Item>
        
        <Descriptions.Item label="Latest Activity">
          <Text style={{ color: 'var(--text-secondary)' }}>
            {formatTimeAgo(serviceGroup.latestActivity)}
          </Text>
        </Descriptions.Item>
      </Descriptions>

      <Divider style={{ margin: '16px 0', borderColor: 'var(--border)' }} />

      {/* Service Actions */}
      <div style={{ marginBottom: '20px' }}>
        <Text strong style={{ 
          display: 'block', 
          marginBottom: '12px', 
          color: 'var(--text-primary)' 
        }}>
          Quick Actions
        </Text>
        
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Button 
            icon={<BookOutlined />} 
            size="small" 
            block
            disabled
            style={{ textAlign: 'left' }}
          >
            View Runbooks
          </Button>
          
          <Button 
            icon={<PlayCircleOutlined />} 
            size="small" 
            block
            disabled
            style={{ textAlign: 'left' }}
          >
            Execute Remediation
          </Button>
          
          <Button 
            icon={<ToolOutlined />} 
            size="small" 
            block
            disabled
            style={{ textAlign: 'left' }}
          >
            Service Configuration
          </Button>
        </Space>
      </div>

      <Divider style={{ margin: '16px 0', borderColor: 'var(--border)' }} />

      {/* Alert Summary */}
      <div>
        <Text strong style={{ 
          display: 'block', 
          marginBottom: '8px', 
          color: 'var(--text-primary)' 
        }}>
          Alert Breakdown
        </Text>
        
        <Paragraph style={{ 
          fontSize: '12px', 
          color: 'var(--text-secondary)',
          marginBottom: '12px'
        }}>
          Summary of all active alerts for this service:
        </Paragraph>

        {/* Group alerts by severity */}
        {(() => {
          const severityGroups = serviceGroup.alerts.reduce((acc, alert) => {
            acc[alert.severity] = (acc[alert.severity] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          return (
            <Space wrap>
              {Object.entries(severityGroups).map(([severity, count]) => (
                <Tag 
                  key={severity} 
                  color={getSeverityColor(severity)}
                  style={{ marginBottom: '4px' }}
                >
                  {count} {severity}
                </Tag>
              ))}
            </Space>
          );
        })()}
      </div>

      {/* Footer note */}
      <div style={{ 
        marginTop: '20px', 
        padding: '8px',
        backgroundColor: 'var(--bg-tertiary)',
        borderRadius: '4px',
        border: '1px solid var(--border)'
      }}>
        <Text style={{ 
          fontSize: '11px', 
          color: 'var(--text-secondary)',
          fontStyle: 'italic'
        }}>
          💡 Advanced service actions and integrations will be added in future iterations
        </Text>
      </div>

    </div>
  );
};