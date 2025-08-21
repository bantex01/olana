import React from 'react';
import { Select, Typography } from 'antd';
import { GroupOutlined } from '@ant-design/icons';

const { Text } = Typography;

export type ArrangementOption = 'namespace' | 'service' | 'namespace-and-service';

interface ArrangeByControlProps {
  value: ArrangementOption;
  onChange: (value: ArrangementOption) => void;
  disabled?: boolean;
}

export const ArrangeByControl: React.FC<ArrangeByControlProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const arrangementOptions = [
    { value: 'namespace' as ArrangementOption, label: 'Namespace' },
    { value: 'service' as ArrangementOption, label: 'Service' },
    { value: 'namespace-and-service' as ArrangementOption, label: 'Namespace and Service' },
  ];

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '8px',
        gap: '8px'
      }}>
        <GroupOutlined style={{ color: 'var(--accent-primary)' }} />
        <Text strong style={{ color: 'var(--text-primary)' }}>
          Arrange by:
        </Text>
      </div>
      
      <Select
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={{ width: '200px' }}
        options={arrangementOptions}
      />
    </div>
  );
};