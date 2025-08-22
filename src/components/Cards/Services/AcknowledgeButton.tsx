import React from 'react';
import { Button } from 'antd';
import { CheckOutlined } from '@ant-design/icons';

interface AcknowledgeButtonProps {
  alertId: number;
  isAcknowledged: boolean;
  onAcknowledge?: (alertId: number) => void;
  disabled?: boolean;
  loading?: boolean;
  size?: 'small' | 'middle' | 'large';
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
}

export const AcknowledgeButton: React.FC<AcknowledgeButtonProps> = ({
  alertId,
  isAcknowledged,
  onAcknowledge,
  disabled = false,
  loading = false,
  size = 'small',
  type = 'primary'
}) => {
  const handleClick = () => {
    if (isAcknowledged || disabled || loading) return;
    onAcknowledge?.(alertId);
  };

  if (isAcknowledged) {
    return (
      <Button
        size={size}
        type="default"
        disabled
        icon={<CheckOutlined />}
        style={{
          backgroundColor: '#f6ffed',
          borderColor: '#b7eb8f',
          color: '#52c41a'
        }}
      >
        Acknowledged
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
    >
      {loading ? 'Acknowledging...' : 'Acknowledge'}
    </Button>
  );
};