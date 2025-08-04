import React from 'react';
import { Row, Col, Card, Statistic, Progress, Alert, Tag } from 'antd';
import { 
  BugOutlined,
  DatabaseOutlined,
  ApiOutlined,
  TagsOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FireOutlined,
  WarningOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';

interface ServiceQualityMetricsProps {
  alerts: {
    services_with_alerts: number;
    critical_alerts: number;
    warning_alerts: number;
    fatal_alerts: number;
  };
  enrichment: {
    services_with_external_calls: number;
    services_with_db_calls: number;
    services_with_rpc_calls: number;
    total_services: number;
  };
  tags: {
    services_with_tags: number;
    alertmanager_created: number;
    tag_coverage: number;
    unique_tags: number;
  };
  totalServices: number;
}

export const ServiceQualityMetrics: React.FC<ServiceQualityMetricsProps> = ({
  alerts,
  enrichment,
  tags,
  totalServices
}) => {
  // Calculate percentages
  const alertPercentage = totalServices > 0 
    ? Math.round((alerts.services_with_alerts / totalServices) * 100) 
    : 0;
  
  const externalCallsPercentage = totalServices > 0 
    ? Math.round((enrichment.services_with_external_calls / totalServices) * 100) 
    : 0;
  
  const dbCallsPercentage = totalServices > 0 
    ? Math.round((enrichment.services_with_db_calls / totalServices) * 100) 
    : 0;
  
  const rpcCallsPercentage = totalServices > 0 
    ? Math.round((enrichment.services_with_rpc_calls / totalServices) * 100) 
    : 0;

  const instrumentationScore = Math.round((externalCallsPercentage + dbCallsPercentage + rpcCallsPercentage) / 3);
  
  // Color functions
  const getAlertColor = (count: number) => count === 0 ? '#52c41a' : '#ff4d4f';
  const getPercentageColor = (percentage: number) => {
    if (percentage >= 70) return '#52c41a';
    if (percentage >= 40) return '#faad14';
    return '#ff4d4f';
  };

  const totalActiveAlerts = alerts.fatal_alerts + alerts.critical_alerts + alerts.warning_alerts;

  return (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <CheckCircleOutlined style={{ marginRight: 8, color: '#52c41a' }} />
          Service Quality Metrics
        </div>
      }
      style={{ marginBottom: 24 }}
    >
      {/* Alert Health Row */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Services with Alerts"
              value={alerts.services_with_alerts}
              suffix={`/ ${totalServices}`}
              prefix={<BugOutlined />}
              valueStyle={{ color: getAlertColor(alerts.services_with_alerts) }}
            />
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
              {alertPercentage}% of total services
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Fatal Alerts"
              value={alerts.fatal_alerts}
              prefix={<FireOutlined />}
              valueStyle={{ color: alerts.fatal_alerts > 0 ? '#000' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Critical Alerts"
              value={alerts.critical_alerts}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: alerts.critical_alerts > 0 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Warning Alerts"
              value={alerts.warning_alerts}
              prefix={<WarningOutlined />}
              valueStyle={{ color: alerts.warning_alerts > 0 ? '#faad14' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Instrumentation Quality Row */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="External API Calls"
              value={enrichment.services_with_external_calls}
              prefix={<ApiOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <Progress 
              percent={externalCallsPercentage} 
              strokeColor="#1890ff"
              size="small"
              format={() => `${externalCallsPercentage}%`}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Database Calls"
              value={enrichment.services_with_db_calls}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress 
              percent={dbCallsPercentage} 
              strokeColor="#52c41a"
              size="small"
              format={() => `${dbCallsPercentage}%`}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="RPC Calls"
              value={enrichment.services_with_rpc_calls}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <Progress 
              percent={rpcCallsPercentage} 
              strokeColor="#722ed1"
              size="small"
              format={() => `${rpcCallsPercentage}%`}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Instrumentation Score"
              value={instrumentationScore}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: getPercentageColor(instrumentationScore) }}
            />
            <Progress 
              percent={instrumentationScore} 
              strokeColor={getPercentageColor(instrumentationScore)}
              size="small"
              showInfo={false}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tag Coverage Row */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Tag Coverage"
              value={tags.tag_coverage}
              suffix="%"
              prefix={<TagsOutlined />}
              valueStyle={{ color: getPercentageColor(tags.tag_coverage) }}
            />
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
              {tags.services_with_tags} of {totalServices} services have tags
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Unique Tags"
              value={tags.unique_tags}
              prefix={<TagsOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
              Total distinct tags across all services
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Auto-Created Services"
              value={tags.alertmanager_created}
              prefix={<BugOutlined />}
              valueStyle={{ color: tags.alertmanager_created > 0 ? '#faad14' : '#52c41a' }}
            />
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
              Services created from alerts
            </div>
          </Card>
        </Col>
      </Row>

      {/* Quality Insights */}
      <Row gutter={16}>
        <Col span={12}>
          <div style={{ 
            padding: 16, 
            backgroundColor: totalActiveAlerts === 0 ? '#f6ffed' : '#fff2f0', 
            borderRadius: 6,
            border: `1px solid ${totalActiveAlerts === 0 ? '#b7eb8f' : '#ffccc7'}`
          }}>
            <h4 style={{ 
              margin: '0 0 12px 0', 
              color: totalActiveAlerts === 0 ? '#52c41a' : '#ff4d4f' 
            }}>
              {totalActiveAlerts === 0 ? '✅ Alert Health' : '⚠️ Alert Health'}
            </h4>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              {totalActiveAlerts === 0 ? (
                <div>All services are healthy with no active alerts!</div>
              ) : (
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>{totalActiveAlerts}</strong> total active alerts across{' '}
                    <strong>{alerts.services_with_alerts}</strong> services
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {alerts.fatal_alerts > 0 && (
                      <Tag color="black">{alerts.fatal_alerts} Fatal</Tag>
                    )}
                    {alerts.critical_alerts > 0 && (
                      <Tag color="red">{alerts.critical_alerts} Critical</Tag>
                    )}
                    {alerts.warning_alerts > 0 && (
                      <Tag color="orange">{alerts.warning_alerts} Warning</Tag>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Col>
        <Col span={12}>
          <div style={{ 
            padding: 16, 
            backgroundColor: instrumentationScore >= 70 ? '#f6ffed' : '#fff7e6', 
            borderRadius: 6,
            border: `1px solid ${instrumentationScore >= 70 ? '#b7eb8f' : '#ffd591'}`
          }}>
            <h4 style={{ 
              margin: '0 0 12px 0', 
              color: instrumentationScore >= 70 ? '#52c41a' : '#fa8c16' 
            }}>
              📊 Instrumentation Quality
            </h4>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              <div style={{ marginBottom: 8 }}>
                <strong>Overall Score:</strong> {instrumentationScore}%
              </div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                {instrumentationScore >= 70 
                  ? 'Excellent! Most services have rich telemetry data.'
                  : instrumentationScore >= 40
                  ? 'Good coverage, but some services could use more instrumentation.'
                  : 'Consider improving telemetry instrumentation across services.'
                }
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Recommendations */}
      {(tags.alertmanager_created > 0 || tags.tag_coverage < 80 || instrumentationScore < 60) && (
        <Alert
          message="Service Quality Recommendations"
          description={
            <div>
              {tags.alertmanager_created > 0 && (
                <div>• {tags.alertmanager_created} services were auto-created from alerts - consider proper instrumentation</div>
              )}
              {tags.tag_coverage < 80 && (
                <div>• {100 - tags.tag_coverage}% of services lack proper tagging - add team/environment metadata</div>
              )}
              {instrumentationScore < 60 && (
                <div>• Low instrumentation score - enhance telemetry to capture external calls, DB operations, and RPC calls</div>
              )}
            </div>
          }
          type="info"
          showIcon
          style={{ marginTop: 16, backgroundColor: '#e6f7ff' }}
        />
      )}
    </Card>
  );
};