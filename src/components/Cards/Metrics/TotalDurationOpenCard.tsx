import React from 'react';
import { Card, Statistic } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';

interface TotalDurationOpenCardProps {
  value: number; // Total duration in milliseconds
  loading?: boolean;
}

export const TotalDurationOpenCard: React.FC<TotalDurationOpenCardProps> = ({ 
  value, 
  loading = false 
}) => {
  // Format total duration from milliseconds to human readable
  const formatTotalDuration = (totalMs: number) => {
    if (totalMs === 0) return '0m';
    
    const totalMinutes = Math.floor(totalMs / 1000 / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours === 0) {
      return `${minutes}m`;
    } else if (hours < 24) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
  };

  return (
    <Card size="small" loading={loading}>
      <Statistic
        title="Total Duration Open"
        value={formatTotalDuration(value)}
        prefix={<ClockCircleOutlined />}
        valueStyle={{ color: '#722ed1', fontSize: '20px' }}
      />
    </Card>
  );
};