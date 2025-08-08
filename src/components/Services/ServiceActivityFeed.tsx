import React, { useMemo } from 'react';
import { Card, Typography, Space, Timeline, Tag, Empty, Divider, Tooltip, Button } from 'antd';
import { 
  ClockCircleOutlined, 
  AlertOutlined, 
  CheckCircleOutlined, 
  DatabaseOutlined,
  ApiOutlined,
  TeamOutlined,
  SettingOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import type { ServiceDetailResponse, Alert } from '../../types';

const { Text, Title } = Typography;

interface ServiceActivityFeedProps {
  serviceData: ServiceDetailResponse;
}

interface ActivityEvent {
  id: string;
  timestamp: string;
  type: 'alert_fired' | 'alert_resolved' | 'service_discovered' | 'dependency_change' | 'configuration_update';
  title: string;
  description: string;
  severity?: 'fatal' | 'critical' | 'warning' | 'info';
  metadata?: Record<string, any>;
}

export const ServiceActivityFeed: React.FC<ServiceActivityFeedProps> = ({ serviceData }) => {
  const { service, alerts, dependencies } = serviceData;
  
  // Generate activity events from available data
  const activityEvents = useMemo(() => {
    const events: ActivityEvent[] = [];
    
    // Add alert events
    alerts.current.forEach(alert => {
      // Alert fired event
      events.push({
        id: `alert-fired-${alert.alert_id}`,
        timestamp: alert.created_at || alert.first_seen,
        type: 'alert_fired',
        title: `Alert Fired: ${alert.severity.toUpperCase()}`,
        description: alert.message,
        severity: alert.severity,
        metadata: {
          alert_id: alert.alert_id,
          instance_id: alert.instance_id,
          count: alert.count,
          source: alert.alert_source
        }
      });
      
      // Alert resolved event (if resolved)
      if (alert.resolved_at) {
        const createdTime = new Date(alert.created_at).getTime();
        const resolvedTime = new Date(alert.resolved_at).getTime();
        const durationMinutes = Math.round((resolvedTime - createdTime) / (1000 * 60));
        
        events.push({
          id: `alert-resolved-${alert.alert_id}`,
          timestamp: alert.resolved_at,
          type: 'alert_resolved',
          title: `Alert Resolved: ${alert.severity.toUpperCase()}`,
          description: `${alert.message} (resolved in ${durationMinutes}m)`,
          severity: 'info',
          metadata: {
            alert_id: alert.alert_id,
            duration_minutes: durationMinutes,
            original_severity: alert.severity
          }
        });
      }
    });
    
    // Add service discovery event
    events.push({
      id: 'service-discovered',
      timestamp: service.created_at,
      type: 'service_discovered',
      title: 'Service Discovered',
      description: `${service.name} first discovered in ${service.namespace} namespace`,
      severity: 'info',
      metadata: {
        component_type: service.component_type,
        team: service.team,
        environment: service.environment
      }
    });
    
    // Add dependency events (simulated based on first_seen timestamps)
    const allDependencies = [...dependencies.incoming, ...dependencies.outgoing];
    allDependencies.forEach(dep => {
      if (dep.first_seen) {
        events.push({
          id: `dependency-${dep.namespace}-${dep.name}`,
          timestamp: dep.first_seen,
          type: 'dependency_change',
          title: 'New Dependency Detected',
          description: `Connection to ${dep.namespace}/${dep.name} (${dep.type})`,
          severity: 'info',
          metadata: {
            dependency_namespace: dep.namespace,
            dependency_name: dep.name,
            dependency_type: dep.type,
            direction: dependencies.outgoing.includes(dep) ? 'outgoing' : 'incoming'
          }
        });
      }
    });
    
    // Add configuration update events (simulated from service metadata)
    if (service.last_seen !== service.created_at) {
      events.push({
        id: 'config-update',
        timestamp: service.last_seen,
        type: 'configuration_update',
        title: 'Service Activity Detected',
        description: 'Recent telemetry or configuration updates detected',
        severity: 'info',
        metadata: {
          uptime_days: service.uptime_days,
          tag_count: Object.keys(service.tags).length
        }
      });
    }
    
    // Sort events by timestamp (newest first)
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [service, alerts.current, dependencies]);
  
  // Get event icon and color
  const getEventStyle = (event: ActivityEvent) => {
    switch (event.type) {
      case 'alert_fired':
        const severityColors = {
          fatal: { icon: <ExclamationCircleOutlined />, color: '#000000' },
          critical: { icon: <ExclamationCircleOutlined />, color: '#ff4d4f' },
          warning: { icon: <WarningOutlined />, color: '#faad14' },
          none: { icon: <InfoCircleOutlined />, color: '#1890ff' }
        };
        return severityColors[event.severity as keyof typeof severityColors] || severityColors.none;
      
      case 'alert_resolved':
        return { icon: <CheckCircleOutlined />, color: '#52c41a' };
      
      case 'service_discovered':
        return { icon: <ThunderboltOutlined />, color: '#722ed1' };
      
      case 'dependency_change':
        return { icon: <DatabaseOutlined />, color: '#1890ff' };
      
      case 'configuration_update':
        return { icon: <SettingOutlined />, color: '#faad14' };
      
      default:
        return { icon: <InfoCircleOutlined />, color: '#8c8c8c' };
    }
  };
  
  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays === 0) {
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return diffMinutes < 1 ? 'Just now' : `${diffMinutes}m ago`;
      }
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  // Group events by date for better organization
  const groupedEvents = useMemo(() => {
    const groups: Record<string, ActivityEvent[]> = {};
    
    activityEvents.forEach(event => {
      const dateKey = new Date(event.timestamp).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    });
    
    return groups;
  }, [activityEvents]);
  
  // Calculate activity summary statistics
  const activityStats = useMemo(() => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentEvents = activityEvents.filter(event => 
      new Date(event.timestamp) >= oneDayAgo
    );
    
    const weeklyEvents = activityEvents.filter(event => 
      new Date(event.timestamp) >= oneWeekAgo
    );
    
    const alertEvents = activityEvents.filter(event => 
      event.type === 'alert_fired' || event.type === 'alert_resolved'
    );
    
    return {
      total: activityEvents.length,
      last24h: recentEvents.length,
      lastWeek: weeklyEvents.length,
      alertsTotal: alertEvents.length,
      alertsFired: activityEvents.filter(e => e.type === 'alert_fired').length,
      alertsResolved: activityEvents.filter(e => e.type === 'alert_resolved').length
    };
  }, [activityEvents]);
  
  return (
    <Card 
      title={
        <Space>
          <ClockCircleOutlined style={{ color: '#1890ff' }} />
          <span>Service Activity Feed</span>
          <Tag color="blue">{activityStats.total} events</Tag>
          {activityStats.last24h > 0 && (
            <Tag color="orange">{activityStats.last24h} in 24h</Tag>
          )}
        </Space>
      }
      extra={
        <Button 
          icon={<ReloadOutlined />} 
          size="small" 
          type="text"
          onClick={() => window.location.reload()}
        >
          Refresh
        </Button>
      }
      size="small"
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* Activity Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px',
          padding: '12px',
          backgroundColor: '#fafafa',
          borderRadius: '6px',
          border: '1px solid #f0f0f0'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
              {activityStats.total}
            </div>
            <div style={{ fontSize: '11px', color: '#8c8c8c' }}>Total Events</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#faad14' }}>
              {activityStats.last24h}
            </div>
            <div style={{ fontSize: '11px', color: '#8c8c8c' }}>Last 24h</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff4d4f' }}>
              {activityStats.alertsFired}
            </div>
            <div style={{ fontSize: '11px', color: '#8c8c8c' }}>Alerts Fired</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
              {activityStats.alertsResolved}
            </div>
            <div style={{ fontSize: '11px', color: '#8c8c8c' }}>Resolved</div>
          </div>
        </div>
        
        <Divider style={{ margin: '8px 0' }} />
        
        {/* Activity Timeline */}
        {activityEvents.length > 0 ? (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {Object.entries(groupedEvents).map(([dateKey, events]) => (
              <div key={dateKey} style={{ marginBottom: '24px' }}>
                <Text strong style={{ 
                  fontSize: '13px', 
                  color: '#595959',
                  display: 'block',
                  marginBottom: '12px',
                  paddingBottom: '4px',
                  borderBottom: '1px solid #f0f0f0'
                }}>
                  {new Date(dateKey).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Text>
                
                <Timeline size="small">
                  {events.map(event => {
                    const style = getEventStyle(event);
                    
                    return (
                      <Timeline.Item
                        key={event.id}
                        dot={React.cloneElement(style.icon, { 
                          style: { color: style.color, fontSize: '14px' } 
                        })}
                        color={style.color}
                      >
                        <div style={{ paddingBottom: '12px' }}>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'flex-start',
                            marginBottom: '4px'
                          }}>
                            <Text strong style={{ fontSize: '13px', color: '#262626' }}>
                              {event.title}
                            </Text>
                            <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>
                              {formatTimestamp(event.timestamp)}
                            </Text>
                          </div>
                          
                          <Text style={{ fontSize: '12px', color: '#595959', display: 'block', marginBottom: '6px' }}>
                            {event.description}
                          </Text>
                          
                          {/* Event metadata tags */}
                          {event.metadata && (
                            <Space size={4} wrap>
                              {event.metadata.instance_id && (
                                <Tag size="small" color="default">
                                  {event.metadata.instance_id}
                                </Tag>
                              )}
                              {event.metadata.count && event.metadata.count > 1 && (
                                <Tag size="small" color="blue">
                                  ×{event.metadata.count}
                                </Tag>
                              )}
                              {event.metadata.source && (
                                <Tag size="small" color="purple">
                                  {event.metadata.source}
                                </Tag>
                              )}
                              {event.metadata.duration_minutes && (
                                <Tag size="small" color="green">
                                  {event.metadata.duration_minutes}m
                                </Tag>
                              )}
                              {event.metadata.direction && (
                                <Tag size="small" color="orange">
                                  {event.metadata.direction}
                                </Tag>
                              )}
                            </Space>
                          )}
                        </div>
                      </Timeline.Item>
                    );
                  })}
                </Timeline>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" size={4}>
                <Text style={{ color: '#8c8c8c', fontSize: '16px' }}>
                  No Recent Activity
                </Text>
                <Text type="secondary" style={{ fontSize: '14px' }}>
                  No events recorded for this service
                </Text>
              </Space>
            }
          />
        )}
        
        {/* Service Summary */}
        <div style={{ 
          backgroundColor: '#f9f9f9', 
          padding: '12px', 
          borderRadius: '6px',
          border: '1px solid #f0f0f0'
        }}>
          <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: '6px' }}>
            Service Overview:
          </Text>
          <Space direction="vertical" size={2}>
            <Text style={{ fontSize: '11px', color: '#595959' }}>
              <strong>{service.name}</strong> in {service.namespace} • 
              {service.component_type && ` ${service.component_type} •`}
              {service.team && ` Team: ${service.team} •`}
              {service.uptime_days !== null && ` ${service.uptime_days} days uptime`}
            </Text>
            <Text style={{ fontSize: '11px', color: '#595959' }}>
              Last seen: {new Date(service.last_seen).toLocaleString()} • 
              {dependencies.incoming.length + dependencies.outgoing.length} dependencies • 
              {Object.keys(service.tags).length} tags
            </Text>
          </Space>
        </div>
      </Space>
    </Card>
  );
};