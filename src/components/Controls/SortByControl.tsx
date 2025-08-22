import React from 'react';
import { Button, Space, Tooltip, Typography } from 'antd';
import { SortAscendingOutlined, SortDescendingOutlined, OrderedListOutlined } from '@ant-design/icons';

const { Text } = Typography;

export type SortOption = 'severity' | 'alertCount' | 'duration' | 'activity' | 'service' | 'namespace' | 'mtta';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortOption;
  direction: SortDirection;
}

export interface SortOptionConfig {
  key: SortOption;
  label: string;
  tooltip: string;
}

interface SortByControlProps {
  sortConfig: SortConfig;
  onSortChange: (field: SortOption) => void;
  availableOptions?: SortOption[];
  disabled?: boolean;
}

export const SortByControl: React.FC<SortByControlProps> = ({
  sortConfig,
  onSortChange,
  availableOptions = ['severity', 'alertCount', 'duration', 'activity'],
  disabled = false
}) => {
  
  const allSortOptions: SortOptionConfig[] = [
    { key: 'severity', label: 'Severity', tooltip: 'Sort by highest severity (fatal → critical → warning)' },
    { key: 'alertCount', label: 'Alert Count', tooltip: 'Sort by number of alerts per service' },
    { key: 'duration', label: 'Duration', tooltip: 'Sort by longest running alert duration' },
    { key: 'activity', label: 'Latest Activity', tooltip: 'Sort by most recent alert activity' },
    { key: 'mtta', label: 'MTTA', tooltip: 'Sort by Mean Time to Acknowledge (longest unacknowledged alerts first)' },
    { key: 'service', label: 'Service Name', tooltip: 'Sort alphabetically by service name' },
    { key: 'namespace', label: 'Namespace', tooltip: 'Sort alphabetically by namespace' },
  ];

  // Filter to only available options
  const sortOptions = allSortOptions.filter(option => 
    availableOptions.includes(option.key)
  );

  const getSortIcon = (field: SortOption) => {
    if (sortConfig.field !== field) return null;
    return sortConfig.direction === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />;
  };

  const getSortButtonType = (field: SortOption): "default" | "primary" => {
    return sortConfig.field === field ? 'primary' : 'default';
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: '12px',
        marginBottom: '8px'
      }}>
        <OrderedListOutlined style={{ color: 'var(--accent-primary)' }} />
        <Text strong style={{ color: 'var(--text-primary)' }}>
          Sort by:
        </Text>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          Click any button to toggle ascending/descending
        </Text>
      </div>
      
      <Space wrap>
        {sortOptions.map(option => (
          <Tooltip key={option.key} title={option.tooltip}>
            <Button
              size="small"
              type={getSortButtonType(option.key)}
              icon={getSortIcon(option.key)}
              onClick={() => onSortChange(option.key)}
              disabled={disabled}
            >
              {option.label}
            </Button>
          </Tooltip>
        ))}
      </Space>
    </div>
  );
};