import React from 'react';
import { Card, Statistic, Typography } from 'antd';
import { AlertOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface TotalOpenAlertsCardProps {
  value: number;
  loading?: boolean;
  // Optional breakdown for open/acknowledged - only used in specific sections
  openCount?: number;
  acknowledgedCount?: number;
  showBreakdown?: boolean;
}

export const TotalOpenAlertsCard: React.FC<TotalOpenAlertsCardProps> = ({ 
  value, 
  loading = false,
  openCount,
  acknowledgedCount,
  showBreakdown = false
}) => {
  return (
    <Card size="small" loading={loading}>
      <Statistic
        title="Total Open Alerts"
        value={value}
        prefix={<AlertOutlined />}
        valueStyle={{ 
          color: value > 0 ? '#ff4d4f' : '#52c41a', 
          fontSize: '20px' 
        }}
      />
      {showBreakdown && openCount !== undefined && acknowledgedCount !== undefined && (
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
      )}
    </Card>
  );
};