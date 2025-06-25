import React, { useEffect, useRef, useState } from "react";
import { Network, DataSet } from "vis-network/standalone/esm/vis-network";

type Alert = {
  service_namespace: string;
  service_name: string;
  instance_id: string;
  severity: string;
  message: string;
};

type Node = {
  id: string;
  label: string;
  color?: string;
  shape?: string;
  team?: string;
  component_type?: string;
};

type Edge = {
  id?: string;
  from: string;
  to: string;
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

      const alertCount = new Map<string, number>();
      const highestSeverity = new Map<string, string>();

      const severityRank = {
        fatal: 1,
        critical: 2,
        warning: 3,
        none: 4,
      };

      alertData.forEach((a) => {
        const key = `${a.service_namespace}::${a.service_name}::${a.instance_id}`;
        alertCount.set(key, (alertCount.get(key) || 0) + 1);

        const current = highestSeverity.get(key);
        if (!current || severityRank[a.severity as keyof typeof severityRank] < severityRank[current as keyof typeof severityRank]) {
          highestSeverity.set(key, a.severity);
        }
      });

      const coloredNodes = nodes.map((n) => {
        const isInstance = n.id.split("::").length === 3;
        const count = alertCount.get(n.id) || 0;
        const sev = highestSeverity.get(n.id) || "none";

        const colorMap: Record<string, string> = {
          fatal: "black",
          critical: "red",
          warning: "orange",
          none: "green",
        };

        return {
          ...n,
          label: isInstance ? `${n.label}\n${count} alert(s)` : n.label,
          color: isInstance ? colorMap[sev] : n.color,
        };
      });

      if (graphRef.current) {
        const data = {
          nodes: new DataSet<Node>(coloredNodes),
          edges: new DataSet<Edge>(edges),
        };

        const options = {
          nodes: {
            shape: "box",
            font: { color: "#fff" },
          },
          edges: { arrows: "to" },
          layout: {
            hierarchical: {
              enabled: true,
              direction: "LR",
              sortMethod: "directed",
            },
          },
        };

        new Network(graphRef.current, data, options);
      }
    };

    fetchData();
  }, []);

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Service Graph</h2>
      <div
        ref={graphRef}
        style={{ height: "600px", border: "1px solid #ccc", marginBottom: "2rem" }}
      ></div>

      <h3>Alerts</h3>
      <ul>
        {alerts.map((alert, idx) => (
          <li key={idx}>
            <strong>[{alert.severity}]</strong> {alert.service_namespace}::{alert.service_name}::{alert.instance_id}: {alert.message}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default App;
