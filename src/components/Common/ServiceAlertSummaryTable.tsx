import React from 'react';
import { Table, Tag, Typography, Space, Button, Tooltip } from 'antd';
import type { SortOrder } from 'antd/es/table/interface';
import { CheckCircleOutlined, ExclamationCircleOutlined, WarningOutlined, CloseCircleOutlined, ClearOutlined } from '@ant-design/icons';
import type { Alert as AlertType } from '../../types';

const { Text } = Typography;

export interface ServiceAlertSummary {
  serviceName: string;
  serviceNamespace: string;
  fullServiceId: string;
  fatal: { open: number; acknowledged: number };
  critical: { open: number; acknowledged: number };
  warning: { open: number; acknowledged: number };
  total: number;
  status: 'healthy' | 'warning' | 'critical' | 'fatal';
  hasRecentDeployment?: boolean;
  recentDeployment?: {
    timeAgo: string;
    branch: string;
    commit: string;
    mergeRequest: string;
    status: 'success' | 'failed' | 'rollback' | 'in-progress';
  };
}

interface ServiceAlertSummaryTableProps {
  alerts: AlertType[];
  loading?: boolean;
}

export const ServiceAlertSummaryTable: React.FC<ServiceAlertSummaryTableProps> = ({
  alerts,
  loading = false
}) => {
  const tableRef = React.useRef<any>(null);
  // Process alerts into service summaries
  const processAlerts = (): ServiceAlertSummary[] => {
    const serviceMap = new Map<string, ServiceAlertSummary>();
    
    alerts.forEach(alert => {
      const serviceId = `${alert.service_namespace}::${alert.service_name}`;
      
      if (!serviceMap.has(serviceId)) {
        serviceMap.set(serviceId, {
          serviceName: alert.service_name,
          serviceNamespace: alert.service_namespace,
          fullServiceId: serviceId,
          fatal: { open: 0, acknowledged: 0 },
          critical: { open: 0, acknowledged: 0 },
          warning: { open: 0, acknowledged: 0 },
          total: 0,
          status: 'healthy'
        });
      }
      
      const service = serviceMap.get(serviceId)!;
      // For now, all alerts are "open" since acknowledged status doesn't exist yet
      const isAcknowledged = false; // Will be: alert.status === 'acknowledged' when implemented
      
      // Count by severity
      switch (alert.severity) {
        case 'fatal':
          if (isAcknowledged) service.fatal.acknowledged++;
          else service.fatal.open++;
          break;
        case 'critical':
          if (isAcknowledged) service.critical.acknowledged++;
          else service.critical.open++;
          break;
        case 'warning':
          if (isAcknowledged) service.warning.acknowledged++;
          else service.warning.open++;
          break;
      }
      
      service.total++;
    });
    
    // Determine status for each service and add demo deployment data
    serviceMap.forEach(service => {
      if (service.fatal.open > 0) {
        service.status = 'fatal';
      } else if (service.critical.open > 0) {
        service.status = 'critical';
      } else if (service.warning.open > 0) {
        service.status = 'warning';
      } else {
        service.status = 'healthy';
      }

      // Add demo deployment data for specific services in opentelemetry-demo namespace
      if (service.serviceNamespace === 'opentelemetry-demo') {
        if (service.serviceName === 'ad') {
          service.hasRecentDeployment = true;
          service.recentDeployment = {
            timeAgo: '3h ago',
            branch: 'main',
            commit: 'f4a8b2c',
            mergeRequest: 'PR #156',
            status: 'success'
          };
        } else if (service.serviceName === 'kafka') {
          service.hasRecentDeployment = true;
          service.recentDeployment = {
            timeAgo: '1h ago',
            branch: 'hotfix/memory-leak',
            commit: '9e3d7f1',
            mergeRequest: 'PR #189',
            status: 'success'
          };
        }
      }
    });
    
    return Array.from(serviceMap.values()).sort((a, b) => {
      // Sort by severity (fatal first, then critical, warning, healthy)
      const statusOrder = { fatal: 0, critical: 1, warning: 2, healthy: 3 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      
      // Then by total alerts (descending)
      const totalDiff = b.total - a.total;
      if (totalDiff !== 0) return totalDiff;
      
      // Then alphabetically
      return a.serviceName.localeCompare(b.serviceName);
    });
  };
  
  const getStatusIcon = (status: ServiceAlertSummary['status']) => {
    switch (status) {
      case 'fatal': return <CloseCircleOutlined style={{ color: '#8c8c8c' }} />;
      case 'critical': return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'warning': return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'healthy': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    }
  };
  
  const getStatusColor = (status: ServiceAlertSummary['status']) => {
    switch (status) {
      case 'fatal': return '#8c8c8c';
      case 'critical': return '#ff4d4f';
      case 'warning': return '#faad14';
      case 'healthy': return '#52c41a';
    }
  };
  
  const clearAllFilters = () => {
    if (tableRef.current) {
      // Reset sorting and filtering
      tableRef.current.resetSorters?.();
      // Force table to clear filters
      window.location.reload(); // Temporary solution - will be improved
    }
  };

  const columns = [
    {
      title: 'Service',
      dataIndex: 'serviceName',
      key: 'serviceName',
      sorter: (a: ServiceAlertSummary, b: ServiceAlertSummary) => 
        a.serviceName.localeCompare(b.serviceName),
      sortDirections: ['ascend' as SortOrder, 'descend' as SortOrder],
      render: (serviceName: string, record: ServiceAlertSummary) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div>
            <div style={{ fontWeight: 'bold' }}>{serviceName}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.serviceNamespace}
            </Text>
          </div>
          {record.hasRecentDeployment && record.recentDeployment && (
            <Tooltip
              title={
                <div>
                  <div><strong>Recent Deployment</strong></div>
                  <div>Time: {record.recentDeployment.timeAgo}</div>
                  <div>Branch: <code>{record.recentDeployment.branch}</code></div>
                  <div>Commit: <code>{record.recentDeployment.commit}</code></div>
                  <div>PR/MR: {record.recentDeployment.mergeRequest}</div>
                  <div>Status: <span style={{ 
                    color: record.recentDeployment.status === 'success' ? '#52c41a' : '#ff4d4f' 
                  }}>
                    {record.recentDeployment.status}
                  </span></div>
                </div>
              }
              placement="right"
            >
              <CheckCircleOutlined 
                style={{ 
                  color: '#52c41a', 
                  fontSize: '14px',
                  cursor: 'pointer'
                }} 
              />
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Fatal',
      key: 'fatal',
      align: 'center' as const,
      width: 80,
      sorter: (a: ServiceAlertSummary, b: ServiceAlertSummary) => 
        (a.fatal.open + a.fatal.acknowledged) - (b.fatal.open + b.fatal.acknowledged),
      sortDirections: ['ascend' as SortOrder, 'descend' as SortOrder],
      render: (_: any, record: ServiceAlertSummary) => {
        const { open, acknowledged } = record.fatal;
        const total = open + acknowledged;
        if (total === 0) return <Text type="secondary">-</Text>;
        
        return (
          <Space direction="vertical" size={2}>
            <Text style={{ fontSize: '14px', fontWeight: 'bold' }}>{total}</Text>
            <Text style={{ fontSize: '11px', color: '#666' }}>
              {open}o / {acknowledged}a
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Critical',
      key: 'critical',
      align: 'center' as const,
      width: 80,
      sorter: (a: ServiceAlertSummary, b: ServiceAlertSummary) => 
        (a.critical.open + a.critical.acknowledged) - (b.critical.open + b.critical.acknowledged),
      sortDirections: ['ascend' as SortOrder, 'descend' as SortOrder],
      render: (_: any, record: ServiceAlertSummary) => {
        const { open, acknowledged } = record.critical;
        const total = open + acknowledged;
        if (total === 0) return <Text type="secondary">-</Text>;
        
        return (
          <Space direction="vertical" size={2}>
            <Text style={{ fontSize: '14px', fontWeight: 'bold' }}>{total}</Text>
            <Text style={{ fontSize: '11px', color: '#666' }}>
              {open}o / {acknowledged}a
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Warning',
      key: 'warning',
      align: 'center' as const,
      width: 80,
      sorter: (a: ServiceAlertSummary, b: ServiceAlertSummary) => 
        (a.warning.open + a.warning.acknowledged) - (b.warning.open + b.warning.acknowledged),
      sortDirections: ['ascend' as SortOrder, 'descend' as SortOrder],
      render: (_: any, record: ServiceAlertSummary) => {
        const { open, acknowledged } = record.warning;
        const total = open + acknowledged;
        if (total === 0) return <Text type="secondary">-</Text>;
        
        return (
          <Space direction="vertical" size={2}>
            <Text style={{ fontSize: '14px', fontWeight: 'bold' }}>{total}</Text>
            <Text style={{ fontSize: '11px', color: '#666' }}>
              {open}o / {acknowledged}a
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      align: 'center' as const,
      width: 80,
      sorter: (a: ServiceAlertSummary, b: ServiceAlertSummary) => a.total - b.total,
      sortDirections: ['ascend' as SortOrder, 'descend' as SortOrder],
      render: (total: number) => (
        <Text style={{ fontSize: '14px', fontWeight: 'bold' }}>{total}</Text>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      align: 'center' as const,
      width: 100,
      sorter: (a: ServiceAlertSummary, b: ServiceAlertSummary) => {
        const statusOrder = { fatal: 0, critical: 1, warning: 2, healthy: 3 };
        return statusOrder[a.status] - statusOrder[b.status];
      },
      sortDirections: ['ascend' as SortOrder, 'descend' as SortOrder],
      filters: [
        { text: 'Fatal', value: 'fatal' },
        { text: 'Critical', value: 'critical' },
        { text: 'Warning', value: 'warning' },
        { text: 'Healthy', value: 'healthy' },
      ],
      onFilter: (value: any, record: ServiceAlertSummary) => record.status === value,
      render: (_: any, record: ServiceAlertSummary) => (
        <Tag 
          icon={getStatusIcon(record.status)}
          color={getStatusColor(record.status)}
          style={{ 
            textTransform: 'capitalize',
            fontWeight: 'bold',
            minWidth: '70px',
            textAlign: 'center'
          }}
        >
          {record.status}
        </Tag>
      ),
    }
  ];
  
  const data = processAlerts();
  
  return (
    <div>
      <div style={{ marginBottom: '12px', textAlign: 'right' }}>
        <Button 
          icon={<ClearOutlined />} 
          onClick={clearAllFilters}
          size="small"
        >
          Clear Filters
        </Button>
      </div>
      <Table
        ref={tableRef}
        columns={columns}
        dataSource={data}
        rowKey="fullServiceId"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} services`
        }}
        size="small"
        style={{ marginTop: '16px' }}
      />
    </div>
  );
};