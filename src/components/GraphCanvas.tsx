import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';

interface GraphCanvasProps {
  nodes: { id: string; label: string; alert?: string; severity?: string }[];
  edges: { source: string; target: string }[];
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({ nodes, edges }) => {
  const cyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cyRef.current) {
      cytoscape({
        container: cyRef.current,
        elements: [
          ...nodes.map(n => ({
            data: {
              id: n.id,
              label: n.label,
              severity: n.severity
            }
          })),
          ...edges.map(e => ({ data: e }))
        ],
        style: [
          {
            selector: 'node',
            style: {
              label: 'data(label)',
              'background-color': 'mapData(severity, "critical", "red", "warning", "orange", "green")'
            }
          },
          {
            selector: 'edge',
            style: {
              width: 2,
              'line-color': '#ccc',
              'target-arrow-color': '#ccc',
              'target-arrow-shape': 'triangle'
            }
          }
        ],
        layout: { name: 'breadthfirst' }
      });
    }
  }, [nodes, edges]);

  return <div ref={cyRef} style={{ width: '100%', height: '500px' }} />;
};

