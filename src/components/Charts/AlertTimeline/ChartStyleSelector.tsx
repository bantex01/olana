import React from 'react';
import { Select, Tooltip } from 'antd';
import { 
  LineChartOutlined, 
  AreaChartOutlined, 
  BarChartOutlined,
  PartitionOutlined
} from '@ant-design/icons';
import type { ChartStyle, ChartStyleOption } from './types';

const { Option } = Select;

interface ChartStyleSelectorProps {
  value: ChartStyle;
  onChange: (style: ChartStyle) => void;
  size?: 'small' | 'middle' | 'large';
}

const chartStyleOptions: ChartStyleOption[] = [
  {
    key: 'area',
    label: 'Area Chart',
    icon: 'AreaChartOutlined',
    description: 'Professional gradient fill with smooth curves'
  },
  {
    key: 'line',
    label: 'Line Chart', 
    icon: 'LineChartOutlined',
    description: 'Clean line visualization with data points'
  },
  {
    key: 'bar',
    label: 'Stacked Bars',
    icon: 'BarChartOutlined',
    description: 'Stacked bars showing severity breakdown'
  },
  {
    key: 'stacked-area',
    label: 'Stacked Areas',
    icon: 'PartitionOutlined', 
    description: 'Color-coded severity breakdown layers'
  }
];

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'AreaChartOutlined': return <AreaChartOutlined />;
    case 'LineChartOutlined': return <LineChartOutlined />;
    case 'BarChartOutlined': return <BarChartOutlined />;
    case 'PartitionOutlined': return <PartitionOutlined />;
    default: return <AreaChartOutlined />;
  }
};

export const ChartStyleSelector: React.FC<ChartStyleSelectorProps> = ({ 
  value, 
  onChange, 
  size = 'small' 
}) => {
  return (
    <Tooltip title="Select chart visualization style">
      <Select
        value={value}
        onChange={onChange}
        size={size}
        style={{ width: 140 }}
        placeholder="Chart Style"
      >
        {chartStyleOptions.map(option => (
          <Option key={option.key} value={option.key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {getIcon(option.icon)}
              <span>{option.label}</span>
            </div>
          </Option>
        ))}
      </Select>
    </Tooltip>
  );
};