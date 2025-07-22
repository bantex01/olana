import React from 'react';
import type { Alert } from '../../types';

interface AlertItemProps {
  alert: Alert;
}

export const AlertItem: React.FC<AlertItemProps> = ({ alert }) => {
  return (
    <li>
      <strong>[{alert.severity}]</strong> {alert.message}
      {alert.instance_id && <span style={{ color: "#666" }}> (instance: {alert.instance_id})</span>}
      {alert.count && alert.count > 1 && <span style={{ color: "#0066cc", fontWeight: "bold" }}> × {alert.count}</span>}
      {alert.last_seen && (
        <div style={{ fontSize: "0.8em", color: "#888" }}>
          Last seen: {new Date(alert.last_seen).toLocaleString()}
        </div>
      )}
    </li>
  );
};