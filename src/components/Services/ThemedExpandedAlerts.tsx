import React from 'react';
import { Space, Tag } from 'antd';
import { AlertOutlined } from '@ant-design/icons';
import { ThemedAlertRow } from './ThemedAlertRow';
import type { ServiceGroup } from '../../types';

interface ThemedExpandedAlertsProps {
  serviceGroup: ServiceGroup;
  onAcknowledgeAlert?: (alertId: number) => Promise<void>;
  acknowledgingAlerts?: Set<number>;
}

export const ThemedExpandedAlerts: React.FC<ThemedExpandedAlertsProps> = ({ 
  serviceGroup, 
  onAcknowledgeAlert,
  acknowledgingAlerts 
}) => {
  // Sort alerts by severity (fatal > critical > warning) then by first_seen (oldest first)
  const sortedAlerts = [...serviceGroup.alerts].sort((a, b) => {
    const severityRank = { fatal: 1, critical: 2, warning: 3, none: 4 };
    const aSevRank = severityRank[a.severity as keyof typeof severityRank] || 5;
    const bSevRank = severityRank[b.severity as keyof typeof severityRank] || 5;
    
    if (aSevRank !== bSevRank) {
      return aSevRank - bSevRank; // Sort by severity first
    }
    
    // If same severity, sort by oldest first (longest running)
    return new Date(a.first_seen).getTime() - new Date(b.first_seen).getTime();
  });

  // Group alerts by severity for summary
  const severityGroups = sortedAlerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{
      backgroundColor: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderTop: 'none',
      borderRadius: '0 0 6px 6px',
      marginTop: '-1px'
    }}>
      {/* Summary header */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: 'var(--bg-tertiary)',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <AlertOutlined style={{ marginRight: '8px', color: 'var(--accent-primary)' }} />
            <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
              {serviceGroup.alertCount} Active Alert{serviceGroup.alertCount !== 1 ? 's' : ''}
            </strong>
          </div>
          
          <Space size="small">
            {Object.entries(severityGroups).map(([severity, count]) => {
              const color = severity === 'fatal' ? 'black' : 
                           severity === 'critical' ? 'red' : 
                           severity === 'warning' ? 'orange' : 'blue';
              return (
                <Tag key={severity} color={color}>
                  {count} {severity}
                </Tag>
              );
            })}
          </Space>
        </div>
      </div>

      {/* Individual alert rows */}
      <div style={{ padding: '12px 0' }}>
        {sortedAlerts.map((alert, index) => (
          <ThemedAlertRow 
            key={alert.alert_id || index} 
            alert={alert}
            onAcknowledgeAlert={onAcknowledgeAlert}
            acknowledgingAlerts={acknowledgingAlerts}
          />
        ))}
      </div>

      {/* Footer with acknowledgment info */}
      <div style={{
        padding: '8px 16px',
        backgroundColor: 'var(--bg-tertiary)',
        borderTop: '1px solid var(--border)',
        fontSize: '11px',
        color: 'var(--text-secondary)',
        fontStyle: 'italic'
      }}>
        {onAcknowledgeAlert ? 
          'Use acknowledge buttons to mark alerts as handled' : 
          'Acknowledgment functionality not available in this view'
        }
      </div>
    </div>
  );
};