import React, { useRef, useEffect } from 'react';
import { Network, DataSet } from "vis-network/standalone/esm/vis-network";
import type { Node, Edge, Alert, GraphFilters } from '../../types';

interface ServiceGraphProps {
  alerts: Alert[];
  currentFilters: GraphFilters;
  fetchGraphData: (filters: GraphFilters, includeDependents: boolean) => Promise<{ nodes: Node[]; edges: Edge[] }>;
  fetchAlerts: (alertQuery: string) => Promise<void>;
  buildFilterQuery: (filters: GraphFilters, includeDependents: boolean) => string;
  includeDependentNamespaces: boolean;
}

export const ServiceGraph: React.FC<ServiceGraphProps> = ({
  alerts,
  currentFilters,
  fetchGraphData,
  fetchAlerts,
  buildFilterQuery,
  includeDependentNamespaces,
}) => {
  const graphRef = useRef<HTMLDivElement>(null);

  const renderGraph = async (filters: GraphFilters = {}) => {
    try {
      // Build alert query with SAME filters as graph
      const alertParams = new URLSearchParams();
      if (filters.namespaces && filters.namespaces.length > 0) {
        alertParams.append('namespaces', filters.namespaces.join(','));
      }
      if (filters.severities && filters.severities.length > 0) {
        alertParams.append('severities', filters.severities.join(','));
      }
      if (filters.tags && filters.tags.length > 0) {
        alertParams.append('tags', filters.tags.join(','));
      }
      
      const alertQuery = alertParams.toString() ? `?${alertParams.toString()}` : '';
      console.log('Alert query:', alertQuery);
      
      // Fetch graph and alerts using hooks
      const { nodes, edges } = await fetchGraphData(filters, includeDependentNamespaces);
      await fetchAlerts(alertQuery);
      
      console.log('Received nodes:', nodes.length);
      console.log('Received edges:', edges.length);
      console.log('First few nodes:', nodes.slice(0, 3));

      // Process nodes for alert coloring
      const coloredNodes = nodes.map((n) => {
        // Use pre-computed values from backend if available
        const count = n.alertCount !== undefined ? n.alertCount : 0;
        const sev = n.highestSeverity || "none";

        const colorMap: Record<string, string> = {
          fatal: "black",
          critical: "red",
          warning: "orange",
          none: "green",
        };

        const shouldShowAlerts = n.nodeType === "service";
        const alertLabel = count > 0 ? `\n${count} alert(s)` : "";

        // Build hover tooltip with metadata, tags, and alerts
        let tooltip = `${n.label}`;
        
        if (n.nodeType === "service") {
          tooltip += `\nType: ${n.nodeType}`;
          if (n.team) tooltip += `\nTeam: ${n.team}`;
          if (n.environment) tooltip += `\nEnvironment: ${n.environment}`;
          if (n.component_type) tooltip += `\nComponent: ${n.component_type}`;
          
          // Add tags if present
          if (n.tags && n.tags.length > 0) {
            tooltip += `\n\nTags:`;
            n.tags.forEach(tag => {
              const source = n.tagSources?.[tag];
              if (source) {
                const sourceIcon = source === 'user' ? '👤' : 
                                  source === 'alertmanager' ? '🚨' : 
                                  source === 'otel' ? '📊' : '❓';
                tooltip += `\n• ${tag} ${sourceIcon}`;
              } else {
                tooltip += `\n• ${tag}`;
              }
            });
          }

          // Add enrichment data to tooltip
          if (n.nodeType === "service") {
            // External HTTP calls
            if (n.external_calls && n.external_calls.length > 0) {
              tooltip += `\n\nExternal HTTP Calls:`;
              n.external_calls.forEach(call => {
                tooltip += `\n• ${call.method || 'GET'} ${call.host}${call.path || ''} (${call.count}x)`;
              });
            }

            // Database calls  
            if (n.database_calls && n.database_calls.length > 0) {
              tooltip += `\n\nDatabase Calls:`;
              n.database_calls.forEach(call => {
                const operation = call.operation ? `${call.operation} ` : '';
                const dbName = call.name ? ` (${call.name})` : '';
                tooltip += `\n• ${operation}${call.system}${dbName} @ ${call.host || 'unknown'} (${call.count}x)`;
              });
            }

            // RPC calls
            if (n.rpc_calls && n.rpc_calls.length > 0) {
              tooltip += `\n\nRPC Calls:`;
              n.rpc_calls.forEach(call => {
                const method = call.method ? `.${call.method}` : '';
                tooltip += `\n• ${call.service}${method} (${call.count}x)`;
              });
            }
          }
          
          // Add alerts section - filter alerts by current severity filter
          let relevantAlerts = alerts.filter((alert: Alert) => {
            const serviceKey = `${alert.service_namespace}::${alert.service_name}`;
            return serviceKey === n.id;
          });

          // Apply severity filter to tooltip alerts if active
          if (filters.severities && filters.severities.length > 0) {
            relevantAlerts = relevantAlerts.filter((alert: Alert) => 
              filters.severities!.includes(alert.severity)
            );
          }
          
          if (relevantAlerts.length > 0) {
            tooltip += `\n\nAlerts:`;
            relevantAlerts.forEach((alert: Alert) => {
              const instanceInfo = alert.instance_id ? ` (${alert.instance_id})` : '';
              const countInfo = alert.count && alert.count > 1 ? ` [x${alert.count}]` : '';
              const timeInfo = alert.last_seen ? ` - Last: ${new Date(alert.last_seen).toLocaleString()}` : '';
              tooltip += `\n• [${alert.severity}] ${alert.message}${instanceInfo}${countInfo}${timeInfo}`;
            });
          }
        } else if (n.nodeType === "namespace") {
          tooltip += `\nType: ${n.nodeType}`;
        }

        return {
          ...n,
          label: shouldShowAlerts ? `${n.label}${alertLabel}` : n.label,
          color: shouldShowAlerts ? colorMap[sev] : n.color,
          title: tooltip
        };
      });

      if (graphRef.current) {
        console.log('=== GRAPH RENDERING ===');
        console.log('Graph ref exists, rendering with:');
        console.log('- Colored nodes:', coloredNodes.length);
        console.log('- Edges:', edges.length);
        console.log('Sample colored node:', coloredNodes[0]);
        
        const data = {
          nodes: new DataSet<Node>(coloredNodes),
          edges: new DataSet<Edge>(edges),
        };

        const options = {
          nodes: {
            font: { 
              color: "#fff",
              size: 12
            },
          },
          edges: { 
            arrows: "to",
            smooth: {
              enabled: true,
              type: "continuous",
              roundness: 0.5
            }
          },

        /*layout: {
          hierarchical: {
            enabled: true,
            direction: "LR",
            sortMethod: "directed",
            nodeSpacing: 200,
            levelSeparation: 150,
          },
        },
        physics: {
          enabled: false
        }*/

                  /*layout: {
            clusterThreshold: 150,
            improvedLayout: true
          },
          physics: {
            enabled: true,
            repulsion: {
              centralGravity: 0.2,
              springLength: 200,
              springConstant: 0.05,
              nodeDistance: 100,
              damping: 0.09
            }
          }*/  

          layout: {
            improvedLayout: true,
            randomSeed: 42, // For consistent layouts
          },
          physics: {
            enabled: false,
            solver: 'forceAtlas2Based',
            forceAtlas2Based: {
              gravitationalConstant: -50,
              centralGravity: 0.01,
              springLength: 200,
              springConstant: 0.08,
              damping: 0.4,
              avoidOverlap: 1
            },
            stabilization: {iterations: 150}
          }
        };

        console.log('Creating new Network...');
        const network = new Network(graphRef.current, data, options);
        console.log('Network created successfully');
      } else {
        console.log('ERROR: graphRef.current is null - cannot render graph');
      }
    } catch (error) {
      console.error('Failed to render graph:', error);
    }
  };

  // Render graph when component mounts or filters change
    useEffect(() => {
    renderGraph(currentFilters);
    }, [
    JSON.stringify(currentFilters), 
    includeDependentNamespaces
    ]);

  return (
    <div
      ref={graphRef}
      style={{ height: "600px", border: "1px solid #ccc", marginBottom: "2rem" }}
    />
  );
};