import React from 'react';
import { Card, Statistic, Typography } from 'antd';
import { BellOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface RecentEventsCardProps {
  value: number | string;
  loading?: boolean;
  isPlaceholder?: boolean;
}

export const RecentEventsCard: React.FC<RecentEventsCardProps> = ({
  value,
  loading = false,
  isPlaceholder = false
}) => {
  return (
    <Card>
      <Statistic
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BellOutlined style={{ color: '#722ed1' }} />
            <span>Recent Events</span>
          </div>
        }
        value={value}
        loading={loading}
        valueStyle={{ color: '#722ed1' }}
        suffix={
          isPlaceholder && (
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Placeholder - Event tracking integration pending
              </Text>
            </div>
          )
        }
      />
    </Card>
  );
};