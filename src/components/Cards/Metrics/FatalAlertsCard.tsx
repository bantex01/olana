import React from 'react';
import { Card, Statistic, Typography } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface FatalAlertsCardProps {
  openCount: number;
  acknowledgedCount: number;
  loading?: boolean;
}

export const FatalAlertsCard: React.FC<FatalAlertsCardProps> = ({ 
  openCount, 
  acknowledgedCount,
  loading = false 
}) => {
  const totalCount = openCount + acknowledgedCount;
  
  return (
    <Card size="small" loading={loading}>
      <Statistic
        title="Fatal Alerts"
        value={totalCount}
        prefix={<ExclamationCircleOutlined />}
        valueStyle={{ color: '#8c8c8c', fontSize: '20px' }}
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