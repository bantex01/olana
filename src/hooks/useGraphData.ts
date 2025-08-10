import { useState } from 'react';
import type { Node, Edge, GraphFilters } from '../types';
import { API_BASE_URL } from '../utils/api';
import { logger } from '../utils/logger';

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
      logger.debug('Fetching graph data', {
        filters: currentFilters,
        queryString: filterQuery,
        includeDependents
      });
      
      const graphRes = await fetch(`${API_BASE_URL}/graph${filterQuery}`);
      const graphData = await graphRes.json();
      const { nodes, edges }: { nodes: Node[]; edges: Edge[] } = graphData;

      const nodeWithEnrichment = nodes.find(n => 
        (n.external_calls && n.external_calls.length > 0) || 
        (n.database_calls && n.database_calls.length > 0) || 
        (n.rpc_calls && n.rpc_calls.length > 0)
      );
      if (nodeWithEnrichment) {
        logger.debug('Node enrichment data found', {
          nodeId: nodeWithEnrichment.id,
          externalCalls: nodeWithEnrichment.external_calls,
          databaseCalls: nodeWithEnrichment.database_calls,
          rpcCalls: nodeWithEnrichment.rpc_calls
        });
      } else {
        logger.debug('No nodes found with enrichment data');
      }

      logger.info('Graph data received', {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        sampleNodes: nodes.slice(0, 3)
      });

      return { nodes, edges };
    } catch (error) {
      logger.error('Failed to fetch graph data', error);
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
      logger.error('Failed to fetch namespaces', error);
    }
  };

  const fetchNamespaceDeps = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/namespace-dependencies`);
      const data = await response.json();
      setNamespaceDeps(data);
    } catch (error) {
      logger.error('Failed to fetch namespace dependencies', error);
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