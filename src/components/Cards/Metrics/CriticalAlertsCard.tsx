import React from 'react';
import { Card, Statistic, Typography } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface CriticalAlertsCardProps {
  openCount: number;
  acknowledgedCount: number;
  loading?: boolean;
}

export const CriticalAlertsCard: React.FC<CriticalAlertsCardProps> = ({ 
  openCount, 
  acknowledgedCount,
  loading = false 
}) => {
  const totalCount = openCount + acknowledgedCount;
  
  return (
    <Card size="small" loading={loading}>
      <Statistic
        title="Critical Alerts"
        value={totalCount}
        prefix={<ExclamationCircleOutlined />}
        valueStyle={{ color: '#ff4d4f', fontSize: '20px' }}
      />
      <div style={{ 
        marginTop: '8px', 
        fontSize: '12px', 
        color: '#666',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <Text style={{ color: '#cf1322' }}>
          {openCount} open
        </Text>
        <Text style={{ color: '#52c41a' }}>
          {acknowledgedCount} ack
        </Text>
      </div>
    </Card>
  );
};