import React from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Progress } from 'antd';
import { 
  ShareAltOutlined,
  DisconnectOutlined,
  NodeIndexOutlined,
  LinkOutlined,
  TeamOutlined
} from '@ant-design/icons';

interface ServiceRelationshipInsightsProps {
  dependencies: {
    total_dependencies: number;
    services_with_deps: number;
    isolated_services: number;
    max_dependencies: number;
    dependency_coverage: number;
  };
  mostConnected: Array<{
    service: string;
    team: string;
    component_type: string;
    dependency_count: number;
  }>;
}

export const ServiceRelationshipInsights: React.FC<ServiceRelationshipInsightsProps> = ({
  dependencies,
  mostConnected
}) => {
  // Table columns for most connected services
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
      title: 'Team',
      dataIndex: 'team',
      key: 'team',
      render: (team: string) => (
        <Tag color={team === 'unknown' ? 'orange' : 'blue'}>
          {team}
        </Tag>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'component_type',
      key: 'component_type',
      render: (type: string) => (
        <Tag color="green">{type}</Tag>
      ),
    },
    {
      title: 'Dependencies',
      dataIndex: 'dependency_count',
      key: 'dependency_count',
      render: (count: number) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <LinkOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
            {count}
          </span>
        </div>
      ),
      sorter: (a: any, b: any) => a.dependency_count - b.dependency_count,
    },
  ];

  // Get dependency coverage color
  const getCoverageColor = (percentage: number) => {
    if (percentage >= 70) return '#52c41a';
    if (percentage >= 40) return '#faad14';
    return '#ff4d4f';
  };

  return (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ShareAltOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          Service Relationships
        </div>
      }
      style={{ marginBottom: 24 }}
    >
      {/* Dependency Statistics */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Dependencies"
              value={dependencies.total_dependencies}
              prefix={<LinkOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Connected Services"
              value={dependencies.services_with_deps}
              prefix={<NodeIndexOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Isolated Services"
              value={dependencies.isolated_services}
              prefix={<DisconnectOutlined />}
              valueStyle={{ color: dependencies.isolated_services > 0 ? '#faad14' : '#52c41a' }}
            />
            {dependencies.isolated_services > 0 && (
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                Services with no connections
              </div>
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Dependency Coverage"
              value={dependencies.dependency_coverage}
              suffix="%"
              prefix={<TeamOutlined />}
              valueStyle={{ color: getCoverageColor(dependencies.dependency_coverage) }}
            />
            <Progress 
              percent={dependencies.dependency_coverage} 
              strokeColor={getCoverageColor(dependencies.dependency_coverage)}
              size="small"
              showInfo={false}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Insights and Recommendations */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={12}>
          <div style={{ 
            padding: 16, 
            backgroundColor: '#f0f5ff', 
            borderRadius: 6,
            border: '1px solid #d6e4ff'
          }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#1890ff' }}>
              📊 Dependency Insights
            </h4>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              <div style={{ marginBottom: 8 }}>
                <strong>Most Connected Service:</strong> {dependencies.max_dependencies} dependencies
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Coverage:</strong> {dependencies.dependency_coverage}% of services have dependencies
              </div>
              <div>
                <strong>Architecture:</strong> {
                  dependencies.dependency_coverage > 70 
                    ? 'Well-connected microservices' 
                    : dependencies.dependency_coverage > 40
                    ? 'Moderately connected services'
                    : 'Monolithic or isolated architecture'
                }
              </div>
            </div>
          </div>
        </Col>
        <Col span={12}>
          {dependencies.isolated_services > 0 && (
            <div style={{ 
              padding: 16, 
              backgroundColor: '#fff7e6', 
              borderRadius: 6,
              border: '1px solid #ffd591'
            }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#fa8c16' }}>
                ⚠️ Isolated Services
              </h4>
              <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                <div style={{ marginBottom: 8 }}>
                  {dependencies.isolated_services} services have no recorded dependencies
                </div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                  These may be:
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    <li>External endpoints or APIs</li>
                    <li>Database services</li>
                    <li>Services needing instrumentation</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          {dependencies.isolated_services === 0 && (
            <div style={{ 
              padding: 16, 
              backgroundColor: '#f6ffed', 
              borderRadius: 6,
              border: '1px solid #b7eb8f'
            }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#52c41a' }}>
                ✅ All Services Connected
              </h4>
              <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                Excellent! All services have at least one dependency relationship, 
                indicating a well-instrumented microservices architecture.
              </div>
            </div>
          )}
        </Col>
      </Row>

      {/* Most Connected Services Table */}
      <div>
        <h4 style={{ marginBottom: 16 }}>Most Connected Services</h4>
        <Table
          dataSource={mostConnected}
          columns={columns}
          rowKey="service"
          pagination={false}
          size="small"
          style={{ backgroundColor: '#fafafa' }}
          locale={{
            emptyText: 'No connected services found'
          }}
        />
        {mostConnected.length > 0 && (
          <div style={{ 
            marginTop: 12, 
            fontSize: 12, 
            color: '#8c8c8c',
            fontStyle: 'italic'
          }}>
            💡 Highly connected services may benefit from dependency review and potential decoupling
          </div>
        )}
      </div>
    </Card>
  );
};