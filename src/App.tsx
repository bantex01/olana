import React, { useEffect, useRef, useState } from "react";
import { Network, DataSet } from "vis-network/standalone/esm/vis-network";

type Alert = {
  service_namespace: string;
  service_name: string;
  instance_id?: string;
  severity: string;
  message: string;
  count?: number;
  first_seen?: string;
  last_seen?: string;
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
  tags?: string[];
  alertCount?: number;  // Added for backend-computed alert counts
  highestSeverity?: string;  // Added for backend-computed severity
  external_calls?: Array<{host: string; method?: string; path?: string; count: number}>;
  database_calls?: Array<{system: string; name?: string; host?: string; operation?: string; count: number}>;
  rpc_calls?: Array<{service: string; method?: string; count: number}>;
};

type Edge = {
  id?: string;
  from: string;
  to: string;
  color?: any;
  width?: number;
  edgeType?: string;
  dashes?: boolean;
};

type GraphFilters = {
  tags?: string[];
  namespaces?: string[];
  teams?: string[];
  severities?: string[];
  environments?: string[];
};

const App = () => {
  const graphRef = useRef<HTMLDivElement>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableNamespaces, setAvailableNamespaces] = useState<string[]>([]);
  const [namespaceDeps, setNamespaceDeps] = useState<any[]>([]);
  const [filters, setFilters] = useState<GraphFilters>({});
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedNamespaces, setSelectedNamespaces] = useState<string[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [includeDependentNamespaces, setIncludeDependentNamespaces] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch available tags
  const fetchTags = async () => {
    try {
      const response = await fetch("http://localhost:3001/tags");
      const data = await response.json();
      setAvailableTags(data.tags || []);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  // Fetch available namespaces
  const fetchNamespaces = async () => {
    try {
      const response = await fetch("http://localhost:3001/graph");
      const data: { nodes: Node[]; edges: Edge[] } = await response.json();
      const namespaces: string[] = data.nodes
        .filter((node: Node) => node.nodeType === "namespace")
        .map((node: Node) => node.id);
      setAvailableNamespaces([...new Set(namespaces)].sort());
    } catch (error) {
      console.error('Failed to fetch namespaces:', error);
    }
  };
  const fetchNamespaceDeps = async () => {
    try {
      const response = await fetch("http://localhost:3001/namespace-dependencies");
      const data = await response.json();
      setNamespaceDeps(data);
    } catch (error) {
      console.error('Failed to fetch namespace dependencies:', error);
    }
  };

  // Build query string from filters
  const buildFilterQuery = (currentFilters: GraphFilters) => {
    const params = new URLSearchParams();
    
    if (currentFilters.tags && currentFilters.tags.length > 0) {
      params.append('tags', currentFilters.tags.join(','));
    }
    if (currentFilters.namespaces && currentFilters.namespaces.length > 0) {
      params.append('namespaces', currentFilters.namespaces.join(','));
    }
    if (currentFilters.severities && currentFilters.severities.length > 0) {
      params.append('severities', currentFilters.severities.join(','));
    }
    // Add the includeDependents parameter
    if (includeDependentNamespaces && currentFilters.namespaces && currentFilters.namespaces.length > 0) {
      params.append('includeDependents', 'true');
    }
    
    return params.toString() ? `?${params.toString()}` : '';
  };

const fetchData = async (currentFilters: GraphFilters = {}) => {
  try {
    const filterQuery = buildFilterQuery(currentFilters);
    console.log('=== FRONTEND DEBUG ===');
    console.log('Fetching with filters:', currentFilters);
    console.log('Query string:', filterQuery);
    console.log('includeDependentNamespaces:', includeDependentNamespaces);
    
    const graphRes = await fetch(`http://localhost:3001/graph${filterQuery}`);
    
    // Build alert query with SAME filters as graph
    const alertParams = new URLSearchParams();
    if (currentFilters.namespaces && currentFilters.namespaces.length > 0) {
      alertParams.append('namespaces', currentFilters.namespaces.join(','));
    }
    if (currentFilters.severities && currentFilters.severities.length > 0) {
      alertParams.append('severities', currentFilters.severities.join(','));
    }
    if (currentFilters.tags && currentFilters.tags.length > 0) {
      alertParams.append('tags', currentFilters.tags.join(','));
    }
    
    const alertQuery = alertParams.toString() ? `?${alertParams.toString()}` : '';
    console.log('Alert query:', alertQuery);
    
    const alertRes = await fetch(`http://localhost:3001/alerts${alertQuery}`);

    const graphData = await graphRes.json();
    const { nodes, edges }: { nodes: Node[]; edges: Edge[] } = graphData;

    console.log('=== FRONTEND ENRICHMENT DEBUG ===');
    const nodeWithEnrichment = nodes.find(n => 
      (n.external_calls && n.external_calls.length > 0) || 
      (n.database_calls && n.database_calls.length > 0) || 
      (n.rpc_calls && n.rpc_calls.length > 0)
    );
    if (nodeWithEnrichment) {
      console.log('Node with enrichment:', nodeWithEnrichment.id);
      console.log('External calls:', nodeWithEnrichment.external_calls);
      console.log('Database calls:', nodeWithEnrichment.database_calls);
      console.log('RPC calls:', nodeWithEnrichment.rpc_calls);
    } else {
      console.log('No nodes found with enrichment data');
    }
    console.log('==================================');



    
    const alertData: Alert[] = await alertRes.json();
    
    console.log('Received nodes:', nodes.length);
    console.log('Received edges:', edges.length);
    console.log('Received alerts:', alertData.length);
    console.log('First few nodes:', nodes.slice(0, 3));
    console.log('Backend response:', graphData);
    
    setAlerts(alertData);

    // Rest of the function remains the same...
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
          tooltip += `\nTags: ${n.tags.join(', ')}`;
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
        let relevantAlerts = alertData.filter(alert => {
          const serviceKey = `${alert.service_namespace}::${alert.service_name}`;
          return serviceKey === n.id;
        });

        // Apply severity filter to tooltip alerts if active
        if (currentFilters.severities && currentFilters.severities.length > 0) {
          relevantAlerts = relevantAlerts.filter(alert => 
            currentFilters.severities!.includes(alert.severity)
          );
        }
        
        if (relevantAlerts.length > 0) {
          tooltip += `\n\nAlerts:`;
          relevantAlerts.forEach(alert => {
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
      };

      console.log('Creating new Network...');
      const network = new Network(graphRef.current, data, options);
      console.log('Network created successfully');
    } else {
      console.log('ERROR: graphRef.current is null - cannot render graph');
    }
  } catch (error) {
    console.error('Failed to fetch data:', error);
  }
};
  // Auto-apply filters when selections change
  // Auto-apply filters when selections change
  useEffect(() => {
    const newFilters: GraphFilters = {};
    
    if (selectedTags.length > 0) {
      newFilters.tags = selectedTags;
    }
    if (selectedNamespaces.length > 0) {
      newFilters.namespaces = selectedNamespaces;
    }
    if (selectedSeverities.length > 0) {
      newFilters.severities = selectedSeverities;
    }
    
    setFilters(newFilters);
    fetchData(newFilters);
  }, [selectedTags, selectedNamespaces, selectedSeverities, includeDependentNamespaces]);

  useEffect(() => {
    console.log('=== FILTER EFFECT TRIGGERED ===');
    console.log('selectedTags:', selectedTags);
    console.log('selectedNamespaces:', selectedNamespaces);
    console.log('selectedSeverities:', selectedSeverities);
    console.log('includeDependentNamespaces:', includeDependentNamespaces);
    
    const newFilters: GraphFilters = {};
    
    if (selectedTags.length > 0) {
      newFilters.tags = selectedTags;
    }
    if (selectedNamespaces.length > 0) {
      newFilters.namespaces = selectedNamespaces;
    }
    if (selectedSeverities.length > 0) {
      newFilters.severities = selectedSeverities;
    }
    
    console.log('newFilters:', newFilters);
    setFilters(newFilters);
    fetchData(newFilters);
  }, [selectedTags, selectedNamespaces, selectedSeverities, includeDependentNamespaces]);

  useEffect(() => {
    fetchData();
    fetchTags();
    fetchNamespaces();
    fetchNamespaceDeps();
  }, []);

  // Group alerts by service
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2>Service Dependency Graph</h2>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          style={{ 
            padding: "0.5rem 1rem", 
            backgroundColor: showFilters ? "#007bff" : "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

   {/* Filter Panel */}
{showFilters && (
  <div style={{ 
    backgroundColor: "#f8f9fa", 
    padding: "1rem", 
    borderRadius: "4px", 
    marginBottom: "1rem",
    border: "1px solid #dee2e6"
  }}>
    <h4>Graph Filters</h4>
    
    {/* Namespace Filter */}
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>
        Filter by Namespaces:
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
        {availableNamespaces.map(namespace => (
          <label key={namespace} style={{ display: "flex", alignItems: "center", marginRight: "1rem" }}>
            <input
              type="checkbox"
              checked={selectedNamespaces.includes(namespace)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedNamespaces([...selectedNamespaces, namespace]);
                } else {
                  setSelectedNamespaces(selectedNamespaces.filter(ns => ns !== namespace));
                }
              }}
              style={{ marginRight: "0.25rem" }}
            />
            <span style={{ 
              backgroundColor: "#e9ecef", 
              padding: "0.25rem 0.5rem", 
              borderRadius: "4px",
              fontSize: "0.9em"
            }}>
              {namespace}
            </span>
          </label>
        ))}
      </div>
      
      {/* Include Dependent Namespaces Option - moved here where it belongs */}
      <div style={{ marginTop: "0.5rem" }}>
        <label style={{ display: "flex", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={includeDependentNamespaces}
            onChange={(e) => setIncludeDependentNamespaces(e.target.checked)}
            style={{ marginRight: "0.5rem" }}
            disabled={selectedNamespaces.length === 0}
          />
          <span style={{ 
            color: selectedNamespaces.length === 0 ? "#999" : "#000",
            fontSize: "0.9em"
          }}>
            Include dependent namespaces (show blast radius)
          </span>
        </label>
        {selectedNamespaces.length === 0 && (
          <div style={{ fontSize: "0.8em", color: "#666", marginTop: "0.25rem", marginLeft: "1.5rem" }}>
            Select namespaces first to enable this option
          </div>
        )}
      </div>
    </div>

    {/* Tag Filter */}
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>
        Filter by Tags:
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {availableTags.map(tag => (
          <label key={tag} style={{ display: "flex", alignItems: "center", marginRight: "1rem" }}>
            <input
              type="checkbox"
              checked={selectedTags.includes(tag)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedTags([...selectedTags, tag]);
                } else {
                  setSelectedTags(selectedTags.filter(t => t !== tag));
                }
              }}
              style={{ marginRight: "0.25rem" }}
            />
            <span style={{ 
              backgroundColor: "#e9ecef", 
              padding: "0.25rem 0.5rem", 
              borderRadius: "4px",
              fontSize: "0.9em"
            }}>
              {tag}
            </span>
          </label>
        ))}
      </div>
    </div>

    {/* Severity Filter */}
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>
        Filter by Alert Severity:
      </label>
      <div style={{ display: "flex", gap: "1rem" }}>
        {['fatal', 'critical', 'warning'].map(severity => (
          <label key={severity} style={{ display: "flex", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={selectedSeverities.includes(severity)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedSeverities([...selectedSeverities, severity]);
                } else {
                  setSelectedSeverities(selectedSeverities.filter(s => s !== severity));
                }
              }}
              style={{ marginRight: "0.25rem" }}
            />
            <span style={{ 
              color: severity === 'fatal' ? 'black' : severity === 'critical' ? 'red' : 'orange',
              fontWeight: "bold"
            }}>
              {severity}
            </span>
          </label>
        ))}
      </div>
    </div>

    {/* Active Filters Display - keep this but remove the manual buttons */}
    {(selectedTags.length > 0 || selectedNamespaces.length > 0 || selectedSeverities.length > 0) && (
      <div style={{ marginTop: "1rem", padding: "0.5rem", backgroundColor: "#d1ecf1", borderRadius: "4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>Active Filters:</strong>
            {selectedNamespaces.length > 0 && (
              <span style={{ marginLeft: "0.5rem" }}>
                Namespaces: {selectedNamespaces.join(', ')}
                {includeDependentNamespaces && <em> (+ dependents)</em>}
              </span>
            )}
            {selectedTags.length > 0 && (
              <span style={{ marginLeft: "0.5rem" }}>
                Tags: {selectedTags.join(', ')}
              </span>
            )}
            {selectedSeverities.length > 0 && (
              <span style={{ marginLeft: "0.5rem" }}>
                Severities: {selectedSeverities.join(', ')}
              </span>
            )}
          </div>
          {/* Add a single clear all button that's less prominent */}
          <button 
            onClick={() => {
              setSelectedTags([]);
              setSelectedNamespaces([]);
              setSelectedSeverities([]);
              setIncludeDependentNamespaces(false);
            }}
            style={{ 
              padding: "0.25rem 0.5rem", 
              backgroundColor: "#6c757d", 
              color: "white", 
              border: "none", 
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.8em"
            }}
            title="Clear all filters"
          >
            Clear All
          </button>
        </div>
      </div>
    )}
  </div>
)}

        {/* Legend */}
        <div style={{ 
          backgroundColor: "#f8f9fa", 
          padding: "0.5rem", 
          marginBottom: "1rem", 
          borderRadius: "4px",
          border: "1px solid #dee2e6"
        }}>
          <strong>Legend:</strong>
          <span style={{ marginLeft: "1rem", color: "#2B7CE9" }}>━ Service Dependencies</span>
          <span style={{ marginLeft: "1rem", color: "#2B7CE9" }}>┅ Namespace Dependencies</span>
          <span style={{ marginLeft: "1rem" }}>🔴 Critical</span>
          <span style={{ marginLeft: "0.5rem" }}>🟠 Warning</span>
          <span style={{ marginLeft: "0.5rem" }}>⚫ Fatal</span>
        </div>

      {/* Graph */}
      <div
        ref={graphRef}
        style={{ height: "600px", border: "1px solid #ccc", marginBottom: "2rem" }}
      ></div>

      {/* Namespace Dependencies Management */}
      <div style={{ marginBottom: "2rem" }}>
        <h3>Namespace Dependencies</h3>
        {namespaceDeps.length > 0 ? (
          <div style={{ backgroundColor: "#f8f9fa", padding: "1rem", borderRadius: "4px" }}>
            {namespaceDeps.map((dep, idx) => (
              <div key={idx} style={{ 
                marginBottom: "0.5rem", 
                padding: "0.5rem", 
                backgroundColor: "white", 
                borderRadius: "4px",
                border: "1px solid #dee2e6"
              }}>
                <strong>{dep.from_namespace}</strong> → <strong>{dep.to_namespace}</strong>
                {dep.description && <span style={{ color: "#666", marginLeft: "1rem" }}>({dep.description})</span>}
                <span style={{ color: "#999", fontSize: "0.8em", marginLeft: "1rem" }}>
                  {dep.dependency_type} • {new Date(dep.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "#666" }}>No namespace dependencies configured.</p>
        )}
      </div>

      {/* Alerts by Service */}
      <h3>Active Alerts by Service</h3>
      {Object.keys(groupedAlerts).length > 0 ? (
        Object.entries(groupedAlerts).map(([serviceKey, serviceAlerts]) => (
          <div key={serviceKey} style={{ marginBottom: "1rem" }}>
            <h4>{serviceKey}</h4>
            <ul>
              {serviceAlerts.map((alert, idx) => (
                <li key={idx}>
                  <strong>[{alert.severity}]</strong> {alert.message}
                  {alert.instance_id && <span style={{ color: "#666" }}> (instance: {alert.instance_id})</span>}
                  {alert.count && alert.count > 1 && <span style={{ color: "#0066cc", fontWeight: "bold" }}> × {alert.count}</span>}
                  {alert.last_seen && (
                    <div style={{ fontSize: "0.8em", color: "#888" }}>
                      Last seen: {new Date(alert.last_seen).toLocaleString()}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))
      ) : (
        <p style={{ color: "#666" }}>No active alerts.</p>
      )}
    </div>
  );
};

export default App;