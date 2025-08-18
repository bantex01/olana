import React from 'react';
import { Card, Statistic } from 'antd';
import { BugOutlined } from '@ant-design/icons';

interface ServicesWithIssuesCardProps {
  value: number;
  loading?: boolean;
}

export const ServicesWithIssuesCard: React.FC<ServicesWithIssuesCardProps> = ({ 
  value, 
  loading = false 
}) => {
  return (
    <Card size="small" loading={loading}>
      <Statistic
        title="Services with Issues"
        value={value}
        prefix={<BugOutlined />}
        valueStyle={{ 
          color: value > 0 ? '#faad14' : '#52c41a', 
          fontSize: '20px' 
        }}
      />
    </Card>
  );
};