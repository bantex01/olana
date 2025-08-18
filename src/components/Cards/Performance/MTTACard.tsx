import React from 'react';
import { Card, Statistic } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';

interface MTTACardProps {
  value: string;
  suffix?: string;
  loading?: boolean;
  isPlaceholder?: boolean;
}

export const MTTACard: React.FC<MTTACardProps> = ({ 
  value, 
  suffix = "min",
  loading = false,
  isPlaceholder = false
}) => {
  return (
    <Card size="small" loading={loading}>
      <Statistic
        title="MTTA (Mean Time to Acknowledge)"
        value={value}
        suffix={suffix}
        prefix={<ClockCircleOutlined />}
        valueStyle={{ color: '#52c41a', fontSize: '20px' }}
      />
      {isPlaceholder && (
        <div style={{ 
          fontSize: '11px', 
          color: '#a0a6b8', 
          fontStyle: 'italic',
          marginTop: '4px' 
        }}>
          Placeholder data only
        </div>
      )}
    </Card>
  );
};