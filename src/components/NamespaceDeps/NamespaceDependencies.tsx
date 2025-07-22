import React from 'react';

interface NamespaceDependenciesProps {
  namespaceDeps: any[];
}

export const NamespaceDependencies: React.FC<NamespaceDependenciesProps> = ({
  namespaceDeps,
}) => {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <h3>Namespace Dependencies</h3>
      {namespaceDeps.length > 0 ? (
        <div style={{ backgroundColor: "#f8f9fa", padding: "1rem", borderRadius: "4px" }}>
          {namespaceDeps.map((dep, idx) => (
            <div key={idx} style={{ 
              marginBottom: "0.5rem", 
              padding: "0.5rem", 
              backgroundColor: "white", 
              borderRadius: "4px",
              border: "1px solid #dee2e6"
            }}>
              <strong>{dep.from_namespace}</strong> → <strong>{dep.to_namespace}</strong>
              {dep.description && <span style={{ color: "#666", marginLeft: "1rem" }}>({dep.description})</span>}
              <span style={{ color: "#999", fontSize: "0.8em", marginLeft: "1rem" }}>
                {dep.dependency_type} • {new Date(dep.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: "#666" }}>No namespace dependencies configured.</p>
      )}
    </div>
  );
};