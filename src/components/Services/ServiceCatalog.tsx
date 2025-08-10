import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Card, 
  Typography, 
  Input, 
  Select, 
  Space, 
  Row, 
  Col, 
  Button, 
  Tag, 
  Spin, 
  Alert, 
  Empty,
  Divider,
  Badge
} from 'antd';
import { 
  SearchOutlined, 
  FilterOutlined, 
  ClearOutlined, 
  ReloadOutlined,
  SelectOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import type { ServiceSummary, ServicesListResponse } from '../../types';
import { ServiceExpandableCard } from './ServiceExpandableCard';
import { API_BASE_URL } from '../../utils/api';
import { logger } from '../../utils/logger';

const { Title, Text } = Typography;
const { Option } = Select;

interface ServiceCatalogProps {
  onServiceSelect?: (namespace: string, name: string) => void;
}

interface ServiceCatalogFilters {
  search: string;
  environment: string | undefined;
  namespace: string | undefined;
  team: string | undefined;
}

export const ServiceCatalog: React.FC<ServiceCatalogProps> = ({ onServiceSelect }) => {
  // State for services data
  const [servicesData, setServicesData] = useState<ServicesListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for filtering
  const [filters, setFilters] = useState<ServiceCatalogFilters>({
    search: '',
    environment: undefined,
    namespace: undefined,
    team: undefined
  });
  
  // State for selected services and expansion
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  
  // Generate service key for identification
  const getServiceKey = useCallback((service: ServiceSummary) => {
    return `${service.namespace}/${service.name}`;
  }, []);

  // Fetch services data
  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const searchParams = new URLSearchParams();
      if (filters.search) searchParams.append('search', filters.search);
      if (filters.environment) searchParams.append('environment', filters.environment);
      if (filters.namespace) searchParams.append('namespace', filters.namespace);
      if (filters.team) searchParams.append('team', filters.team);

      const response = await fetch(`${API_BASE_URL}/services?${searchParams.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch services: ${response.status} ${response.statusText}`);
      }

      const data: ServicesListResponse = await response.json();
      setServicesData(data);
    } catch (err) {
      logger.error('Error fetching services:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial load and filter changes
  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // URL parameter persistence
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selectedParam = params.get('selected');
    if (selectedParam) {
      setSelectedServices(new Set(selectedParam.split(',')));
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (selectedServices.size > 0) {
      params.set('selected', Array.from(selectedServices).join(','));
    } else {
      params.delete('selected');
    }
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [selectedServices]);

  // Filter services
  const filteredServices = useMemo(() => {
    if (!servicesData?.services) return [];
    
    let filtered = [...servicesData.services];
    
    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(service => 
        service.name.toLowerCase().includes(searchLower) ||
        service.namespace.toLowerCase().includes(searchLower) ||
        service.team?.toLowerCase().includes(searchLower) ||
        Object.keys(service.tags).some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    return filtered;
  }, [servicesData, filters]);

  // Selected services data
  const selectedServicesData = useMemo(() => {
    if (!servicesData?.services) return [];
    return servicesData.services.filter(service => 
      selectedServices.has(getServiceKey(service))
    );
  }, [servicesData, selectedServices, getServiceKey]);

  // Event handlers
  const handleServiceSelect = (service: ServiceSummary) => {
    const serviceKey = getServiceKey(service);
    const newSelected = new Set(selectedServices);
    
    if (newSelected.has(serviceKey)) {
      newSelected.delete(serviceKey);
      // Also remove from expanded when deselected
      const newExpanded = new Set(expandedServices);
      newExpanded.delete(serviceKey);
      setExpandedServices(newExpanded);
    } else {
      newSelected.add(serviceKey);
    }
    
    setSelectedServices(newSelected);
  };

  const handleServiceRemove = (service: ServiceSummary) => {
    const serviceKey = getServiceKey(service);
    const newSelected = new Set(selectedServices);
    const newExpanded = new Set(expandedServices);
    
    newSelected.delete(serviceKey);
    newExpanded.delete(serviceKey);
    
    setSelectedServices(newSelected);
    setExpandedServices(newExpanded);
  };

  const handleToggleExpanded = (service: ServiceSummary) => {
    const serviceKey = getServiceKey(service);
    const newExpanded = new Set(expandedServices);
    
    if (newExpanded.has(serviceKey)) {
      newExpanded.delete(serviceKey);
    } else {
      newExpanded.add(serviceKey);
    }
    
    setExpandedServices(newExpanded);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      environment: undefined,
      namespace: undefined,
      team: undefined
    });
  };

  const handleClearSelection = () => {
    setSelectedServices(new Set());
    setExpandedServices(new Set());
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>
          <Text type="secondary">Loading service catalog...</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="Error Loading Service Catalog"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchServices}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              Service Catalog
            </Title>
            <Text type="secondary">
              Browse and monitor all discovered services. Select services to compare details side-by-side.
            </Text>
          </div>
          
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchServices}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        </div>

        {/* Filters */}
        <Card size="small" style={{ marginBottom: '16px' }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={8}>
                <Input
                  placeholder="Search services, namespaces, teams, or tags..."
                  prefix={<SearchOutlined />}
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  allowClear
                />
              </Col>
              
              <Col xs={24} sm={12} md={4}>
                <Select
                  placeholder="Environment"
                  value={filters.environment}
                  onChange={(value) => setFilters(prev => ({ ...prev, environment: value }))}
                  allowClear
                  style={{ width: '100%' }}
                >
                  {servicesData?.filters.environments.map(env => (
                    <Option key={env} value={env}>{env}</Option>
                  ))}
                </Select>
              </Col>
              
              <Col xs={24} sm={12} md={4}>
                <Select
                  placeholder="Namespace"
                  value={filters.namespace}
                  onChange={(value) => setFilters(prev => ({ ...prev, namespace: value }))}
                  allowClear
                  style={{ width: '100%' }}
                >
                  {servicesData?.filters.namespaces.map(ns => (
                    <Option key={ns} value={ns}>{ns}</Option>
                  ))}
                </Select>
              </Col>
              
              <Col xs={24} sm={12} md={4}>
                <Select
                  placeholder="Team"
                  value={filters.team}
                  onChange={(value) => setFilters(prev => ({ ...prev, team: value }))}
                  allowClear
                  style={{ width: '100%' }}
                >
                  {servicesData?.filters.teams.map(team => (
                    <Option key={team} value={team}>{team}</Option>
                  ))}
                </Select>
              </Col>
              
              <Col xs={24} sm={24} md={4}>
                <Space>
                  <Button 
                    icon={<ClearOutlined />} 
                    onClick={handleClearFilters}
                    disabled={!filters.search && !filters.environment && !filters.namespace && !filters.team}
                  >
                    Clear Filters
                  </Button>
                </Space>
              </Col>
            </Row>
            
            {/* Filter Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space wrap>
                <Text type="secondary">
                  <AppstoreOutlined /> {filteredServices.length} services found
                </Text>
                {selectedServices.size > 0 && (
                  <Badge count={selectedServices.size} color="blue">
                    <Text type="secondary">
                      <SelectOutlined /> Selected for comparison
                    </Text>
                  </Badge>
                )}
              </Space>
              
              {selectedServices.size > 0 && (
                <Button 
                  size="small" 
                  onClick={handleClearSelection}
                  icon={<ClearOutlined />}
                >
                  Clear Selection
                </Button>
              )}
            </div>
          </Space>
        </Card>
      </div>

      {/* Selected Services (Expandable Cards) */}
      {selectedServicesData.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ marginBottom: '16px' }}>
            <Title level={4} style={{ margin: 0, marginBottom: '8px' }}>
              Selected Services ({selectedServicesData.length})
            </Title>
            <Text type="secondary">
              Click expand to view detailed information for each service. Compare multiple services side-by-side.
            </Text>
          </div>
          
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '16px', 
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            {selectedServicesData.map(service => (
              <ServiceExpandableCard
                key={getServiceKey(service)}
                service={service}
                onRemove={() => handleServiceRemove(service)}
                expanded={expandedServices.has(getServiceKey(service))}
                onToggleExpanded={() => handleToggleExpanded(service)}
              />
            ))}
          </div>
          
          <Divider />
        </div>
      )}

      {/* Service List */}
      <div>
        <Title level={4} style={{ margin: 0, marginBottom: '16px' }}>
          All Services
        </Title>
        
        {filteredServices.length > 0 ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
            gap: '16px' 
          }}>
            {filteredServices.map(service => (
              <div key={getServiceKey(service)} style={{ position: 'relative' }}>
                <div
                  style={{
                    padding: '12px',
                    border: selectedServices.has(getServiceKey(service)) 
                      ? '2px solid #1890ff' 
                      : '2px solid transparent',
                    borderRadius: '8px',
                    backgroundColor: selectedServices.has(getServiceKey(service)) 
                      ? '#f0f8ff' 
                      : 'transparent',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div 
                    onClick={() => handleServiceSelect(service)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Card
                      hoverable
                      size="small"
                      style={{
                        border: 'none',
                        boxShadow: selectedServices.has(getServiceKey(service))
                          ? '0 4px 12px rgba(24, 144, 255, 0.15)'
                          : undefined
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div>
                              <Text strong>{service.name}</Text>
                              <div>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  {service.namespace}
                                </Text>
                              </div>
                            </div>
                            
                            {selectedServices.has(getServiceKey(service)) && (
                              <Tag color="blue" size="small">
                                <SelectOutlined /> Selected
                              </Tag>
                            )}
                          </div>
                          
                          <Space size="small" wrap>
                            {service.environment && (
                              <Tag size="small">{service.environment}</Tag>
                            )}
                            {service.team && (
                              <Tag size="small">{service.team}</Tag>
                            )}
                            {service.current_alert_count > 0 && (
                              <Tag color="red" size="small">
                                {service.current_alert_count} alerts
                              </Tag>
                            )}
                          </Space>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            description="No services found matching the current filters"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </div>
    </div>
  );
};