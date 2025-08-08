import React, { useMemo } from 'react';
import { Card, Typography, Space, Row, Col, Tag, Progress, Tooltip, Empty, Divider, Alert } from 'antd';
import { 
  SettingOutlined, 
  FlagOutlined,
  EnvironmentOutlined,
  DatabaseOutlined,
  SecurityScanOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  ApiOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  BugOutlined
} from '@ant-design/icons';
import type { ServiceDetailResponse } from '../../types';

const { Text, Title } = Typography;

interface ServiceConfigurationCardProps {
  serviceData: ServiceDetailResponse;
}

interface ConfigurationItem {
  key: string;
  value: string;
  category: 'database' | 'auth' | 'feature' | 'performance' | 'network' | 'monitoring' | 'other';
  type: 'env_var' | 'feature_flag' | 'endpoint' | 'credential' | 'setting' | 'metadata';
  required: boolean;
  sensitive: boolean;
}

export const ServiceConfigurationCard: React.FC<ServiceConfigurationCardProps> = ({ serviceData }) => {
  const { service } = serviceData;
  
  // Parse and categorize configuration from service tags
  const configurations = useMemo(() => {
    const configs: ConfigurationItem[] = [];
    
    Object.entries(service.tags).forEach(([key, value]) => {
      let category: ConfigurationItem['category'] = 'other';
      let type: ConfigurationItem['type'] = 'metadata';
      let required = false;
      let sensitive = false;
      
      const keyLower = key.toLowerCase();
      const valueLower = value.toLowerCase();
      
      // Categorize by key patterns
      if (keyLower.includes('db') || keyLower.includes('database') || keyLower.includes('sql') || keyLower.includes('mongo')) {
        category = 'database';
        type = 'setting';
        required = true;
      } else if (keyLower.includes('auth') || keyLower.includes('token') || keyLower.includes('key') || keyLower.includes('secret')) {
        category = 'auth';
        type = 'credential';
        required = true;
        sensitive = true;
      } else if (keyLower.includes('feature') || keyLower.includes('flag') || keyLower.includes('enable') || keyLower.includes('disable')) {
        category = 'feature';
        type = 'feature_flag';
        required = false;
      } else if (keyLower.includes('timeout') || keyLower.includes('cache') || keyLower.includes('pool') || keyLower.includes('limit')) {
        category = 'performance';
        type = 'setting';
        required = false;
      } else if (keyLower.includes('host') || keyLower.includes('port') || keyLower.includes('url') || keyLower.includes('endpoint')) {
        category = 'network';
        type = 'endpoint';
        required = true;
      } else if (keyLower.includes('log') || keyLower.includes('metric') || keyLower.includes('trace') || keyLower.includes('monitor')) {
        category = 'monitoring';
        type = 'setting';
        required = false;
      }
      
      // Check for environment variable patterns
      if (keyLower.includes('_') && keyLower === keyLower.toUpperCase()) {
        type = 'env_var';
      }
      
      // Check for boolean feature flags
      if (valueLower === 'true' || valueLower === 'false' || valueLower === 'enabled' || valueLower === 'disabled') {
        type = 'feature_flag';
        category = 'feature';
      }
      
      configs.push({
        key,
        value,
        category,
        type,
        required,
        sensitive
      });
    });
    
    return configs;
  }, [service.tags]);
  
  // Group configurations by category
  const configurationsByCategory = useMemo(() => {
    const grouped = configurations.reduce((acc, config) => {
      if (!acc[config.category]) {
        acc[config.category] = [];
      }
      acc[config.category].push(config);
      return acc;
    }, {} as Record<string, ConfigurationItem[]>);
    
    return grouped;
  }, [configurations]);
  
  // Calculate configuration health metrics
  const configHealth = useMemo(() => {
    const totalConfigs = configurations.length;
    const requiredConfigs = configurations.filter(c => c.required);
    const sensitiveConfigs = configurations.filter(c => c.sensitive);
    const featureFlags = configurations.filter(c => c.type === 'feature_flag');
    
    // Check for common required configurations
    const hasDbConfig = configurations.some(c => c.category === 'database');
    const hasNetworkConfig = configurations.some(c => c.category === 'network');
    const hasAuthConfig = configurations.some(c => c.category === 'auth');
    const hasMonitoringConfig = configurations.some(c => c.category === 'monitoring');
    
    const completenessScore = [hasDbConfig, hasNetworkConfig, hasAuthConfig, hasMonitoringConfig]
      .filter(Boolean).length * 25;
    
    const healthLevel = completenessScore >= 75 ? 'Excellent' : 
                      completenessScore >= 50 ? 'Good' : 
                      completenessScore >= 25 ? 'Basic' : 'Incomplete';
    
    return {
      totalConfigs,
      requiredConfigs: requiredConfigs.length,
      sensitiveConfigs: sensitiveConfigs.length,
      featureFlags: featureFlags.length,
      completenessScore,
      healthLevel,
      hasDbConfig,
      hasNetworkConfig,
      hasAuthConfig,
      hasMonitoringConfig
    };
  }, [configurations]);
  
  // Get category icon and color
  const getCategoryStyle = (category: string) => {
    switch (category) {
      case 'database':
        return { icon: <DatabaseOutlined />, color: '#52c41a', name: 'Database' };
      case 'auth':
        return { icon: <SecurityScanOutlined />, color: '#ff4d4f', name: 'Authentication' };
      case 'feature':
        return { icon: <FlagOutlined />, color: '#1890ff', name: 'Feature Flags' };
      case 'performance':
        return { icon: <ThunderboltOutlined />, color: '#faad14', name: 'Performance' };
      case 'network':
        return { icon: <GlobalOutlined />, color: '#722ed1', name: 'Network' };
      case 'monitoring':
        return { icon: <BugOutlined />, color: '#13c2c2', name: 'Monitoring' };
      default:
        return { icon: <SettingOutlined />, color: '#8c8c8c', name: 'Other' };
    }
  };
  
  // Get type badge style
  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'env_var': return { color: 'blue', text: 'ENV' };
      case 'feature_flag': return { color: 'green', text: 'FLAG' };
      case 'endpoint': return { color: 'purple', text: 'URL' };
      case 'credential': return { color: 'red', text: 'AUTH' };
      case 'setting': return { color: 'orange', text: 'CONFIG' };
      default: return { color: 'default', text: 'META' };
    }
  };
  
  // Mask sensitive values
  const formatValue = (config: ConfigurationItem) => {
    if (config.sensitive) {
      return '••••••••';
    }
    if (config.value.length > 50) {
      return config.value.substring(0, 47) + '...';
    }
    return config.value;
  };
  
  return (
    <Card 
      title={
        <Space>
          <SettingOutlined style={{ color: '#1890ff' }} />
          <span>Service Configuration</span>
          <Tag color={configHealth.completenessScore >= 75 ? 'green' : configHealth.completenessScore >= 50 ? 'blue' : 'orange'}>
            {configHealth.healthLevel}
          </Tag>
        </Space>
      }
      size="small"
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* Configuration Health Overview */}
        <div style={{
          padding: '16px',
          backgroundColor: '#fafafa',
          borderRadius: '6px',
          border: '1px solid #f0f0f0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <Text strong style={{ fontSize: '14px' }}>Configuration Health</Text>
            <Text style={{ 
              fontSize: '12px', 
              color: configHealth.completenessScore >= 75 ? '#52c41a' : 
                     configHealth.completenessScore >= 50 ? '#1890ff' : '#faad14'
            }}>
              {configHealth.completenessScore}% Complete
            </Text>
          </div>
          
          <Progress 
            percent={configHealth.completenessScore} 
            showInfo={false}
            strokeColor={configHealth.completenessScore >= 75 ? '#52c41a' : 
                        configHealth.completenessScore >= 50 ? '#1890ff' : '#faad14'}
            trailColor="#f0f0f0"
            size="small"
            style={{ marginBottom: '12px' }}
          />
          
          <Row gutter={[16, 8]}>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
                  {configHealth.totalConfigs}
                </div>
                <div style={{ fontSize: '10px', color: '#8c8c8c' }}>Total</div>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#faad14' }}>
                  {configHealth.requiredConfigs}
                </div>
                <div style={{ fontSize: '10px', color: '#8c8c8c' }}>Required</div>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ff4d4f' }}>
                  {configHealth.sensitiveConfigs}
                </div>
                <div style={{ fontSize: '10px', color: '#8c8c8c' }}>Sensitive</div>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a' }}>
                  {configHealth.featureFlags}
                </div>
                <div style={{ fontSize: '10px', color: '#8c8c8c' }}>Features</div>
              </div>
            </Col>
          </Row>
        </div>
        
        {/* Configuration Coverage */}
        <div>
          <Text strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>
            Configuration Coverage
          </Text>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '8px'
          }}>
            {[
              { key: 'hasDbConfig', label: 'Database', icon: <DatabaseOutlined />, color: '#52c41a' },
              { key: 'hasNetworkConfig', label: 'Network', icon: <GlobalOutlined />, color: '#722ed1' },
              { key: 'hasAuthConfig', label: 'Authentication', icon: <SecurityScanOutlined />, color: '#ff4d4f' },
              { key: 'hasMonitoringConfig', label: 'Monitoring', icon: <BugOutlined />, color: '#13c2c2' }
            ].map(item => {
              const hasConfig = configHealth[item.key as keyof typeof configHealth] as boolean;
              return (
                <div key={item.key} style={{
                  padding: '8px',
                  backgroundColor: hasConfig ? '#f6ffed' : '#fff2f0',
                  borderRadius: '4px',
                  border: `1px solid ${hasConfig ? '#b7eb8f' : '#ffccc7'}`,
                  textAlign: 'center'
                }}>
                  <div style={{ marginBottom: '4px' }}>
                    {React.cloneElement(item.icon, { 
                      style: { color: hasConfig ? item.color : '#bfbfbf', fontSize: '16px' } 
                    })}
                  </div>
                  <Text style={{ 
                    fontSize: '11px', 
                    color: hasConfig ? '#52c41a' : '#ff4d4f',
                    fontWeight: 'bold'
                  }}>
                    {hasConfig ? 'Configured' : 'Missing'}
                  </Text>
                  <div style={{ fontSize: '10px', color: '#8c8c8c' }}>{item.label}</div>
                </div>
              );
            })}
          </div>
        </div>
        
        <Divider style={{ margin: '8px 0' }} />
        
        {/* Configuration Categories */}
        {Object.keys(configurationsByCategory).length > 0 ? (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {Object.entries(configurationsByCategory).map(([category, configs]) => {
              const categoryStyle = getCategoryStyle(category);
              
              return (
                <div key={category} style={{ marginBottom: '16px' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '8px',
                    padding: '8px',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '4px',
                    border: '1px solid #f0f0f0'
                  }}>
                    {React.cloneElement(categoryStyle.icon, { 
                      style: { color: categoryStyle.color, marginRight: '8px' } 
                    })}
                    <Text strong style={{ fontSize: '13px' }}>{categoryStyle.name}</Text>
                    <Tag style={{ marginLeft: '8px' }}>{configs.length}</Tag>
                  </div>
                  
                  <div style={{ paddingLeft: '16px' }}>
                    {configs.map(config => {
                      const typeStyle = getTypeStyle(config.type);
                      
                      return (
                        <div key={config.key} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px',
                          marginBottom: '4px',
                          backgroundColor: '#fafafa',
                          borderRadius: '4px',
                          border: '1px solid #f0f0f0'
                        }}>
                          <div style={{ flex: 1 }}>
                            <Space>
                              <Text code style={{ fontSize: '11px' }}>{config.key}</Text>
                              <Tag color={typeStyle.color} style={{ fontSize: '10px' }}>
                                {typeStyle.text}
                              </Tag>
                              {config.required && (
                                <Tooltip title="Required configuration">
                                  <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: '12px' }} />
                                </Tooltip>
                              )}
                              {config.sensitive && (
                                <Tooltip title="Sensitive data">
                                  <SecurityScanOutlined style={{ color: '#ff4d4f', fontSize: '12px' }} />
                                </Tooltip>
                              )}
                            </Space>
                          </div>
                          <div style={{ maxWidth: '200px' }}>
                            <Text style={{ fontSize: '11px', color: '#595959' }}>
                              {formatValue(config)}
                            </Text>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" size={4}>
                <Text style={{ color: '#8c8c8c', fontSize: '16px' }}>
                  No Configuration Found
                </Text>
                <Text type="secondary" style={{ fontSize: '14px' }}>
                  No configuration parameters detected in service tags
                </Text>
              </Space>
            }
          />
        )}
        
        {/* Configuration Recommendations */}
        {configHealth.completenessScore < 75 && (
          <Alert
            message="Configuration Recommendations"
            description={
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                {!configHealth.hasDbConfig && <li>Add database configuration tags</li>}
                {!configHealth.hasNetworkConfig && <li>Configure network endpoints and ports</li>}
                {!configHealth.hasAuthConfig && <li>Set up authentication configuration</li>}
                {!configHealth.hasMonitoringConfig && <li>Add monitoring and logging settings</li>}
              </ul>
            }
            type="info"
            showIcon
            style={{ fontSize: '12px' }}
          />
        )}
      </Space>
    </Card>
  );
};