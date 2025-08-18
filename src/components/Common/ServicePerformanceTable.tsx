import React from 'react';
import { Table, Typography, Space, Button } from 'antd';
import type { SortOrder } from 'antd/es/table/interface';
import { ClearOutlined } from '@ant-design/icons';
import type { Node } from '../../types';

const { Text } = Typography;

export interface ServicePerformance {
  serviceName: string;
  serviceNamespace: string;
  fullServiceId: string;
  mtta24h: number;  // in minutes
  mttaOverall: number; // in minutes
  mttaTarget: number; // in minutes
  mttr24h: number; // in minutes
  mttrOverall: number; // in minutes
  mttrTarget: number; // in minutes
}

interface ServicePerformanceTableProps {
  serviceNodes: Node[]; // Filtered service nodes from graph data
  loading?: boolean;
}

export const ServicePerformanceTable: React.FC<ServicePerformanceTableProps> = ({
  serviceNodes,
  loading = false
}) => {
  const tableRef = React.useRef<any>(null);
  // Generate dummy performance data based on filtered service nodes
  const generatePerformanceData = (): ServicePerformance[] => {
    const serviceMap = new Map<string, ServicePerformance>();
    
    // Generate performance data for all filtered services
    serviceNodes
      .filter(node => node.nodeType === 'service')
      .forEach(serviceNode => {
        // Parse service name and namespace from node ID (format: namespace::serviceName)
        const [namespace, serviceName] = serviceNode.id.split('::');
        const serviceId = serviceNode.id;
        
        if (!serviceMap.has(serviceId) && serviceName && namespace) {
          // Generate realistic dummy performance data
          const mttaTarget = Math.floor(Math.random() * 30) + 15; // 15-45 min targets
          const mttrTarget = Math.floor(Math.random() * 60) + 30; // 30-90 min targets
          
          // Generate performance values that sometimes exceed targets
          const mtta24h = Math.floor(Math.random() * 60) + 5; // 5-65 min
          const mttaOverall = Math.floor(Math.random() * 50) + 10; // 10-60 min
          const mttr24h = Math.floor(Math.random() * 120) + 15; // 15-135 min
          const mttrOverall = Math.floor(Math.random() * 90) + 20; // 20-110 min
          
          serviceMap.set(serviceId, {
            serviceName,
            serviceNamespace: namespace,
            fullServiceId: serviceId,
            mtta24h,
            mttaOverall,
            mttaTarget,
            mttr24h,
            mttrOverall,
            mttrTarget
          });
        }
      });
    
    return Array.from(serviceMap.values()).sort((a, b) => 
      a.serviceName.localeCompare(b.serviceName)
    );
  };
  
  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };
  
  const getPerformanceColor = (actual: number, target: number): string => {
    return actual <= target ? '#52c41a' : '#ff4d4f'; // green if under/at target, red if over
  };
  
  const clearAllFilters = () => {
    if (tableRef.current) {
      // Reset sorting and filtering
      tableRef.current.resetSorters?.();
    }
  };
  
  const renderMetricCell = (actual: number, target: number) => (
    <Space direction="vertical" size={2} style={{ textAlign: 'center' }}>
      <Text 
        style={{ 
          fontSize: '14px', 
          fontWeight: 'bold',
          color: getPerformanceColor(actual, target)
        }}
      >
        {formatTime(actual)}
      </Text>
      <Text style={{ fontSize: '11px', color: '#666' }}>
        vs {formatTime(target)}
      </Text>
    </Space>
  );
  
  const columns = [
    {
      title: 'Service',
      dataIndex: 'serviceName',
      key: 'serviceName',
      sorter: (a: ServicePerformance, b: ServicePerformance) => 
        a.serviceName.localeCompare(b.serviceName),
      sortDirections: ['ascend' as SortOrder, 'descend' as SortOrder],
      render: (serviceName: string, record: ServicePerformance) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{serviceName}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.serviceNamespace}
          </Text>
        </div>
      ),
    },
    {
      title: 'MTTA (24h)',
      key: 'mtta24h',
      align: 'center' as const,
      width: 100,
      sorter: (a: ServicePerformance, b: ServicePerformance) => a.mtta24h - b.mtta24h,
      sortDirections: ['ascend' as SortOrder, 'descend' as SortOrder],
      render: (_: any, record: ServicePerformance) => 
        renderMetricCell(record.mtta24h, record.mttaTarget),
    },
    {
      title: 'MTTA (Overall)',
      key: 'mttaOverall',
      align: 'center' as const,
      width: 110,
      sorter: (a: ServicePerformance, b: ServicePerformance) => a.mttaOverall - b.mttaOverall,
      sortDirections: ['ascend' as SortOrder, 'descend' as SortOrder],
      render: (_: any, record: ServicePerformance) => 
        renderMetricCell(record.mttaOverall, record.mttaTarget),
    },
    {
      title: 'MTTR (24h)',
      key: 'mttr24h',
      align: 'center' as const,
      width: 100,
      sorter: (a: ServicePerformance, b: ServicePerformance) => a.mttr24h - b.mttr24h,
      sortDirections: ['ascend' as SortOrder, 'descend' as SortOrder],
      render: (_: any, record: ServicePerformance) => 
        renderMetricCell(record.mttr24h, record.mttrTarget),
    },
    {
      title: 'MTTR (Overall)',
      key: 'mttrOverall',
      align: 'center' as const,
      width: 110,
      sorter: (a: ServicePerformance, b: ServicePerformance) => a.mttrOverall - b.mttrOverall,
      sortDirections: ['ascend' as SortOrder, 'descend' as SortOrder],
      render: (_: any, record: ServicePerformance) => 
        renderMetricCell(record.mttrOverall, record.mttrTarget),
    }
  ];
  
  const data = generatePerformanceData();
  
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