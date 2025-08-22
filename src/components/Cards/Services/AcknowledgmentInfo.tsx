import React from 'react';
import { Space, Typography, Tooltip } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface AcknowledgmentInfoProps {
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  size?: 'small' | 'default';
  layout?: 'horizontal' | 'vertical';
  showIcons?: boolean;
}

export const AcknowledgmentInfo: React.FC<AcknowledgmentInfoProps> = ({
  acknowledgedBy,
  acknowledgedAt,
  size = 'default',
  layout = 'horizontal',
  showIcons = true
}) => {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      full: date.toLocaleString()
    };
  };

  const fontSize = size === 'small' ? '12px' : '14px';
  const iconSize = size === 'small' ? 12 : 14;

  if (!acknowledgedBy && !acknowledgedAt) {
    return (
      <Space size={4} direction={layout}>
        {showIcons && (
          <CheckCircleOutlined 
            style={{ 
              color: '#d9d9d9', 
              fontSize: iconSize 
            }} 
          />
        )}
        <Text 
          type="secondary" 
          style={{ 
            fontSize,
            fontStyle: 'italic' 
          }}
        >
          Not acknowledged
        </Text>
      </Space>
    );
  }

  const datetime = acknowledgedAt ? formatDateTime(acknowledgedAt) : null;

  return (
    <Space size={2} direction={layout}>
      {acknowledgedBy && (
        <Text 
          style={{ 
            fontSize,
            color: '#52c41a',
            fontWeight: 500 
          }}
        >
          {acknowledgedBy}
        </Text>
      )}

      {datetime && (
        <Tooltip title={`Acknowledged on ${datetime.full}`}>
          <Text 
            type="secondary" 
            style={{ fontSize }}
          >
            {datetime.time}
          </Text>
        </Tooltip>
      )}
    </Space>
  );
};