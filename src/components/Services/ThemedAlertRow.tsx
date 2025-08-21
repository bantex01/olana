import React from 'react';
import { Tag, Space, Tooltip } from 'antd';
import { AlertOutlined, ClockCircleOutlined, UserOutlined, NumberOutlined } from '@ant-design/icons';
import type { Alert } from '../../types';

interface ThemedAlertRowProps {
  alert: Alert;
}

export const ThemedAlertRow: React.FC<ThemedAlertRowProps> = ({ alert }) => {
  // Get severity color and styling (keep severity colors, but use theme-aware backgrounds)
  const getSeverityProps = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'fatal':
        return { 
          color: 'black', 
          backgroundColor: 'var(--bg-tertiary)', 
          borderColor: '#000',
          tagColor: 'black'
        };
      case 'critical':
        return { 
          color: 'red', 
          backgroundColor: 'var(--bg-tertiary)', 
          borderColor: '#ff4d4f',
          tagColor: 'red'
        };
      case 'warning':
        return { 
          color: 'orange', 
          backgroundColor: 'var(--bg-tertiary)', 
          borderColor: '#faad14',
          tagColor: 'orange'
        };
      default:
        return { 
          color: 'blue', 
          backgroundColor: 'var(--bg-tertiary)', 
          borderColor: 'var(--accent-primary)',
          tagColor: 'blue'
        };
    }
  };

  // Format duration since first seen
  const formatDuration = (firstSeen: string) => {
    if (!firstSeen) return 'Unknown';
    const duration = Math.floor((Date.now() - new Date(firstSeen).getTime()) / 1000 / 60);
    return duration < 60 ? `${duration}m` : `${Math.floor(duration / 60)}h ${duration % 60}m`;
  };

  // Format last seen time
  const formatLastSeen = (lastSeen: string) => {
    if (!lastSeen) return 'Unknown';
    const timeAgo = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000 / 60);
    if (timeAgo < 60) return `${timeAgo}m ago`;
    if (timeAgo < 1440) return `${Math.floor(timeAgo / 60)}h ago`;
    return `${Math.floor(timeAgo / 1440)}d ago`;
  };

  const severityProps = getSeverityProps(alert.severity);

  return (
    <div style={{
      padding: '12px 16px',
      backgroundColor: severityProps.backgroundColor,
      border: `1px solid ${severityProps.borderColor}`,
      borderRadius: '4px',
      marginBottom: '8px',
      marginLeft: '24px', // Indent to show hierarchy
      marginRight: '16px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '8px'
      }}>
        {/* Alert message and basic info */}
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            marginBottom: '4px',
            color: 'var(--text-primary)',
            lineHeight: '1.4'
          }}>
            {alert.message}
          </div>
          
          <div style={{ 
            fontSize: '12px', 
            color: 'var(--text-secondary)',
            marginBottom: '6px' 
          }}>
            <UserOutlined style={{ marginRight: '4px' }} />
            {alert.service_namespace}::{alert.service_name} • {alert.instance_id}
          </div>
        </div>

        {/* Severity tag */}
        <Tag 
          icon={<AlertOutlined />}
          color={severityProps.tagColor}
          style={{ marginLeft: '16px' }}
        >
          {alert.severity.toUpperCase()}
        </Tag>
      </div>

      {/* Meta info row */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        fontSize: '11px',
        color: 'var(--text-secondary)'
      }}>
        <Space size="large">
          <span>
            <NumberOutlined style={{ marginRight: '4px' }} />
            Count: {alert.count}
          </span>
          
          <Tooltip title={`First seen: ${new Date(alert.first_seen).toLocaleString()}`}>
            <span>
              <ClockCircleOutlined style={{ marginRight: '4px' }} />
              Running for: {formatDuration(alert.first_seen)}
            </span>
          </Tooltip>
        </Space>

        <span>Last seen: {formatLastSeen(alert.last_seen)}</span>
      </div>
    </div>
  );
};