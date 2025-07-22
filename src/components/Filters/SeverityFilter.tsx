import React from 'react';

interface SeverityFilterProps {
  selectedSeverities: string[];
  setSelectedSeverities: (severities: string[]) => void;
}

export const SeverityFilter: React.FC<SeverityFilterProps> = ({
  selectedSeverities,
  setSelectedSeverities,
}) => {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>
        Filter by Alert Severity:
      </label>
      <div style={{ display: "flex", gap: "1rem" }}>
        {['fatal', 'critical', 'warning'].map(severity => (
          <label key={severity} style={{ display: "flex", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={selectedSeverities.includes(severity)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedSeverities([...selectedSeverities, severity]);
                } else {
                  setSelectedSeverities(selectedSeverities.filter(s => s !== severity));
                }
              }}
              style={{ marginRight: "0.25rem" }}
            />
            <span style={{ 
              color: severity === 'fatal' ? 'black' : severity === 'critical' ? 'red' : 'orange',
              fontWeight: "bold"
            }}>
              {severity}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};