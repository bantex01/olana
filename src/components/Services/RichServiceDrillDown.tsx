import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Typography, Button, Modal } from 'antd';
import { ExpandOutlined } from '@ant-design/icons';
import { ServiceMap } from '../ServiceMap/ServiceMap';
import { AlertTimeChart } from '../Dashboard/AlertTimeChart';
import { ThemedExpandedAlerts } from './ThemedExpandedAlerts';
import { ServiceDetailsPanel } from './ServiceDetailsPanel';
import { useFilterState } from '../../hooks/useFilterState';
import { useServiceMapData } from '../../hooks/useServiceMapData';
import type { ServiceGroup } from '../../types';

const { Title } = Typography;

interface RichServiceDrillDownProps {
  serviceGroup: ServiceGroup;
}

export const RichServiceDrillDown: React.FC<RichServiceDrillDownProps> = ({ 
  serviceGroup
}) => {
  // Use global filter state (same as Mission Control)
  const { state: filterState, actions: filterActions } = useFilterState();
  
  // Use reusable service map data hook (EXACT same as Mission Control)
  const { data, serviceMapData, fetchData, refreshData } = useServiceMapData();

  // EXACT same fetch logic as Mission Control BUT scope to this service's namespace
  const memoizedFetchData = useCallback(async () => {
    // Extract namespace from serviceKey (format: "namespace::service")
    const serviceNamespace = serviceGroup.serviceKey.split('::')[0];
    
    const filters = {
      // ALWAYS include the service's namespace for proper contextual filtering
      namespaces: [serviceNamespace],
      severities: filterState.selectedSeverities.length > 0 ? filterState.selectedSeverities : undefined,
      tags: filterState.selectedTags.length > 0 ? filterState.selectedTags : undefined,
      search: filterState.searchTerm.trim() !== '' ? filterState.searchTerm.trim() : undefined,
    };
    const options = {
      includeDependentNamespaces: filterState.includeDependentNamespaces,
      showFullChain: filterState.showFullChain
    };
    
    console.log('[RichServiceDrillDown] Fetching data with options:', options);
    await fetchData(filters, options);
  }, [
    serviceGroup.serviceKey, // Add this since we're using it to extract namespace
    filterState.selectedSeverities, 
    filterState.selectedTags, 
    filterState.searchTerm, 
    filterState.includeDependentNamespaces, 
    filterState.showFullChain,
    fetchData
  ]);

  // Fetch data when filters change (EXACT same as Mission Control)
  useEffect(() => {
    memoizedFetchData();
  }, [memoizedFetchData]);

  // Filter to show only the target service and its dependencies (based on toggle settings)
  const getFilteredServiceMapData = () => {
    if (!serviceMapData || !serviceMapData.nodes || !serviceMapData.edges) {
      console.warn('[RichServiceDrillDown] No serviceMapData available');
      return { nodes: [], edges: [], alerts: [] };
    }

    const targetServiceId = serviceGroup.serviceKey;
    
    // If toggles are off, show only immediate dependencies (like before)
    if (!filterState.includeDependentNamespaces && !filterState.showFullChain) {
      const connectedNodeIds = new Set<string>();
      connectedNodeIds.add(targetServiceId);
      
      const relevantEdges = serviceMapData.edges.filter(edge => 
        edge.from === targetServiceId || edge.to === targetServiceId
      );
      
      relevantEdges.forEach(edge => {
        connectedNodeIds.add(edge.from);
        connectedNodeIds.add(edge.to);
      });
      
      const filteredNodes = serviceMapData.nodes.filter(node => 
        connectedNodeIds.has(node.id)
      );
      
      return {
        nodes: filteredNodes,
        edges: relevantEdges,
        alerts: serviceMapData.allAlerts || []
      };
    }
    
    // If toggles are on, use the full API response (which already has the expanded data)
    return {
      nodes: serviceMapData.nodes,
      edges: serviceMapData.edges,
      alerts: serviceMapData.allAlerts || []
    };
  };

  const { nodes: filteredNodes, edges: filteredEdges, alerts: filteredAlerts } = getFilteredServiceMapData();

  // State for service map modal
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);

  return (
    <div style={{
      backgroundColor: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderTop: 'none',
      borderRadius: '0 0 6px 6px',
      marginTop: '-1px',
      padding: '20px'
    }}>
      
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <Title level={4} style={{ 
          margin: 0, 
          color: 'var(--text-primary)',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '12px'
        }}>
          🔍 Service Deep Dive: {serviceGroup.serviceKey}
        </Title>
      </div>

      {/* Three Column Layout - Left, Center, Right */}
      <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
        
        {/* Left Panel - Service Alerts */}
        <Col span={8}>
          <Card 
            title="Service Alerts" 
            size="small"
            style={{ 
              height: '400px', 
              overflow: 'auto',
              backgroundColor: 'var(--bg-primary)'
            }}
            styles={{ body: { padding: '12px' } }}
          >
            <ThemedExpandedAlerts serviceGroup={serviceGroup} />
          </Card>
        </Col>

        {/* Center Panel - Service Topology Map */}
        <Col span={8}>
          <Card 
            title="Service Dependencies" 
            size="small"
            style={{ 
              height: '400px',
              backgroundColor: 'var(--bg-primary)'
            }}
            styles={{ body: { padding: '8px' } }}
            extra={
              <Button
                type="text"
                size="small"
                icon={<ExpandOutlined />}
                onClick={() => setIsMapModalVisible(true)}
                style={{ color: 'var(--accent-primary)' }}
              >
                Expand
              </Button>
            }
          >
            <ServiceMap
              alerts={filteredAlerts}
              nodes={filteredNodes}
              edges={filteredEdges}
              loading={data.loading}
              totalServices={data.systemHealth.totalServices}
              lastUpdated={new Date()}
              includeDependentNamespaces={filterState.includeDependentNamespaces}
              showFullChain={filterState.showFullChain}
              config={{
                height: '320px',
                showControls: false,
                showHeader: false,
                showLegend: false,
                enableFocusMode: false,
                enableRefresh: false,
                defaultLayout: 'hierarchical'
              }}
            />
          </Card>
        </Col>

        {/* Right Panel - Service Details */}
        <Col span={8}>
          <Card 
            title="Service Details" 
            size="small"
            style={{ 
              height: '400px', 
              overflow: 'auto',
              backgroundColor: 'var(--bg-primary)'
            }}
            styles={{ body: { padding: '12px' } }}
          >
            <ServiceDetailsPanel serviceGroup={serviceGroup} />
          </Card>
        </Col>

      </Row>

      {/* Bottom Panel - Alert Timeline */}
      <Row>
        <Col span={24}>
          <Card 
            title="Alert Timeline" 
            size="small"
            style={{ 
              backgroundColor: 'var(--bg-primary)',
              height: '280px'
            }}
            styles={{ 
              body: { 
                padding: '12px',
                height: '220px',
                overflow: 'hidden'
              }
            }}
          >
            <div style={{ 
              height: '100%',
              width: '100%',
              overflow: 'hidden'
            }}>
              <AlertTimeChart loading={false} />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Full-Screen Service Map Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Service Dependencies: {serviceGroup.serviceKey}</span>
          </div>
        }
        open={isMapModalVisible}
        onCancel={() => setIsMapModalVisible(false)}
        footer={null}
        width="100%"
        style={{ 
          top: 0,
          maxWidth: 'none',
          margin: 0,
          padding: 0
        }}
        styles={{
          body: {
            height: 'calc(100vh - 55px)', // Full height minus modal title
            padding: '8px',
            backgroundColor: 'var(--bg-primary)'
          }
        }}
        modalRender={(modal) => (
          <div style={{
            height: '100vh',
            width: '100vw',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}>
            {modal}
          </div>
        )}
      >
        <ServiceMap
          alerts={filteredAlerts}
          nodes={filteredNodes}
          edges={filteredEdges}
          loading={data.loading}
          totalServices={data.systemHealth.totalServices}
          lastUpdated={new Date()}
          includeDependentNamespaces={filterState.includeDependentNamespaces}
          showFullChain={filterState.showFullChain}
          onIncludeDependentNamespacesChange={(value) => {
            console.log('[RichServiceDrillDown] includeDependentNamespaces changed to:', value);
            filterActions.setIncludeDependentNamespaces(value);
          }}
          onShowFullChainChange={(value) => {
            console.log('[RichServiceDrillDown] showFullChain changed to:', value);
            filterActions.setShowFullChain(value);
          }}
          onRefresh={refreshData}
          config={{
            height: 'calc(100vh - 110px)', // Full viewport minus modal header and some padding
            showControls: true,
            showHeader: true,
            showLegend: true,
            enableFocusMode: true,
            enableRefresh: true,
            enableAutoRefresh: false,
            defaultLayout: 'hierarchical'
          }}
        />
      </Modal>

    </div>
  );
};