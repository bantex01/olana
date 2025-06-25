export interface Node {
  id: string;
  label: string;
  alert?: string;
  severity?: string;
}

export interface Edge {
  source: string;
  target: string;
}

export function parseTraces(traceData: any, alerts: any[]): { nodes: Node[]; edges: Edge[] } {
  const nodesMap = new Map<string, Node>();
  const edges: Edge[] = [];

  traceData.resourceSpans.forEach((rs: any) => {
    const serviceAttr = rs.resource.attributes.find((a: any) => a.key === 'service.name');
    const serviceName = serviceAttr?.value?.stringValue;

    rs.scopeSpans.forEach((ss: any) => {
      ss.spans.forEach((span: any) => {
        const peerServiceAttr = span.attributes.find((a: any) => a.key === 'peer.service');
        if (peerServiceAttr) {
          const targetService = peerServiceAttr.value.stringValue;

          if (!nodesMap.has(serviceName)) nodesMap.set(serviceName, { id: serviceName, label: serviceName });
          if (!nodesMap.has(targetService)) nodesMap.set(targetService, { id: targetService, label: targetService });

          edges.push({ source: serviceName, target: targetService });
        }
      });
    });
  });

  // Attach alerts to nodes
  alerts.forEach(alert => {
    const node = nodesMap.get(alert.service);
    if (node) {
      node.alert = alert.alert;
      node.severity = alert.severity;
    }
  });

  return {
    nodes: Array.from(nodesMap.values()),
    edges
  };
}

