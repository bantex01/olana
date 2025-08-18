import React from 'react';
import { Card, Statistic } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';

interface MTTRCardProps {
  value: string;
  suffix?: string;
  loading?: boolean;
  isPlaceholder?: boolean;
}

export const MTTRCard: React.FC<MTTRCardProps> = ({ 
  value, 
  suffix = "min",
  loading = false,
  isPlaceholder = false
}) => {
  return (
    <Card size="small" loading={loading}>
      <Statistic
        title="MTTR (Mean Time to Resolve)"
        value={value}
        suffix={suffix}
        prefix={<HistoryOutlined />}
        valueStyle={{ color: '#1890ff', fontSize: '20px' }}
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