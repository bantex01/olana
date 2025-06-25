import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

type Telemetry = {
  service_namespace: string;
  service_name: string;
  instance_id: string;
  environment: string;
  team: string;
  component_type: string;
  depends_on: { service_namespace: string; service_name: string }[];
};

type Alert = {
  service_namespace: string;
  service_name: string;
  instance_id: string;
  severity: "fatal" | "critical" | "warning" | "none";
  message: string;
};

const telemetryStore: Telemetry[] = [];
const alertStore: Alert[] = [];

app.post("/telemetry", (req, res) => {
  const t = req.body as Telemetry;
  telemetryStore.push(t);
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

  telemetryStore.forEach((t) => {
    const nsNodeId = t.service_namespace;
    const serviceNodeId = `${t.service_namespace}::${t.service_name}`;
    const instanceNodeId = `${t.service_namespace}::${t.service_name}::${t.instance_id}`;

    if (!seen.has(nsNodeId)) {
      nodes.push({ id: nsNodeId, label: t.service_namespace, color: "#888", shape: "ellipse" });
      seen.add(nsNodeId);
    }

    if (!seen.has(serviceNodeId)) {
      nodes.push({ id: serviceNodeId, label: t.service_name, shape: "box", color: "#D3D3D3" });
      edges.push({ from: nsNodeId, to: serviceNodeId });
      seen.add(serviceNodeId);
    }

    if (!seen.has(instanceNodeId)) {
      nodes.push({
        id: instanceNodeId,
        label: t.instance_id,
        team: t.team,
        component_type: t.component_type,
        shape: "box",
      });
      edges.push({ from: serviceNodeId, to: instanceNodeId });
      seen.add(instanceNodeId);
    }

    t.depends_on.forEach((dep) => {
      const targetServiceId = `${dep.service_namespace}::${dep.service_name}`;
      edges.push({ from: serviceNodeId, to: targetServiceId });
    });
  });

  res.json({ nodes, edges });
});

app.get("/alerts", (_req, res) => {
  res.json(alertStore);
});

app.listen(3001, () => console.log("Server running on http://localhost:3001"));
