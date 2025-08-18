import React from 'react';
import { Card, Statistic } from 'antd';
import { NodeIndexOutlined } from '@ant-design/icons';

interface TotalServicesCardProps {
  value: number;
  loading?: boolean;
}

export const TotalServicesCard: React.FC<TotalServicesCardProps> = ({ 
  value, 
  loading = false 
}) => {
  return (
    <Card size="small" loading={loading}>
      <Statistic
        title="Total Services"
        value={value}
        prefix={<NodeIndexOutlined />}
        valueStyle={{ color: '#1890ff', fontSize: '20px' }}
      />
    </Card>
  );
};