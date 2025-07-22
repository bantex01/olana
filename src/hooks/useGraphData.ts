import { useState } from 'react';
import type { Node, Edge, GraphFilters } from '../types';
import { API_BASE_URL } from '../utils/api';

export const useGraphData = () => {
  const [availableNamespaces, setAvailableNamespaces] = useState<string[]>([]);
  const [namespaceDeps, setNamespaceDeps] = useState<any[]>([]);

  // Build query string from filters (extracted from App.tsx)
  const buildFilterQuery = (currentFilters: GraphFilters, includeDependents: boolean) => {
    const params = new URLSearchParams();
    
    if (currentFilters.tags && currentFilters.tags.length > 0) {
      params.append('tags', currentFilters.tags.join(','));
    }
    if (currentFilters.namespaces && currentFilters.namespaces.length > 0) {
      params.append('namespaces', currentFilters.namespaces.join(','));
    }
    if (currentFilters.severities && currentFilters.severities.length > 0) {
      params.append('severities', currentFilters.severities.join(','));
    }
    // Add the includeDependents parameter
    if (includeDependents && currentFilters.namespaces && currentFilters.namespaces.length > 0) {
      params.append('includeDependents', 'true');
    }
    
    return params.toString() ? `?${params.toString()}` : '';
  };

  const fetchGraphData = async (currentFilters: GraphFilters, includeDependents: boolean) => {
    try {
      const filterQuery = buildFilterQuery(currentFilters, includeDependents);
      console.log('=== FRONTEND DEBUG ===');
      console.log('Fetching with filters:', currentFilters);
      console.log('Query string:', filterQuery);
      console.log('includeDependentNamespaces:', includeDependents);
      
      const graphRes = await fetch(`${API_BASE_URL}/graph${filterQuery}`);
      const graphData = await graphRes.json();
      const { nodes, edges }: { nodes: Node[]; edges: Edge[] } = graphData;

      console.log('=== FRONTEND ENRICHMENT DEBUG ===');
      const nodeWithEnrichment = nodes.find(n => 
        (n.external_calls && n.external_calls.length > 0) || 
        (n.database_calls && n.database_calls.length > 0) || 
        (n.rpc_calls && n.rpc_calls.length > 0)
      );
      if (nodeWithEnrichment) {
        console.log('Node with enrichment:', nodeWithEnrichment.id);
        console.log('External calls:', nodeWithEnrichment.external_calls);
        console.log('Database calls:', nodeWithEnrichment.database_calls);
        console.log('RPC calls:', nodeWithEnrichment.rpc_calls);
      } else {
        console.log('No nodes found with enrichment data');
      }
      console.log('==================================');

      console.log('Received nodes:', nodes.length);
      console.log('Received edges:', edges.length);
      console.log('First few nodes:', nodes.slice(0, 3));
      console.log('Backend response:', graphData);

      return { nodes, edges };
    } catch (error) {
      console.error('Failed to fetch graph data:', error);
      throw error;
    }
  };

  const fetchNamespaces = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/graph`);
      const data: { nodes: Node[]; edges: Edge[] } = await response.json();
      const namespaces: string[] = data.nodes
        .filter((node: Node) => node.nodeType === "namespace")
        .map((node: Node) => node.id);
      setAvailableNamespaces([...new Set(namespaces)].sort());
    } catch (error) {
      console.error('Failed to fetch namespaces:', error);
    }
  };

  const fetchNamespaceDeps = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/namespace-dependencies`);
      const data = await response.json();
      setNamespaceDeps(data);
    } catch (error) {
      console.error('Failed to fetch namespace dependencies:', error);
    }
  };

  return {
    availableNamespaces,
    namespaceDeps,
    fetchGraphData,
    fetchNamespaces,
    fetchNamespaceDeps,
    buildFilterQuery,
  };
};