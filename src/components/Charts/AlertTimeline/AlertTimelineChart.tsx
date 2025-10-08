import React from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Typography } from 'antd';
import type { ChartStyle, TimelineDataPoint, TimelineEvent } from './types';

const { Text } = Typography;

interface AlertTimelineChartProps {
  data: TimelineDataPoint[];
  events: TimelineEvent[];
  chartStyle: ChartStyle;
  height: string;
  timeRange?: number; // hours - for better formatting
  aggregationInterval?: string; // 'minute', '5-minute', 'hourly', etc.
}

// Format time for tooltip based on aggregation interval
const formatTooltipTime = (tickItem: string, aggregationInterval: string = 'hourly') => {
  const date = new Date(tickItem);
  let endTime: Date;
  let intervalDuration: string;
  
  switch (aggregationInterval) {
    case 'minute':
      endTime = new Date(date.getTime() + 60 * 1000); // Add 1 minute
      intervalDuration = 'minute';
      break;
    case '5-minute':
      endTime = new Date(date.getTime() + 5 * 60 * 1000); // Add 5 minutes
      intervalDuration = '5 minutes';
      break;
    case 'hourly':
      endTime = new Date(date.getTime() + 60 * 60 * 1000); // Add 1 hour
      intervalDuration = 'hour';
      break;
    case '6-hour':
      endTime = new Date(date.getTime() + 6 * 60 * 60 * 1000); // Add 6 hours
      intervalDuration = '6 hours';
      break;
    case 'daily':
      endTime = new Date(date.getTime() + 24 * 60 * 60 * 1000); // Add 1 day
      intervalDuration = 'day';
      break;
    case 'weekly':
      endTime = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000); // Add 1 week
      intervalDuration = 'week';
      break;
    default:
      endTime = new Date(date.getTime() + 60 * 60 * 1000); // Default to 1 hour
      intervalDuration = 'hour';
  }
  
  // Format based on the interval duration
  if (intervalDuration === 'minute' || intervalDuration === '5 minutes') {
    return `${date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })} - ${endTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })}`;
  } else if (intervalDuration === 'hour' || intervalDuration === '6 hours') {
    return `${date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })} - ${endTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })}`;
  } else {
    return `${date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })} - ${endTime.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })}`;
  }
};

// Custom tooltip component  
const CustomTooltip = ({ active, payload, label, chartStyle, aggregationInterval }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const time = formatTooltipTime(label, aggregationInterval);

  return (
    <div className="recharts-tooltip-wrapper" style={{
      backgroundColor: '#fff',
      border: '1px solid #d9d9d9',
      borderRadius: '6px',
      padding: '12px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      minWidth: '160px'
    }}>
      <Text strong style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>
        {time}
      </Text>
      <div style={{ fontSize: '12px', lineHeight: '20px' }}>
        {chartStyle === 'stacked-area' || chartStyle === 'bar' ? (
          // Show stacked breakdown
          <div>
            <div style={{ color: '#1890ff', marginBottom: '4px' }}>
              <strong>{data.incidents}</strong> total incidents
            </div>
            {data.fatal > 0 && (
              <div style={{ color: severityColors.fatal, display: 'flex', justifyContent: 'space-between' }}>
                <span>Fatal:</span> <strong>{data.fatal}</strong>
              </div>
            )}
            {data.critical > 0 && (
              <div style={{ color: severityColors.critical, display: 'flex', justifyContent: 'space-between' }}>
                <span>Critical:</span> <strong>{data.critical}</strong>
              </div>
            )}
            {data.warning > 0 && (
              <div style={{ color: severityColors.warning, display: 'flex', justifyContent: 'space-between' }}>
                <span>Warning:</span> <strong>{data.warning}</strong>
              </div>
            )}
          </div>
        ) : (
          // Show regular breakdown
          <div>
            <div style={{ color: '#1890ff' }}>
              <strong>{data.incidents}</strong> total incidents
            </div>
            <div style={{ color: '#52c41a' }}>
              <strong>{data.services_affected}</strong> services affected
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


// Format time for X-axis based on time range
const formatTime = (tickItem: string, timeRange: number = 24) => {
  const date = new Date(tickItem);
  
  if (timeRange <= 48) {
    // For short ranges, show time
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  } else if (timeRange <= 168) {
    // For weekly ranges, show day + time
    return date.toLocaleDateString('en-US', { 
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      hour12: false
    });
  } else {
    // For longer ranges, show date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
};

// Severity colors
const severityColors = {
  fatal: '#000000',      // Black for fatal
  critical: '#ff4d4f',   // Red for critical  
  warning: '#ff7a00',    // Orange for warning
  none: '#52c41a'        // Keep for backward compatibility
};

export const AlertTimelineChart: React.FC<AlertTimelineChartProps> = ({
  data,
  events,
  chartStyle,
  height,
  timeRange = 24,
  aggregationInterval = 'hourly'
}) => {
  // Prepare data for different chart types
  const chartData = data.map(point => ({
    timestamp: point.timestamp,
    incidents: point.incidents,
    services_affected: point.services_affected,
    // For stacked areas - flatten severity breakdown
    fatal: point.severityBreakdown?.fatal || 0,
    critical: point.severityBreakdown?.critical || 0,
    warning: point.severityBreakdown?.warning || 0,
    none: point.severityBreakdown?.none || 0
  }));

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 60 }
    };

    const xAxisProps = {
      dataKey: "timestamp",
      tickFormatter: (tick: string) => formatTime(tick, timeRange),
      interval: 'preserveStartEnd' as any,
      tick: { fontSize: 11, fill: '#a0a6b8' },
      axisLine: { stroke: '#a0a6b8' },
      tickLine: { stroke: '#a0a6b8' }
    };

    const yAxisProps = {
      tick: { fontSize: 11, fill: '#a0a6b8' },
      axisLine: { stroke: '#a0a6b8' },
      tickLine: { stroke: '#a0a6b8' }
    };

    const gridProps = {
      strokeDasharray: "3 3",
      stroke: "#374151",
      opacity: 0.3
    };

    switch (chartStyle) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1890ff" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#1890ff" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={(props: any) => <CustomTooltip {...props} chartStyle={chartStyle} timeRange={timeRange} aggregationInterval={aggregationInterval} />} />
            <Area 
              type="monotone" 
              dataKey="incidents" 
              stroke="#1890ff" 
              strokeWidth={2}
              fill="url(#areaGradient)" 
              dot={{ fill: '#1890ff', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#1890ff', strokeWidth: 2 }}
            />
          </AreaChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid {...gridProps} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={(props: any) => <CustomTooltip {...props} chartStyle={chartStyle} timeRange={timeRange} aggregationInterval={aggregationInterval} />} />
            <Line 
              type="monotone" 
              dataKey="incidents" 
              stroke="#1890ff" 
              strokeWidth={2}
              dot={{ fill: '#1890ff', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#1890ff', strokeWidth: 2 }}
            />
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <defs>
              <linearGradient id="fatalBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={severityColors.fatal} stopOpacity={0.9}/>
                <stop offset="95%" stopColor={severityColors.fatal} stopOpacity={0.7}/>
              </linearGradient>
              <linearGradient id="criticalBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={severityColors.critical} stopOpacity={0.9}/>
                <stop offset="95%" stopColor={severityColors.critical} stopOpacity={0.7}/>
              </linearGradient>
              <linearGradient id="warningBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={severityColors.warning} stopOpacity={0.9}/>
                <stop offset="95%" stopColor={severityColors.warning} stopOpacity={0.7}/>
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={(props: any) => <CustomTooltip {...props} chartStyle={chartStyle} timeRange={timeRange} aggregationInterval={aggregationInterval} />} />
            <Legend />
            <Bar 
              dataKey="fatal" 
              stackId="severity"
              fill="url(#fatalBarGradient)"
              name="Fatal"
            />
            <Bar 
              dataKey="critical" 
              stackId="severity"
              fill="url(#criticalBarGradient)"
              name="Critical"
            />
            <Bar 
              dataKey="warning" 
              stackId="severity"
              fill="url(#warningBarGradient)"
              name="Warning"
            />
          </BarChart>
        );

      case 'stacked-area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="fatalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={severityColors.fatal} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={severityColors.fatal} stopOpacity={0.3}/>
              </linearGradient>
              <linearGradient id="criticalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={severityColors.critical} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={severityColors.critical} stopOpacity={0.3}/>
              </linearGradient>
              <linearGradient id="warningGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={severityColors.warning} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={severityColors.warning} stopOpacity={0.3}/>
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={(props: any) => <CustomTooltip {...props} chartStyle={chartStyle} timeRange={timeRange} aggregationInterval={aggregationInterval} />} />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="fatal" 
              stackId="severity"
              stroke={severityColors.fatal}
              strokeWidth={1}
              fill="url(#fatalGradient)"
              name="Fatal"
            />
            <Area 
              type="monotone" 
              dataKey="critical" 
              stackId="severity"
              stroke={severityColors.critical}
              strokeWidth={1}
              fill="url(#criticalGradient)"
              name="Critical"
            />
            <Area 
              type="monotone" 
              dataKey="warning" 
              stackId="severity"
              stroke={severityColors.warning}
              strokeWidth={1}
              fill="url(#warningGradient)"
              name="Warning"
            />
          </AreaChart>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        {renderChart() || <div>Error loading chart</div>}
      </ResponsiveContainer>
      
      {/* Event markers overlay */}
      {events.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none'
        }}>
          {/* Event markers would be positioned here */}
          {/* This is a simplified version - full implementation would calculate positions */}
        </div>
      )}
    </div>
  );
};