import React, { useEffect, useRef, useState } from "react";
import { Network, DataSet } from "vis-network/standalone/esm/vis-network";

type Alert = {
  service_namespace: string;
  service_name: string;
  instance_id?: string; // Now optional
  severity: string;
  message: string;
};

type Node = {
  id: string;
  label: string;
  color?: string;
  shape?: string;
  size?: number;
  team?: string;
  component_type?: string;
  environment?: string;
  nodeType?: string;
};

type Edge = {
  id?: string;
  from: string;
  to: string;
  color?: any;
  width?: number;
  edgeType?: string; // Added to track edge types
};

const App = () => {
  const graphRef = useRef<HTMLDivElement>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const graphRes = await fetch("http://localhost:3001/graph");
      const alertRes = await fetch("http://localhost:3001/alerts");

      const { nodes, edges }: { nodes: Node[]; edges: Edge[] } = await graphRes.json();
      const alertData: Alert[] = await alertRes.json();
      setAlerts(alertData);

      // Map alerts by their target (instance if available, otherwise service)
      const alertCount = new Map<string, number>();
      const highestSeverity = new Map<string, string>();

      const severityRank = {
        fatal: 1,
        critical: 2,
        warning: 3,
        none: 4,
      };

      alertData.forEach((a) => {
        // Alert targets instance if instance_id exists, otherwise targets service
        const key = a.instance_id 
          ? `${a.service_namespace}::${a.service_name}::${a.instance_id}`
          : `${a.service_namespace}::${a.service_name}`;
          
        alertCount.set(key, (alertCount.get(key) || 0) + 1);

        const current = highestSeverity.get(key);
        if (!current || severityRank[a.severity as keyof typeof severityRank] < severityRank[current as keyof typeof severityRank]) {
          highestSeverity.set(key, a.severity);
        }
      });

      const coloredNodes = nodes.map((n) => {
        const count = alertCount.get(n.id) || 0;
        const sev = highestSeverity.get(n.id) || "none";

        const colorMap: Record<string, string> = {
          fatal: "black",
          critical: "red",
          warning: "orange",
          none: "green",
        };

        // Only apply alert colors to services and instances, not namespaces
        const shouldShowAlerts = n.nodeType === "service" || n.nodeType === "instance";
        const alertLabel = count > 0 ? `\n${count} alert(s)` : "";

        // Build hover tooltip with metadata and alerts
        let tooltip = `${n.label}`;
        
        if (n.nodeType === "service" || n.nodeType === "instance") {
          tooltip += `\nType: ${n.nodeType}`;
          if (n.team) tooltip += `\nTeam: ${n.team}`;
          if (n.environment) tooltip += `\nEnvironment: ${n.environment}`;
          if (n.component_type) tooltip += `\nComponent: ${n.component_type}`;
          
          // Add alerts section if there are alerts for this node
          const nodeAlerts = alertData.filter(alert => {
            const alertKey = alert.instance_id 
              ? `${alert.service_namespace}::${alert.service_name}::${alert.instance_id}`
              : `${alert.service_namespace}::${alert.service_name}`;
            return alertKey === n.id;
          });
          
          if (nodeAlerts.length > 0) {
            tooltip += `\n\nAlerts:`;
            nodeAlerts.forEach(alert => {
              tooltip += `\n• [${alert.severity}] ${alert.message}`;
            });
          }
        } else if (n.nodeType === "namespace") {
          tooltip += `\nType: ${n.nodeType}`;
        }

        return {
          ...n,
          label: shouldShowAlerts ? `${n.label}${alertLabel}` : n.label,
          color: shouldShowAlerts ? colorMap[sev] : n.color,
          title: tooltip // This creates the hover tooltip
        };
      });

      if (graphRef.current) {
        // Update instance edge colors based on instance-specific alerts
        const coloredEdges = edges.map((edge) => {
          if (edge.edgeType === "instance") {
            // Check if the target instance has alerts
            const instanceId = edge.to;
            const instanceAlerts = alertData.filter(alert => {
              const alertKey = alert.instance_id 
                ? `${alert.service_namespace}::${alert.service_name}::${alert.instance_id}`
                : `${alert.service_namespace}::${alert.service_name}`;
              return alertKey === instanceId;
            });

            if (instanceAlerts.length > 0) {
              // Get highest severity for this instance
              const instanceSeverity = instanceAlerts.reduce((highest, alert) => {
                const severityRank = { fatal: 1, critical: 2, warning: 3, none: 4 };
                if (!highest || severityRank[alert.severity as keyof typeof severityRank] < severityRank[highest as keyof typeof severityRank]) {
                  return alert.severity;
                }
                return highest;
              }, "");

              const colorMap: Record<string, string> = {
                fatal: "black",
                critical: "red",
                warning: "orange",
                none: "#888",
              };

              return {
                ...edge,
                color: { color: colorMap[instanceSeverity] || "#888" }
              };
            }
          }
          return edge;
        });

        const data = {
          nodes: new DataSet<Node>(coloredNodes),
          edges: new DataSet<Edge>(coloredEdges),
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
          layout: {
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
          }
        };

        new Network(graphRef.current, data, options);
      }
    };

    fetchData();
  }, []);

  // Group alerts by their attribution target
  const groupedAlerts = alerts.reduce((acc, alert) => {
    const key = alert.instance_id 
      ? `${alert.service_namespace}::${alert.service_name}::${alert.instance_id} (instance)`
      : `${alert.service_namespace}::${alert.service_name} (service)`;
    
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(alert);
    return acc;
  }, {} as Record<string, Alert[]>);

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Service Graph</h2>
      <div
        ref={graphRef}
        style={{ height: "600px", border: "1px solid #ccc", marginBottom: "2rem" }}
      ></div>

      <h3>Alerts by Attribution</h3>
      {Object.entries(groupedAlerts).map(([target, targetAlerts]) => (
        <div key={target} style={{ marginBottom: "1rem" }}>
          <h4>{target}</h4>
          <ul>
            {targetAlerts.map((alert, idx) => (
              <li key={idx}>
                <strong>[{alert.severity}]</strong> {alert.message}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default App;