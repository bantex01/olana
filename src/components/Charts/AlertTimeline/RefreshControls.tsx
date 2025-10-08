import React from 'react';
import { Button, Select, Switch, Space, Tooltip, Typography } from 'antd';
import { ReloadOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { RefreshInterval } from './types';

const { Option } = Select;
const { Text } = Typography;

interface RefreshControlsProps {
  onRefresh: () => void;
  refreshInterval: RefreshInterval;
  onRefreshIntervalChange: (interval: RefreshInterval) => void;
  loading?: boolean;
  lastUpdated?: Date | null;
}

const refreshOptions = [
  { value: 0, label: 'Off' },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 300, label: '5m' },
  { value: 600, label: '10m' }
];

export const RefreshControls: React.FC<RefreshControlsProps> = ({
  onRefresh,
  refreshInterval,
  onRefreshIntervalChange,
  loading = false,
  lastUpdated
}) => {
  const isAutoRefreshOn = refreshInterval > 0;

  const handleToggleAutoRefresh = (checked: boolean) => {
    if (checked && refreshInterval === 0) {
      // Turn on auto-refresh with default 1 minute
      onRefreshIntervalChange(60);
    } else if (!checked) {
      // Turn off auto-refresh
      onRefreshIntervalChange(0);
    }
  };

  const formatLastUpdated = (date: Date | null | undefined) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Space size="middle" style={{ alignItems: 'center' }}>
      {/* Last updated info */}
      <Tooltip title={`Last updated: ${lastUpdated?.toLocaleString() || 'Never'}`}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          <ClockCircleOutlined style={{ marginRight: '4px' }} />
          {formatLastUpdated(lastUpdated)}
        </Text>
      </Tooltip>

      {/* Auto-refresh toggle */}
      <Tooltip title={isAutoRefreshOn ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}>
        <Switch
          size="small"
          checked={isAutoRefreshOn}
          onChange={handleToggleAutoRefresh}
          checkedChildren="Auto"
          unCheckedChildren="Manual"
        />
      </Tooltip>

      {/* Refresh interval selector */}
      {isAutoRefreshOn && (
        <Select
          size="small"
          value={refreshInterval}
          onChange={onRefreshIntervalChange}
          style={{ width: 70 }}
        >
          {refreshOptions.slice(1).map(option => (
            <Option key={option.value} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>
      )}

      {/* Manual refresh button */}
      <Tooltip title="Refresh timeline data">
        <Button
          type="text"
          size="small"
          icon={<ReloadOutlined />}
          onClick={onRefresh}
          loading={loading}
          style={{ padding: '4px 8px' }}
        />
      </Tooltip>
    </Space>
  );
};