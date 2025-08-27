import React, { useState, useEffect, useCallback } from 'react';
import { Table, Typography, Space, Button } from 'antd';
import type { SortOrder } from 'antd/es/table/interface';
import { ClearOutlined } from '@ant-design/icons';
import type { Node } from '../../types';
import { API_BASE_URL } from '../../utils/api';
import { logger } from '../../utils/logger';

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
  const [performanceData, setPerformanceData] = useState<ServicePerformance[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Fetch real analytics data for each service
  const fetchServiceAnalytics = useCallback(async () => {
    if (serviceNodes.length === 0) {
      setPerformanceData([]);
      return;
    }

    setAnalyticsLoading(true);
    try {
      logger.debug('Fetching service analytics', { serviceCount: serviceNodes.length });

      const services = serviceNodes
        .filter(node => node.nodeType === 'service')
        .map(node => {
          const [namespace, serviceName] = node.id.split('::');
          return { namespace, serviceName, nodeId: node.id };
        })
        .filter(service => service.namespace && service.serviceName);

      if (services.length === 0) {
        setPerformanceData([]);
        return;
      }

      // Fetch analytics for each service (24h and overall) - no additional filters needed since services are already filtered
      const analyticsPromises = services.map(async (service) => {
        try {
          const [analytics24h, analyticsOverall] = await Promise.all([
            fetch(`${API_BASE_URL}/alerts/analytics/service/${service.namespace}/${service.serviceName}?hours=24`),
            fetch(`${API_BASE_URL}/alerts/analytics/service/${service.namespace}/${service.serviceName}?hours=87600`) // Whole DB
          ]);

          const data24h = analytics24h.ok ? await analytics24h.json() : null;
          const dataOverall = analyticsOverall.ok ? await analyticsOverall.json() : null;

          // Default target values (could be configurable)
          const mttaTarget = 30; // 30 minutes
          const mttrTarget = 60; // 60 minutes

          return {
            serviceName: service.serviceName,
            serviceNamespace: service.namespace,
            fullServiceId: service.nodeId,
            mtta24h: data24h?.mtta?.average_minutes || 0,
            mttaOverall: dataOverall?.mtta?.average_minutes || 0,
            mttaTarget,
            mttr24h: data24h?.mttr?.average_minutes || 0,
            mttrOverall: dataOverall?.mttr?.average_minutes || 0,
            mttrTarget
          };
        } catch (error) {
          logger.error('Failed to fetch analytics for service', { service, error });
          return {
            serviceName: service.serviceName,
            serviceNamespace: service.namespace,
            fullServiceId: service.nodeId,
            mtta24h: 0,
            mttaOverall: 0,
            mttaTarget: 30,
            mttr24h: 0,
            mttrOverall: 0,
            mttrTarget: 60
          };
        }
      });

      const results = await Promise.all(analyticsPromises);
      const sortedResults = results.sort((a, b) => a.serviceName.localeCompare(b.serviceName));
      
      logger.debug('Service analytics fetched', { resultCount: sortedResults.length });
      setPerformanceData(sortedResults);
    } catch (error) {
      logger.error('Failed to fetch service analytics', { error });
      setPerformanceData([]);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [serviceNodes]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchServiceAnalytics();
  }, [fetchServiceAnalytics]);

  
  const formatTime = (minutes: number): string => {
    const roundedMinutes = Math.round(minutes);
    if (roundedMinutes < 60) {
      return `${roundedMinutes}m`;
    }
    const hours = Math.floor(roundedMinutes / 60);
    const mins = roundedMinutes % 60;
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
  
  // Use real fetched data instead of generated dummy data
  
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
        dataSource={performanceData}
        rowKey="fullServiceId"
        loading={loading || analyticsLoading}
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