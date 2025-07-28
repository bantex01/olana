import React, { useEffect, useState } from 'react';
import { Card, Button } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import { useFilters } from '../../hooks/useFilters';
import { useTags } from '../../hooks/useTags';
import { useAlerts } from '../../hooks/useAlerts';
import { useGraphData } from '../../hooks/useGraphData';
import { GraphLegend } from '../Graph/GraphLegend';
import { AlertsList } from '../Alerts/AlertsList';
import { FilterPanel } from '../Filters/FilterPanel';
import { NamespaceDependencies } from '../NamespaceDeps/NamespaceDependencies';
import { ServiceGraph } from '../Graph/ServiceGraph';

export const ServiceGraphPage: React.FC = () => {
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
    <div>
      {/* Controls */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Button 
            type={showFilters ? "primary" : "default"}
            icon={<FilterOutlined />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>
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

      {/* Service Graph */}
      <Card title="Service Dependency Map" style={{ marginBottom: 24 }}>
        <ServiceGraph
          alerts={alerts}
          currentFilters={filterState.filters}
          fetchGraphData={fetchGraphData}
          fetchAlerts={fetchAlerts}
          buildFilterQuery={buildFilterQuery}
          includeDependentNamespaces={filterState.includeDependentNamespaces}
        />
      </Card>

      {/* Namespace Dependencies */}
      <Card title="Namespace Dependencies" style={{ marginBottom: 24 }}>
        <NamespaceDependencies namespaceDeps={namespaceDeps} />
      </Card>

      {/* Active Alerts */}
      <Card title="Active Alerts by Service">
        <AlertsList groupedAlerts={groupedAlerts} />
      </Card>
    </div>
  );
};