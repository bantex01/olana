import React from 'react';
import { Card, Table, Tag, Timeline, Row, Col } from 'antd';
import { 
  ClockCircleOutlined,
  PlusCircleOutlined,
  EditOutlined,
  EyeOutlined,
  NodeIndexOutlined,
  TeamOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';

interface RecentActivityProps {
  recentActivity: Array<{
    service: string;
    team: string;
    environment: string;
    last_seen: string;
    created_at: string;
    activity_type: 'new' | 'updated' | 'seen';
  }>;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ recentActivity }) => {
  // Separate activities by type
  const newServices = recentActivity.filter(activity => activity.activity_type === 'new');
  const updatedServices = recentActivity.filter(activity => activity.activity_type === 'updated');
  const recentlySeen = recentActivity.filter(activity => activity.activity_type === 'seen');

  // Format time ago
  const formatTimeAgo = (timestamp: string) => {
    const timeAgo = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000 / 60);
    if (timeAgo < 60) return `${timeAgo}m ago`;
    if (timeAgo < 1440) return `${Math.floor(timeAgo / 60)}h ago`;
    return `${Math.floor(timeAgo / 1440)}d ago`;
  };

  // Get activity icon and color
  const getActivityProps = (type: string) => {
    switch (type) {
      case 'new':
        return { icon: <PlusCircleOutlined />, color: '#52c41a', label: 'New' };
      case 'updated':
        return { icon: <EditOutlined />, color: '#1890ff', label: 'Updated' };
      case 'seen':
        return { icon: <EyeOutlined />, color: '#8c8c8c', label: 'Active' };
      default:
        return { icon: <ClockCircleOutlined />, color: '#8c8c8c', label: 'Unknown' };
    }
  };

  // Table columns for detailed view
  const columns = [
    {
      title: 'Service',
      dataIndex: 'service',
      key: 'service',
      render: (service: string) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
          {service}
        </span>
      ),
    },
    {
      title: 'Activity',
      dataIndex: 'activity_type',
      key: 'activity_type',
      render: (type: string) => {
        const props = getActivityProps(type);
        return (
          <Tag color={props.color} icon={props.icon}>
            {props.label}
          </Tag>
        );
      },
      filters: [
        { text: 'New', value: 'new' },
        { text: 'Updated', value: 'updated' },
        { text: 'Active', value: 'seen' },
      ],
      onFilter: (value: any, record: any) => record.activity_type === value,
    },
    {
      title: 'Team',
      dataIndex: 'team',
      key: 'team',
      render: (team: string) => (
        <Tag color={team === 'unknown' ? 'orange' : 'blue'} icon={<TeamOutlined />}>
          {team}
        </Tag>
      ),
    },
    {
      title: 'Environment',
      dataIndex: 'environment',
      key: 'environment',
      render: (env: string) => (
        <Tag color={env === 'unknown' ? 'orange' : 'green'} icon={<EnvironmentOutlined />}>
          {env}
        </Tag>
      ),
    },
    {
      title: 'Last Seen',
      dataIndex: 'last_seen',
      key: 'last_seen',
      render: (timestamp: string) => (
        <span style={{ color: '#8c8c8c' }}>
          {formatTimeAgo(timestamp)}
        </span>
      ),
      sorter: (a: any, b: any) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime(),
    },
  ];

  // Create timeline items
  const timelineItems = recentActivity
    .slice(0, 10) // Show only latest 10 for timeline
    .map((activity) => {
      const props = getActivityProps(activity.activity_type);
      return {
        dot: React.cloneElement(props.icon, { style: { color: props.color } }),
        children: (
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
              {activity.service}
            </div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
              {props.label} • {activity.team} • {activity.environment} • {formatTimeAgo(activity.last_seen)}
            </div>
          </div>
        ),
      };
    });

  return (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ClockCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          Recent Service Activity (24h)
        </div>
      }
      style={{ marginBottom: 24 }}
    >
      {/* Activity Summary */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <div style={{ 
            textAlign: 'center', 
            padding: 16, 
            backgroundColor: '#f6ffed', 
            borderRadius: 6,
            border: '1px solid #b7eb8f'
          }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a', marginBottom: 4 }}>
              {newServices.length}
            </div>
            <div style={{ color: '#52c41a', fontWeight: 'bold' }}>
              <PlusCircleOutlined style={{ marginRight: 4 }} />
              New Services
            </div>
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
              Discovered in last 24h
            </div>
          </div>
        </Col>
        <Col span={8}>
          <div style={{ 
            textAlign: 'center', 
            padding: 16, 
            backgroundColor: '#e6f7ff', 
            borderRadius: 6,
            border: '1px solid #91d5ff'
          }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff', marginBottom: 4 }}>
              {updatedServices.length}
            </div>
            <div style={{ color: '#1890ff', fontWeight: 'bold' }}>
              <EditOutlined style={{ marginRight: 4 }} />
              Updated Services
            </div>
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
              Modified in last hour
            </div>
          </div>
        </Col>
        <Col span={8}>
          <div style={{ 
            textAlign: 'center', 
            padding: 16, 
            backgroundColor: '#f9f9f9', 
            borderRadius: 6,
            border: '1px solid #d9d9d9'
          }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#8c8c8c', marginBottom: 4 }}>
              {recentlySeen.length}
            </div>
            <div style={{ color: '#8c8c8c', fontWeight: 'bold' }}>
              <EyeOutlined style={{ marginRight: 4 }} />
              Recently Active
            </div>
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
              Active in last 24h
            </div>
          </div>
        </Col>
      </Row>

      {/* Two-column layout: Timeline and Detailed Table */}
      <Row gutter={16}>
        <Col span={10}>
          <Card 
            title="Activity Timeline" 
            size="small"
            style={{ height: 400 }}
          >
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {timelineItems.length > 0 ? (
                <Timeline
                  items={timelineItems}
                  mode="left"
                />
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#8c8c8c', 
                  padding: '40px 0' 
                }}>
                  <NodeIndexOutlined style={{ fontSize: 32, marginBottom: 16 }} />
                  <div>No recent activity</div>
                </div>
              )}
            </div>
          </Card>
        </Col>
        <Col span={14}>
          <Card 
            title="Detailed Activity" 
            size="small"
            style={{ height: 400 }}
          >
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              <Table
                dataSource={recentActivity}
                columns={columns}
                rowKey={(record) => `${record.service}-${record.last_seen}`}
                pagination={false}
                size="small"
                scroll={{ y: 280 }}
                locale={{
                  emptyText: (
                    <div style={{ padding: '20px 0', color: '#8c8c8c' }}>
                      <NodeIndexOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                      <div>No recent service activity</div>
                    </div>
                  )
                }}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Activity Insights */}
      {recentActivity.length > 0 && (
        <div style={{ 
          marginTop: 16, 
          padding: 12, 
          backgroundColor: '#f0f2f5', 
          borderRadius: 6,
          fontSize: 12,
          color: '#8c8c8c'
        }}>
          <strong>Activity Insights:</strong>
          <span style={{ marginLeft: 8 }}>
            {newServices.length > 0 && (
              <span>🆕 {newServices.length} new service{newServices.length !== 1 ? 's' : ''} discovered • </span>
            )}
            {updatedServices.length > 0 && (
              <span>🔄 {updatedServices.length} service{updatedServices.length !== 1 ? 's' : ''} recently updated • </span>
            )}
            Last activity: {formatTimeAgo(recentActivity[0]?.last_seen || new Date().toISOString())}
          </span>
        </div>
      )}
    </Card>
  );
};