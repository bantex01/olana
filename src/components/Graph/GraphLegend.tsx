import React from 'react';

export const GraphLegend: React.FC = () => {
  return (
    <div style={{ 
      backgroundColor: "#f8f9fa", 
      padding: "0.5rem", 
      marginBottom: "1rem", 
      borderRadius: "4px",
      border: "1px solid #dee2e6"
    }}>
      <strong>Legend:</strong>
      <span style={{ marginLeft: "1rem", color: "#2B7CE9" }}>━ Service Dependencies</span>
      <span style={{ marginLeft: "1rem", color: "#2B7CE9" }}>┅ Namespace Dependencies</span>
      <span style={{ marginLeft: "1rem" }}>🔴 Critical</span>
      <span style={{ marginLeft: "0.5rem" }}>🟠 Warning</span>
      <span style={{ marginLeft: "0.5rem" }}>⚫ Fatal</span>
    </div>
  );
};