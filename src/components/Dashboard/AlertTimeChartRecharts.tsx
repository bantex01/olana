import React from 'react';
import { Card, Typography, Tooltip } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  ReferenceLine
} from 'recharts';

const { Text } = Typography;

interface DataPoint {
  time: string;
  timestamp: number;
  count: number;
  formattedTime?: string;
}

interface Event {
  time: string;
  timestamp: number;
  type: 'commit' | 'deployment' | 'incident';
  title: string;
  description: string;
  author?: string;
  repo?: string;
  count?: number;
}

interface AlertTimeChartProps {
  loading?: boolean;
}

export const AlertTimeChartRecharts: React.FC<AlertTimeChartProps> = ({ loading = false }) => {
  
  // Mock data for the last 24 hours
  const mockData: DataPoint[] = [
    { time: '00:00', timestamp: Date.now() - 24 * 60 * 60 * 1000, count: 8, formattedTime: '00:00' },
    { time: '02:00', timestamp: Date.now() - 22 * 60 * 60 * 1000, count: 5, formattedTime: '02:00' },
    { time: '04:00', timestamp: Date.now() - 20 * 60 * 60 * 1000, count: 3, formattedTime: '04:00' },
    { time: '06:00', timestamp: Date.now() - 18 * 60 * 60 * 1000, count: 6, formattedTime: '06:00' },
    { time: '08:00', timestamp: Date.now() - 16 * 60 * 60 * 1000, count: 18, formattedTime: '08:00' },
    { time: '10:00', timestamp: Date.now() - 14 * 60 * 60 * 1000, count: 25, formattedTime: '10:00' },
    { time: '12:00', timestamp: Date.now() - 12 * 60 * 60 * 1000, count: 22, formattedTime: '12:00' },
    { time: '14:00', timestamp: Date.now() - 10 * 60 * 60 * 1000, count: 35, formattedTime: '14:00' }, // Peak
    { time: '16:00', timestamp: Date.now() - 8 * 60 * 60 * 1000, count: 28, formattedTime: '16:00' },
    { time: '18:00', timestamp: Date.now() - 6 * 60 * 60 * 1000, count: 15, formattedTime: '18:00' },
    { time: '20:00', timestamp: Date.now() - 4 * 60 * 60 * 1000, count: 42, formattedTime: '20:00' }, // Another peak
    { time: '22:00', timestamp: Date.now() - 2 * 60 * 60 * 1000, count: 31, formattedTime: '22:00' },
    { time: '24:00', timestamp: Date.now(), count: 19, formattedTime: '24:00' },
  ];

  // Mock events that correlate with alert spikes
  const mockEvents: Event[] = [
    {
      time: '09:30',
      timestamp: Date.now() - 14.5 * 60 * 60 * 1000,
      type: 'commit',
      title: 'Database migration commit',
      description: 'Updated user schema with new indexes',
      author: 'john.doe@company.com',
      repo: 'backend-services'
    },
    {
      time: '13:45',
      timestamp: Date.now() - 10.25 * 60 * 60 * 1000,
      type: 'deployment',
      title: 'Production deployment v2.1.4',
      description: 'Deployed new API endpoints and performance improvements',
      author: 'deploy-bot',
      repo: 'api-gateway'
    },
    {
      time: '14:10',
      timestamp: Date.now() - 9.83 * 60 * 60 * 1000,
      type: 'incident',
      title: 'High latency detected',
      description: 'Database connection pool exhaustion',
      count: 12
    },
    {
      time: '19:15',
      timestamp: Date.now() - 4.75 * 60 * 60 * 1000,
      type: 'commit',
      title: 'Hotfix: Memory leak patch',
      description: 'Fixed memory leak in user session handling',
      author: 'jane.smith@company.com',
      repo: 'user-service'
    }
  ];


  const getEventColor = (type: string) => {
    switch (type) {
      case 'commit': return '#52c41a';
      case 'deployment': return '#1890ff';
      case 'incident': return '#ff4d4f';
      default: return '#52c41a';
    }
  };

  // Custom tooltip for the line chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '12px',
          color: '#e5e7eb'
        }}>
          <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
            {label}
          </div>
          <div style={{ color: '#1890ff' }}>
            Alerts: {payload[0].value}
          </div>
        </div>
      );
    }
    return null;
  };


  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LineChartOutlined style={{ color: '#1890ff' }} />
          <span>Alert Timeline (Last 24h)</span>
          <Text type="secondary" style={{ fontSize: '12px', fontWeight: 'normal' }}>
            Hover over events for details
          </Text>
        </div>
      }
      loading={loading}
      style={{ marginBottom: '24px' }}
    >
      <div style={{ position: 'relative', width: '100%', height: '200px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={mockData} margin={{ top: 30, right: 20, bottom: 30, left: 20 }}>
            <defs>
              <linearGradient id="alertGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1890ff" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#1890ff" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#374151" 
              opacity={0.3}
            />
            
            <XAxis 
              dataKey="formattedTime"
              axisLine={{ stroke: '#a0a6b8' }}
              tickLine={{ stroke: '#a0a6b8' }}
              tick={{ fill: '#a0a6b8', fontSize: 12 }}
              interval={2} // Show every 3rd label to avoid crowding
            />
            
            <YAxis 
              axisLine={{ stroke: '#a0a6b8' }}
              tickLine={{ stroke: '#a0a6b8' }}
              tick={{ fill: '#a0a6b8', fontSize: 12 }}
              label={{ 
                value: 'Alert Count', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#a0a6b8', fontSize: '12px' }
              }}
            />
            
            <RechartsTooltip content={<CustomTooltip />} />
            
            {/* Event reference lines */}
            {mockEvents.map((event, i) => {
              const nearestDataIndex = mockData.findIndex(d => 
                Math.abs(d.timestamp - event.timestamp) === 
                Math.min(...mockData.map(dp => Math.abs(dp.timestamp - event.timestamp)))
              );
              return (
                <ReferenceLine 
                  key={`event-line-${i}`}
                  x={mockData[nearestDataIndex]?.formattedTime}
                  stroke={getEventColor(event.type)}
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  opacity={0.7}
                />
              );
            })}
            
            {/* Area fill under line */}
            <Area
              type="monotone"
              dataKey="count"
              stroke="none"
              fill="url(#alertGradient)"
            />
            
            {/* Main line */}
            <Line
              type="monotone"
              dataKey="count"
              stroke="#1890ff"
              strokeWidth={2}
              dot={{ fill: '#1890ff', stroke: '#ffffff', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#1890ff', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Event annotations overlay */}
        <div style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}>
          <svg width="100%" height="100%" style={{ position: 'absolute' }}>
            {mockEvents.map((event, i) => {
              const minTime = Math.min(...mockData.map(d => d.timestamp));
              const maxTime = Math.max(...mockData.map(d => d.timestamp));
              const maxCount = Math.max(...mockData.map(d => d.count));
              
              // Calculate position (accounting for chart margins)
              const chartMargin = { top: 30, right: 20, bottom: 30, left: 65 }; // Approximate margins
              const chartWidth = window.innerWidth - chartMargin.left - chartMargin.right - 48; // Account for card padding
              const chartHeight = 200 - chartMargin.top - chartMargin.bottom;
              
              const x = chartMargin.left + ((event.timestamp - minTime) / (maxTime - minTime)) * chartWidth;
              const nearestDataPoint = mockData.reduce((prev, curr) => 
                Math.abs(curr.timestamp - event.timestamp) < Math.abs(prev.timestamp - event.timestamp) 
                  ? curr : prev
              );
              const y = chartMargin.top + chartHeight - (nearestDataPoint.count / maxCount) * chartHeight;

              return (
                <Tooltip
                  key={i}
                  title={
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        {event.title}
                      </div>
                      <div style={{ marginBottom: '4px' }}>
                        {event.description}
                      </div>
                      <div style={{ fontSize: '12px', color: '#a0a6b8' }}>
                        {event.time} • {event.type}
                        {event.author && ` • ${event.author}`}
                        {event.repo && ` • ${event.repo}`}
                        {event.count && ` • ${event.count} alerts`}
                      </div>
                    </div>
                  }
                  placement="top"
                >
                  <circle
                    cx={x}
                    cy={Math.max(chartMargin.top + 15, y - 15)}
                    r="8"
                    fill={getEventColor(event.type)}
                    stroke="#ffffff"
                    strokeWidth="2"
                    style={{ cursor: 'pointer', pointerEvents: 'all' }}
                  />
                </Tooltip>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '20px', 
        marginTop: '16px',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ 
            width: '12px', 
            height: '2px', 
            backgroundColor: '#52c41a',
            opacity: 0.7
          }} />
          <span style={{ color: '#a0a6b8' }}>Commits</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ 
            width: '12px', 
            height: '2px', 
            backgroundColor: '#1890ff',
            opacity: 0.7
          }} />
          <span style={{ color: '#a0a6b8' }}>Deployments</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ 
            width: '12px', 
            height: '2px', 
            backgroundColor: '#ff4d4f',
            opacity: 0.7
          }} />
          <span style={{ color: '#a0a6b8' }}>Incidents</span>
        </div>
      </div>
    </Card>
  );
};