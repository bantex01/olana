import React, { useState, useCallback } from 'react';
import { Row, Col, Card, Typography, Button, Modal } from 'antd';
import { ExpandOutlined } from '@ant-design/icons';
import { ServiceMapEasy } from '../ServiceMap';
import { AlertTimeChart } from '../Dashboard/AlertTimeChart';
import { ThemedExpandedAlerts } from './ThemedExpandedAlerts';
import { ServiceDetailsPanel } from './ServiceDetailsPanel';
import { useFilterState } from '../../hooks/useFilterState';
import type { ServiceGroup } from '../../types';

const { Title } = Typography;

interface RichServiceDrillDownProps {
  serviceGroup: ServiceGroup;
}

export const RichServiceDrillDown: React.FC<RichServiceDrillDownProps> = ({ 
  serviceGroup
}) => {
  // Use reusable filter state hook
  const { state: filterState } = useFilterState();
  
  // Extract namespace from serviceKey (format: "namespace::service")
  const serviceNamespace = serviceGroup.serviceKey.split('::')[0];
  
  // Build filters for ServiceMapEasy - scoped to this service's namespace
  const serviceMapFilters = {
    // ALWAYS filter to this service's namespace for contextual view
    namespaces: [serviceNamespace],
    severities: filterState.selectedSeverities.length > 0 ? filterState.selectedSeverities : undefined,
    tags: filterState.selectedTags.length > 0 ? filterState.selectedTags : undefined,
    search: filterState.searchTerm.trim() !== '' ? filterState.searchTerm.trim() : undefined,
  };

  // Handle toggle changes (ServiceMapEasy handles data fetching automatically)
  const handleToggleChange = useCallback((_includeDependentNamespaces: boolean, _showFullChain: boolean) => {
    // ServiceMapEasy automatically handles data fetching when toggles change
  }, []);

  // State for service map modal
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);

  return (
    <div style={{
      backgroundColor: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderTop: 'none',
      borderRadius: '0 0 6px 6px',
      padding: '16px'
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

        {/* Center Panel - Service Dependencies Map */}
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
            {/* Using ServiceMapEasy instead of complex ServiceMap setup */}
            <ServiceMapEasy
              filters={serviceMapFilters}
              config={{
                height: '320px',
                showControls: false,
                showHeader: false,
                showLegend: false,
                enableFocusMode: false,
                enableRefresh: false,
                defaultLayout: 'hierarchical'
              }}
              onToggleChange={handleToggleChange}
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

      {/* Expanded Service Map Modal */}
      <Modal
        title={`Service Dependencies: ${serviceGroup.serviceKey}`}
        open={isMapModalVisible}
        onCancel={() => setIsMapModalVisible(false)}
        footer={null}
        width="90%"
        style={{ top: 20 }}
        styles={{
          body: {
            height: '70vh',
            padding: '16px'
          }
        }}
      >
        {/* Same ServiceMapEasy component but full-screen */}
        <ServiceMapEasy
          filters={serviceMapFilters}
          config={{
            height: 'calc(70vh - 60px)',
            showControls: true,
            showHeader: true,
            showLegend: true,
            enableFocusMode: true,
            enableRefresh: true,
            defaultLayout: 'hierarchical'
          }}
          onToggleChange={handleToggleChange}
        />
      </Modal>
    </div>
  );
};