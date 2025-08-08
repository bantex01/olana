import React from 'react';
import { Card, Statistic, Typography, Space, Progress, Tag, Tooltip, Row, Col } from 'antd';
import { ApiOutlined, DatabaseOutlined, CloudOutlined, ThunderboltOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { ServiceDetailResponse } from '../../types';

const { Text } = Typography;

interface ServiceInstrumentationCardProps {
  serviceData: ServiceDetailResponse;
}

export const ServiceInstrumentationCard: React.FC<ServiceInstrumentationCardProps> = ({ serviceData }) => {
  const { metrics } = serviceData;
  
  const externalCalls = metrics.external_calls_count || 0;
  const databaseCalls = metrics.database_calls_count || 0;
  const rpcCalls = metrics.rpc_calls_count || 0;
  const totalCalls = externalCalls + databaseCalls + rpcCalls;

  // Calculate instrumentation quality score (0-100)
  const calculateInstrumentationQuality = () => {
    let score = 0;
    let factors = 0;

    // Base score for having any instrumentation
    if (totalCalls > 0) {
      score += 40;
      factors++;
    }

    // Bonus for diverse call types (good coverage)
    const callTypes = [externalCalls > 0, databaseCalls > 0, rpcCalls > 0].filter(Boolean).length;
    if (callTypes >= 3) {
      score += 30; // All three types instrumented
    } else if (callTypes >= 2) {
      score += 20; // Two types instrumented
    } else if (callTypes >= 1) {
      score += 10; // At least one type instrumented
    }

    // Quality based on call volume balance
    if (totalCalls > 0) {
      const maxCalls = Math.max(externalCalls, databaseCalls, rpcCalls);
      const minCalls = Math.min(externalCalls || Infinity, databaseCalls || Infinity, rpcCalls || Infinity);
      const balance = minCalls === Infinity ? 0 : (minCalls / maxCalls);
      
      if (balance >= 0.3) score += 20; // Well balanced
      else if (balance >= 0.1) score += 10; // Somewhat balanced
      else score += 5; // Unbalanced but present
    }

    // Penalty for very low instrumentation
    if (totalCalls < 5) score *= 0.7;

    return Math.min(100, Math.round(score));
  };

  // Get instrumentation coverage insights
  const getCoverageInsights = () => {
    const hasExternal = externalCalls > 0;
    const hasDatabase = databaseCalls > 0;
    const hasRPC = rpcCalls > 0;
    const coverage = [hasExternal, hasDatabase, hasRPC].filter(Boolean).length;

    if (coverage === 0) {
      return { 
        status: 'No Instrumentation', 
        description: 'No external calls detected',
        color: '#ff4d4f',
        icon: <ExclamationCircleOutlined />
      };
    } else if (coverage === 3) {
      return { 
        status: 'Full Coverage', 
        description: 'All call types instrumented',
        color: '#52c41a',
        icon: <CheckCircleOutlined />
      };
    } else if (coverage === 2) {
      return { 
        status: 'Good Coverage', 
        description: 'Most call types instrumented',
        color: '#1890ff',
        icon: <CheckCircleOutlined />
      };
    } else {
      return { 
        status: 'Partial Coverage', 
        description: 'Limited instrumentation detected',
        color: '#faad14',
        icon: <ExclamationCircleOutlined />
      };
    }
  };

  // Calculate call distribution percentages
  const getCallDistribution = () => {
    if (totalCalls === 0) return { external: 0, database: 0, rpc: 0 };
    
    return {
      external: Math.round((externalCalls / totalCalls) * 100),
      database: Math.round((databaseCalls / totalCalls) * 100),
      rpc: Math.round((rpcCalls / totalCalls) * 100)
    };
  };

  // Get tracking quality assessment
  const getTrackingQuality = () => {
    const quality = calculateInstrumentationQuality();
    
    if (quality >= 80) {
      return { level: 'Excellent', color: '#52c41a', description: 'Comprehensive tracking' };
    } else if (quality >= 60) {
      return { level: 'Good', color: '#1890ff', description: 'Solid tracking coverage' };
    } else if (quality >= 40) {
      return { level: 'Fair', color: '#faad14', description: 'Basic tracking present' };
    } else if (quality >= 20) {
      return { level: 'Poor', color: '#ff7875', description: 'Limited tracking' };
    } else {
      return { level: 'None', color: '#ff4d4f', description: 'No tracking detected' };
    }
  };

  const instrumentationQuality = calculateInstrumentationQuality();
  const coverage = getCoverageInsights();
  const distribution = getCallDistribution();
  const trackingQuality = getTrackingQuality();

  return (
    <Card 
      title={
        <Space>
          <ApiOutlined style={{ color: '#722ed1' }} />
          <span>Service Instrumentation</span>
        </Space>
      }
      size="small"
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {/* Total External Calls */}
        <div style={{ textAlign: 'center' }}>
          <Statistic
            title="Total External Calls"
            value={totalCalls}
            valueStyle={{ 
              color: totalCalls === 0 ? '#faad14' : 
                     totalCalls > 100 ? '#ff4d4f' : '#722ed1',
              fontSize: '24px'
            }}
            prefix={<ThunderboltOutlined />}
          />
        </div>

        {/* Call Type Breakdown */}
        {totalCalls > 0 && (
          <Row gutter={[8, 8]}>
            <Col span={8} style={{ textAlign: 'center' }}>
              <div style={{ 
                padding: '8px 4px',
                backgroundColor: '#f6ffed',
                borderRadius: '4px',
                border: '1px solid #b7eb8f'
              }}>
                <CloudOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#52c41a', marginTop: '4px' }}>
                  {externalCalls}
                </div>
                <div style={{ fontSize: '10px', color: '#8c8c8c' }}>HTTP</div>
                <div style={{ fontSize: '9px', color: '#8c8c8c' }}>
                  {distribution.external}%
                </div>
              </div>
            </Col>

            <Col span={8} style={{ textAlign: 'center' }}>
              <div style={{ 
                padding: '8px 4px',
                backgroundColor: '#f0f9ff',
                borderRadius: '4px',
                border: '1px solid #91d5ff'
              }}>
                <DatabaseOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff', marginTop: '4px' }}>
                  {databaseCalls}
                </div>
                <div style={{ fontSize: '10px', color: '#8c8c8c' }}>DB</div>
                <div style={{ fontSize: '9px', color: '#8c8c8c' }}>
                  {distribution.database}%
                </div>
              </div>
            </Col>

            <Col span={8} style={{ textAlign: 'center' }}>
              <div style={{ 
                padding: '8px 4px',
                backgroundColor: '#f9f0ff',
                borderRadius: '4px',
                border: '1px solid #d3adf7'
              }}>
                <ApiOutlined style={{ color: '#722ed1', fontSize: '16px' }} />
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#722ed1', marginTop: '4px' }}>
                  {rpcCalls}
                </div>
                <div style={{ fontSize: '10px', color: '#8c8c8c' }}>RPC</div>
                <div style={{ fontSize: '9px', color: '#8c8c8c' }}>
                  {distribution.rpc}%
                </div>
              </div>
            </Col>
          </Row>
        )}

        {/* Coverage Status */}
        <div style={{ textAlign: 'center' }}>
          <Space direction="vertical" size={4}>
            <Space>
              {coverage.icon}
              <Text strong style={{ color: coverage.color, fontSize: '14px' }}>
                {coverage.status}
              </Text>
            </Space>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {coverage.description}
            </Text>
          </Space>
        </div>

        {/* Tracking Quality Score */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <Text style={{ fontSize: '12px', fontWeight: 500 }}>Tracking Quality</Text>
            <Text style={{ color: trackingQuality.color, fontSize: '12px', fontWeight: 'bold' }}>
              {trackingQuality.level}
            </Text>
          </div>
          <Progress 
            percent={instrumentationQuality} 
            showInfo={false}
            strokeColor={trackingQuality.color}
            trailColor="#f0f0f0"
            size="small"
          />
          <div style={{ textAlign: 'center', marginTop: '4px' }}>
            <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>
              {instrumentationQuality}/100
            </Text>
          </div>
        </div>

        {/* Instrumentation Tags */}
        <div style={{ textAlign: 'center' }}>
          <Space wrap>
            {externalCalls > 0 && (
              <Tooltip title={`${externalCalls} HTTP/External calls tracked`}>
                <Tag color="green" style={{ fontSize: '10px' }}>
                  HTTP ✓
                </Tag>
              </Tooltip>
            )}
            {databaseCalls > 0 && (
              <Tooltip title={`${databaseCalls} Database calls tracked`}>
                <Tag color="blue" style={{ fontSize: '10px' }}>
                  Database ✓
                </Tag>
              </Tooltip>
            )}
            {rpcCalls > 0 && (
              <Tooltip title={`${rpcCalls} RPC calls tracked`}>
                <Tag color="purple" style={{ fontSize: '10px' }}>
                  RPC ✓
                </Tag>
              </Tooltip>
            )}
            {totalCalls === 0 && (
              <Tag color="orange" style={{ fontSize: '10px' }}>
                No Tracking
              </Tag>
            )}
          </Space>
        </div>

        {/* Quality Insights */}
        <div style={{ 
          backgroundColor: '#fafafa', 
          padding: '8px', 
          borderRadius: '4px',
          border: '1px solid #f0f0f0'
        }}>
          <Text style={{ fontSize: '11px', color: '#595959' }}>
            {trackingQuality.description}
            {totalCalls > 0 && (
              <>
                {' • '}
                {totalCalls < 10 ? 'Low activity detected' :
                 totalCalls < 50 ? 'Moderate activity level' :
                 totalCalls < 200 ? 'High activity service' : 'Very high activity service'}
              </>
            )}
          </Text>
        </div>
      </Space>
    </Card>
  );
};