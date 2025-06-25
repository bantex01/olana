import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

type Telemetry = {
  service_namespace: string;
  service_name: string;
  // Removed: instance_id
  environment: string;
  team: string;
  component_type: string;
  depends_on: { service_namespace: string; service_name: string }[];
};

type Alert = {
  service_namespace: string;
  service_name: string;
  instance_id?: string; // Keep for alert context only
  severity: "fatal" | "critical" | "warning" | "none";
  message: string;
};

const telemetryStore: Telemetry[] = [];
const alertStore: Alert[] = [];

app.post("/telemetry", (req, res) => {
  const t = req.body as Telemetry;
  
  // Remove any existing telemetry for this service (upsert behavior)
  const existingIndex = telemetryStore.findIndex(
    existing => existing.service_namespace === t.service_namespace && 
                existing.service_name === t.service_name
  );
  
  if (existingIndex >= 0) {
    telemetryStore[existingIndex] = t;
  } else {
    telemetryStore.push(t);
  }
  
  res.json({ status: "ok" });
});

app.post("/alerts", (req, res) => {
  const a = req.body as Alert;
  alertStore.push(a);
  res.json({ status: "ok" });
});

app.get("/graph", (_req, res) => {
  const nodes: any[] = [];
  const edges: any[] = [];

  const seen = new Set<string>();
  const serviceDependencies: Array<{from: string, to: string}> = [];

  // Create service nodes only (no instances)
  telemetryStore.forEach((t) => {
    const nsNodeId = t.service_namespace;
    const serviceNodeId = `${t.service_namespace}::${t.service_name}`;

    // Create namespace node
    if (!seen.has(nsNodeId)) {
      nodes.push({ 
        id: nsNodeId, 
        label: t.service_namespace, 
        color: "#888", 
        shape: "ellipse",
        nodeType: "namespace"
      });
      seen.add(nsNodeId);
    }

    // Create service node
    if (!seen.has(serviceNodeId)) {
      nodes.push({ 
        id: serviceNodeId, 
        label: t.service_name, 
        shape: "box", 
        color: "#D3D3D3",
        team: t.team,
        environment: t.environment,
        component_type: t.component_type,
        nodeType: "service"
      });
      edges.push({ from: nsNodeId, to: serviceNodeId });
      seen.add(serviceNodeId);
    }

    // Collect service dependencies
    t.depends_on.forEach((dep) => {
      const targetServiceId = `${dep.service_namespace}::${dep.service_name}`;
      serviceDependencies.push({
        from: serviceNodeId,
        to: targetServiceId
      });
    });
  });

  // Create dependency edges (only between existing services)
  serviceDependencies.forEach((dep) => {
    const edgeId = `${dep.from}-->${dep.to}`;
    
    // Only create edge if both source and target services exist
    const sourceExists = nodes.find(n => n.id === dep.from);
    const targetExists = nodes.find(n => n.id === dep.to);
    
    if (sourceExists && targetExists && !edges.find(e => e.id === edgeId)) {
      edges.push({ 
        id: edgeId,
        from: dep.from, 
        to: dep.to,
        color: { color: "#2B7CE9" }, // Blue for dependencies
        width: 2,
        arrows: { from: { enabled: true }, to: {enabled: false } },
        title: "depends_on",
        edgeType: "dependency"
      });
    }
  });

  res.json({ nodes, edges });
});

app.get("/alerts", (_req, res) => {
  res.json(alertStore);
});

app.listen(3001, () => console.log("Server running on http://localhost:3001"));