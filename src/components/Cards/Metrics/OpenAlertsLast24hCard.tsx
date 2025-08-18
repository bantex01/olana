import React from 'react';
import { Card, Statistic } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

interface OpenAlertsLast24hCardProps {
  value: number;
  loading?: boolean;
}

export const OpenAlertsLast24hCard: React.FC<OpenAlertsLast24hCardProps> = ({ 
  value, 
  loading = false 
}) => {
  return (
    <Card size="small" loading={loading}>
      <Statistic
        title="Open Alerts (24h)"
        value={value}
        prefix={<ExclamationCircleOutlined />}
        valueStyle={{ color: '#722ed1', fontSize: '20px' }}
      />
    </Card>
  );
};