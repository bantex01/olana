import React, { useRef, useEffect, useState } from 'react';
import { Card, Typography, Space, Button, Switch, Slider, Select, Tag, Tooltip } from 'antd';
import { ForkOutlined, ExpandOutlined, CompressOutlined, FilterOutlined, AimOutlined } from '@ant-design/icons';
import { Network, DataSet } from "vis-network/standalone/esm/vis-network";
import type { ServiceDetailResponse, Node, Edge } from '../../types';
import { logger } from '../../utils/logger';

const { Text } = Typography;
const { Option } = Select;

interface ServiceDependencyMapProps {
  serviceData: ServiceDetailResponse;
}

interface DependencyNode extends Node {
  distance?: number; // Hops from central service
  isCenter?: boolean; // Is the central service
  direction?: 'upstream' | 'downstream' | 'center';
  serviceInfo?: {
    namespace: string;
    name: string;
    environment?: string;
    team?: string;
    component_type?: string;
  };
  font?: any; // vis-network font property
  title?: string; // vis-network tooltip property
}

interface DependencyEdge extends Edge {
  direction?: 'upstream' | 'downstream';
  edgeType?: 'dependency';
  arrows?: any; // vis-network arrows property
  smooth?: any; // vis-network smooth property
}

export const ServiceDependencyMap: React.FC<ServiceDependencyMapProps> = ({ serviceData }) => {
  const graphRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Interactive controls state
  const [showUpstream, setShowUpstream] = useState(true);
  const [showDownstream, setShowDownstream] = useState(true);
  const [maxDepth, setMaxDepth] = useState(2);
  const [filterBy, setFilterBy] = useState<'all' | 'environment' | 'team'>('all');
  const [selectedEnvironment, setSelectedEnvironment] = useState<string | undefined>();
  const [selectedTeam, setSelectedTeam] = useState<string | undefined>();
  const [focusMode, setFocusMode] = useState(false);

  const { service, dependencies } = serviceData;

  // Generate nodes and edges for dependency visualization
  const generateGraphData = () => {
    const nodes: DependencyNode[] = [];
    const edges: DependencyEdge[] = [];
    const processedServices = new Set<string>();

    // Central service node (always visible)
    const centralServiceId = `${service.namespace}::${service.name}`;
    const centralNode: DependencyNode = {
      id: centralServiceId,
      label: service.name,
      color: '#1890ff',
      shape: 'dot',
      size: 30,
      font: { size: 14, color: '#000', background: 'rgba(255,255,255,0.8)', strokeWidth: 2, strokeColor: '#fff' },
      isCenter: true,
      direction: 'center',
      distance: 0,
      serviceInfo: {
        namespace: service.namespace,
        name: service.name,
        environment: service.environment,
        team: service.team,
        component_type: service.component_type
      },
      title: `${service.name}\nNamespace: ${service.namespace}\nEnvironment: ${service.environment || 'Unknown'}\nTeam: ${service.team || 'Unknown'}\nType: ${service.component_type || 'Unknown'}`
    };
    nodes.push(centralNode);
    processedServices.add(centralServiceId);

    // Add upstream dependencies (services this service depends on)
    if (showUpstream && maxDepth >= 1) {
      dependencies.outgoing.forEach((dep, _index) => {
        const depId = `${dep.namespace}::${dep.name}`;
        if (!processedServices.has(depId)) {
          const upstreamNode: DependencyNode = {
            id: depId,
            label: dep.name,
            color: '#52c41a',
            shape: 'dot',
            size: focusMode ? 20 : 25,
            font: { size: focusMode ? 11 : 12, color: '#000', background: 'rgba(255,255,255,0.8)', strokeWidth: 1, strokeColor: '#fff' },
            isCenter: false,
            direction: 'upstream',
            distance: 1,
            serviceInfo: {
              namespace: dep.namespace,
              name: dep.name
            },
            title: `${dep.name}\nNamespace: ${dep.namespace}\nType: ${dep.type || 'Unknown'}\nLast seen: ${new Date(dep.last_seen).toLocaleString()}`
          };

          // Apply environment/team filtering
          if (filterBy === 'environment' && selectedEnvironment && dep.namespace !== selectedEnvironment) {
            return;
          }
          if (filterBy === 'team' && selectedTeam) {
            // Note: We don't have team info for dependencies, so this filter is limited
            return;
          }

          nodes.push(upstreamNode);
          processedServices.add(depId);

          // Create edge from central service to upstream dependency
          edges.push({
            id: `${centralServiceId}->${depId}`,
            from: centralServiceId,
            to: depId,
            direction: 'upstream',
            edgeType: 'dependency',
            color: { color: '#52c41a', highlight: '#389e0d' },
            width: focusMode ? 1 : 2,
            arrows: { to: { enabled: true, scaleFactor: focusMode ? 0.8 : 1.2 } },
            smooth: { enabled: true, type: 'continuous', roundness: 0.3 }
          });
        }
      });
    }

    // Add downstream dependencies (services that depend on this service)
    if (showDownstream && maxDepth >= 1) {
      dependencies.incoming.forEach((dep, _index) => {
        const depId = `${dep.namespace}::${dep.name}`;
        if (!processedServices.has(depId)) {
          const downstreamNode: DependencyNode = {
            id: depId,
            label: dep.name,
            color: '#faad14',
            shape: 'dot',
            size: focusMode ? 20 : 25,
            font: { size: focusMode ? 11 : 12, color: '#000', background: 'rgba(255,255,255,0.8)', strokeWidth: 1, strokeColor: '#fff' },
            isCenter: false,
            direction: 'downstream',
            distance: 1,
            serviceInfo: {
              namespace: dep.namespace,
              name: dep.name
            },
            title: `${dep.name}\nNamespace: ${dep.namespace}\nType: ${dep.type || 'Unknown'}\nLast seen: ${new Date(dep.last_seen).toLocaleString()}`
          };

          // Apply environment/team filtering
          if (filterBy === 'environment' && selectedEnvironment && dep.namespace !== selectedEnvironment) {
            return;
          }
          if (filterBy === 'team' && selectedTeam) {
            return;
          }

          nodes.push(downstreamNode);
          processedServices.add(depId);

          // Create edge from downstream dependency to central service
          edges.push({
            id: `${depId}->${centralServiceId}`,
            from: depId,
            to: centralServiceId,
            direction: 'downstream',
            edgeType: 'dependency',
            color: { color: '#faad14', highlight: '#d48806' },
            width: focusMode ? 1 : 2,
            arrows: { to: { enabled: true, scaleFactor: focusMode ? 0.8 : 1.2 } },
            smooth: { enabled: true, type: 'continuous', roundness: 0.3 }
          });
        }
      });
    }

    return { nodes, edges };
  };

  // Render the dependency graph
  const renderDependencyGraph = () => {
    if (!graphRef.current) return;

    setLoading(true);
    
    try {
      const { nodes, edges } = generateGraphData();

      const data = {
        nodes: new DataSet<DependencyNode>(nodes),
        edges: new DataSet<DependencyEdge>(edges),
      };

      const options = {
        nodes: {
          borderWidth: 2,
          borderWidthSelected: 3,
          shadow: {
            enabled: true,
            color: 'rgba(0,0,0,0.2)',
            size: 8,
            x: 2,
            y: 2
          }
        },
        edges: {
          shadow: {
            enabled: true,
            color: 'rgba(0,0,0,0.1)',
            size: 3,
            x: 1,
            y: 1
          },
          smooth: {
            enabled: true,
            type: "continuous",
            roundness: 0.4
          }
        },
        layout: {
          improvedLayout: true,
          randomSeed: service.name.charCodeAt(0) // Consistent layout based on service name
        },
        physics: {
          enabled: true,
          stabilization: { iterations: 200 },
          repulsion: {
            centralGravity: 0.3,
            springLength: focusMode ? 150 : 200,
            springConstant: 0.08,
            nodeDistance: focusMode ? 80 : 120,
            damping: 0.09
          }
        },
        interaction: {
          hover: true,
          tooltipDelay: 200,
          hideEdgesOnDrag: false,
          hideNodesOnDrag: false
        }
      };

      // Cleanup previous network
      if (networkRef.current) {
        networkRef.current.destroy();
      }

      // Create new network
      const network = new Network(graphRef.current, data, options);
      networkRef.current = network;

      // Center the view on the central service
      setTimeout(() => {
        if (network && network.focus) {
          network.focus(service.namespace + '::' + service.name, {
            scale: focusMode ? 1.5 : 1.0,
            animation: true
          });
        }
      }, 500);

    } catch (error) {
      logger.error('Failed to render dependency graph:', error);
    } finally {
      setLoading(false);
    }
  };

  // Re-render when controls change
  useEffect(() => {
    renderDependencyGraph();
  }, [
    showUpstream, 
    showDownstream, 
    maxDepth, 
    filterBy, 
    selectedEnvironment, 
    selectedTeam, 
    focusMode,
    serviceData
  ]);

  // Get unique environments and teams for filtering
  const getFilterOptions = () => {
    const environments = new Set<string>();
    const teams = new Set<string>();

    dependencies.incoming.forEach(dep => {
      if (dep.namespace) environments.add(dep.namespace);
    });
    dependencies.outgoing.forEach(dep => {
      if (dep.namespace) environments.add(dep.namespace);
    });

    if (service.environment) environments.add(service.environment);
    if (service.team) teams.add(service.team);

    return {
      environments: Array.from(environments),
      teams: Array.from(teams)
    };
  };

  const { environments, teams } = getFilterOptions();
  const totalDependencies = dependencies.incoming.length + dependencies.outgoing.length;
  
  // Calculate dynamic max depth based on available dependencies
  const calculateMaxDepth = () => {
    if (totalDependencies === 0) return 1; // No dependencies, only show current service
    if (totalDependencies < 5) return 2; // Few dependencies, max 2 hops
    return 3; // Many dependencies, allow full 3 hops
  };
  
  const dynamicMaxDepth = calculateMaxDepth();
  
  // Adjust current depth if it exceeds dynamic max
  useEffect(() => {
    if (maxDepth > dynamicMaxDepth) {
      setMaxDepth(dynamicMaxDepth);
    }
  }, [dynamicMaxDepth]);

  return (
    <Card
      title={
        <Space>
          <ForkOutlined style={{ color: '#1890ff' }} />
          <span>Service Dependency Map</span>
          <Tag color="blue">{totalDependencies} dependencies</Tag>
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="Toggle focus mode for cleaner view">
            <Button
              size="small"
              icon={focusMode ? <CompressOutlined /> : <ExpandOutlined />}
              onClick={() => setFocusMode(!focusMode)}
            >
              {focusMode ? 'Normal' : 'Focus'}
            </Button>
          </Tooltip>
          <Tooltip title="Center view on main service">
            <Button
              size="small"
              icon={<AimOutlined />}
              onClick={() => {
                if (networkRef.current && networkRef.current.focus) {
                  networkRef.current.focus(service.namespace + '::' + service.name, {
                    scale: focusMode ? 1.5 : 1.0,
                    animation: true
                  });
                }
              }}
            >
              Center
            </Button>
          </Tooltip>
        </Space>
      }
      loading={loading}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* Interactive Controls */}
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#fafafa', 
          borderRadius: '6px',
          border: '1px solid #f0f0f0'
        }}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {/* Direction Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <Space>
                <Text strong style={{ fontSize: '13px' }}>Show Dependencies:</Text>
                <Switch
                  size="small"
                  checked={showUpstream}
                  onChange={setShowUpstream}
                  checkedChildren="Upstream"
                  unCheckedChildren="Upstream"
                />
                <Switch
                  size="small"
                  checked={showDownstream}
                  onChange={setShowDownstream}
                  checkedChildren="Downstream"
                  unCheckedChildren="Downstream"
                />
              </Space>

              <Space>
                <Tooltip title={`How many levels of dependencies to show. Current service has ${totalDependencies} direct dependencies.`}>
                  <Text style={{ fontSize: '12px' }}>Depth:</Text>
                </Tooltip>
                <Slider
                  style={{ width: '80px' }}
                  min={1}
                  max={dynamicMaxDepth}
                  value={maxDepth}
                  onChange={setMaxDepth}
                  tooltip={{ formatter: (value) => `${value || 1} level${(value || 1) > 1 ? 's' : ''}` }}
                />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {maxDepth}/{dynamicMaxDepth} level{maxDepth > 1 ? 's' : ''}
                </Text>
              </Space>
            </div>

            {/* Filtering Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <Space>
                <FilterOutlined style={{ fontSize: '12px', color: '#1890ff' }} />
                <Text strong style={{ fontSize: '13px' }}>Filter by:</Text>
                <Select
                  size="small"
                  value={filterBy}
                  onChange={setFilterBy}
                  style={{ width: '100px' }}
                >
                  <Option value="all">All</Option>
                  <Option value="environment">Environment</Option>
                  <Option value="team">Team</Option>
                </Select>
              </Space>

              {filterBy === 'environment' && (
                <Select
                  size="small"
                  placeholder="Select environment"
                  value={selectedEnvironment}
                  onChange={setSelectedEnvironment}
                  allowClear
                  style={{ width: '140px' }}
                >
                  {environments.map(env => (
                    <Option key={env} value={env}>{env}</Option>
                  ))}
                </Select>
              )}

              {filterBy === 'team' && (
                <Select
                  size="small"
                  placeholder="Select team"
                  value={selectedTeam}
                  onChange={setSelectedTeam}
                  allowClear
                  style={{ width: '120px' }}
                >
                  {teams.map(team => (
                    <Option key={team} value={team}>{team}</Option>
                  ))}
                </Select>
              )}
            </div>
          </Space>
        </div>

        {/* Graph Container */}
        {totalDependencies === 0 ? (
          <div style={{
            height: focusMode ? '320px' : '400px', 
            border: "1px solid #d9d9d9", 
            borderRadius: '6px',
            backgroundColor: '#fafafa',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }}>
              🔵
            </div>
            <Text style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
              {service.name}
            </Text>
            <Text type="secondary" style={{ fontSize: '14px', marginBottom: '16px' }}>
              This service has no detected dependencies
            </Text>
            <Text type="secondary" style={{ fontSize: '12px', maxWidth: '300px' }}>
              Dependencies are detected through OpenTelemetry traces. This service may be:
              • An isolated service
              • A new service without telemetry data
              • Operating independently
            </Text>
          </div>
        ) : (
          <div
            ref={graphRef}
            style={{ 
              height: focusMode ? '320px' : '400px', 
              border: "1px solid #d9d9d9", 
              borderRadius: '6px',
              backgroundColor: '#fafafa'
            }}
          />
        )}

        {/* Legend */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          gap: '24px', 
          flexWrap: 'wrap',
          padding: '8px',
          backgroundColor: '#f9f9f9',
          borderRadius: '4px',
          border: '1px solid #f0f0f0'
        }}>
          <Space>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              backgroundColor: '#1890ff' 
            }} />
            <Text style={{ fontSize: '12px' }}>Central Service</Text>
          </Space>
          <Space>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              backgroundColor: '#52c41a' 
            }} />
            <Text style={{ fontSize: '12px' }}>Upstream (Dependencies)</Text>
          </Space>
          <Space>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              backgroundColor: '#faad14' 
            }} />
            <Text style={{ fontSize: '12px' }}>Downstream (Dependents)</Text>
          </Space>
        </div>

        {/* Summary Stats */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-around', 
          alignItems: 'center',
          padding: '8px',
          backgroundColor: '#f6ffed',
          borderRadius: '4px',
          border: '1px solid #b7eb8f'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a' }}>
              {dependencies.outgoing.length}
            </div>
            <div style={{ fontSize: '11px', color: '#8c8c8c' }}>Upstream</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
              1
            </div>
            <div style={{ fontSize: '11px', color: '#8c8c8c' }}>Central</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#faad14' }}>
              {dependencies.incoming.length}
            </div>
            <div style={{ fontSize: '11px', color: '#8c8c8c' }}>Downstream</div>
          </div>
        </div>
      </Space>
    </Card>
  );
};