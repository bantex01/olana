import React from 'react';

interface Alert {
  service: string;
  alert: string;
  severity: string;
}

export const AlertPanel: React.FC<{ alerts: Alert[] }> = ({ alerts }) => (
  <div>
    <h3>Alerts</h3>
    <ul>
      {alerts.map((a, idx) => (
        <li key={idx}>
          <strong>{a.service}</strong>: {a.alert} ({a.severity})
        </li>
      ))}
    </ul>
  </div>
);

