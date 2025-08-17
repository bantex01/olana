import React from 'react';
import { Checkbox, Space, Button, Select, Input, theme } from 'antd';
import { ClearOutlined, SearchOutlined } from '@ant-design/icons';

const { Option } = Select;

interface AlertsFiltersProps {
  selectedSeverities: string[];
  selectedNamespaces: string[];
  selectedTags: string[];
  searchTerm: string;
  availableNamespaces: string[];
  availableTags: string[];
  onSeverityChange: (severities: string[]) => void;
  onNamespaceChange: (namespaces: string[]) => void;
  onTagsChange: (tags: string[]) => void;
  onSearchChange: (term: string) => void;
  onClearAll: () => void;
}

export const AlertsFilters: React.FC<AlertsFiltersProps> = ({
  selectedSeverities,
  selectedNamespaces,
  selectedTags,
  searchTerm,
  availableNamespaces,
  availableTags,
  onSeverityChange,
  onNamespaceChange,
  onTagsChange,
  onSearchChange,
  onClearAll,
}) => {
  const { token } = theme.useToken();
  const severityOptions = [
    { value: 'fatal', label: 'Fatal', color: '#8c8c8c' }, // Grey instead of black for visibility
    { value: 'critical', label: 'Critical', color: 'red' },
    { value: 'warning', label: 'Warning', color: 'orange' },
  ];

  const handleSeverityChange = (checkedValues: string[]) => {
    onSeverityChange(checkedValues);
  };

  const handleNamespaceChange = (values: string[]) => {
    onNamespaceChange(values);
  };

  const handleTagsChange = (values: string[]) => {
    onTagsChange(values);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  const hasActiveFilters = selectedSeverities.length > 0 || 
                          selectedNamespaces.length > 0 || 
                          selectedTags.length > 0 ||
                          searchTerm.trim() !== '';

  return (
    <div style={{ width: '100%' }}>
      {/* Header with clear button */}
      {hasActiveFilters && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          marginBottom: '16px' 
        }}>
          <Button 
            size="small" 
            icon={<ClearOutlined />} 
            onClick={onClearAll}
          >
            Clear All
          </Button>
        </div>
      )}
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

        {/* Tags Filter */}
        <div>
          <strong style={{ marginRight: 12 }}>Tags:</strong>
          <Select
            mode="multiple"
            placeholder="Select tags..."
            value={selectedTags}
            onChange={handleTagsChange}
            style={{ minWidth: 300 }}
            maxTagCount="responsive"
          >
            {availableTags.map(tag => (
              <Option key={tag} value={tag}>
                {tag}
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
            color: token.colorTextSecondary,
            backgroundColor: token.colorFillSecondary,
            padding: '8px 12px',
            borderRadius: token.borderRadius,
            border: `1px solid ${token.colorBorder}`
          }}>
            <strong>Active filters:</strong>
            <div style={{ marginTop: '4px' }}>
              {selectedNamespaces.length > 0 && (
                <div>• Namespaces: {selectedNamespaces.join(', ')}</div>
              )}
              {selectedTags.length > 0 && (
                <div>• Tags: {selectedTags.join(', ')}</div>
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
    </div>
  );
};