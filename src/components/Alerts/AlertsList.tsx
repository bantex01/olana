import React from 'react';
import type { Alert } from '../../types';
import { AlertItem } from './AlertItem';

interface AlertsListProps {
  groupedAlerts: Record<string, Alert[]>;
}

export const AlertsList: React.FC<AlertsListProps> = ({ groupedAlerts }) => {
  return (
    <>
      <h3>Active Alerts by Service</h3>
      {Object.keys(groupedAlerts).length > 0 ? (
        Object.entries(groupedAlerts).map(([serviceKey, serviceAlerts]) => (
          <div key={serviceKey} style={{ marginBottom: "1rem" }}>
            <h4>{serviceKey}</h4>
            <ul>
              {serviceAlerts.map((alert, idx) => (
                <AlertItem key={idx} alert={alert} />
              ))}
            </ul>
          </div>
        ))
      ) : (
        <p style={{ color: "#666" }}>No active alerts.</p>
      )}
    </>
  );
};