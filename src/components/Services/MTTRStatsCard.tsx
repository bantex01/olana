import React, { useMemo } from 'react';
import { Card, Typography, Space, Statistic, Progress, Row, Col, Tag, Tooltip, Divider } from 'antd';
import { ClockCircleOutlined, ThunderboltOutlined, CheckCircleOutlined, ExclamationCircleOutlined, TrophyOutlined, AlertOutlined } from '@ant-design/icons';
import type { ServiceDetailResponse, Alert } from '../../types';

const { Text, Title } = Typography;

interface MTTRStatsCardProps {
  serviceData: ServiceDetailResponse;
}

export const MTTRStatsCard: React.FC<MTTRStatsCardProps> = ({ serviceData }) => {
  const { alerts } = serviceData;
  
  // Calculate MTTR metrics from current and historical alerts
  const mttrMetrics = useMemo(() => {
    const resolvedAlerts = alerts.current.filter(alert => 
      alert.status === 'resolved' && alert.resolved_at
    );
    
    if (resolvedAlerts.length === 0) {
      return {
        avgMTTR: 0,
        medianMTTR: 0,
        minMTTR: 0,
        maxMTTR: 0,
        resolvedCount: 0,
        activeCount: alerts.current.filter(a => a.status === 'firing').length,
        resolutionTimes: [],
        severityMTTR: {
          fatal: { avg: 0, count: 0 },
          critical: { avg: 0, count: 0 },
          warning: { avg: 0, count: 0 },
          none: { avg: 0, count: 0 }
        }
      };
    }
    
    // Calculate resolution times in minutes
    const resolutionTimes = resolvedAlerts.map(alert => {
      const createdTime = new Date(alert.created_at).getTime();
      const resolvedTime = new Date(alert.resolved_at!).getTime();
      return (resolvedTime - createdTime) / (1000 * 60); // Convert to minutes
    }).filter(time => time >= 0); // Filter out invalid times
    
    // Basic statistics
    const avgMTTR = resolutionTimes.length > 0 ? 
      resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length : 0;
    
    const sortedTimes = [...resolutionTimes].sort((a, b) => a - b);
    const medianMTTR = sortedTimes.length > 0 ? 
      sortedTimes.length % 2 === 0 
        ? (sortedTimes[sortedTimes.length / 2 - 1] + sortedTimes[sortedTimes.length / 2]) / 2
        : sortedTimes[Math.floor(sortedTimes.length / 2)]
      : 0;
    
    const minMTTR = sortedTimes.length > 0 ? Math.min(...resolutionTimes) : 0;
    const maxMTTR = sortedTimes.length > 0 ? Math.max(...resolutionTimes) : 0;
    
    // Calculate MTTR by severity
    const severityMTTR = {
      fatal: { avg: 0, count: 0 },
      critical: { avg: 0, count: 0 },
      warning: { avg: 0, count: 0 },
      none: { avg: 0, count: 0 }
    };
    
    resolvedAlerts.forEach(alert => {
      const createdTime = new Date(alert.created_at).getTime();
      const resolvedTime = new Date(alert.resolved_at!).getTime();
      const resolutionTime = (resolvedTime - createdTime) / (1000 * 60);
      
      if (resolutionTime >= 0) {
        const severity = alert.severity as keyof typeof severityMTTR;
        if (severityMTTR[severity]) {
          severityMTTR[severity].avg += resolutionTime;
          severityMTTR[severity].count++;
        }
      }
    });
    
    // Calculate averages
    Object.keys(severityMTTR).forEach(severity => {
      const sev = severity as keyof typeof severityMTTR;
      if (severityMTTR[sev].count > 0) {
        severityMTTR[sev].avg = severityMTTR[sev].avg / severityMTTR[sev].count;
      }
    });
    
    return {
      avgMTTR,
      medianMTTR,
      minMTTR,
      maxMTTR,
      resolvedCount: resolvedAlerts.length,
      activeCount: alerts.current.filter(a => a.status === 'firing').length,
      resolutionTimes,
      severityMTTR
    };
  }, [alerts.current]);
  
  // Format time duration
  const formatDuration = (minutes: number) => {
    if (minutes < 1) return `${Math.round(minutes * 60)}s`;
    if (minutes < 60) return `${Math.round(minutes)}m`;
    if (minutes < 1440) return `${Math.round(minutes / 60 * 10) / 10}h`;
    return `${Math.round(minutes / 1440 * 10) / 10}d`;
  };
  
  // Get MTTR performance rating
  const getMTTRRating = (avgMTTR: number) => {
    if (avgMTTR === 0) return { label: 'No Data', color: '#d9d9d9', score: 0 };
    if (avgMTTR < 15) return { label: 'Excellent', color: '#52c41a', score: 95 };
    if (avgMTTR < 60) return { label: 'Good', color: '#1890ff', score: 80 };
    if (avgMTTR < 240) return { label: 'Fair', color: '#faad14', score: 60 };
    if (avgMTTR < 720) return { label: 'Poor', color: '#ff7875', score: 40 };
    return { label: 'Critical', color: '#ff4d4f', score: 20 };
  };
  
  // Calculate resolution rate (resolved vs total)
  const totalAlerts = mttrMetrics.resolvedCount + mttrMetrics.activeCount;
  const resolutionRate = totalAlerts > 0 ? (mttrMetrics.resolvedCount / totalAlerts) * 100 : 0;
  
  const mttrRating = getMTTRRating(mttrMetrics.avgMTTR);
  
  return (
    <Card 
      title={
        <Space>
          <ClockCircleOutlined style={{ color: '#1890ff' }} />
          <span>Alert Resolution Metrics (MTTR)</span>
          <Tag color={mttrRating.color}>{mttrRating.label}</Tag>
        </Space>
      }
      size="small"
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* Primary MTTR Stats */}
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <Statistic
                title="Average MTTR"
                value={mttrMetrics.avgMTTR}
                formatter={(value) => formatDuration(Number(value))}
                valueStyle={{ 
                  color: mttrRating.color,
                  fontSize: '20px'
                }}
                prefix={<ThunderboltOutlined />}
              />
            </div>
          </Col>
          
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <Statistic
                title="Median MTTR"
                value={mttrMetrics.medianMTTR}
                formatter={(value) => formatDuration(Number(value))}
                valueStyle={{ 
                  color: '#1890ff',
                  fontSize: '20px'
                }}
                prefix={<ClockCircleOutlined />}
              />
            </div>
          </Col>
        </Row>
        
        {/* Resolution Performance */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <Text strong style={{ fontSize: '14px' }}>Resolution Performance</Text>
            <Text style={{ color: mttrRating.color, fontSize: '12px', fontWeight: 'bold' }}>
              {mttrRating.score}/100
            </Text>
          </div>
          <Progress 
            percent={mttrRating.score} 
            showInfo={false}
            strokeColor={mttrRating.color}
            trailColor="#f0f0f0"
            size="small"
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>
              {mttrMetrics.resolvedCount} resolved, {mttrMetrics.activeCount} active
            </Text>
            <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>
              {Math.round(resolutionRate)}% resolution rate
            </Text>
          </div>
        </div>
        
        {/* MTTR Range */}
        {mttrMetrics.resolvedCount > 0 && (
          <Row gutter={[8, 8]}>
            <Col span={8} style={{ textAlign: 'center' }}>
              <div style={{ 
                padding: '8px', 
                backgroundColor: '#f6ffed', 
                borderRadius: '4px',
                border: '1px solid #b7eb8f'
              }}>
                <div style={{ fontSize: '12px', color: '#52c41a', fontWeight: 'bold' }}>
                  {formatDuration(mttrMetrics.minMTTR)}
                </div>
                <div style={{ fontSize: '10px', color: '#8c8c8c' }}>Fastest</div>
              </div>
            </Col>
            
            <Col span={8} style={{ textAlign: 'center' }}>
              <div style={{ 
                padding: '8px', 
                backgroundColor: '#f0f9ff', 
                borderRadius: '4px',
                border: '1px solid #91d5ff'
              }}>
                <div style={{ fontSize: '12px', color: '#1890ff', fontWeight: 'bold' }}>
                  {formatDuration(mttrMetrics.avgMTTR)}
                </div>
                <div style={{ fontSize: '10px', color: '#8c8c8c' }}>Average</div>
              </div>
            </Col>
            
            <Col span={8} style={{ textAlign: 'center' }}>
              <div style={{ 
                padding: '8px', 
                backgroundColor: '#fff2e8', 
                borderRadius: '4px',
                border: '1px solid #ffd591'
              }}>
                <div style={{ fontSize: '12px', color: '#faad14', fontWeight: 'bold' }}>
                  {formatDuration(mttrMetrics.maxMTTR)}
                </div>
                <div style={{ fontSize: '10px', color: '#8c8c8c' }}>Slowest</div>
              </div>
            </Col>
          </Row>
        )}
        
        <Divider style={{ margin: '8px 0' }} />
        
        {/* MTTR by Severity */}
        <div>
          <Text strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>
            Resolution Time by Severity
          </Text>
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            {Object.entries(mttrMetrics.severityMTTR).map(([severity, data]) => {
              const severityColors = {
                fatal: '#000000',
                critical: '#ff4d4f',
                warning: '#faad14',
                none: '#52c41a'
              };
              
              if (data.count === 0) return null;
              
              return (
                <div key={severity} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '4px 8px',
                  backgroundColor: '#fafafa',
                  borderRadius: '4px',
                  border: '1px solid #f0f0f0'
                }}>
                  <Space>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: severityColors[severity as keyof typeof severityColors]
                    }} />
                    <Text style={{ fontSize: '12px', textTransform: 'capitalize' }}>
                      {severity === 'none' ? 'Info' : severity}
                    </Text>
                    <Tag size="small" color={severityColors[severity as keyof typeof severityColors]}>
                      {data.count}
                    </Tag>
                  </Space>
                  <Text style={{ fontSize: '12px', fontWeight: 'bold', color: '#595959' }}>
                    {formatDuration(data.avg)}
                  </Text>
                </div>
              );
            })}
          </Space>
        </div>
        
        {/* Resolution Insights */}
        <div style={{ 
          backgroundColor: '#f9f9f9', 
          padding: '12px', 
          borderRadius: '6px',
          border: '1px solid #f0f0f0'
        }}>
          <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: '6px' }}>
            Performance Insights:
          </Text>
          <Space direction="vertical" size={2}>
            {mttrMetrics.avgMTTR === 0 && (
              <Space>
                <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: '12px' }} />
                <Text style={{ fontSize: '11px', color: '#595959' }}>
                  No resolved alerts to calculate MTTR
                </Text>
              </Space>
            )}
            {mttrMetrics.avgMTTR > 0 && mttrMetrics.avgMTTR < 60 && (
              <Space>
                <TrophyOutlined style={{ color: '#52c41a', fontSize: '12px' }} />
                <Text style={{ fontSize: '11px', color: '#52c41a' }}>
                  Excellent response time under 1 hour
                </Text>
              </Space>
            )}
            {resolutionRate >= 80 && (
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '12px' }} />
                <Text style={{ fontSize: '11px', color: '#52c41a' }}>
                  High resolution rate ({Math.round(resolutionRate)}%)
                </Text>
              </Space>
            )}
            {mttrMetrics.activeCount > 0 && (
              <Space>
                <AlertOutlined style={{ color: '#ff4d4f', fontSize: '12px' }} />
                <Text style={{ fontSize: '11px', color: '#ff4d4f' }}>
                  {mttrMetrics.activeCount} unresolved alert{mttrMetrics.activeCount > 1 ? 's' : ''}
                </Text>
              </Space>
            )}
            {mttrMetrics.avgMTTR > 240 && (
              <Space>
                <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: '12px' }} />
                <Text style={{ fontSize: '11px', color: '#faad14' }}>
                  Consider improving alert response procedures
                </Text>
              </Space>
            )}
          </Space>
        </div>
      </Space>
    </Card>
  );
};