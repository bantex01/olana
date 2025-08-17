import React, { useRef, useEffect, useCallback } from 'react';
import { Network, DataSet } from "vis-network/standalone/esm/vis-network";
import type { Node, Edge, Alert, GraphFilters } from '../../types';
import { logger } from '../../utils/logger';
import { useTheme } from '../../contexts/ThemeContext';

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
  includeDependentNamespaces,
}) => {
  const graphRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const animationRef = useRef<number | null>(null);
  const nodesDataSetRef = useRef<DataSet<Node> | null>(null);
  const { theme } = useTheme();

  // Animation system for pulsing alert nodes
  const startPulseAnimation = useCallback(() => {
    if (!nodesDataSetRef.current) return;

    const animate = () => {
      const timestamp = Date.now();
      const nodes = nodesDataSetRef.current!.get();
      const updates: Array<{ id: string; size: number; borderWidth: number }> = [];

      nodes.forEach((node) => {
        if (node.nodeType === 'service' && node.highestSeverity && node.highestSeverity !== 'none') {
          // Define pulse rates based on severity (in milliseconds)
          const pulseRates: Record<string, number> = {
            fatal: 1000,    // 1 second
            critical: 2000, // 2 seconds  
            warning: 3000,  // 3 seconds
          };

          const pulseRate = pulseRates[node.highestSeverity] || 3000;
          
          // Calculate pulse phase (0 to 1) using sine wave
          const phase = (timestamp % pulseRate) / pulseRate;
          const pulseValue = (Math.sin(phase * 2 * Math.PI) + 1) / 2; // 0 to 1

          // Base size and pulse range
          const baseSize = node.size || 25;
          const pulseRange = 8; // How much bigger the node gets
          const baseBorderWidth = 2;
          const borderPulseRange = 3;

          const newSize = baseSize + (pulseValue * pulseRange);
          const newBorderWidth = baseBorderWidth + (pulseValue * borderPulseRange);

          updates.push({
            id: node.id,
            size: newSize,
            borderWidth: newBorderWidth
          });
        }
      });

      // Batch update all node changes
      if (updates.length > 0) {
        nodesDataSetRef.current!.update(updates);
      }

      // Continue animation
      animationRef.current = requestAnimationFrame(animate);
    };

    // Start the animation loop
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  const stopPulseAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

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
      logger.debug('Alert query:', alertQuery);
      
      // Fetch graph and alerts using hooks
      const { nodes, edges } = await fetchGraphData(filters, includeDependentNamespaces);
      await fetchAlerts(alertQuery);
      
      logger.debug('Received nodes:', nodes.length);
      logger.debug('Received edges:', edges.length);
      logger.debug('First few nodes:', nodes.slice(0, 3));

      // Process nodes for alert coloring
      const coloredNodes = nodes.map((n) => {
        // Use pre-computed values from backend if available
        const count = n.alertCount !== undefined ? n.alertCount : 0;
        const sev = n.highestSeverity || "none";

        const colorMap: Record<string, string> = {
          fatal: "#000000",
          critical: "#dc3545",
          warning: "#fd7e14",
          none: "#198754",
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
          title: tooltip,
          // Set initial properties for animation
          size: shouldShowAlerts && sev !== 'none' ? 25 : (n.size || 20),
          borderWidth: shouldShowAlerts && sev !== 'none' ? 2 : 1,
          borderColor: shouldShowAlerts ? colorMap[sev] : undefined
        };
      });

      if (graphRef.current) {
        logger.debug('=== GRAPH RENDERING ===');
        logger.debug('Graph ref exists, rendering with:');
        logger.debug('- Colored nodes:', coloredNodes.length);
        logger.debug('- Edges:', edges.length);
        logger.debug('Sample colored node:', coloredNodes[0]);
        
        // Stop any existing animation
        stopPulseAnimation();

        const nodesDataSet = new DataSet<Node>(coloredNodes);
        const data = {
          nodes: nodesDataSet,
          edges: new DataSet<Edge>(edges),
        };

        // Store reference to nodes dataset for animation
        nodesDataSetRef.current = nodesDataSet;

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

                  layout: {
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
          }

          /*layout: {
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
          }*/
        };

        logger.debug('Creating new Network...');
        const network = new Network(graphRef.current, data, options);
        networkRef.current = network;
        
        // Start pulse animation after network is created
        setTimeout(() => {
          startPulseAnimation();
        }, 1000); // Small delay to let network initialize
        
        logger.debug('Network created successfully');
      } else {
        logger.error('ERROR: graphRef.current is null - cannot render graph');
      }
    } catch (error) {
      logger.error('Failed to render graph:', error);
    }
  };

  // Render graph when component mounts or filters change
  useEffect(() => {
    renderGraph(currentFilters);
  }, [
    JSON.stringify(currentFilters), 
    includeDependentNamespaces,
    theme // Re-render when theme changes
  ]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      stopPulseAnimation();
    };
  }, [stopPulseAnimation]);

  return (
    <div
      key={`graph-${theme}`} // Force remount on theme change
      ref={graphRef}
      style={{ height: "600px", border: "1px solid #ccc", marginBottom: "2rem" }}
    />
  );
};