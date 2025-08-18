import React from 'react';
import { Card, Statistic, Typography } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface RecentDeploymentsCardProps {
  value: number | string;
  loading?: boolean;
  isPlaceholder?: boolean;
}

export const RecentDeploymentsCard: React.FC<RecentDeploymentsCardProps> = ({
  value,
  loading = false,
  isPlaceholder = false
}) => {
  return (
    <Card>
      <Statistic
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span>Recent Deployments</span>
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