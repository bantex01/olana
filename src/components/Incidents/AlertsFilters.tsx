import React from 'react';
import { Card, Checkbox, Space, Button, Select, Input } from 'antd';
import { FilterOutlined, ClearOutlined, SearchOutlined } from '@ant-design/icons';

const { Option } = Select;

interface AlertsFiltersProps {
  selectedSeverities: string[];
  selectedNamespaces: string[];
  searchTerm: string;
  availableNamespaces: string[];
  onSeverityChange: (severities: string[]) => void;
  onNamespaceChange: (namespaces: string[]) => void;
  onSearchChange: (term: string) => void;
  onClearAll: () => void;
}

export const AlertsFilters: React.FC<AlertsFiltersProps> = ({
  selectedSeverities,
  selectedNamespaces,
  searchTerm,
  availableNamespaces,
  onSeverityChange,
  onNamespaceChange,
  onSearchChange,
  onClearAll,
}) => {
  const severityOptions = [
    { value: 'fatal', label: 'Fatal', color: 'black' },
    { value: 'critical', label: 'Critical', color: 'red' },
    { value: 'warning', label: 'Warning', color: 'orange' },
  ];

  const handleSeverityChange = (checkedValues: string[]) => {
    onSeverityChange(checkedValues);
  };

  const handleNamespaceChange = (values: string[]) => {
    onNamespaceChange(values);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  const hasActiveFilters = selectedSeverities.length > 0 || 
                          selectedNamespaces.length > 0 || 
                          searchTerm.trim() !== '';

  return (
    <Card 
      size="small" 
      style={{ marginBottom: 16 }}
      title={
        <Space>
          <FilterOutlined />
          Filters
        </Space>
      }
      extra={
        hasActiveFilters && (
          <Button 
            size="small" 
            icon={<ClearOutlined />} 
            onClick={onClearAll}
          >
            Clear All
          </Button>
        )
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Service Name Search */}
        <div>
          <strong style={{ marginRight: 12 }}>Service Search:</strong>
          <Input
            placeholder="Search service names..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={handleSearchChange}
            style={{ width: 300 }}
            allowClear
          />
        </div>

        {/* Namespace Filter */}
        <div>
          <strong style={{ marginRight: 12 }}>Namespaces:</strong>
          <Select
            mode="multiple"
            placeholder="Select namespaces..."
            value={selectedNamespaces}
            onChange={handleNamespaceChange}
            style={{ minWidth: 300 }}
            maxTagCount="responsive"
          >
            {availableNamespaces.map(namespace => (
              <Option key={namespace} value={namespace}>
                {namespace}
              </Option>
            ))}
          </Select>
        </div>

        {/* Severity Filter */}
        <div>
          <strong style={{ marginRight: 12 }}>Severity:</strong>
          <Checkbox.Group
            value={selectedSeverities}
            onChange={handleSeverityChange}
          >
            <Space>
              {severityOptions.map(option => (
                <Checkbox key={option.value} value={option.value}>
                  <span style={{ color: option.color, fontWeight: 'bold' }}>
                    {option.label}
                  </span>
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
        </div>
        
        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div style={{ 
            fontSize: '12px', 
            color: '#666',
            backgroundColor: '#f0f0f0',
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #d9d9d9'
          }}>
            <strong>Active filters:</strong>
            <div style={{ marginTop: '4px' }}>
              {selectedNamespaces.length > 0 && (
                <div>• Namespaces: {selectedNamespaces.join(', ')}</div>
              )}
              {selectedSeverities.length > 0 && (
                <div>• Severities: {selectedSeverities.join(', ')}</div>
              )}
              {searchTerm.trim() !== '' && (
                <div>• Search: "{searchTerm}"</div>
              )}
            </div>
          </div>
        )}
      </Space>
    </Card>
  );
};