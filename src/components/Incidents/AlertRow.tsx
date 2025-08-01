import React from 'react';
import { Tag, Space, Tooltip } from 'antd';
import { AlertOutlined, ClockCircleOutlined, UserOutlined, NumberOutlined } from '@ant-design/icons';
import type { Alert } from '../../types';

interface AlertRowProps {
  alert: Alert;
}

export const AlertRow: React.FC<AlertRowProps> = ({ alert }) => {
  // Get severity color and styling
  const getSeverityProps = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'fatal':
        return { color: 'black', backgroundColor: '#000', borderColor: '#000' };
      case 'critical':
        return { color: 'red', backgroundColor: '#fff2f0', borderColor: '#ff4d4f' };
      case 'warning':
        return { color: 'orange', backgroundColor: '#fff7e6', borderColor: '#faad14' };
      default:
        return { color: 'blue', backgroundColor: '#f0f5ff', borderColor: '#1890ff' };
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
      transition: 'all 0.2s ease'
    }}>
      <div style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        {/* Left side - Alert details */}
        <div style={{ flex: 1, marginRight: '16px' }}>
          {/* Alert message */}
          <div style={{ 
            fontSize: '14px',
            fontWeight: '500',
            color: '#262626',
            marginBottom: '8px',
            lineHeight: '1.4'
          }}>
            <Tooltip title={alert.message} placement="top">
              <span style={{ cursor: 'help' }}>
                {alert.message.length > 100 
                  ? `${alert.message.substring(0, 100)}...` 
                  : alert.message
                }
              </span>
            </Tooltip>
          </div>

          {/* Alert metadata */}
          <Space size="middle" wrap>
            <Tag 
              icon={<AlertOutlined />}
              color={severityProps.color}
              style={{ fontWeight: 'bold' }}
            >
              {alert.severity.toUpperCase()}
            </Tag>

            {alert.instance_id && (
              <span style={{ fontSize: '12px', color: '#595959' }}>
                <UserOutlined style={{ marginRight: '4px' }} />
                {alert.instance_id}
              </span>
            )}

            <span style={{ fontSize: '12px', color: '#595959' }}>
              <ClockCircleOutlined style={{ marginRight: '4px' }} />
              Duration: {formatDuration(alert.first_seen || '')}
            </span>

            {alert.count && alert.count > 1 && (
              <Tag color="blue" icon={<NumberOutlined />}>
                {alert.count} occurrences
              </Tag>
            )}

            <Tag color="red">
              FIRING
            </Tag>
          </Space>
        </div>

        {/* Right side - Timestamps and actions */}
        <div style={{ 
          textAlign: 'right',
          color: '#8c8c8c',
          fontSize: '11px',
          minWidth: '120px'
        }}>
          <div style={{ marginBottom: '4px' }}>
            <strong>First seen:</strong><br />
            {alert.first_seen ? new Date(alert.first_seen).toLocaleString() : 'Unknown'}
          </div>
          <div style={{ marginBottom: '8px' }}>
            <strong>Last seen:</strong><br />
            {formatLastSeen(alert.last_seen || '')}
          </div>
          
          {/* Placeholder for future actions */}
          <div style={{ 
            fontSize: '10px',
            color: '#bfbfbf',
            fontStyle: 'italic'
          }}>
            Actions coming soon
          </div>
        </div>
      </div>

      {/* Additional details section */}
      {(alert.alert_source || alert.external_alert_id) && (
        <div style={{
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid #f0f0f0',
          fontSize: '11px',
          color: '#8c8c8c'
        }}>
          <Space size="middle">
            {alert.alert_source && (
              <span>Source: <strong>{alert.alert_source}</strong></span>
            )}
            {alert.external_alert_id && (
              <span>
                External ID: 
                <code style={{ 
                  backgroundColor: '#f5f5f5', 
                  padding: '1px 4px', 
                  marginLeft: '4px',
                  fontSize: '10px'
                }}>
                  {alert.external_alert_id.length > 20 
                    ? `${alert.external_alert_id.substring(0, 20)}...`
                    : alert.external_alert_id
                  }
                </code>
              </span>
            )}
          </Space>
        </div>
      )}
    </div>
  );
};