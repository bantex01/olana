import React from 'react';
import { Card, Statistic, Typography } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface EventsLast24hCardProps {
  value: number | string;
  loading?: boolean;
  isPlaceholder?: boolean;
}

export const EventsLast24hCard: React.FC<EventsLast24hCardProps> = ({
  value,
  loading = false,
  isPlaceholder = false
}) => {
  return (
    <Card>
      <Statistic
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ThunderboltOutlined style={{ color: '#faad14' }} />
            <span>Events (24h)</span>
          </div>
        }
        value={value}
        loading={loading}
        valueStyle={{ color: '#faad14' }}
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