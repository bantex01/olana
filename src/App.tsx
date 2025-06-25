import React, { useEffect, useRef, useState } from "react";
import { Network, DataSet } from "vis-network/standalone/esm/vis-network";

type Alert = {
  service_namespace: string;
  service_name: string;
  instance_id?: string;
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
  edgeType?: string;
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

      // Map alerts by service (no instance nodes)
      const alertCount = new Map<string, number>();
      const highestSeverity = new Map<string, string>();

      const severityRank = {
        fatal: 1,
        critical: 2,
        warning: 3,
        none: 4,
      };

      alertData.forEach((a) => {
        // All alerts are attributed to service level
        const serviceKey = `${a.service_namespace}::${a.service_name}`;
          
        alertCount.set(serviceKey, (alertCount.get(serviceKey) || 0) + 1);

        const current = highestSeverity.get(serviceKey);
        if (!current || severityRank[a.severity as keyof typeof severityRank] < severityRank[current as keyof typeof severityRank]) {
          highestSeverity.set(serviceKey, a.severity);
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

        // Only apply alert colors to services, not namespaces
        const shouldShowAlerts = n.nodeType === "service";
        const alertLabel = count > 0 ? `\n${count} alert(s)` : "";

        // Build hover tooltip with metadata and alerts
        let tooltip = `${n.label}`;
        
        if (n.nodeType === "service") {
          tooltip += `\nType: ${n.nodeType}`;
          if (n.team) tooltip += `\nTeam: ${n.team}`;
          if (n.environment) tooltip += `\nEnvironment: ${n.environment}`;
          if (n.component_type) tooltip += `\nComponent: ${n.component_type}`;
          
          // Add alerts section if there are alerts for this service
          const serviceAlerts = alertData.filter(alert => {
            const serviceKey = `${alert.service_namespace}::${alert.service_name}`;
            return serviceKey === n.id;
          });
          
          if (serviceAlerts.length > 0) {
            tooltip += `\n\nAlerts:`;
            serviceAlerts.forEach(alert => {
              const instanceInfo = alert.instance_id ? ` (${alert.instance_id})` : '';
              tooltip += `\n• [${alert.severity}] ${alert.message}${instanceInfo}`;
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

  // Group alerts by service (simplified)
  const groupedAlerts = alerts.reduce((acc, alert) => {
    const serviceKey = `${alert.service_namespace}::${alert.service_name}`;
    
    if (!acc[serviceKey]) {
      acc[serviceKey] = [];
    }
    acc[serviceKey].push(alert);
    return acc;
  }, {} as Record<string, Alert[]>);

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Service Graph</h2>
      <div
        ref={graphRef}
        style={{ height: "600px", border: "1px solid #ccc", marginBottom: "2rem" }}
      ></div>

      <h3>Alerts by Service</h3>
      {Object.entries(groupedAlerts).map(([serviceKey, serviceAlerts]) => (
        <div key={serviceKey} style={{ marginBottom: "1rem" }}>
          <h4>{serviceKey}</h4>
          <ul>
            {serviceAlerts.map((alert, idx) => (
              <li key={idx}>
                <strong>[{alert.severity}]</strong> {alert.message}
                {alert.instance_id && <span style={{ color: "#666" }}> (instance: {alert.instance_id})</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default App;