import React from 'react';
import { Tag, Space, theme } from 'antd';
import { AlertOutlined, ClockCircleOutlined, NumberOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import type { ServiceGroup } from '../../types';

interface ThemedServiceRowProps {
  serviceGroup: ServiceGroup;
  isExpanded: boolean;
  onToggleExpand: (serviceKey: string) => void;
}

export const ThemedServiceRow: React.FC<ThemedServiceRowProps> = ({ 
  serviceGroup, 
  isExpanded, 
  onToggleExpand 
}) => {
  // Get theme token to detect dark mode
  const { token } = theme.useToken();
  
  // Detect if we're in dark mode
  const isDarkMode = token.colorBgContainer && (
    token.colorBgContainer.includes('#1') || 
    token.colorBgContainer.includes('#0') ||
    token.colorBgContainer === 'rgb(20, 20, 20)' ||
    parseInt(token.colorBgContainer.replace('#', ''), 16) < 0x808080
  );

  // Get severity color and styling (keep severity colors consistent)
  const getSeverityStyle = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'fatal':
        return { 
          color: 'white', 
          backgroundColor: 'black',
          // Use purple border for fatal in dark mode for visibility
          borderColor: isDarkMode ? '#a855f7' : 'black'
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
          backgroundColor: 'var(--accent-primary)',
          borderColor: 'var(--accent-primary)'
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

  // Get theme-aware background colors
  const getBackgroundColor = (expanded: boolean, hovered: boolean = false) => {
    if (expanded) {
      return hovered ? 'var(--bg-tertiary)' : 'var(--bg-secondary)';
    }
    return hovered ? 'var(--bg-secondary)' : 'var(--bg-primary)';
  };

  return (
    <div 
      style={{ 
        padding: '12px 16px',
        backgroundColor: getBackgroundColor(isExpanded),
        border: `2px solid ${severityStyle.borderColor}`,
        borderRadius: '6px',
        marginBottom: '1px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onClick={handleClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = getBackgroundColor(isExpanded, true);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = getBackgroundColor(isExpanded, false);
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
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center'
          }}>
            {isExpanded ? (
              <DownOutlined style={{ marginRight: '8px', color: 'var(--accent-primary)' }} />
            ) : (
              <RightOutlined style={{ marginRight: '8px', color: 'var(--text-secondary)' }} />
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
            
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              <NumberOutlined style={{ marginRight: '4px' }} />
              {serviceGroup.alertCount} alert{serviceGroup.alertCount !== 1 ? 's' : ''}
            </span>
            
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              <ClockCircleOutlined style={{ marginRight: '4px' }} />
              Longest: {formatDuration(serviceGroup.longestDuration)}
            </span>
          </Space>
        </div>

        {/* Right side - Latest activity and expand indicator */}
        <div style={{ 
          textAlign: 'right',
          color: 'var(--text-secondary)',
          fontSize: '12px'
        }}>
          <div>Latest: {formatTimeAgo(serviceGroup.latestActivity)}</div>
          <div style={{ 
            marginTop: '4px',
            color: 'var(--accent-primary)',
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