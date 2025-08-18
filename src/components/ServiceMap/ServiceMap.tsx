import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Typography, Space, Button, Switch, Select, Tooltip, theme, Modal } from 'antd';
import { ExpandOutlined, CompressOutlined, AimOutlined, ReloadOutlined, ClockCircleOutlined, WarningOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { Network, DataSet } from "vis-network/standalone/esm/vis-network";
import type { Alert as AlertType, Node, Edge } from '../../types';
import { logger } from '../../utils/logger';

const { Text } = Typography;
const { Option } = Select;

export interface ServiceMapConfig {
  height?: string;
  showControls?: boolean;
  showHeader?: boolean;
  showLegend?: boolean;
  enableFocusMode?: boolean;
  enableRefresh?: boolean;
  enableAutoRefresh?: boolean;
  defaultLayout?: 'hierarchical' | 'static' | 'clustered';
  defaultShowServices?: boolean;
  defaultShowNamespaces?: boolean;
}

export interface ServiceMapProps {
  alerts: AlertType[];
  nodes: Node[];
  edges: Edge[];
  loading?: boolean;
  totalServices?: number;
  lastUpdated?: Date;
  includeDependentNamespaces?: boolean;
  showFullChain?: boolean;
  config?: ServiceMapConfig;
  onRefresh?: () => void;
  onIncludeDependentNamespacesChange?: (include: boolean) => void;
  onShowFullChainChange?: (show: boolean) => void;
}

interface EnhancedNode extends Node {
  distance?: number;
  isHighlighted?: boolean;
  font?: any;
  title?: string;
  borderWidth?: number;
  shadow?: any;
}

interface EnhancedEdge extends Omit<Edge, 'dashes'> {
  arrows?: any;
  smooth?: any;
  shadow?: any;
  dashes?: boolean | number[];
}

export const ServiceMap: React.FC<ServiceMapProps> = ({ 
  alerts, 
  nodes, 
  edges, 
  loading = false, 
  totalServices = 0,
  lastUpdated,
  includeDependentNamespaces = false,
  showFullChain = false,
  config = {},
  onRefresh,
  onIncludeDependentNamespacesChange,
  onShowFullChainChange
}) => {
  const { token } = theme.useToken();
  
  // Apply default config
  const mapConfig: Required<ServiceMapConfig> = {
    height: '500px',
    showControls: true,
    showHeader: true,
    showLegend: true,
    enableFocusMode: true,
    enableRefresh: true,
    enableAutoRefresh: true,
    defaultLayout: 'static',
    defaultShowServices: true,
    defaultShowNamespaces: false,
    ...config
  };

  // Theme detection
  const isDarkTheme = token.colorBgContainer && (
    token.colorBgContainer.includes('#1') || 
    token.colorBgContainer.includes('#0') ||
    token.colorBgContainer === 'rgb(20, 20, 20)' ||
    parseInt(token.colorBgContainer.replace('#', ''), 16) < 0x808080
  );
  
  const graphRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const nodesDataSetRef = useRef<DataSet<EnhancedNode> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Interactive controls state
  const [showServices, setShowServices] = useState(mapConfig.defaultShowServices);
  const [showNamespaces, setShowNamespaces] = useState(mapConfig.defaultShowNamespaces);
  const [focusMode, setFocusMode] = useState(false);
  const [layoutStyle, setLayoutStyle] = useState<'hierarchical' | 'static' | 'clustered'>(mapConfig.defaultLayout);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(300);

  // Custom tooltip state
  const [customTooltip, setCustomTooltip] = useState<{
    visible: boolean;
    content: string;
    x: number;
    y: number;
  }>({ visible: false, content: '', x: 0, y: 0 });

  // Check if there are sufficient filters to safely use Show Full Chain
  const hasMinimalFilters = useCallback(() => {
    return nodes.length < 50;
  }, [nodes.length]);

  // Handle Show Full Chain toggle with warnings
  const handleShowFullChainChange = useCallback((checked: boolean) => {
    if (!onShowFullChainChange) return;
    
    if (checked && !hasMinimalFilters()) {
      Modal.confirm({
        title: (
          <span>
            <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
            Performance Warning
          </span>
        ),
        content: (
          <div>
            <p><strong>Show Full Chain</strong> may return a very large graph with many services.</p>
            <p>This works best when you have applied filters (namespaces, tags, etc.) to limit the scope.</p>
            <p>Continue anyway?</p>
          </div>
        ),
        onOk: () => {
          onShowFullChainChange(true);
        },
        onCancel: () => {
          // Do nothing - keep it disabled
        },
        okText: 'Continue',
        cancelText: 'Cancel'
      });
    } else {
      onShowFullChainChange(checked);
    }
  }, [hasMinimalFilters, onShowFullChainChange]);

  // Stop animation function
  const stopPulsingAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Process nodes with enhanced styling and alert information
  const processNodes = (): EnhancedNode[] => {
    return nodes
      .filter(node => {
        if (!showServices && node.nodeType === 'service') return false;
        if (!showNamespaces && node.nodeType === 'namespace') return false;
        return true;
      })
      .map(node => {
        const isService = node.nodeType === 'service';
        const alertCount = node.alertCount || 0;
        const severity = node.highestSeverity || 'none';
        
        // Enhanced color scheme
        const getNodeColor = () => {
          if (!isService) {
            return node.nodeType === 'namespace' ? '#8c8c8c' : '#1890ff';
          }
          
          const severityColors = {
            fatal: isDarkTheme ? '#8c8c8c' : '#000000',
            critical: '#ff4d4f',
            warning: '#faad14',
            none: '#52c41a'
          };
          
          return severityColors[severity as keyof typeof severityColors] || '#1890ff';
        };

        // Build tooltip content
        const buildTooltip = () => {
          const primaryTextColor = isDarkTheme ? '#ffffff' : '#262626';
          const secondaryTextColor = isDarkTheme ? '#a6adb4' : '#8c8c8c';
          const tertiaryTextColor = isDarkTheme ? '#8a919a' : '#595959';
          const tagBgColor = isDarkTheme ? '#424242' : '#f5f5f5';
          
          if (!isService) {
            return `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: ${primaryTextColor};">${node.label}</div>
                <div style="font-size: 12px; color: ${secondaryTextColor};">Type: ${node.nodeType}</div>
              </div>
            `;
          }

          const nodeAlerts = alerts.filter(alert => 
            `${alert.service_namespace}::${alert.service_name}` === node.id
          );

          let sectionsHtml = [];

          // Header section
          sectionsHtml.push(`
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: ${primaryTextColor};">
              ${node.label}
            </div>
          `);

          // Basic info section
          let basicInfo = [];
          if (node.team) basicInfo.push(`<strong>Team:</strong> ${node.team}`);
          if (node.environment) basicInfo.push(`<strong>Environment:</strong> ${node.environment}`);
          if (node.component_type) basicInfo.push(`<strong>Component:</strong> ${node.component_type}`);
          
          if (basicInfo.length > 0) {
            sectionsHtml.push(`
              <div style="font-size: 12px; color: ${tertiaryTextColor}; margin-bottom: 8px;">
                ${basicInfo.join('<br>')}
              </div>
            `);
          }

          // Tags section
          if (node.tags && node.tags.length > 0) {
            const tagsHtml = node.tags.map(tag => {
              const source = node.tagSources?.[tag];
              const sourceIcon = source === 'user' ? '👤' : 
                              source === 'alertmanager' ? '🚨' : 
                              source === 'otel' ? '📊' : '';
              return `<span style="background: ${tagBgColor}; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-right: 4px; color: ${tertiaryTextColor};">${tag} ${sourceIcon}</span>`;
            }).join('');
            
            sectionsHtml.push(`
              <div style="margin-bottom: 8px;">
                <div style="font-size: 12px; font-weight: 500; color: ${primaryTextColor}; margin-bottom: 4px;">Tags:</div>
                <div>${tagsHtml}</div>
              </div>
            `);
          }

          // Alerts section
          if (nodeAlerts.length > 0) {
            const alertsHtml = nodeAlerts.slice(0, 3).map(alert => {
              const severityColor = alert.severity === 'fatal' ? '#8c8c8c' :
                                  alert.severity === 'critical' ? '#ff4d4f' :
                                  alert.severity === 'warning' ? '#faad14' : '#52c41a';
              const instanceInfo = alert.instance_id ? ` (${alert.instance_id})` : '';
              const countInfo = alert.count && alert.count > 1 ? ` [x${alert.count}]` : '';
              return `<div style="font-size: 11px; color: ${tertiaryTextColor}; margin-bottom: 2px;">• <span style="color: ${severityColor}; font-weight: 600;">[${alert.severity.toUpperCase()}]</span> ${alert.message}${instanceInfo}${countInfo}</div>`;
            }).join('');
            
            sectionsHtml.push(`
              <div style="margin-bottom: 8px;">
                <div style="font-size: 12px; font-weight: 500; color: ${primaryTextColor}; margin-bottom: 4px;">Active Alerts (${nodeAlerts.length}):</div>
                ${alertsHtml}
                ${nodeAlerts.length > 3 ? `<div style="font-size: 11px; color: ${secondaryTextColor};">... and ${nodeAlerts.length - 3} more alerts</div>` : ''}
              </div>
            `);
          }

          return `
            <div style="
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 320px;
              line-height: 1.4;
            ">
              ${sectionsHtml.join('')}
            </div>
          `;
        };

        const nodeColor = getNodeColor();
        const alertLabel = alertCount > 0 ? `\n${alertCount} alert${alertCount > 1 ? 's' : ''}` : '';
        
        // Border configuration
        const getBorderConfig = () => {
          if (isService && severity === 'fatal' && isDarkTheme) {
            return {
              color: '#d9d9d9',
              width: 4
            };
          }
          return {
            color: undefined,
            width: isService && alertCount > 0 ? 3 : 2
          };
        };
        
        const borderConfig = getBorderConfig();

        return {
          ...node,
          label: isService ? `${node.label}${alertLabel}` : node.label,
          color: nodeColor,
          borderColor: borderConfig.color,
          shape: isService ? 'dot' : 'box',
          size: isService ? (focusMode ? 20 : 25) : (focusMode ? 15 : 20),
          font: { 
            size: focusMode ? 11 : 12, 
            color: isDarkTheme ? (isService ? '#a0a6b8' : '#ffffff') : '#ffffff',
            background: isService ? 'rgba(0, 0, 0, 0.8)' : 'transparent',
            strokeWidth: isService && alertCount > 0 ? 2 : 1, 
            strokeColor: nodeColor
          },
          borderWidth: borderConfig.width,
          shadow: {
            enabled: true,
            color: alertCount > 0 ? nodeColor : 'rgba(255, 255, 255, 0.2)',
            size: alertCount > 0 ? (severity === 'fatal' ? 16 : severity === 'critical' ? 14 : 12) : 6,
            x: 0,
            y: 0
          },
          chosen: alertCount > 0 ? {
            node: (values: any) => {
              values.shadowSize = Math.max(values.shadowSize, 15);
              values.shadowColor = nodeColor;
            }
          } : undefined,
          tooltipContent: buildTooltip()
        };
      });
  };

  // Process edges with enhanced styling
  const processEdges = (): EnhancedEdge[] => {
    return edges.map(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      
      const isServiceToService = fromNode?.nodeType === 'service' && toNode?.nodeType === 'service';
      const isServiceToNamespace = (fromNode?.nodeType === 'service' && toNode?.nodeType === 'namespace') ||
                                  (fromNode?.nodeType === 'namespace' && toNode?.nodeType === 'service');
      const isNamespaceToNamespace = fromNode?.nodeType === 'namespace' && toNode?.nodeType === 'namespace';
      
      let edgeColor, isDashed = false;
      
      if (isServiceToService) {
        edgeColor = isDarkTheme ? 'rgba(100, 200, 255, 0.8)' : '#2B7CE9';
        isDashed = false;
      } else if (isServiceToNamespace) {
        edgeColor = isDarkTheme ? 'rgba(180, 180, 180, 0.8)' : '#8c8c8c';
        isDashed = false;
      } else if (isNamespaceToNamespace) {
        edgeColor = isDarkTheme ? 'rgba(100, 200, 255, 0.8)' : '#2B7CE9';
        isDashed = true;
      } else {
        edgeColor = isDarkTheme ? 'rgba(100, 200, 255, 0.8)' : '#2B7CE9';
        isDashed = false;
      }
      
      return {
        ...edge,
        color: {
          color: edgeColor,
          highlight: '#00d4aa',
          hover: '#00d4aa'
        },
        width: focusMode ? 2 : 3,
        arrows: { 
          to: { 
            enabled: true, 
            scaleFactor: focusMode ? 1.0 : 1.3,
            color: edgeColor
          } 
        },
        smooth: {
          enabled: true,
          type: "continuous",
          roundness: 0.4
        },
        dashes: isDashed ? [5, 5] : false,
        shadow: {
          enabled: true,
          color: isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.1)',
          size: 1,
          x: 0,
          y: 0
        }
      };
    });
  };

  // Get layout configuration
  const getLayoutConfig = () => {
    switch (layoutStyle) {
      case 'hierarchical':
        return {
          hierarchical: {
            enabled: true,
            direction: "TB",
            sortMethod: "directed",
            nodeSpacing: focusMode ? 120 : 150,
            levelSeparation: focusMode ? 100 : 120,
            treeSpacing: focusMode ? 150 : 200,
            blockShifting: true,
            edgeMinimization: true,
            parentCentralization: true
          }
        };
      case 'static':
        return {
          randomSeed: 42,
          improvedLayout: true,
          clusterThreshold: 150
        };
      case 'clustered':
        return {
          randomSeed: 42,
          improvedLayout: true,
          clusterThreshold: 80
        };
      default:
        return {
          randomSeed: 42,
          improvedLayout: true
        };
    }
  };

  // Get physics configuration
  const getPhysicsConfig = () => {
    if (layoutStyle === 'hierarchical') {
      return {
        enabled: false,
        stabilization: { enabled: false }
      };
    }
    
    return {
      enabled: true,
      stabilization: {
        enabled: true,
        iterations: 100,
        updateInterval: 10
      },
      solver: 'repulsion',
      repulsion: {
        centralGravity: 0.1,
        springLength: focusMode ? 100 : 150,
        springConstant: 0.03,
        nodeDistance: focusMode ? 80 : 120,
        damping: 0.4
      },
      maxVelocity: 30,
      minVelocity: 0.1,
      timestep: 0.5
    };
  };

  // Animation system for pulsing nodes
  const startPulsingAnimation = useCallback(() => {
    if (!networkRef.current || !nodesDataSetRef.current) return;
    
    const animate = (timestamp: number) => {
      if (!nodesDataSetRef.current) return;
      
      const updates: { id: string; size: number; borderWidth: number }[] = [];
      const currentNodes = nodesDataSetRef.current.get();
      
      currentNodes.forEach(node => {
        const isService = node.nodeType === 'service';
        const alertCount = node.alertCount || 0;
        const severity = node.highestSeverity || 'none';
        
        if (isService && alertCount > 0) {
          const pulseRate = severity === 'fatal' ? 1000 : 
                           severity === 'critical' ? 2000 : 
                           severity === 'warning' ? 3000 : 0;
          
          if (pulseRate > 0) {
            const phase = (timestamp % pulseRate) / pulseRate;
            const pulseIntensity = (Math.sin(phase * 2 * Math.PI) + 1) / 2;
            
            const baseSize = focusMode ? 20 : 25;
            const pulsedSize = baseSize + (pulseIntensity * 5);
            
            const baseBorderWidth = (isService && severity === 'fatal' && isDarkTheme) ? 4 :
                                  (isService && alertCount > 0) ? 3 : 2;
            const pulsedBorderWidth = baseBorderWidth + (pulseIntensity * 1);
            
            updates.push({
              id: node.id,
              size: pulsedSize,
              borderWidth: pulsedBorderWidth
            });
          }
        }
      });
      
      if (updates.length > 0) {
        nodesDataSetRef.current!.update(updates);
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [focusMode, isDarkTheme]);

  // Render the enhanced graph
  const renderEnhancedGraph = () => {
    if (!graphRef.current) return;
    
    try {
      const processedNodes = processNodes();
      const processedEdges = processEdges();

      const nodesDataSet = new DataSet<EnhancedNode>(processedNodes);
      const edgesDataSet = new DataSet<EnhancedEdge>(processedEdges);
      
      const data = {
        nodes: nodesDataSet,
        edges: edgesDataSet,
      };
      
      nodesDataSetRef.current = nodesDataSet;

      const options = {
        nodes: {
          borderWidthSelected: 3,
          chosen: {
            node: (values: any, _id: any, selected: boolean, hovering: boolean) => {
              if (hovering || selected) {
                values.shadowSize = 20;
                values.shadowColor = 'rgba(255, 255, 255, 0.8)';
              }
            },
            label: false
          }
        },
        edges: {
          color: {
            color: isDarkTheme ? 'rgba(100, 200, 255, 0.8)' : '#2B7CE9',
            highlight: '#00d4aa',
            hover: '#00d4aa'
          },
          width: 2,
          smooth: {
            enabled: true,
            type: "continuous",
            roundness: 0.4
          }
        },
        configure: {
          enabled: false
        },
        layout: getLayoutConfig(),
        physics: getPhysicsConfig(),
        interaction: {
          hover: true,
          tooltipDelay: 200,
          hideEdgesOnDrag: false,
          hideNodesOnDrag: false
        }
      };

      if (networkRef.current) {
        networkRef.current.destroy();
      }

      const network = new Network(graphRef.current, data, options);
      networkRef.current = network;

      // Handle custom tooltip hover events
      network.on('hoverNode', (event) => {
        const nodeId = event.node;
        const node = nodesDataSetRef.current?.get(nodeId);
        if (node && (node as any).tooltipContent) {
          const { pointer } = event;
          const { DOM } = pointer;
          setCustomTooltip({
            visible: true,
            content: (node as any).tooltipContent,
            x: DOM.x + 10,
            y: DOM.y - 10
          });
        }
      });

      network.on('blurNode', () => {
        setCustomTooltip(prev => ({ ...prev, visible: false }));
      });

      network.on('dragStart', () => {
        setCustomTooltip(prev => ({ ...prev, visible: false }));
      });

      network.on('stabilizationIterationsDone', () => {
        if (layoutStyle !== 'hierarchical') {
          network.setOptions({
            physics: { enabled: false }
          });
        }
        
        setTimeout(() => {
          startPulsingAnimation();
        }, 1000);
      });

    } catch (error) {
      logger.error('Failed to render enhanced graph:', error);
    }
  };

  // Cleanup effects
  useEffect(() => {
    return () => {
      stopPulsingAnimation();
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
      nodesDataSetRef.current = null;
    };
  }, [isDarkTheme]);
  
  useEffect(() => {
    return () => {
      stopPulsingAnimation();
    };
  }, [stopPulsingAnimation]);

  // Re-render when dependencies change
  useEffect(() => {
    renderEnhancedGraph();
  }, [
    showServices, 
    showNamespaces, 
    focusMode,
    layoutStyle,
    nodes,
    edges,
    alerts,
    isDarkTheme
  ]);

  return (
    <div style={{ width: '100%' }}>
      {/* Header with controls */}
      {mapConfig.showHeader && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '16px',
          padding: '8px 0'
        }}>
          <Space>
            {lastUpdated && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Updated: {lastUpdated.toLocaleTimeString()}
              </Text>
            )}
          </Space>
          <Space>
            {mapConfig.enableRefresh && onRefresh && (
              <Tooltip title="Refresh data manually">
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={onRefresh}
                  loading={loading}
                >
                  Refresh
                </Button>
              </Tooltip>
            )}
            {mapConfig.enableFocusMode && (
              <Tooltip title="Toggle focus mode for cleaner view">
                <Button
                  size="small"
                  icon={focusMode ? <CompressOutlined /> : <ExpandOutlined />}
                  onClick={() => setFocusMode(!focusMode)}
                >
                  {focusMode ? 'Normal' : 'Focus'}
                </Button>
              </Tooltip>
            )}
            <Tooltip title="Fit graph to view">
              <Button
                size="small"
                icon={<AimOutlined />}
                onClick={() => {
                  if (networkRef.current && networkRef.current.fit) {
                    networkRef.current.fit({
                      animation: true
                    });
                  }
                }}
              >
                Fit
              </Button>
            </Tooltip>
          </Space>
        </div>
      )}

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* Interactive Controls */}
        {mapConfig.showControls && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: token.colorFillSecondary,
            borderRadius: token.borderRadius,
            border: `1px solid ${token.colorBorder}`
          }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {/* Visibility Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <Space>
                  <Text strong style={{ fontSize: '13px', color: token.colorText }}>Show:</Text>
                  <Switch
                    size="small"
                    checked={showServices}
                    onChange={setShowServices}
                    checkedChildren="Services"
                    unCheckedChildren="Services"
                  />
                  <Switch
                    size="small"
                    checked={showNamespaces}
                    onChange={setShowNamespaces}
                    checkedChildren="Namespaces"
                    unCheckedChildren="Namespaces"
                  />
                </Space>

                {onIncludeDependentNamespacesChange && (
                  <Space>
                    <Tooltip title="Shows direct namespace dependencies (works best with namespaces visible)">
                      <Text style={{ fontSize: '12px', color: token.colorText }}>Include dependent namespaces:</Text>
                    </Tooltip>
                    <Switch
                      size="small"
                      checked={includeDependentNamespaces}
                      onChange={onIncludeDependentNamespacesChange}
                      checkedChildren="On"
                      unCheckedChildren="Off"
                    />
                  </Space>
                )}

                {showNamespaces && onShowFullChainChange && (
                  <Space>
                    <Tooltip title="Shows complete interconnected service graph (may include many services)">
                      <Text style={{ fontSize: '12px', color: token.colorText }}>Show full chain:</Text>
                    </Tooltip>
                    <Switch
                      size="small"
                      checked={showFullChain}
                      onChange={handleShowFullChainChange}
                      checkedChildren="On"
                      unCheckedChildren="Off"
                    />
                  </Space>
                )}

                <Space>
                  <Text style={{ fontSize: '12px', color: token.colorText }}>Layout:</Text>
                  <Select
                    size="small"
                    value={layoutStyle}
                    onChange={setLayoutStyle}
                    style={{ width: '110px' }}
                  >
                    <Option value="static">Static</Option>
                    <Option value="hierarchical">Hierarchical</Option>
                    <Option value="clustered">Clustered</Option>
                  </Select>
                </Space>
              </div>

              {/* Auto-refresh Controls */}
              {mapConfig.enableAutoRefresh && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <Space>
                    <ClockCircleOutlined style={{ fontSize: '12px', color: '#1890ff' }} />
                    <Text strong style={{ fontSize: '13px', color: token.colorText }}>Auto-refresh:</Text>
                    <Switch
                      size="small"
                      checked={autoRefresh}
                      onChange={setAutoRefresh}
                      checkedChildren="On"
                      unCheckedChildren="Off"
                    />
                    {autoRefresh && (
                      <Select
                        size="small"
                        value={refreshInterval}
                        onChange={setRefreshInterval}
                        style={{ width: '100px' }}
                      >
                        <Option value={300}>5 min</Option>
                        <Option value={600}>10 min</Option>
                        <Option value={900}>15 min</Option>
                        <Option value={1800}>30 min</Option>
                      </Select>
                    )}
                  </Space>
                </div>
              )}
            </Space>
          </div>
        )}

        {/* Performance Warning for Large Result Sets */}
        {showFullChain && totalServices > 100 && (
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: '#fff7e6',
            borderRadius: token.borderRadius,
            border: '1px solid #ffd591',
            marginBottom: '12px'
          }}>
            <Space>
              <WarningOutlined style={{ color: '#fa8c16' }} />
              <Text style={{ fontSize: '12px', color: '#d46b08' }}>
                <strong>Large result set:</strong> Showing {totalServices} services from full chain expansion. 
                Consider applying filters for better performance.
              </Text>
            </Space>
          </div>
        )}

        {/* Graph Container */}
        {totalServices === 0 ? (
          <div style={{
            height: mapConfig.height, 
            border: "1px solid #d9d9d9", 
            borderRadius: token.borderRadius,
            backgroundColor: token.colorBgContainer,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }}>
              🔍
            </div>
            <Text style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
              No Services Found
            </Text>
            <Text type="secondary" style={{ fontSize: '14px', marginBottom: '16px' }}>
              Try adjusting your filters to see services
            </Text>
          </div>
        ) : (
          <div
            key={`graph-${isDarkTheme}`}
            ref={graphRef}
            className={`service-map-container ${focusMode ? 'focus-mode' : ''}`}
            style={{ 
              height: mapConfig.height,
              position: 'relative',
              background: isDarkTheme 
                ? 'linear-gradient(135deg, #0a0e27 0%, #1a1a2e 50%, #16213e 100%)'
                : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #f5f5f5 100%)',
              overflow: 'hidden',
              border: `1px solid ${token.colorBorder}`,
              borderRadius: token.borderRadius
            }}
          />
        )}

        {/* Enhanced Legend */}
        {mapConfig.showLegend && (
          <div style={{ 
            padding: '8px 16px',
            backgroundColor: token.colorFillSecondary,
            borderRadius: token.borderRadius,
            border: `1px solid ${token.colorBorder}`,
            marginBottom: '8px'
          }}>
            <Space size={24} wrap>
              <Text strong style={{ color: token.colorText }}>Legend:</Text>
              <Space>
                <span style={{ 
                  color: isDarkTheme ? 'rgba(100, 200, 255, 0.9)' : '#2B7CE9',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>━</span>
                <Text style={{ fontSize: '12px', color: token.colorText }}>Service Dependencies</Text>
              </Space>
              <Space>
                <span style={{ 
                  color: isDarkTheme ? 'rgba(100, 200, 255, 0.9)' : '#2B7CE9',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>┅</span>
                <Text style={{ fontSize: '12px', color: token.colorText }}>Namespace Dependencies</Text>
              </Space>
              <Space>
                <div style={{ 
                  width: '10px', 
                  height: '10px', 
                  borderRadius: '50%', 
                  backgroundColor: '#52c41a' 
                }} />
                <Text style={{ fontSize: '12px', color: token.colorText }}>Healthy</Text>
              </Space>
              <Space>
                <div style={{ 
                  width: '10px', 
                  height: '10px', 
                  borderRadius: '50%', 
                  backgroundColor: '#faad14' 
                }} />
                <Text style={{ fontSize: '12px', color: token.colorText }}>Warning</Text>
              </Space>
              <Space>
                <div style={{ 
                  width: '10px', 
                  height: '10px', 
                  borderRadius: '50%', 
                  backgroundColor: '#ff4d4f' 
                }} />
                <Text style={{ fontSize: '12px', color: token.colorText }}>Critical</Text>
              </Space>
              <Space>
                <div style={{ 
                  width: '10px', 
                  height: '10px', 
                  borderRadius: '50%', 
                  backgroundColor: '#8c8c8c' 
                }} />
                <Text style={{ fontSize: '12px', color: token.colorText }}>Fatal</Text>
              </Space>
              <Space>
                <div style={{ 
                  width: '10px', 
                  height: '10px', 
                  backgroundColor: '#8c8c8c' 
                }} />
                <Text style={{ fontSize: '12px', color: token.colorText }}>Namespaces</Text>
              </Space>
            </Space>
          </div>
        )}
      </Space>

      {/* Custom Styled Tooltip Overlay */}
      {customTooltip.visible && (
        <div
          style={{
            position: 'fixed',
            left: customTooltip.x,
            top: customTooltip.y,
            zIndex: 9999,
            pointerEvents: 'none',
            backgroundColor: token.colorBgElevated,
            border: `1px solid ${token.colorBorder}`,
            borderRadius: token.borderRadius,
            boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
            padding: '12px',
            maxWidth: '320px',
            fontSize: '14px',
            lineHeight: 1.5
          }}
          dangerouslySetInnerHTML={{ __html: customTooltip.content }}
        />
      )}
    </div>
  );
};