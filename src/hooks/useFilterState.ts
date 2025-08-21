import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../utils/api';
import { logger } from '../utils/logger';
import type { GraphFilters, Node } from '../types';
import type { ArrangementOption, SortConfig, SortOption } from '../components/Controls';

export interface FilterState {
  selectedSeverities: string[];
  selectedNamespaces: string[];
  selectedTags: string[];
  searchTerm: string;
  availableNamespaces: string[];
  availableTags: string[];
  includeDependentNamespaces: boolean;
  showFullChain: boolean;
  arrangement: ArrangementOption;
  sortConfig: SortConfig;
}

export interface FilterActions {
  handleSeverityChange: (severities: string[]) => void;
  handleNamespaceChange: (namespaces: string[]) => void;
  handleTagsChange: (tags: string[]) => void;
  handleSearchChange: (term: string) => void;
  handleClearAll: () => void;
  setIncludeDependentNamespaces: (value: boolean) => void;
  setShowFullChain: (value: boolean) => void;
  handleArrangementChange: (arrangement: ArrangementOption) => void;
  handleSortChange: (field: SortOption) => void;
}

export interface FilterHelpers {
  buildGraphFilters: () => GraphFilters;
  getActiveFilterCount: () => number;
  hasActiveFilters: () => boolean;
}

export interface UseFilterStateReturn {
  state: FilterState;
  actions: FilterActions;
  helpers: FilterHelpers;
}

export const useFilterState = (): UseFilterStateReturn => {
  // Filter states
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [selectedNamespaces, setSelectedNamespaces] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [availableNamespaces, setAvailableNamespaces] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [includeDependentNamespaces, setIncludeDependentNamespaces] = useState<boolean>(false);
  const [showFullChain, setShowFullChain] = useState<boolean>(false);
  const [arrangement, setArrangement] = useState<ArrangementOption>('service');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'severity', direction: 'asc' });

  // Fetch available namespaces for filter dropdown
  const fetchAvailableNamespaces = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/graph`);
      const graphData = await response.json();
      const namespaces = [...new Set(
        graphData.nodes
          ?.filter((n: Node) => n.nodeType === 'service')
          ?.map((n: Node) => n.id.split('::')[0]) || []
      )].sort() as string[];
      setAvailableNamespaces(namespaces);
    } catch (error) {
      logger.error('Failed to fetch namespaces:', error);
    }
  }, []);

  // Fetch available tags for filter dropdown
  const fetchAvailableTags = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/tags`);
      const data = await response.json();
      setAvailableTags((data.tags as string[]) || []);
    } catch (error) {
      logger.error('Failed to fetch tags:', error);
    }
  }, []);

  // Initialize available options
  useEffect(() => {
    fetchAvailableNamespaces();
    fetchAvailableTags();
  }, [fetchAvailableNamespaces, fetchAvailableTags]);

  // Filter handlers
  const handleSeverityChange = useCallback((severities: string[]) => {
    setSelectedSeverities(severities);
  }, []);

  const handleNamespaceChange = useCallback((namespaces: string[]) => {
    setSelectedNamespaces(namespaces);
  }, []);

  const handleTagsChange = useCallback((tags: string[]) => {
    setSelectedTags(tags);
  }, []);

  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const handleClearAll = useCallback(() => {
    setSelectedSeverities([]);
    setSelectedNamespaces([]);
    setSelectedTags([]);
    setSearchTerm('');
    setIncludeDependentNamespaces(false);
    setShowFullChain(false);
    // Don't reset arrangement and sort config on clear - these are user preferences
  }, []);

  const handleArrangementChange = useCallback((newArrangement: ArrangementOption) => {
    setArrangement(newArrangement);
  }, []);

  const handleSortChange = useCallback((field: SortOption) => {
    setSortConfig(prevConfig => {
      const newDirection = prevConfig.field === field && prevConfig.direction === 'asc' ? 'desc' : 'asc';
      return { field, direction: newDirection };
    });
  }, []);

  // Helper functions
  const buildGraphFilters = useCallback((): GraphFilters => {
    return {
      namespaces: selectedNamespaces.length > 0 ? selectedNamespaces : undefined,
      severities: selectedSeverities.length > 0 ? selectedSeverities : undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      search: searchTerm.trim() !== '' ? searchTerm.trim() : undefined,
    };
  }, [selectedNamespaces, selectedSeverities, selectedTags, searchTerm]);

  const getActiveFilterCount = useCallback((): number => {
    return selectedSeverities.length + 
           selectedNamespaces.length + 
           selectedTags.length + 
           (searchTerm.trim() !== '' ? 1 : 0);
  }, [selectedSeverities.length, selectedNamespaces.length, selectedTags.length, searchTerm]);

  const hasActiveFilters = useCallback((): boolean => {
    return getActiveFilterCount() > 0;
  }, [getActiveFilterCount]);

  return {
    state: {
      selectedSeverities,
      selectedNamespaces,
      selectedTags,
      searchTerm,
      availableNamespaces,
      availableTags,
      includeDependentNamespaces,
      showFullChain,
      arrangement,
      sortConfig,
    },
    actions: {
      handleSeverityChange,
      handleNamespaceChange,
      handleTagsChange,
      handleSearchChange,
      handleClearAll,
      setIncludeDependentNamespaces,
      setShowFullChain,
      handleArrangementChange,
      handleSortChange,
    },
    helpers: {
      buildGraphFilters,
      getActiveFilterCount,
      hasActiveFilters,
    },
  };
};