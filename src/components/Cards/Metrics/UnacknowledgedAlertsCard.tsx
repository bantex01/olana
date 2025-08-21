import React from 'react';
import { Card, Statistic } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

interface UnacknowledgedAlertsCardProps {
  value: number;
  loading?: boolean;
}

export const UnacknowledgedAlertsCard: React.FC<UnacknowledgedAlertsCardProps> = ({ 
  value, 
  loading = false 
}) => {
  return (
    <Card size="small" loading={loading}>
      <Statistic
        title="Unacknowledged Alerts"
        value={value}
        prefix={<ExclamationCircleOutlined />}
        valueStyle={{ color: '#fa541c', fontSize: '20px' }}
      />
    </Card>
  );
};