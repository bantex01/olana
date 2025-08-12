import React, { useMemo } from 'react';
import { Card, Typography, Space, Tabs, Table, Tag, Descriptions, Empty, Row, Col, Statistic, Divider, Tooltip } from 'antd';
import { 
  TagOutlined, 
  DatabaseOutlined, 
  ApiOutlined, 
  SettingOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  ThunderboltOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import type { ServiceDetailResponse, ServiceDependency } from '../../types';

const { Text, Title } = Typography;
const { TabPane } = Tabs;

interface TechnicalDetailsTabProps {
  serviceData: ServiceDetailResponse;
}

export const TechnicalDetailsTab: React.FC<TechnicalDetailsTabProps> = ({ serviceData }) => {
  const { service, dependencies, metrics } = serviceData;
  
  // Process tags data for display
  const tagsData = useMemo(() => {
    return Object.entries(service.tags).map(([key, value]) => ({
      key,
      value,
      source: service.tag_sources[key] || 'Unknown'
    }));
  }, [service.tags, service.tag_sources]);
  
  // Process external calls data
  const externalCallsData = useMemo(() => {
    if (!service.external_calls || typeof service.external_calls !== 'object') {
      return [];
    }
    
    return Object.entries(service.external_calls).map(([host, data]: [string, any]) => ({
      host,
      method: data.method || 'Unknown',
      path: data.path || '/',
      count: data.count || 0,
      key: host
    }));
  }, [service.external_calls]);
  
  // Process database calls data
  const databaseCallsData = useMemo(() => {
    if (!service.database_calls || typeof service.database_calls !== 'object') {
      return [];
    }
    
    return Object.entries(service.database_calls).map(([system, data]: [string, any]) => ({
      system,
      name: data.name || system,
      host: data.host || 'Unknown',
      operation: data.operation || 'query',
      count: data.count || 0,
      key: system
    }));
  }, [service.database_calls]);
  
  // Process RPC calls data
  const rpcCallsData = useMemo(() => {
    if (!service.rpc_calls || typeof service.rpc_calls !== 'object') {
      return [];
    }
    
    return Object.entries(service.rpc_calls).map(([service_name, data]: [string, any]) => ({
      service: service_name,
      method: data.method || 'Unknown',
      count: data.count || 0,
      key: service_name
    }));
  }, [service.rpc_calls]);
  
  // Dependencies table columns
  const dependencyColumns = [
    {
      title: 'Service',
      key: 'service',
      render: (record: ServiceDependency) => (
        <Space>
          <Text strong>{record.name}</Text>
          <Text type="secondary">({record.namespace})</Text>
        </Space>
      )
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color="blue">{type}</Tag>
    },
    {
      title: 'First Seen',
      dataIndex: 'first_seen',
      key: 'first_seen',
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Last Seen',
      dataIndex: 'last_seen',
      key: 'last_seen',
      render: (date: string) => new Date(date).toLocaleDateString()
    }
  ];
  
  // Tags table columns
  const tagsColumns = [
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
      render: (key: string) => <Text code>{key}</Text>
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (value: string) => <Tag>{value}</Tag>
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>{source}</Text>
      )
    }
  ];
  
  // External calls table columns
  const externalCallsColumns = [
    {
      title: 'Host',
      dataIndex: 'host',
      key: 'host',
      render: (host: string) => <Text code style={{ fontSize: '12px' }}>{host}</Text>
    },
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      render: (method: string) => <Tag color="green">{method}</Tag>
    },
    {
      title: 'Path',
      dataIndex: 'path',
      key: 'path',
      render: (path: string) => <Text type="secondary" style={{ fontSize: '12px' }}>{path}</Text>
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
      render: (count: number) => <Text strong>{count.toLocaleString()}</Text>
    }
  ];
  
  // Database calls table columns
  const databaseCallsColumns = [
    {
      title: 'System',
      dataIndex: 'system',
      key: 'system',
      render: (system: string) => <Text strong>{system}</Text>
    },
    {
      title: 'Database',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text code style={{ fontSize: '12px' }}>{name}</Text>
    },
    {
      title: 'Host',
      dataIndex: 'host',
      key: 'host',
      render: (host: string) => <Text type="secondary" style={{ fontSize: '12px' }}>{host}</Text>
    },
    {
      title: 'Operation',
      dataIndex: 'operation',
      key: 'operation',
      render: (operation: string) => <Tag color="purple">{operation}</Tag>
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
      render: (count: number) => <Text strong>{count.toLocaleString()}</Text>
    }
  ];
  
  // RPC calls table columns
  const rpcCallsColumns = [
    {
      title: 'Service',
      dataIndex: 'service',
      key: 'service',
      render: (service: string) => <Text strong>{service}</Text>
    },
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      render: (method: string) => <Text code style={{ fontSize: '12px' }}>{method}</Text>
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
      render: (count: number) => <Text strong>{count.toLocaleString()}</Text>
    }
  ];
  
  return (
    <Card 
      title={
        <Space>
          <SettingOutlined style={{ color: '#1890ff' }} />
          <span>Technical Details</span>
        </Space>
      }
      size="small"
    >
      <Tabs defaultActiveKey="metadata" size="small">
        {/* Service Metadata Tab */}
        <TabPane
          tab={
            <Space>
              <InfoCircleOutlined />
              <span>Metadata</span>
              <Tag color="blue">{tagsData.length}</Tag>
            </Space>
          }
          key="metadata"
        >
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {/* Service Basic Info */}
            <Descriptions 
              size="small" 
              bordered 
              column={2}
              title="Service Information"
            >
              <Descriptions.Item label="Name">
                <Text strong>{service.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Namespace">
                <Tag color="blue">{service.namespace}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Component Type">
                <Tag color="purple">{service.component_type || 'Unknown'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Environment">
                <Tag color="green">{service.environment || 'Unknown'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Team">
                <Tag color="orange">{service.team || 'Unassigned'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Uptime">
                {service.uptime_days !== null ? (
                  <Text>{service.uptime_days} days</Text>
                ) : (
                  <Text type="secondary">Unknown</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                <Text>{new Date(service.created_at).toLocaleString()}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Last Seen">
                <Text>{new Date(service.last_seen).toLocaleString()}</Text>
              </Descriptions.Item>
            </Descriptions>
            
            {/* Service Tags */}
            <div>
              <Title level={5} style={{ marginBottom: '12px' }}>
                <TagOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                Service Tags ({tagsData.length})
              </Title>
              
              {tagsData.length > 0 ? (
                <Table
                  dataSource={tagsData}
                  columns={tagsColumns}
                  size="small"
                  pagination={false}
                  bordered
                />
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No tags configured for this service"
                />
              )}
            </div>
            
            {/* Service Metrics Summary */}
            <div>
              <Title level={5} style={{ marginBottom: '12px' }}>
                <ThunderboltOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                Service Metrics Summary
              </Title>
              
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Statistic
                    title="Dependencies"
                    value={metrics.dependency_count}
                    prefix={<LinkOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Current Alerts"
                    value={metrics.current_alert_count}
                    prefix={<ExclamationCircleOutlined />}
                    valueStyle={{ color: metrics.current_alert_count > 0 ? '#ff4d4f' : '#52c41a' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="External Calls"
                    value={metrics.external_calls_count}
                    prefix={<ApiOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
              </Row>
            </div>
          </Space>
        </TabPane>
        
        {/* Dependencies Tab */}
        <TabPane
          tab={
            <Space>
              <LinkOutlined />
              <span>Dependencies</span>
              <Tag color="blue">{dependencies.incoming.length + dependencies.outgoing.length}</Tag>
            </Space>
          }
          key="dependencies"
        >
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {/* Incoming Dependencies */}
            <div>
              <Title level={5} style={{ marginBottom: '12px' }}>
                <DatabaseOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                Incoming Dependencies ({dependencies.incoming.length})
                <Tooltip title="Services that depend on this service">
                  <InfoCircleOutlined style={{ marginLeft: '8px', color: '#8c8c8c' }} />
                </Tooltip>
              </Title>
              
              {dependencies.incoming.length > 0 ? (
                <Table
                  dataSource={dependencies.incoming}
                  columns={dependencyColumns}
                  size="small"
                  pagination={false}
                  bordered
                  rowKey="name"
                />
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No incoming dependencies"
                />
              )}
            </div>
            
            <Divider />
            
            {/* Outgoing Dependencies */}
            <div>
              <Title level={5} style={{ marginBottom: '12px' }}>
                <ApiOutlined style={{ marginRight: '8px', color: '#faad14' }} />
                Outgoing Dependencies ({dependencies.outgoing.length})
                <Tooltip title="Services that this service depends on">
                  <InfoCircleOutlined style={{ marginLeft: '8px', color: '#8c8c8c' }} />
                </Tooltip>
              </Title>
              
              {dependencies.outgoing.length > 0 ? (
                <Table
                  dataSource={dependencies.outgoing}
                  columns={dependencyColumns}
                  size="small"
                  pagination={false}
                  bordered
                  rowKey="name"
                />
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No outgoing dependencies"
                />
              )}
            </div>
          </Space>
        </TabPane>
        
        {/* Communication Details Tab */}
        <TabPane
          tab={
            <Space>
              <ApiOutlined />
              <span>Communication</span>
              <Tag color="blue">
                {externalCallsData.length + databaseCallsData.length + rpcCallsData.length}
              </Tag>
            </Space>
          }
          key="communication"
        >
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {/* External Calls */}
            <div>
              <Title level={5} style={{ marginBottom: '12px' }}>
                <ApiOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                External HTTP Calls ({externalCallsData.length})
              </Title>
              
              {externalCallsData.length > 0 ? (
                <Table
                  dataSource={externalCallsData}
                  columns={externalCallsColumns}
                  size="small"
                  pagination={false}
                  bordered
                />
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No external HTTP calls detected"
                />
              )}
            </div>
            
            <Divider />
            
            {/* Database Calls */}
            <div>
              <Title level={5} style={{ marginBottom: '12px' }}>
                <DatabaseOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                Database Calls ({databaseCallsData.length})
              </Title>
              
              {databaseCallsData.length > 0 ? (
                <Table
                  dataSource={databaseCallsData}
                  columns={databaseCallsColumns}
                  size="small"
                  pagination={false}
                  bordered
                />
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No database calls detected"
                />
              )}
            </div>
            
            <Divider />
            
            {/* RPC Calls */}
            <div>
              <Title level={5} style={{ marginBottom: '12px' }}>
                <ThunderboltOutlined style={{ marginRight: '8px', color: '#722ed1' }} />
                RPC Calls ({rpcCallsData.length})
              </Title>
              
              {rpcCallsData.length > 0 ? (
                <Table
                  dataSource={rpcCallsData}
                  columns={rpcCallsColumns}
                  size="small"
                  pagination={false}
                  bordered
                />
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No RPC calls detected"
                />
              )}
            </div>
          </Space>
        </TabPane>
      </Tabs>
    </Card>
  );
};