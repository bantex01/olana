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
  // Color logic: Green for 0, Red for any unacknowledged alerts
  const getColor = () => {
    return value === 0 ? '#52c41a' : '#fa541c'; // Green for 0, Red for > 0
  };

  return (
    <Card size="small" loading={loading}>
      <Statistic
        title="Unacknowledged Alerts"
        value={value}
        prefix={<ExclamationCircleOutlined />}
        valueStyle={{ color: getColor(), fontSize: '20px' }}
      />
    </Card>
  );
};