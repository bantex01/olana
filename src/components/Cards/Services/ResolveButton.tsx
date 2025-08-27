import React from 'react';
import { Button } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';

interface ResolveButtonProps {
  alertId: number;
  isResolved: boolean;
  onResolve?: (alertId: number) => void;
  disabled?: boolean;
  loading?: boolean;
  size?: 'small' | 'middle' | 'large';
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
}

export const ResolveButton: React.FC<ResolveButtonProps> = ({
  alertId,
  isResolved,
  onResolve,
  disabled = false,
  loading = false,
  size = 'small',
  type = 'primary'
}) => {
  const handleClick = () => {
    if (isResolved || disabled || loading) return;
    onResolve?.(alertId);
  };

  if (isResolved) {
    return (
      <Button
        size={size}
        type="default"
        disabled
        icon={<CheckCircleOutlined />}
        style={{
          backgroundColor: '#f6ffed',
          borderColor: '#52c41a',
          color: '#52c41a'
        }}
      >
        Resolved
      </Button>
    );
  }

  return (
    <Button
      size={size}
      type={type}
      loading={loading}
      disabled={disabled}
      onClick={handleClick}
      icon={!loading ? <CheckCircleOutlined /> : undefined}
      style={{
        backgroundColor: '#52c41a',
        borderColor: '#52c41a',
        color: 'white'
      }}
    >
      {loading ? 'Resolving...' : 'Resolve'}
    </Button>
  );
};