import { useState } from 'react';
import type { GraphFilters } from '../types';

export const useFilters = () => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedNamespaces, setSelectedNamespaces] = useState<string[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [includeDependentNamespaces, setIncludeDependentNamespaces] = useState<boolean>(false);

  const filters: GraphFilters = {};
  if (selectedTags.length > 0) {
    filters.tags = selectedTags;
  }
  if (selectedNamespaces.length > 0) {
    filters.namespaces = selectedNamespaces;
  }
  if (selectedSeverities.length > 0) {
    filters.severities = selectedSeverities;
  }

  const clearAllFilters = () => {
    setSelectedTags([]);
    setSelectedNamespaces([]);
    setSelectedSeverities([]);
    setIncludeDependentNamespaces(false);
  };

  return {
    selectedTags,
    setSelectedTags,
    selectedNamespaces,
    setSelectedNamespaces,
    selectedSeverities,
    setSelectedSeverities,
    includeDependentNamespaces,
    setIncludeDependentNamespaces,
    filters,
    clearAllFilters,
  };
};