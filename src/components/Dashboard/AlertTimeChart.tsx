import React, { useState } from 'react';
import { Card, Typography, Tooltip } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface DataPoint {
  time: string;
  timestamp: number;
  count: number;
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

export const AlertTimeChart: React.FC<AlertTimeChartProps> = ({ loading = false }) => {
  const [containerWidth, setContainerWidth] = useState(800);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Update chart width based on container
  React.useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth - 24; // Minimal padding
        setContainerWidth(Math.max(400, width)); // Use full available width
      }
    };

    // Initial measurement with delay to ensure DOM is ready
    setTimeout(updateWidth, 50);
    
    // Set up resize observer for better performance
    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  // Mock data for the last 24 hours
  const mockData: DataPoint[] = [
    { time: '00:00', timestamp: Date.now() - 24 * 60 * 60 * 1000, count: 8 },
    { time: '02:00', timestamp: Date.now() - 22 * 60 * 60 * 1000, count: 5 },
    { time: '04:00', timestamp: Date.now() - 20 * 60 * 60 * 1000, count: 3 },
    { time: '06:00', timestamp: Date.now() - 18 * 60 * 60 * 1000, count: 12 },
    { time: '08:00', timestamp: Date.now() - 16 * 60 * 60 * 1000, count: 18 },
    { time: '10:00', timestamp: Date.now() - 14 * 60 * 60 * 1000, count: 25 },
    { time: '12:00', timestamp: Date.now() - 12 * 60 * 60 * 1000, count: 22 },
    { time: '14:00', timestamp: Date.now() - 10 * 60 * 60 * 1000, count: 35 }, // Peak
    { time: '16:00', timestamp: Date.now() - 8 * 60 * 60 * 1000, count: 28 },
    { time: '18:00', timestamp: Date.now() - 6 * 60 * 60 * 1000, count: 15 },
    { time: '20:00', timestamp: Date.now() - 4 * 60 * 60 * 1000, count: 42 }, // Another peak
    { time: '22:00', timestamp: Date.now() - 2 * 60 * 60 * 1000, count: 31 },
    { time: '24:00', timestamp: Date.now(), count: 19 },
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

  const chartWidth = containerWidth;
  const chartHeight = 140; // Further reduced height
  const padding = { top: 25, right: 15, bottom: 45, left: 60 }; // More bottom padding for x-axis labels
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const maxCount = Math.max(...mockData.map(d => d.count));
  const minTime = Math.min(...mockData.map(d => d.timestamp));
  const maxTime = Math.max(...mockData.map(d => d.timestamp));

  // Scale functions
  const xScale = (timestamp: number) => 
    ((timestamp - minTime) / (maxTime - minTime)) * innerWidth;
  
  const yScale = (count: number) => 
    innerHeight - (count / maxCount) * innerHeight;

  // Create line path
  const linePath = mockData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(d.timestamp)} ${yScale(d.count)}`)
    .join(' ');

  // Create area path (for fill under line)
  const areaPath = `${linePath} L ${xScale(mockData[mockData.length - 1].timestamp)} ${innerHeight} L ${xScale(mockData[0].timestamp)} ${innerHeight} Z`;


  const getEventColor = (type: string) => {
    switch (type) {
      case 'commit': return '#52c41a';
      case 'deployment': return '#1890ff';
      case 'incident': return '#ff4d4f';
      default: return '#52c41a';
    }
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
      <div 
        ref={containerRef}
        className="alert-timeline-container"
        style={{ position: 'relative', overflow: 'hidden', width: '100%' }}
      >
        <svg 
          width={chartWidth} 
          height={chartHeight}
          style={{ display: 'block', margin: '0 auto' }}
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="50" height="20" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 20" fill="none" stroke="#374151" strokeWidth="1" opacity="0.3"/>
            </pattern>
          </defs>
          <rect 
            x={padding.left} 
            y={padding.top} 
            width={innerWidth} 
            height={innerHeight} 
            fill="url(#grid)"
          />

          {/* Chart area */}
          <g transform={`translate(${padding.left}, ${padding.top})`}>
            {/* Area under line */}
            <path
              d={areaPath}
              fill="rgba(24, 144, 255, 0.1)"
              stroke="none"
            />
            
            {/* Main line */}
            <path
              d={linePath}
              fill="none"
              stroke="#1890ff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {mockData.map((d, i) => (
              <circle
                key={i}
                cx={xScale(d.timestamp)}
                cy={yScale(d.count)}
                r="4"
                fill="#1890ff"
                stroke="#ffffff"
                strokeWidth="2"
              />
            ))}

            {/* Event annotations */}
            {mockEvents.map((event, i) => {
              const x = xScale(event.timestamp);
              const nearestDataPoint = mockData.reduce((prev, curr) => 
                Math.abs(curr.timestamp - event.timestamp) < Math.abs(prev.timestamp - event.timestamp) 
                  ? curr : prev
              );
              const y = yScale(nearestDataPoint.count);

              return (
                <g key={i}>
                  {/* Event line */}
                  <line
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={innerHeight}
                    stroke={getEventColor(event.type)}
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    opacity="0.7"
                  />
                  
                  {/* Event marker */}
                  <Tooltip
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
                      cy={Math.max(15, y - 15)} // Ensure annotations don't go above chart area
                      r="8"
                      fill={getEventColor(event.type)}
                      stroke="#ffffff"
                      strokeWidth="2"
                      style={{ cursor: 'pointer' }}
                    />
                  </Tooltip>
                </g>
              );
            })}

            {/* Y-axis labels */}
            {[0, maxCount / 4, maxCount / 2, (3 * maxCount) / 4, maxCount].map((value, i) => (
              <g key={i}>
                <text
                  x={-10}
                  y={yScale(value) + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#a0a6b8"
                >
                  {Math.round(value)}
                </text>
                <line
                  x1={0}
                  y1={yScale(value)}
                  x2={innerWidth}
                  y2={yScale(value)}
                  stroke="#374151"
                  strokeWidth="1"
                  opacity="0.3"
                />
              </g>
            ))}

            {/* X-axis labels */}
            {mockData.filter((_, i) => i % 3 === 0).map((d, i) => (
              <text
                key={i}
                x={xScale(d.timestamp)}
                y={innerHeight + 15}
                textAnchor="middle"
                fontSize="11"
                fill="#a0a6b8"
              >
                {d.time}
              </text>
            ))}
          </g>

          {/* Axes */}
          <line
            x1={padding.left}
            y1={padding.top + innerHeight}
            x2={padding.left + innerWidth}
            y2={padding.top + innerHeight}
            stroke="#a0a6b8"
            strokeWidth="1"
          />
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={padding.top + innerHeight}
            stroke="#a0a6b8"
            strokeWidth="1"
          />

          {/* Axis labels */}
          <text
            x={padding.left + innerWidth / 2}
            y={chartHeight - 8}
            textAnchor="middle"
            fontSize="11"
            fill="#a0a6b8"
          >
            Time (24h)
          </text>
          <text
            x={15}
            y={padding.top + innerHeight / 2}
            textAnchor="middle"
            fontSize="12"
            fill="#a0a6b8"
            transform={`rotate(-90, 15, ${padding.top + innerHeight / 2})`}
          >
            Alert Count
          </text>
        </svg>

        {/* Legend */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '20px', 
          marginTop: '4px', // Minimal margin
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
      </div>
    </Card>
  );
};