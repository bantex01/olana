import React from 'react';
import { NamespaceFilter } from './NamespaceFilter';
import { TagFilter } from './TagFilter';
import { SeverityFilter } from './SeverityFilter';

interface FilterPanelProps {
  showFilters: boolean;
  availableNamespaces: string[];
  availableTags: string[];
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
  selectedNamespaces: string[];
  setSelectedNamespaces: (namespaces: string[]) => void;
  selectedSeverities: string[];
  setSelectedSeverities: (severities: string[]) => void;
  includeDependentNamespaces: boolean;
  setIncludeDependentNamespaces: (include: boolean) => void;
  clearAllFilters: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  showFilters,
  availableNamespaces,
  availableTags,
  selectedTags,
  setSelectedTags,
  selectedNamespaces,
  setSelectedNamespaces,
  selectedSeverities,
  setSelectedSeverities,
  includeDependentNamespaces,
  setIncludeDependentNamespaces,
  clearAllFilters,
}) => {
  if (!showFilters) return null;

  return (
    <div style={{ 
      backgroundColor: "#f8f9fa", 
      padding: "1rem", 
      borderRadius: "4px", 
      marginBottom: "1rem",
      border: "1px solid #dee2e6"
    }}>
      <h4>Graph Filters</h4>
      
      <NamespaceFilter
        availableNamespaces={availableNamespaces}
        selectedNamespaces={selectedNamespaces}
        setSelectedNamespaces={setSelectedNamespaces}
        includeDependentNamespaces={includeDependentNamespaces}
        setIncludeDependentNamespaces={setIncludeDependentNamespaces}
      />

      <TagFilter
        availableTags={availableTags}
        selectedTags={selectedTags}
        setSelectedTags={setSelectedTags}
      />

      <SeverityFilter
        selectedSeverities={selectedSeverities}
        setSelectedSeverities={setSelectedSeverities}
      />

      {/* Active Filters Display */}
      {(selectedTags.length > 0 || selectedNamespaces.length > 0 || selectedSeverities.length > 0) && (
        <div style={{ marginTop: "1rem", padding: "0.5rem", backgroundColor: "#d1ecf1", borderRadius: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>Active Filters:</strong>
              {selectedNamespaces.length > 0 && (
                <span style={{ marginLeft: "0.5rem" }}>
                  Namespaces: {selectedNamespaces.join(', ')}
                  {includeDependentNamespaces && <em> (+ dependents)</em>}
                </span>
              )}
              {selectedTags.length > 0 && (
                <span style={{ marginLeft: "0.5rem" }}>
                  Tags: {selectedTags.join(', ')}
                </span>
              )}
              {selectedSeverities.length > 0 && (
                <span style={{ marginLeft: "0.5rem" }}>
                  Severities: {selectedSeverities.join(', ')}
                </span>
              )}
            </div>
            <button 
              onClick={clearAllFilters}
              style={{ 
                padding: "0.25rem 0.5rem", 
                backgroundColor: "#6c757d", 
                color: "white", 
                border: "none", 
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.8em"
              }}
              title="Clear all filters"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};