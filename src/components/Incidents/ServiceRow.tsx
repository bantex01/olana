import React from 'react';
import { Tag, Space } from 'antd';
import { AlertOutlined, ClockCircleOutlined, NumberOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import type { ServiceGroup } from '../../types';

interface ServiceRowProps {
  serviceGroup: ServiceGroup;
  isExpanded: boolean;
  onToggleExpand: (serviceKey: string) => void;
}

export const ServiceRow: React.FC<ServiceRowProps> = ({ 
  serviceGroup, 
  isExpanded, 
  onToggleExpand 
}) => {
  // Get severity color and styling
  const getSeverityStyle = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'fatal':
        return { 
          color: 'white', 
          backgroundColor: 'black',
          borderColor: 'black'
        };
      case 'critical':
        return { 
          color: 'white', 
          backgroundColor: '#ff4d4f',
          borderColor: '#ff4d4f'
        };
      case 'warning':
        return { 
          color: 'white', 
          backgroundColor: '#faad14',
          borderColor: '#faad14'
        };
      default:
        return { 
          color: 'white', 
          backgroundColor: '#1890ff',
          borderColor: '#1890ff'
        };
    }
  };

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

  const severityStyle = getSeverityStyle(serviceGroup.highestSeverity);

  const handleClick = () => {
    onToggleExpand(serviceGroup.serviceKey);
  };

  return (
    <div 
      style={{ 
        padding: '12px 16px',
        backgroundColor: isExpanded ? '#e6f7ff' : '#fafafa',
        border: `2px solid ${severityStyle.borderColor}`,
        borderRadius: '6px',
        marginBottom: '1px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onClick={handleClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = isExpanded ? '#bae7ff' : '#f0f0f0';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isExpanded ? '#e6f7ff' : '#fafafa';
      }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        {/* Left side - Service name and key info */}
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: 'bold', 
            marginBottom: '4px',
            color: '#262626',
            display: 'flex',
            alignItems: 'center'
          }}>
            {isExpanded ? (
              <DownOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            ) : (
              <RightOutlined style={{ marginRight: '8px', color: '#8c8c8c' }} />
            )}
            {serviceGroup.serviceKey}
          </div>
          
          <Space size="middle">
            <Tag 
              icon={<AlertOutlined />}
              style={severityStyle}
            >
              {serviceGroup.highestSeverity.toUpperCase()}
            </Tag>
            
            <span style={{ fontSize: '14px', color: '#595959' }}>
              <NumberOutlined style={{ marginRight: '4px' }} />
              {serviceGroup.alertCount} alert{serviceGroup.alertCount !== 1 ? 's' : ''}
            </span>
            
            <span style={{ fontSize: '14px', color: '#595959' }}>
              <ClockCircleOutlined style={{ marginRight: '4px' }} />
              Longest: {formatDuration(serviceGroup.longestDuration)}
            </span>
          </Space>
        </div>

        {/* Right side - Latest activity and expand indicator */}
        <div style={{ 
          textAlign: 'right',
          color: '#8c8c8c',
          fontSize: '12px'
        }}>
          <div>Latest: {formatTimeAgo(serviceGroup.latestActivity)}</div>
          <div style={{ 
            marginTop: '4px',
            color: '#1890ff',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            {isExpanded ? 'Click to collapse ▲' : 'Click to expand ▼'}
          </div>
        </div>
      </div>
    </div>
  );
};
