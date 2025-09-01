import React from 'react';
import { Card, Statistic } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';

interface MTTALast24hCardProps {
  value: string;
  suffix?: string;
  loading?: boolean;
  isPlaceholder?: boolean;
}

export const MTTALast24hCard: React.FC<MTTALast24hCardProps> = ({ 
  value, 
  suffix = "min",
  loading = false,
  isPlaceholder = false
}) => {
  return (
    <Card size="small" loading={loading}>
      <Statistic
        title="MTTA (Last 24h)"
        value={value}
        suffix={suffix}
        prefix={<ClockCircleOutlined />}
        valueStyle={{ color: '#52c41a', fontSize: '20px' }}
      />
    </Card>
  );
};