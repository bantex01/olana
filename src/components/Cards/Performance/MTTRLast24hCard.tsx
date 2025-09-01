import React from 'react';
import { Card, Statistic } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';

interface MTTRLast24hCardProps {
  value: string;
  suffix?: string;
  loading?: boolean;
  isPlaceholder?: boolean;
}

export const MTTRLast24hCard: React.FC<MTTRLast24hCardProps> = ({ 
  value, 
  suffix = "min",
  loading = false,
  isPlaceholder = false
}) => {
  return (
    <Card size="small" loading={loading}>
      <Statistic
        title="MTTR (Last 24h)"
        value={value}
        suffix={suffix}
        prefix={<HistoryOutlined />}
        valueStyle={{ color: '#1890ff', fontSize: '20px' }}
      />
    </Card>
  );
};