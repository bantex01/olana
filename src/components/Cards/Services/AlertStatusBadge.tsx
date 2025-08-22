import React from 'react';
import { Badge, Tooltip } from 'antd';
//import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

interface AlertStatusBadgeProps {
  isAcknowledged: boolean;
  acknowledgedBy?: string | null;
  acknowledgedAt?: string | null;
  severity?: 'fatal' | 'critical' | 'warning' | 'none';
  showText?: boolean;
  size?: 'default' | 'small';
}

export const AlertStatusBadge: React.FC<AlertStatusBadgeProps> = ({
  isAcknowledged,
  acknowledgedBy,
  acknowledgedAt,
  severity = 'warning',
  showText = false,
  size = 'default'
}) => {
  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'fatal': return '#ff4d4f';
      case 'critical': return '#ff7a45';
      case 'warning': return '#faad14';
      default: return '#52c41a';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isAcknowledged) {
    const tooltipContent = acknowledgedBy && acknowledgedAt 
      ? `Acknowledged by ${acknowledgedBy} on ${formatDateTime(acknowledgedAt)}`
      : 'Alert has been acknowledged';

    return (
      <Tooltip title={tooltipContent}>
        <Badge
          status="success"
          text={showText ? 'Acknowledged' : undefined}
          style={{ 
            fontSize: size === 'small' ? '12px' : '14px',
            color: '#52c41a'
          }}
        />
      </Tooltip>
    );
  }

  return (
    <Tooltip title="Alert requires acknowledgment">
      <Badge
        status="error"
        text={showText ? 'Unacknowledged' : undefined}
        style={{ 
          fontSize: size === 'small' ? '12px' : '14px',
          color: getSeverityColor(severity)
        }}
      />
    </Tooltip>
  );
};