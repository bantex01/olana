import React from 'react';
import { Card, Statistic, Typography } from 'antd';
import { RocketOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface DeploymentsLast24hCardProps {
  value: number | string;
  loading?: boolean;
  isPlaceholder?: boolean;
}

export const DeploymentsLast24hCard: React.FC<DeploymentsLast24hCardProps> = ({
  value,
  loading = false,
  isPlaceholder = false
}) => {
  return (
    <Card>
      <Statistic
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RocketOutlined style={{ color: '#52c41a' }} />
            <span>Deployments (24h)</span>
          </div>
        }
        value={value}
        loading={loading}
        valueStyle={{ color: '#52c41a' }}
        suffix={
          isPlaceholder && (
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Placeholder - GitHub/GitLab integration pending
              </Text>
            </div>
          )
        }
      />
    </Card>
  );
};