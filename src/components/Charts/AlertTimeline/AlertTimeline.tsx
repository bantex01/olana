import React, { useState, useCallback, useEffect } from 'react';
import { Card, Alert, Space, Typography, DatePicker } from 'antd';
import { LineChartOutlined, ExclamationCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { AlertTimelineChart } from './AlertTimelineChart';
import { ChartStyleSelector } from './ChartStyleSelector';
import { RefreshControls } from './RefreshControls';
import { useTimelineData } from './useTimelineData';
import type { AlertTimelineProps, ChartStyle, RefreshInterval } from './types';

const { Text, Title } = Typography;

const { RangePicker } = DatePicker;

// Preset ranges for quick selection
const presets = [
  { label: 'Last Hour', value: [dayjs().subtract(1, 'hour'), dayjs()] },
  { label: 'Last 6 Hours', value: [dayjs().subtract(6, 'hour'), dayjs()] },
  { label: 'Last 12 Hours', value: [dayjs().subtract(12, 'hour'), dayjs()] },
  { label: 'Last 24 Hours', value: [dayjs().subtract(24, 'hour'), dayjs()] },
  { label: 'Last 2 Days', value: [dayjs().subtract(2, 'day'), dayjs()] },
  { label: 'Last 7 Days', value: [dayjs().subtract(7, 'day'), dayjs()] },
  { label: 'Last 30 Days', value: [dayjs().subtract(30, 'day'), dayjs()] },
  { label: 'Last 90 Days', value: [dayjs().subtract(90, 'day'), dayjs()] },
];

export const AlertTimeline: React.FC<AlertTimelineProps> = ({
  filters = {},
  config = {},
  loading: externalLoading = false,
  onRefresh
}) => {
  // Configuration with defaults
  const {
    timeRange = 24,
    chartStyle: defaultChartStyle = 'area',
    height = '300px',
    showStyleSelector = true,
    showRefresh = true,
    refreshInterval: defaultRefreshInterval = 0
  } = config;

  // Local state
  const [chartStyle, setChartStyle] = useState<ChartStyle>(defaultChartStyle);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(() => [
    dayjs().subtract(timeRange, 'hour'),
    dayjs()
  ]);
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(defaultRefreshInterval as RefreshInterval);
  
  // Calculate time range in hours from date range
  const selectedTimeRange = dateRange[1].diff(dateRange[0], 'hour');

  // Data fetching hook
  const { 
    data, 
    loading, 
    error, 
    lastUpdated, 
    refresh 
  } = useTimelineData({
    filters,
    startDate: dateRange[0].toDate(),
    endDate: dateRange[1].toDate(),
    refreshInterval
  });

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refresh();
    onRefresh?.();
  }, [refresh, onRefresh]);

  // Handle chart style change and persist to localStorage
  const handleChartStyleChange = useCallback((newStyle: ChartStyle) => {
    setChartStyle(newStyle);
    localStorage.setItem('alertTimelineChartStyle', newStyle);
  }, []);

  // Load saved chart style preference
  useEffect(() => {
    const savedStyle = localStorage.getItem('alertTimelineChartStyle') as ChartStyle;
    if (savedStyle && ['area', 'line', 'bar', 'stacked-area'].includes(savedStyle)) {
      setChartStyle(savedStyle);
    }
  }, []);

  const isLoading = loading || externalLoading;

  // Card title with summary info
  const cardTitle = (
    <Space size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
      <Space size="small">
        <LineChartOutlined style={{ color: '#1890ff' }} />
        <Title level={5} style={{ margin: 0 }}>
          Alert Timeline
        </Title>
        {data && (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {data.summary.totalIncidents} incidents • {dateRange[0].format('MMM D')} to {dateRange[1].format('MMM D')}
          </Text>
        )}
      </Space>
      
      <Space size="small">
        {/* Date range picker */}
        <RangePicker
          size="small"
          value={dateRange}
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
              setDateRange([dates[0], dates[1]]);
            }
          }}
          showTime={{ format: 'HH:mm' }}
          format="MMM D HH:mm"
          presets={presets.map(preset => ({
            label: preset.label,
            value: preset.value as [Dayjs, Dayjs]
          }))}
          style={{ minWidth: 280 }}
          suffixIcon={<CalendarOutlined />}
        />

        {/* Chart style selector */}
        {showStyleSelector && (
          <ChartStyleSelector
            value={chartStyle}
            onChange={handleChartStyleChange}
            size="small"
          />
        )}

        {/* Refresh controls */}
        {showRefresh && (
          <RefreshControls
            onRefresh={handleRefresh}
            refreshInterval={refreshInterval}
            onRefreshIntervalChange={setRefreshInterval}
            loading={isLoading}
            lastUpdated={lastUpdated}
          />
        )}
      </Space>
    </Space>
  );

  // Error state
  if (error) {
    return (
      <Card
        title={cardTitle}
        style={{ marginBottom: '24px' }}
      >
        <Alert
          message="Failed to load timeline data"
          description={error}
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
          action={
            <Space>
              <button onClick={handleRefresh} style={{
                border: 'none',
                background: 'none',
                color: '#1890ff',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}>
                Retry
              </button>
            </Space>
          }
        />
      </Card>
    );
  }

  // Loading state with skeleton
  if (isLoading && !data) {
    return (
      <Card
        title={cardTitle}
        loading={true}
        style={{ marginBottom: '24px' }}
      >
        <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text type="secondary">Loading timeline data...</Text>
        </div>
      </Card>
    );
  }

  // No data state
  if (!data || data.dataPoints.length === 0) {
    return (
      <Card
        title={cardTitle}
        style={{ marginBottom: '24px' }}
      >
        <div style={{ 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <ExclamationCircleOutlined style={{ fontSize: '24px', color: '#d9d9d9' }} />
          <Text type="secondary">No alert data available for the selected time range</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Try adjusting your filters or selecting a different time range
          </Text>
        </div>
      </Card>
    );
  }

  // Main chart display
  return (
    <Card
      title={cardTitle}
      loading={isLoading}
      style={{ marginBottom: '24px' }}
      bodyStyle={{ padding: '16px 24px' }}
    >
      <AlertTimelineChart
        data={data.dataPoints}
        events={data.events}
        chartStyle={chartStyle}
        height={height}
        timeRange={selectedTimeRange}
        aggregationInterval={data.aggregationInterval}
      />
      
      {/* Summary info */}
      <div style={{ 
        marginTop: '12px', 
        paddingTop: '12px', 
        borderTop: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'center',
        gap: '24px'
      }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          <strong>{data.summary.totalIncidents}</strong> total incidents
        </Text>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          <strong>{data.summary.avgIncidentsPerHour.toFixed(1)}</strong> avg per hour
        </Text>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          Peak at <strong>{data.summary.peakHour}</strong>
        </Text>
        {data.events.length > 0 && (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            <strong>{data.events.length}</strong> notable events
          </Text>
        )}
      </div>
    </Card>
  );
};