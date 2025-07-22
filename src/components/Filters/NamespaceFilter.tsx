import React from 'react';

interface NamespaceFilterProps {
  availableNamespaces: string[];
  selectedNamespaces: string[];
  setSelectedNamespaces: (namespaces: string[]) => void;
  includeDependentNamespaces: boolean;
  setIncludeDependentNamespaces: (include: boolean) => void;
}

export const NamespaceFilter: React.FC<NamespaceFilterProps> = ({
  availableNamespaces,
  selectedNamespaces,
  setSelectedNamespaces,
  includeDependentNamespaces,
  setIncludeDependentNamespaces,
}) => {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>
        Filter by Namespaces:
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
        {availableNamespaces.map(namespace => (
          <label key={namespace} style={{ display: "flex", alignItems: "center", marginRight: "1rem" }}>
            <input
              type="checkbox"
              checked={selectedNamespaces.includes(namespace)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedNamespaces([...selectedNamespaces, namespace]);
                } else {
                  setSelectedNamespaces(selectedNamespaces.filter(ns => ns !== namespace));
                }
              }}
              style={{ marginRight: "0.25rem" }}
            />
            <span style={{ 
              backgroundColor: "#e9ecef", 
              padding: "0.25rem 0.5rem", 
              borderRadius: "4px",
              fontSize: "0.9em"
            }}>
              {namespace}
            </span>
          </label>
        ))}
      </div>
      
      {/* Include Dependent Namespaces Option */}
      <div style={{ marginTop: "0.5rem" }}>
        <label style={{ display: "flex", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={includeDependentNamespaces}
            onChange={(e) => setIncludeDependentNamespaces(e.target.checked)}
            style={{ marginRight: "0.5rem" }}
            disabled={selectedNamespaces.length === 0}
          />
          <span style={{ 
            color: selectedNamespaces.length === 0 ? "#999" : "#000",
            fontSize: "0.9em"
          }}>
            Include dependent namespaces (show blast radius)
          </span>
        </label>
        {selectedNamespaces.length === 0 && (
          <div style={{ fontSize: "0.8em", color: "#666", marginTop: "0.25rem", marginLeft: "1.5rem" }}>
            Select namespaces first to enable this option
          </div>
        )}
      </div>
    </div>
  );
};