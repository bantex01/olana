import React from 'react';
import { Card, Statistic, Typography, Space, Progress, Tooltip, Divider } from 'antd';
import { LinkOutlined, ArrowRightOutlined, ArrowLeftOutlined, DisconnectOutlined, NodeIndexOutlined } from '@ant-design/icons';
import type { ServiceDetailResponse } from '../../types';

const { Text } = Typography;

interface ServiceConnectivityCardProps {
  serviceData: ServiceDetailResponse;
}

export const ServiceConnectivityCard: React.FC<ServiceConnectivityCardProps> = ({ serviceData }) => {
  const { dependencies: _dependencies, metrics } = serviceData;
  
  const incomingCount = metrics.incoming_dependency_count || 0;
  const outgoingCount = metrics.outgoing_dependency_count || 0;
  const totalDependencies = metrics.dependency_count || 0;

  // Calculate isolation score (0-100, higher = more isolated)
  const calculateIsolationScore = () => {
    if (totalDependencies === 0) return 100; // Completely isolated
    
    // Base score starts at 100 and decreases with more dependencies
    // Formula: max(0, 100 - (totalDeps * weight))
    const weight = 5; // Each dependency reduces score by 5 points
    const score = Math.max(0, 100 - (totalDependencies * weight));
    return score;
  };

  // Calculate connectivity health (0-100, higher = better connectivity balance)
  const calculateConnectivityHealth = () => {
    if (totalDependencies === 0) return 50; // Neutral for isolated services
    
    // Ideal ratio is roughly balanced between incoming and outgoing
    const ratio = incomingCount === 0 ? (outgoingCount === 0 ? 1 : 0) : 
                  outgoingCount / incomingCount;
    
    // Score based on how close to balanced (ratio of 0.5 to 2.0 is considered healthy)
    let balanceScore = 100;
    if (ratio < 0.2 || ratio > 5.0) balanceScore = 40; // Very unbalanced
    else if (ratio < 0.5 || ratio > 2.0) balanceScore = 70; // Somewhat unbalanced
    else balanceScore = 90; // Well balanced
    
    // Factor in total dependency count (too many or too few reduces health)
    let countScore = 100;
    if (totalDependencies > 20) countScore = 60; // Too many dependencies
    else if (totalDependencies > 10) countScore = 80; // Many dependencies
    else if (totalDependencies < 2) countScore = 70; // Too few dependencies
    
    return Math.round((balanceScore + countScore) / 2);
  };

  // Get service topology insights
  const getTopologyInsights = () => {
    if (totalDependencies === 0) {
      return { type: 'Isolated', description: 'No dependencies detected', color: '#faad14' };
    } else if (incomingCount === 0 && outgoingCount > 0) {
      return { type: 'Leaf Service', description: 'Consumes but not consumed', color: '#52c41a' };
    } else if (outgoingCount === 0 && incomingCount > 0) {
      return { type: 'Root Service', description: 'Consumed but doesn\'t consume', color: '#1890ff' };
    } else if (incomingCount > outgoingCount * 3) {
      return { type: 'Hub Service', description: 'Heavily consumed by others', color: '#722ed1' };
    } else if (outgoingCount > incomingCount * 3) {
      return { type: 'Consumer Service', description: 'Heavy consumer of others', color: '#fa8c16' };
    } else {
      return { type: 'Bridge Service', description: 'Balanced connectivity', color: '#13c2c2' };
    }
  };

  const isolationScore = calculateIsolationScore();
  const connectivityHealth = calculateConnectivityHealth();
  const topology = getTopologyInsights();

  // Helper function to get health status for scores
  const getScoreStatus = (score: number) => ({
    color: score >= 80 ? '#52c41a' : score >= 60 ? '#1890ff' : score >= 40 ? '#faad14' : '#ff4d4f',
    text: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor'
  });

  const healthStatus = getScoreStatus(connectivityHealth);

  return (
    <Card 
      title={
        <Space>
          <LinkOutlined style={{ color: '#1890ff' }} />
          <span>Service Connectivity</span>
        </Space>
      }
      size="small"
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {/* Total Dependencies */}
        <div style={{ textAlign: 'center' }}>
          <Statistic
            title="Total Dependencies"
            value={totalDependencies}
            valueStyle={{ 
              color: totalDependencies === 0 ? '#faad14' : 
                     totalDependencies > 10 ? '#ff4d4f' : '#1890ff',
              fontSize: '24px'
            }}
            prefix={<NodeIndexOutlined />}
          />
        </div>

        {/* Incoming vs Outgoing Flow */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <Space>
              <ArrowLeftOutlined style={{ color: '#52c41a' }} />
              <Text style={{ fontSize: '12px' }}>Incoming</Text>
            </Space>
            <Text strong style={{ fontSize: '14px' }}>{incomingCount}</Text>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <Space>
              <ArrowRightOutlined style={{ color: '#faad14' }} />
              <Text style={{ fontSize: '12px' }}>Outgoing</Text>
            </Space>
            <Text strong style={{ fontSize: '14px' }}>{outgoingCount}</Text>
          </div>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* Service Topology Type */}
        <div style={{ textAlign: 'center' }}>
          <Space direction="vertical" size={4}>
            <Text strong style={{ color: topology.color, fontSize: '14px' }}>
              {topology.type}
            </Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {topology.description}
            </Text>
          </Space>
        </div>

        {/* Connectivity Health Score */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <Text style={{ fontSize: '12px', fontWeight: 500 }}>Connectivity Health</Text>
            <Text style={{ color: healthStatus.color, fontSize: '12px', fontWeight: 'bold' }}>
              {healthStatus.text}
            </Text>
          </div>
          <Progress 
            percent={connectivityHealth} 
            showInfo={false}
            strokeColor={healthStatus.color}
            trailColor="#f0f0f0"
            size="small"
          />
          <div style={{ textAlign: 'center', marginTop: '4px' }}>
            <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>
              {connectivityHealth}/100
            </Text>
          </div>
        </div>

        {/* Isolation Score */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <Tooltip title="Higher scores indicate more isolated services with fewer dependencies">
              <Space>
                <DisconnectOutlined style={{ fontSize: '12px' }} />
                <Text style={{ fontSize: '12px', fontWeight: 500 }}>Isolation Score</Text>
              </Space>
            </Tooltip>
            <Text style={{ 
              color: isolationScore >= 80 ? '#faad14' : 
                     isolationScore >= 60 ? '#1890ff' : '#52c41a',
              fontSize: '12px', 
              fontWeight: 'bold' 
            }}>
              {isolationScore >= 80 ? 'High' : isolationScore >= 60 ? 'Medium' : 'Low'}
            </Text>
          </div>
          <Progress 
            percent={isolationScore} 
            showInfo={false}
            strokeColor={
              isolationScore >= 80 ? '#faad14' : 
              isolationScore >= 60 ? '#1890ff' : '#52c41a'
            }
            trailColor="#f0f0f0"
            size="small"
          />
          <div style={{ textAlign: 'center', marginTop: '4px' }}>
            <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>
              {isolationScore}/100
            </Text>
          </div>
        </div>

        {/* Dependency Insights */}
        {totalDependencies > 0 && (
          <div style={{ 
            backgroundColor: '#fafafa', 
            padding: '8px', 
            borderRadius: '4px',
            border: '1px solid #f0f0f0'
          }}>
            <Text style={{ fontSize: '11px', color: '#595959' }}>
              {incomingCount > 0 && outgoingCount > 0 && (
                `Ratio: ${(outgoingCount / incomingCount).toFixed(1)}:1 out/in`
              )}
              {incomingCount === 0 && outgoingCount > 0 && 'Pure consumer service'}
              {outgoingCount === 0 && incomingCount > 0 && 'Pure provider service'}
              {totalDependencies === 0 && 'No dependencies detected'}
            </Text>
          </div>
        )}
      </Space>
    </Card>
  );
};