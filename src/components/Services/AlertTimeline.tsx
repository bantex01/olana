import React, { useState, useMemo } from 'react';
import { Card, Typography, Space, Button, Select, Tag, Tooltip, Row, Col, Progress } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined, CalendarOutlined, BarChartOutlined } from '@ant-design/icons';
import type { ServiceDetailResponse, ServiceAlertHistory } from '../../types';

const { Text } = Typography;
const { Option } = Select;

interface AlertTimelineProps {
  serviceData: ServiceDetailResponse;
}

export const AlertTimeline: React.FC<AlertTimelineProps> = ({ serviceData }) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [viewMode, setViewMode] = useState<'timeline' | 'chart'>('timeline');
  
  const { alerts } = serviceData;
  
  // Filter alert history based on selected time range and fill missing days
  const filteredHistory = useMemo(() => {
    const now = new Date();
    const cutoffDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    
    // Create a complete date range with placeholder entries
    const dateRange: ServiceAlertHistory[] = [];
    for (let i = 0; i < cutoffDays; i++) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      
      // Find matching alert data for this date
      const existingData = alerts.history?.find(alert => {
        const alertDate = new Date(alert.date).toISOString().split('T')[0];
        return alertDate === dateStr;
      });
      
      const entry = existingData || {
        date: dateStr,
        alert_count: 0,
        critical_count: 0,
        warning_count: 0,
        fatal_count: 0
      } as ServiceAlertHistory;
      
      dateRange.push(entry);
    }
    return dateRange; // Already in reverse chronological order (newest first)
  }, [alerts.history, timeRange]);

  // Calculate timeline metrics
  const timelineMetrics = useMemo(() => {
    if (filteredHistory.length === 0) {
      return {
        totalDays: 0,
        alertDays: 0,
        alertFreeDays: 0,
        avgAlertsPerDay: 0,
        maxAlertsInDay: 0,
        criticalDays: 0,
        warningDays: 0,
        alertFreeStreak: 0,
        longestAlertFreeStreak: 0
      };
    }

    const totalDays = filteredHistory.length;
    const alertDays = filteredHistory.filter(h => parseInt(String(h.alert_count)) > 0).length;
    const alertFreeDays = totalDays - alertDays;
    const totalAlerts = filteredHistory.reduce((sum, h) => sum + (parseInt(String(h.alert_count)) || 0), 0);
    const avgAlertsPerDay = totalDays > 0 ? totalAlerts / totalDays : 0;
    const maxAlertsInDay = Math.max(...filteredHistory.map(h => parseInt(String(h.alert_count)) || 0));
    const criticalDays = filteredHistory.filter(h => (parseInt(String(h.critical_count)) || 0) + (parseInt(String((h as any).fatal_count)) || 0) > 0).length;
    const warningDays = filteredHistory.filter(h => parseInt(String(h.warning_count)) > 0 && parseInt(String(h.critical_count)) === 0).length;

    // Calculate current alert-free streak and longest streak
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    // Start from most recent (first in sorted array)
    for (const entry of filteredHistory) {
      if (parseInt(String(entry.alert_count)) === 0) {
        tempStreak++;
        if (tempStreak === 1 && currentStreak === 0) {
          currentStreak = tempStreak; // Start counting current streak
        } else if (currentStreak > 0) {
          currentStreak = tempStreak; // Continue current streak
        }
      } else {
        if (currentStreak === 0) {
          currentStreak = 0; // No current streak if we hit an alert day
        }
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        tempStreak = 0;
      }
    }
    
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }

    return {
      totalDays,
      alertDays,
      alertFreeDays,
      avgAlertsPerDay: Math.round(avgAlertsPerDay),
      maxAlertsInDay,
      criticalDays,
      warningDays,
      alertFreeStreak: currentStreak,
      longestAlertFreeStreak: longestStreak
    };
  }, [filteredHistory]);

  // Get status for a specific day
  const getDayStatus = (entry: ServiceAlertHistory) => {
    const criticalCount = parseInt(String(entry.critical_count)) || 0;
    const warningCount = parseInt(String(entry.warning_count)) || 0;
    const alertCount = parseInt(String(entry.alert_count)) || 0;
    
    // Calculate potential fatal count - alerts that aren't critical or warning are likely fatal or info
    // Since we know this service has fatal alerts from DB, if we have unaccounted alerts, treat as fatal
    const accountedAlerts = criticalCount + warningCount;
    const unaccountedAlerts = alertCount - accountedAlerts;
    
    // If we have unaccounted alerts and this matches a known pattern, treat as fatal
    // For this service, we know there are fatal alerts, so unaccounted alerts are likely fatal
    if (unaccountedAlerts > 0 && criticalCount === 0 && warningCount === 0) {
      return { 
        status: 'fatal', 
        color: '#000000', 
        intensity: Math.min(unaccountedAlerts / 3, 1),
        label: `${unaccountedAlerts} fatal`
      };
    } else if (criticalCount > 0) {
      return { 
        status: 'critical', 
        color: '#ff4d4f', 
        intensity: Math.min(criticalCount / 5, 1),
        label: `${criticalCount} critical`
      };
    } else if (warningCount > 0) {
      return { 
        status: 'warning', 
        color: '#faad14', 
        intensity: Math.min(warningCount / 10, 1),
        label: `${warningCount} warning`
      };
    } else if (alertCount > 0) {
      return { 
        status: 'info', 
        color: '#1890ff', 
        intensity: Math.min(alertCount / 10, 1),
        label: `${alertCount} info alerts`
      };
    } else {
      return { 
        status: 'success', 
        color: '#52c41a', 
        intensity: 1,
        label: 'No alerts'
      };
    }
  };

  // Render timeline view
  const renderTimeline = () => (
    <div style={{ padding: '16px 0' }}>
      {/* Timeline Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(filteredHistory.length, 50)}, 1fr)`,
        gap: '1px',
        maxWidth: '100%',
        overflowX: 'auto',
        paddingBottom: '16px'
      }}>
        {filteredHistory.map((entry, _index) => {
          const dayStatus = getDayStatus(entry);
          const date = new Date(entry.date);
          const isToday = date.toDateString() === new Date().toDateString();
          
          return (
            <Tooltip
              key={entry.date}
              title={
                <div>
                  <div style={{ fontWeight: 'bold' }}>
                    {date.toLocaleDateString()}
                    {isToday && ' (Today)'}
                  </div>
                  <div>{dayStatus.label}</div>
                  {entry.alert_count > 0 && (
                    <div style={{ marginTop: '4px', fontSize: '11px' }}>
                      Critical: {entry.critical_count} | Warning: {entry.warning_count}
                    </div>
                  )}
                </div>
              }
            >
              <div style={{
                height: '32px',
                backgroundColor: dayStatus.color,
                opacity: 0.3 + (dayStatus.intensity * 0.7),
                borderRadius: '3px',
                border: isToday ? '2px solid #1890ff' : '1px solid rgba(0,0,0,0.1)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                minWidth: '16px',
                fontSize: '9px'
              }}>
                {parseInt(String(entry.alert_count)) > 0 && (
                  <Text style={{ 
                    fontSize: '10px', 
                    color: 'white', 
                    fontWeight: 'bold',
                    textShadow: '1px 1px 1px rgba(0,0,0,0.5)'
                  }}>
                    {parseInt(String(entry.alert_count)) > 99 ? '99+' : parseInt(String(entry.alert_count))}
                  </Text>
                )}
                {isToday && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '8px',
                    color: '#1890ff',
                    fontWeight: 'bold'
                  }}>
                    TODAY
                  </div>
                )}
              </div>
            </Tooltip>
          );
        })}
      </div>

      {/* Date Labels */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '20px',
        fontSize: '11px',
        color: '#8c8c8c'
      }}>
        <span>{filteredHistory.length > 0 ? new Date(filteredHistory[filteredHistory.length - 1]?.date).toLocaleDateString() : ''}</span>
        <span>{filteredHistory.length > 0 ? new Date(filteredHistory[0]?.date).toLocaleDateString() : ''}</span>
      </div>
    </div>
  );

  // Render chart view (stacked bar chart using CSS)
  const renderChart = () => {
    const maxCount = Math.max(...filteredHistory.map(h => h.alert_count), 1);
    
    return (
      <div style={{ padding: '16px 0' }}>
        <div style={{
          display: 'flex',
          alignItems: 'end',
          justifyContent: 'space-between',
          gap: '1px',
          height: '200px',
          overflowX: 'auto',
          paddingBottom: '20px'
        }}>
          {filteredHistory.map((entry, _index) => {
            const alertCount = parseInt(String(entry.alert_count)) || 0;
            const totalHeight = alertCount === 0 ? 4 : Math.max((alertCount / maxCount) * 180, 8);
            
            // Calculate stacked segments based on actual data
            const segments = [];
            
            if (alertCount > 0) {
              // Get actual counts from data
              const criticalCount = parseInt(String(entry.critical_count)) || 0;
              const warningCount = parseInt(String(entry.warning_count)) || 0;
              const accountedAlerts = criticalCount + warningCount;
              const unaccountedAlerts = alertCount - accountedAlerts;
              
              // Determine if unaccounted alerts are fatal or info
              // If no critical/warning but we have alerts, likely fatal
              const fatalCount = (unaccountedAlerts > 0 && criticalCount === 0 && warningCount === 0) ? unaccountedAlerts : 0;
              const infoCount = (unaccountedAlerts > 0 && (criticalCount > 0 || warningCount > 0)) ? unaccountedAlerts : 0;
              
              // Build segments from bottom up (info -> warning -> critical -> fatal)
              if (infoCount > 0) {
                segments.push({
                  height: (infoCount / alertCount) * totalHeight,
                  color: '#1890ff',
                  label: 'Info',
                  count: infoCount
                });
              }
              
              if (warningCount > 0) {
                segments.push({
                  height: (warningCount / alertCount) * totalHeight,
                  color: '#faad14',
                  label: 'Warning',
                  count: warningCount
                });
              }
              
              if (criticalCount > 0) {
                segments.push({
                  height: (criticalCount / alertCount) * totalHeight,
                  color: '#ff4d4f',
                  label: 'Critical',
                  count: criticalCount
                });
              }
              
              if (fatalCount > 0) {
                segments.push({
                  height: (fatalCount / alertCount) * totalHeight,
                  color: '#000000',
                  label: 'Fatal',
                  count: fatalCount
                });
              }
            }
            
            return (
              <Tooltip
                key={entry.date}
                title={
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{new Date(entry.date).toLocaleDateString()}</div>
                    <div>Total: {alertCount}</div>
                    {segments.map((segment, i) => (
                      <div key={i} style={{ color: segment.color }}>
                        {segment.label}: {segment.count}
                      </div>
                    ))}
                  </div>
                }
              >
                <div style={{
                  height: `${totalHeight}px`,
                  width: '12px',
                  cursor: 'pointer',
                  minWidth: '12px',
                  display: 'flex',
                  flexDirection: 'column-reverse', // Stack from bottom up
                  borderRadius: '2px 2px 0 0',
                  overflow: 'hidden'
                }}>
                  {alertCount === 0 ? (
                    // Show minimal green bar for no alerts
                    <div style={{
                      height: '100%',
                      backgroundColor: '#52c41a',
                      opacity: 0.3
                    }} />
                  ) : (
                    // Show stacked segments
                    segments.map((segment, segIndex) => (
                      <div
                        key={segIndex}
                        style={{
                          height: `${segment.height}px`,
                          backgroundColor: segment.color,
                          opacity: 0.8,
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                      />
                    ))
                  )}
                </div>
              </Tooltip>
            );
          })}
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#8c8c8c'
        }}>
          <span>{filteredHistory.length > 0 ? new Date(filteredHistory[filteredHistory.length - 1]?.date).toLocaleDateString() : ''}</span>
          <span>Max: {maxCount}</span>
          <span>{filteredHistory.length > 0 ? new Date(filteredHistory[0]?.date).toLocaleDateString() : ''}</span>
        </div>
      </div>
    );
  };

  if (!alerts.history || alerts.history.length === 0) {
    return (
      <Card
        title={
          <Space>
            <ClockCircleOutlined style={{ color: '#1890ff' }} />
            <span>Alert Timeline & History</span>
          </Space>
        }
      >
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          color: '#8c8c8c'
        }}>
          <CalendarOutlined style={{ fontSize: '48px', marginBottom: '16px', color: '#d9d9d9' }} />
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>No Alert History Available</div>
          <div style={{ fontSize: '14px' }}>
            Alert timeline data will appear once the service generates alert history.
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <ClockCircleOutlined style={{ color: '#1890ff' }} />
          <span>Alert Timeline & History</span>
          <Tag color="blue">{timelineMetrics.totalDays} days</Tag>
        </Space>
      }
      extra={
        <Space>
          <Select
            size="small"
            value={timeRange}
            onChange={setTimeRange}
            style={{ width: '80px' }}
          >
            <Option value="7d">7 days</Option>
            <Option value="30d">30 days</Option>
            <Option value="90d">90 days</Option>
          </Select>
          <Button.Group size="small">
            <Button 
              type={viewMode === 'timeline' ? 'primary' : 'default'}
              icon={<CalendarOutlined />}
              onClick={() => setViewMode('timeline')}
            >
              Timeline
            </Button>
            <Button 
              type={viewMode === 'chart' ? 'primary' : 'default'}
              icon={<BarChartOutlined />}
              onClick={() => setViewMode('chart')}
            >
              Chart
            </Button>
          </Button.Group>
        </Space>
      }
    >
      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        {/* Quick Stats */}
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f6ffed', borderRadius: '6px' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>
                {timelineMetrics.alertFreeDays}
              </div>
              <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Alert-Free Days</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#fff2e8', borderRadius: '6px' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#faad14' }}>
                {timelineMetrics.alertFreeStreak}
              </div>
              <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Current Streak</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
                {timelineMetrics.avgAlertsPerDay}
              </div>
              <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Avg/Day</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#fff1f0', borderRadius: '6px' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff4d4f' }}>
                {timelineMetrics.criticalDays}
              </div>
              <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Critical Days</div>
            </div>
          </Col>
        </Row>

        {/* Timeline/Chart Visualization */}
        <div style={{ 
          backgroundColor: '#fafafa', 
          borderRadius: '8px', 
          padding: '16px',
          border: '1px solid #f0f0f0'
        }}>
          {viewMode === 'timeline' ? renderTimeline() : renderChart()}
        </div>

        {/* Legend and Insights */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px' }}>
          {/* Legend */}
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: '13px', marginBottom: '8px', display: 'block' }}>
              Status Legend:
            </Text>
            <Space wrap>
              <Space>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#52c41a', borderRadius: '2px' }} />
                <Text style={{ fontSize: '11px' }}>No Alerts</Text>
              </Space>
              <Space>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#1890ff', borderRadius: '2px' }} />
                <Text style={{ fontSize: '11px' }}>Info</Text>
              </Space>
              <Space>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#faad14', borderRadius: '2px' }} />
                <Text style={{ fontSize: '11px' }}>Warning</Text>
              </Space>
              <Space>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#ff4d4f', borderRadius: '2px' }} />
                <Text style={{ fontSize: '11px' }}>Critical</Text>
              </Space>
              <Space>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#000000', borderRadius: '2px' }} />
                <Text style={{ fontSize: '11px' }}>Fatal</Text>
              </Space>
            </Space>
          </div>

          {/* Health Insights */}
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: '13px', marginBottom: '8px', display: 'block' }}>
              Health Insights:
            </Text>
            <Space direction="vertical" size={4}>
              {timelineMetrics.alertFreeStreak >= 7 && (
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '12px' }} />
                  <Text style={{ fontSize: '11px', color: '#52c41a' }}>
                    Stable {timelineMetrics.alertFreeStreak}-day streak
                  </Text>
                </Space>
              )}
              {timelineMetrics.longestAlertFreeStreak >= 14 && (
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '12px' }} />
                  <Text style={{ fontSize: '11px', color: '#52c41a' }}>
                    Best streak: {timelineMetrics.longestAlertFreeStreak} days
                  </Text>
                </Space>
              )}
              {timelineMetrics.criticalDays > timelineMetrics.totalDays * 0.1 && (
                <Space>
                  <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: '12px' }} />
                  <Text style={{ fontSize: '11px', color: '#ff4d4f' }}>
                    High critical frequency
                  </Text>
                </Space>
              )}
              {timelineMetrics.avgAlertsPerDay > 10 && (
                <Space>
                  <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: '12px' }} />
                  <Text style={{ fontSize: '11px', color: '#faad14' }}>
                    High alert volume
                  </Text>
                </Space>
              )}
            </Space>
          </div>
        </div>

        {/* Service Reliability Score */}
        <div style={{ 
          backgroundColor: '#f9f9f9', 
          padding: '16px', 
          borderRadius: '8px',
          border: '1px solid #f0f0f0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <Text strong style={{ fontSize: '14px' }}>Service Reliability Score</Text>
            <Text style={{ 
              fontSize: '16px', 
              fontWeight: 'bold',
              color: timelineMetrics.alertFreeDays / timelineMetrics.totalDays >= 0.9 ? '#52c41a' :
                     timelineMetrics.alertFreeDays / timelineMetrics.totalDays >= 0.7 ? '#1890ff' :
                     timelineMetrics.alertFreeDays / timelineMetrics.totalDays >= 0.5 ? '#faad14' : '#ff4d4f'
            }}>
              {Math.round((timelineMetrics.alertFreeDays / timelineMetrics.totalDays) * 100)}%
            </Text>
          </div>
          <Progress 
            percent={Math.round((timelineMetrics.alertFreeDays / timelineMetrics.totalDays) * 100)}
            showInfo={false}
            strokeColor={
              timelineMetrics.alertFreeDays / timelineMetrics.totalDays >= 0.9 ? '#52c41a' :
              timelineMetrics.alertFreeDays / timelineMetrics.totalDays >= 0.7 ? '#1890ff' :
              timelineMetrics.alertFreeDays / timelineMetrics.totalDays >= 0.5 ? '#faad14' : '#ff4d4f'
            }
          />
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#8c8c8c' }}>
            {timelineMetrics.alertFreeDays} out of {timelineMetrics.totalDays} days without alerts
          </div>
        </div>
      </Space>
    </Card>
  );
};