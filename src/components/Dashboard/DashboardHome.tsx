import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Alert, Spin, Typography, Select, Space } from 'antd';
import { 
  AlertOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  NodeIndexOutlined,
  WarningOutlined,
  BugOutlined,
  SortAscendingOutlined
} from '@ant-design/icons';
import { API_BASE_URL } from '../../utils/api';
import { logger } from '../../utils/logger';

const { Title } = Typography;
const { Option } = Select;

interface DashboardData {
  activeAlerts: any[];
  systemHealth: {
    totalServices: number;
    servicesWithIssues: number;
    totalAlertsLast24h: number;
    totalOpenAlerts: number;
  };
  loading: boolean;
  error: string | null;
}

interface DashboardClassicProps {
  onLastUpdatedChange: (date: Date) => void;
}

export const DashboardClassic: React.FC<DashboardClassicProps> = ({ onLastUpdatedChange }) => {
  const [data, setData] = useState<DashboardData>({
    activeAlerts: [],
    systemHealth: {
      totalServices: 0,
      servicesWithIssues: 0,
      totalAlertsLast24h: 0,
      totalOpenAlerts: 0
    },
    loading: true,
    error: null
  });

  const [sortBy, setSortBy] = useState<'severity' | 'service_issues' | 'duration'>('severity');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Fetch active alerts
      const alertsResponse = await fetch(`${API_BASE_URL}/alerts`);
      const activeAlerts = await alertsResponse.json();

      // Fetch analytics for 24h data
      const analyticsResponse = await fetch(`${API_BASE_URL}/alerts/analytics?hours=24`);
      const analyticsData = await analyticsResponse.json();

      // Fetch total services count from graph endpoint
      const graphResponse = await fetch(`${API_BASE_URL}/graph`);
      const graphData = await graphResponse.json();
      const totalServices = graphData.nodes?.filter((n: any) => n.nodeType === 'service').length || 0;

      // Calculate services with issues (unique services that have active alerts)
      const servicesWithIssues = new Set(
        activeAlerts.map((alert: any) => `${alert.service_namespace}::${alert.service_name}`)
      ).size;

      setData({
        activeAlerts,
        systemHealth: {
          totalServices,
          servicesWithIssues,
          totalAlertsLast24h: analyticsData.summary?.total_incidents || 0,
          totalOpenAlerts: activeAlerts.length
        },
        loading: false,
        error: null
      });

      // Update last updated timestamp
      const now = new Date();
      setLastUpdated(now);
      onLastUpdatedChange(now);

    } catch (error) {
      logger.error('Failed to fetch dashboard data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load dashboard data'
      }));
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get severity color and icon
  const getSeverityProps = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'fatal':
        return { color: 'black', icon: <ExclamationCircleOutlined /> };
      case 'critical':
        return { color: 'red', icon: <AlertOutlined /> };
      case 'warning':
        return { color: 'orange', icon: <WarningOutlined /> };
      default:
        return { color: 'blue', icon: <CheckCircleOutlined /> };
    }
  };

  // Sort alerts based on selected criteria
  const getSortedAlerts = () => {
    const alerts = [...data.activeAlerts];
    
    switch (sortBy) {
      case 'severity':
        // Sort by severity priority (fatal > critical > warning > none)
        return alerts.sort((a, b) => {
          const severityOrder = { fatal: 0, critical: 1, warning: 2, none: 3 };
          const aOrder = severityOrder[a.severity as keyof typeof severityOrder] ?? 4;
          const bOrder = severityOrder[b.severity as keyof typeof severityOrder] ?? 4;
          return aOrder - bOrder;
        });
        
      case 'service_issues':
        // Group by service and sort by count of issues per service
        const serviceAlertCounts: Record<string, number> = {};
        alerts.forEach(alert => {
          const serviceKey = `${alert.service_namespace}::${alert.service_name}`;
          serviceAlertCounts[serviceKey] = (serviceAlertCounts[serviceKey] || 0) + 1;
        });
        
        return alerts.sort((a, b) => {
          const aServiceKey = `${a.service_namespace}::${a.service_name}`;
          const bServiceKey = `${b.service_namespace}::${b.service_name}`;
          const aCount = serviceAlertCounts[aServiceKey];
          const bCount = serviceAlertCounts[bServiceKey];
          return bCount - aCount; // Descending order
        });
        
      case 'duration':
        // Sort by longest running (oldest first_seen)
        return alerts.sort((a, b) => {
          const aTime = new Date(a.first_seen).getTime();
          const bTime = new Date(b.first_seen).getTime();
          return aTime - bTime; // Ascending order (oldest first)
        });
        
      default:
        return alerts;
    }
  };

  // Get count of alerts per service for display
  const getServiceAlertCount = (alert: any) => {
    const serviceKey = `${alert.service_namespace}::${alert.service_name}`;
    return data.activeAlerts.filter(a => 
      `${a.service_namespace}::${a.service_name}` === serviceKey
    ).length;
  };

  // Update table columns to show service alert counts and improved rendering
  const alertColumns = [
    {
      title: 'Service',
      dataIndex: 'service_name',
      key: 'service',
      render: (text: string, record: any) => {
        const serviceAlertCount = getServiceAlertCount(record);
        return (
          <div>
            <strong>{record.service_namespace}::{text}</strong>
            {serviceAlertCount > 1 && (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                {serviceAlertCount} alerts
              </Tag>
            )}
            {record.instance_id && (
              <div style={{ fontSize: '12px', color: '#666' }}>
                Instance: {record.instance_id}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => {
        const { color, icon } = getSeverityProps(severity);
        return (
          <Tag color={color} icon={icon}>
            {severity.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        // For now all will be "firing" but this sets up for acknowledgment feature
        const statusProps = {
          firing: { color: 'red', text: 'Firing' },
          acknowledged: { color: 'orange', text: 'Acknowledged' },
          resolved: { color: 'green', text: 'Resolved' }
        };
        
        const props = statusProps[status as keyof typeof statusProps] || statusProps.firing;
        
        return (
          <Tag color={props.color}>
            {props.text}
          </Tag>
        );
      },
    },
    {
    title: 'Message',
    dataIndex: 'message',
    key: 'message',
    ellipsis: {
        showTitle: false,
    },
    render: (message: string) => (
        <span title={message} style={{ cursor: 'help' }}>
        {message}
        </span>
    ),
    },
    {
      title: 'Duration',
      dataIndex: 'first_seen',
      key: 'duration',
      render: (firstSeen: string) => {
        const duration = Math.floor((Date.now() - new Date(firstSeen).getTime()) / 1000 / 60);
        return (
          <span>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {duration < 60 ? `${duration}m` : `${Math.floor(duration / 60)}h ${duration % 60}m`}
          </span>
        );
      },
    },
    {
      title: 'Occurrences',
      dataIndex: 'count',
      key: 'count',
      render: (count: number) => {
        // Show count if > 1, otherwise show 1
        const displayCount = count && count > 1 ? count : 1;
        return (
          <Tag color={displayCount > 1 ? "blue" : "default"}>
            {displayCount}
          </Tag>
        );
      },
    },
  ];

  if (data.error) {
    return (
      <Alert
        message="Error Loading Dashboard"
        description={data.error}
        type="error"
        showIcon
        action={
          <button onClick={fetchDashboardData}>Retry</button>
        }
      />
    );
  }

  return (
    <div>
      {/* System Overview Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Services"
              value={data.systemHealth.totalServices}
              prefix={<NodeIndexOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Services with Issues"
              value={data.systemHealth.servicesWithIssues}
              prefix={<BugOutlined />}
              valueStyle={{ color: data.systemHealth.servicesWithIssues > 0 ? '#faad14' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Open Alerts (24h)"
              value={data.systemHealth.totalAlertsLast24h}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Open Alerts"
              value={data.systemHealth.totalOpenAlerts}
              prefix={<AlertOutlined />}
              valueStyle={{ color: data.systemHealth.totalOpenAlerts > 0 ? '#cf1322' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Open Alerts Section */}
      <Card 
        title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <AlertOutlined style={{ marginRight: 8, color: '#cf1322' }} />
        <Title level={4} style={{ margin: 0 }}>
          Open Alerts ({data.activeAlerts.length})
        </Title>
        <span style={{ fontSize: '12px', color: '#666', marginLeft: 12 }}>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </span>
      </div>
            
            {/* Sort Controls */}
            <Space>
              <span style={{ fontSize: '14px', color: '#666' }}>Sort by:</span>
              <Select
                value={sortBy}
                onChange={setSortBy}
                style={{ width: 200 }}
                size="small"
              >
                <Option value="severity">
                  <SortAscendingOutlined /> Highest Criticality
                </Option>
                <Option value="service_issues">
                  <BugOutlined /> Service with Most Issues
                </Option>
                <Option value="duration">
                  <ClockCircleOutlined /> Longest Running
                </Option>
              </Select>
            </Space>
          </div>
        }
      >
        {data.loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
          </div>
        ) : data.activeAlerts.length > 0 ? (
          <Table
            dataSource={getSortedAlerts().slice(0, 50)} // Limit to 50 alerts
            columns={alertColumns}
            rowKey="alert_id"
            pagination={data.activeAlerts.length > 10 ? { pageSize: 10, showSizeChanger: false } : false}
            size="middle"
            footer={() => 
              data.activeAlerts.length > 50 ? (
                <div style={{ textAlign: 'center', color: '#666' }}>
                  Showing top 50 of {data.activeAlerts.length} total alerts
                </div>
              ) : null
            }
          />
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px',
            color: '#52c41a'
          }}>
            <CheckCircleOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <div>All systems operational - no active alerts</div>
          </div>
        )}
      </Card>
    </div>
  );
};