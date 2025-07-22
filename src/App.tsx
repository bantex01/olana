import React, { useEffect, useRef, useState } from "react";
import type { Alert, Node, Edge, GraphFilters } from "./types";
import { API_BASE_URL } from "./utils/api";
import { useFilters } from './hooks/useFilters';
import { useTags } from './hooks/useTags';
import { useAlerts } from './hooks/useAlerts';
import { useGraphData } from './hooks/useGraphData';
import { GraphLegend } from './components/Graph/GraphLegend';
import { AlertsList } from './components/Alerts/AlertsList';
import { FilterPanel } from './components/Filters/FilterPanel';
import { NamespaceDependencies } from './components/NamespaceDeps/NamespaceDependencies';
import { ServiceGraph } from './components/Graph/ServiceGraph';

const App = () => {

  const filterState = useFilters();
  const { availableTags } = useTags();
  const { alerts, groupedAlerts, fetchAlerts } = useAlerts();
  const { availableNamespaces, namespaceDeps, fetchGraphData, fetchNamespaces, fetchNamespaceDeps, buildFilterQuery } = useGraphData();

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchNamespaces();
    fetchNamespaceDeps();
  }, []);

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2>Service Dependency Graph</h2>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          style={{ 
            padding: "0.5rem 1rem", 
            backgroundColor: showFilters ? "#007bff" : "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

   {/* Filter Panel */}
      <FilterPanel
        showFilters={showFilters}
        availableNamespaces={availableNamespaces}
        availableTags={availableTags}
        selectedTags={filterState.selectedTags}
        setSelectedTags={filterState.setSelectedTags}
        selectedNamespaces={filterState.selectedNamespaces}
        setSelectedNamespaces={filterState.setSelectedNamespaces}
        selectedSeverities={filterState.selectedSeverities}
        setSelectedSeverities={filterState.setSelectedSeverities}
        includeDependentNamespaces={filterState.includeDependentNamespaces}
        setIncludeDependentNamespaces={filterState.setIncludeDependentNamespaces}
        clearAllFilters={filterState.clearAllFilters}
      />

        {/* Legend */}
        <GraphLegend />

      {/* Graph */}
      <ServiceGraph
        alerts={alerts}
        currentFilters={filterState.filters}
        fetchGraphData={fetchGraphData}
        fetchAlerts={fetchAlerts}
        buildFilterQuery={buildFilterQuery}
        includeDependentNamespaces={filterState.includeDependentNamespaces}
      />

      {/* Namespace Dependencies Management */}
      <NamespaceDependencies namespaceDeps={namespaceDeps} />

      {/* Alerts by Service */}
      <AlertsList groupedAlerts={groupedAlerts} />
    </div>
  );
};

export default App;