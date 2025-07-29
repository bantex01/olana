import React from 'react';
import { Button, Space, Tooltip } from 'antd';
import { SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons';
import type { SortConfig, SortOption } from '../../hooks/useIncidents';

interface SortControlsProps {
  sortConfig: SortConfig;
  onSortChange: (field: SortOption) => void;
}

export const SortControls: React.FC<SortControlsProps> = ({ sortConfig, onSortChange }) => {
  const sortOptions = [
    { key: 'severity' as SortOption, label: 'Severity', tooltip: 'Sort by highest severity (fatal → critical → warning)' },
    { key: 'alertCount' as SortOption, label: 'Alert Count', tooltip: 'Sort by number of alerts per service' },
    { key: 'duration' as SortOption, label: 'Duration', tooltip: 'Sort by longest running alert duration' },
    { key: 'activity' as SortOption, label: 'Latest Activity', tooltip: 'Sort by most recent alert activity' },
    { key: 'service' as SortOption, label: 'Service Name', tooltip: 'Sort alphabetically by service name' },
  ];

  const getSortIcon = (field: SortOption) => {
    if (sortConfig.field !== field) return null;
    return sortConfig.direction === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />;
  };

  const getSortButtonType = (field: SortOption) => {
    return sortConfig.field === field ? 'primary' : 'default';
  };

  return (
    <div style={{
      padding: '12px 16px',
      backgroundColor: '#fafafa',
      border: '1px solid #d9d9d9',
      borderRadius: '6px',
      marginBottom: '16px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <span style={{ fontWeight: 'bold', color: '#262626' }}>
          Sort Services By:
        </span>
        <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
          Click any button to toggle ascending/descending
        </span>
      </div>
      
      <Space wrap>
        {sortOptions.map(option => (
          <Tooltip key={option.key} title={option.tooltip}>
            <Button
              size="small"
              type={getSortButtonType(option.key)}
              icon={getSortIcon(option.key)}
              onClick={() => onSortChange(option.key)}
            >
              {option.label}
            </Button>
          </Tooltip>
        ))}
      </Space>
    </div>
  );
};