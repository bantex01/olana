import React from 'react';
import { Card, Statistic, Typography } from 'antd';
import { WarningOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface WarningAlertsCardProps {
  openCount: number;
  acknowledgedCount: number;
  loading?: boolean;
}

export const WarningAlertsCard: React.FC<WarningAlertsCardProps> = ({ 
  openCount, 
  acknowledgedCount,
  loading = false 
}) => {
  const totalCount = openCount + acknowledgedCount;
  
  return (
    <Card size="small" loading={loading}>
      <Statistic
        title="Warning Alerts"
        value={totalCount}
        prefix={<WarningOutlined />}
        valueStyle={{ color: '#faad14', fontSize: '20px' }}
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