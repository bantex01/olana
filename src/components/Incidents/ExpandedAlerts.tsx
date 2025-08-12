import React from 'react';
import { Space, Tag } from 'antd';
import { AlertOutlined } from '@ant-design/icons';
import { AlertRow } from './AlertRow';
import type { ServiceGroup } from '../../types';

interface ExpandedAlertsProps {
  serviceGroup: ServiceGroup;
}

export const ExpandedAlerts: React.FC<ExpandedAlertsProps> = ({ serviceGroup }) => {
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
      backgroundColor: '#f9f9f9',
      border: '1px solid #d9d9d9',
      borderTop: 'none',
      borderRadius: '0 0 6px 6px',
      marginTop: '-1px'
    }}>
      {/* Summary header */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#f0f2f5',
        borderBottom: '1px solid #d9d9d9'
      }}>
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <AlertOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            <strong style={{ fontSize: '14px' }}>
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
          <AlertRow 
            key={alert.alert_id || index} 
            alert={alert} 
          />
        ))}
      </div>

      {/* Footer with instructions */}
      <div style={{
        padding: '8px 16px',
        backgroundColor: '#f0f2f5',
        borderTop: '1px solid #d9d9d9',
        fontSize: '11px',
        color: '#8c8c8c',
        fontStyle: 'italic'
      }}>
        Individual alert actions (resolve, acknowledge) will be added in future steps
      </div>
    </div>
  );
};