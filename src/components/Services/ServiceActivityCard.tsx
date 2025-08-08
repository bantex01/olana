import React from 'react';
import { Card, Statistic, Typography, Space, Tag, Tooltip, Timeline, Badge } from 'antd';
import { ClockCircleOutlined, CalendarOutlined, ThunderboltOutlined, EyeOutlined, RiseOutlined, EditOutlined } from '@ant-design/icons';
import type { ServiceDetailResponse } from '../../types';

const { Text } = Typography;

interface ServiceActivityCardProps {
  serviceData: ServiceDetailResponse;
}

export const ServiceActivityCard: React.FC<ServiceActivityCardProps> = ({ serviceData }) => {
  const { service, metrics } = serviceData;
  
  // Calculate service age in days
  const calculateServiceAge = () => {
    const createdDate = new Date(service.created_at);
    const now = new Date();
    return Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Calculate hours since last seen
  const calculateHoursSinceLastSeen = () => {
    const lastSeenDate = new Date(service.last_seen);
    const now = new Date();
    return Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60));
  };

  // Estimate 24h activity level
  const estimate24hActivity = () => {
    const hoursSinceLastSeen = calculateHoursSinceLastSeen();
    
    // If seen within last hour, assume high activity
    if (hoursSinceLastSeen < 1) return 'High';
    // If seen within last 6 hours, assume moderate activity  
    if (hoursSinceLastSeen < 6) return 'Moderate';
    // If seen within last 24 hours, assume low activity
    if (hoursSinceLastSeen < 24) return 'Low';
    // Otherwise, inactive
    return 'Inactive';
  };

  // Get activity status color
  const getActivityStatusColor = (activity: string) => {
    switch (activity) {
      case 'High': return '#52c41a';
      case 'Moderate': return '#1890ff';  
      case 'Low': return '#faad14';
      case 'Inactive': return '#ff4d4f';
      default: return '#8c8c8c';
    }
  };

  // Calculate recent changes indicator
  const calculateRecentChanges = () => {
    const serviceAge = calculateServiceAge();
    const hoursSinceLastSeen = calculateHoursSinceLastSeen();
    
    // New service (less than 7 days)
    if (serviceAge < 7) return { type: 'New Service', color: '#52c41a', count: 1 };
    
    // Recently active (seen within 24 hours)
    if (hoursSinceLastSeen < 24) return { type: 'Active', color: '#1890ff', count: 1 };
    
    // Recently inactive (not seen in 1-7 days)
    if (hoursSinceLastSeen < 168) return { type: 'Recently Quiet', color: '#faad14', count: 0 };
    
    // Long inactive
    return { type: 'Stale', color: '#ff4d4f', count: 0 };
  };

  // Format time duration  
  const formatTimeDuration = (hours: number) => {
    if (hours < 1) return 'Less than 1 hour ago';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  };

  // Generate activity timeline items
  const generateActivityTimeline = () => {
    const items = [];
    const serviceAge = calculateServiceAge();
    const hoursSinceLastSeen = calculateHoursSinceLastSeen();
    const recentChanges = calculateRecentChanges();

    // Service creation
    items.push({
      color: '#722ed1',
      children: (
        <div>
          <Text style={{ fontSize: '12px' }}>
            <strong>Service Discovered</strong>
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {new Date(service.created_at).toLocaleDateString()} ({serviceAge} days ago)
          </Text>
        </div>
      )
    });

    // Recent activity
    if (hoursSinceLastSeen < 168) { // Within a week
      items.unshift({
        color: getActivityStatusColor(estimate24hActivity()),
        children: (
          <div>
            <Text style={{ fontSize: '12px' }}>
              <strong>Last Activity</strong>
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {formatTimeDuration(hoursSinceLastSeen)}
            </Text>
          </div>
        )
      });
    }

    return items.slice(0, 3); // Show max 3 items
  };

  const serviceAge = calculateServiceAge();
  const hoursSinceLastSeen = calculateHoursSinceLastSeen();
  const activity24h = estimate24hActivity();
  const recentChanges = calculateRecentChanges();
  const timelineItems = generateActivityTimeline();

  return (
    <Card 
      title={
        <Space>
          <ClockCircleOutlined style={{ color: '#52c41a' }} />
          <span>Service Activity</span>
        </Space>
      }
      size="small"
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {/* Service Age */}
        <div style={{ textAlign: 'center' }}>
          <Statistic
            title="Service Age"
            value={serviceAge}
            suffix="days"
            valueStyle={{ 
              color: serviceAge < 7 ? '#52c41a' :
                     serviceAge < 30 ? '#1890ff' :
                     serviceAge < 365 ? '#722ed1' : '#8c8c8c',
              fontSize: '24px'
            }}
            prefix={<CalendarOutlined />}
          />
          <div style={{ marginTop: '4px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Discovered {new Date(service.created_at).toLocaleDateString()}
            </Text>
          </div>
        </div>

        {/* 24h Activity Estimate */}
        <div style={{ textAlign: 'center' }}>
          <Space direction="vertical" size={4}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Badge 
                color={getActivityStatusColor(activity24h)}
                dot 
              />
              <Text strong style={{ color: getActivityStatusColor(activity24h), fontSize: '14px' }}>
                {activity24h} Activity
              </Text>
            </div>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Based on recent telemetry
            </Text>
          </Space>
        </div>

        {/* Last Seen */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <Space>
              <EyeOutlined style={{ fontSize: '12px', color: '#1890ff' }} />
              <Text style={{ fontSize: '12px', fontWeight: 500 }}>Last Seen</Text>
            </Space>
          </div>
          <Text style={{ fontSize: '12px', color: '#595959' }}>
            {formatTimeDuration(hoursSinceLastSeen)}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: '10px' }}>
            {new Date(service.last_seen).toLocaleString()}
          </Text>
        </div>

        {/* Recent Changes Indicator */}
        <div style={{ textAlign: 'center' }}>
          <Space direction="vertical" size={4}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Tooltip title="Estimated changes based on service lifecycle">
                <Space>
                  <EditOutlined style={{ color: recentChanges.color, fontSize: '12px' }} />
                  <Text strong style={{ color: recentChanges.color, fontSize: '12px' }}>
                    {recentChanges.type}
                  </Text>
                </Space>
              </Tooltip>
            </div>
            
            {/* Activity Tags */}
            <Space wrap>
              {serviceAge < 7 && (
                <Tag color="green" style={{ fontSize: '10px' }}>New</Tag>
              )}
              {serviceAge >= 365 && (
                <Tag color="purple" style={{ fontSize: '10px' }}>Mature</Tag>
              )}
              {hoursSinceLastSeen < 1 && (
                <Tag color="blue" style={{ fontSize: '10px' }}>Live</Tag>
              )}
              {hoursSinceLastSeen > 168 && (
                <Tag color="orange" style={{ fontSize: '10px' }}>Stale</Tag>
              )}
            </Space>
          </Space>
        </div>

        {/* Activity Timeline */}
        <div>
          <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
            Recent Timeline:
          </Text>
          <Timeline 
            size="small"
            items={timelineItems}
            style={{ marginLeft: '8px' }}
          />
        </div>

        {/* Activity Summary */}
        <div style={{ 
          backgroundColor: '#fafafa', 
          padding: '8px', 
          borderRadius: '4px',
          border: '1px solid #f0f0f0'
        }}>
          <Space direction="vertical" size={2}>
            <Text style={{ fontSize: '11px', color: '#595959' }}>
              <RiseOutlined style={{ marginRight: '4px' }} />
              {serviceAge < 7 ? 'Recently discovered service' :
               serviceAge < 30 ? 'Young service, establishing patterns' :
               serviceAge < 365 ? 'Established service with history' : 'Mature, long-running service'}
            </Text>
            <Text style={{ fontSize: '11px', color: '#595959' }}>
              <ThunderboltOutlined style={{ marginRight: '4px' }} />
              {activity24h === 'High' ? 'Very active in telemetry' :
               activity24h === 'Moderate' ? 'Moderate telemetry activity' :
               activity24h === 'Low' ? 'Low recent activity' : 'No recent activity detected'}
            </Text>
          </Space>
        </div>
      </Space>
    </Card>
  );
};