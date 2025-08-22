import React from 'react';
import { Button, Space, Typography } from 'antd';
import { FilterOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

export type AckFilterOption = 'all' | 'acknowledged' | 'unacknowledged';

interface AckFilterProps {
  value: AckFilterOption;
  onChange: (filter: AckFilterOption) => void;
  disabled?: boolean;
}

export const AckFilter: React.FC<AckFilterProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  
  const filterOptions = [
    { 
      key: 'all' as AckFilterOption, 
      label: 'All Alerts', 
      icon: <FilterOutlined />,
      tooltip: 'Show all alerts (acknowledged and unacknowledged)'
    },
    { 
      key: 'acknowledged' as AckFilterOption, 
      label: 'Acknowledged', 
      icon: <CheckCircleOutlined />,
      tooltip: 'Show only acknowledged alerts'
    },
    { 
      key: 'unacknowledged' as AckFilterOption, 
      label: 'Unacknowledged', 
      icon: <ExclamationCircleOutlined />,
      tooltip: 'Show only unacknowledged alerts (need attention)'
    }
  ];

  const getButtonType = (option: AckFilterOption): "default" | "primary" => {
    return value === option ? 'primary' : 'default';
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <FilterOutlined style={{ color: 'var(--accent-primary)', marginRight: '8px' }} />
        <Text strong style={{ color: 'var(--text-primary)' }}>
          Filter by Acknowledgment:
        </Text>
      </div>
      
      <Space>
        {filterOptions.map(option => (
          <Button
            key={option.key}
            size="small"
            type={getButtonType(option.key)}
            icon={option.icon}
            onClick={() => onChange(option.key)}
            disabled={disabled}
            title={option.tooltip}
          >
            {option.label}
          </Button>
        ))}
      </Space>
    </div>
  );
};