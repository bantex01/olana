import React, { useMemo } from 'react';
import { ServiceMap } from './ServiceMap';
import type { ServiceMapProps } from './ServiceMap';
import type { Alert as AlertType, Node, Edge } from '../../types';

/**
 * ServiceMapWrapper - A truly plug-and-play service map component
 * 
 * This wrapper handles all the data correlation logic that ServiceMap should have
 * handled internally, making it truly reusable across the application.
 * 
 * Usage:
 * <ServiceMapWrapper
 *   alerts={allAlerts}           // Raw alert data
 *   nodes={rawNodes}            // Raw node data (without alertCount/highestSeverity)
 *   edges={edges}               // Edge data
 *   config={...}                // ServiceMap config
 * />
 */

interface ServiceMapWrapperProps extends Omit<ServiceMapProps, 'nodes'> {
  alerts: AlertType[];
  nodes: Node[];  // Raw nodes without alert correlation
  edges: Edge[];
}

export const ServiceMapWrapper: React.FC<ServiceMapWrapperProps> = ({
  alerts,
  nodes,
  edges,
  ...otherProps
}) => {
  // Auto-compute alert correlation for nodes (this should be inside ServiceMap)
  const enhancedNodes = useMemo(() => {
    return nodes.map(node => {
      // Find alerts for this specific node
      const nodeAlerts = alerts.filter(alert => {
        const alertNodeId = `${alert.service_namespace}::${alert.service_name}`;
        return alertNodeId === node.id;
      });

      // Calculate alert count and highest severity for this node
      let highestSeverity = 'none';
      if (nodeAlerts.length > 0) {
        const severityRank = { fatal: 1, critical: 2, warning: 3, none: 4 };
        highestSeverity = nodeAlerts.reduce((highest, alert) => {
          const alertRank = severityRank[alert.severity as keyof typeof severityRank] || 5;
          const highestRank = severityRank[highest as keyof typeof severityRank] || 5;
          return alertRank < highestRank ? alert.severity : highest;
        }, 'none');
      }

      return {
        ...node,
        // Auto-compute these properties that ServiceMap depends on
        alertCount: nodeAlerts.length,
        highestSeverity: highestSeverity,
      };
    });
  }, [alerts, nodes]);

  // Add debugging for troubleshooting
  const nodesWithAlerts = enhancedNodes.filter(n => n.alertCount && n.alertCount > 0);
  if (nodesWithAlerts.length > 0) {
    console.log('[ServiceMapWrapper] Enhanced nodes with alerts:', nodesWithAlerts.length);
    console.log('[ServiceMapWrapper] Alert correlation complete');
  }

  return (
    <ServiceMap
      alerts={alerts}
      nodes={enhancedNodes}  // Pass enhanced nodes with alert correlation
      edges={edges}
      {...otherProps}
    />
  );
};