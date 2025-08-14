# SRE Service Dependency Mapping Tool - Design Specification

## Project Overview

**Purpose**: Real-time service dependency mapping tool using OpenTelemetry telemetry data with integrated Alertmanager alerts for SRE incident response and operational awareness.

**Tech Stack**: React 19 + TypeScript + Vite + Ant Design v5 + Cytoscape.js + Node.js + PostgreSQL

**Target Users**: SRE teams, DevOps engineers, operations staff during incident response and routine monitoring.

---

## Page 1: Homepage/Dashboard

### Page Purpose & User Goals
- **Primary Goal**: Provide immediate situational awareness of system health
- **Secondary Goals**: Quick access to active incidents, recent alerts, trending issues
- **User Context**: SRE logging in for shift handover, daily monitoring, or incident response

### Layout Structure

#### Header (Height: 64px)
```typescript
// Ant Design Layout.Header with custom styling
<Layout.Header className="dashboard-header">
  - Left: Company logo + "SRE Operations Center" (Typography.Title level={4})
  - Center: Global search (Input.Search, placeholder="Search services, alerts, or incidents...", width: 400px)
  - Right: 
    - Alert counter badge (Badge count with Notification bell icon)
    - User avatar dropdown (Avatar + Dropdown menu)
    - Theme toggle (Switch component)
</Layout.Header>
```

#### Sidebar Navigation (Width: 240px, collapsible to 80px)
```typescript
<Layout.Sider collapsible>
  <Menu mode="inline" defaultSelectedKeys={['dashboard']}>
    - Dashboard (HomeOutlined) - Active state
    - Alerts (AlertOutlined) - Badge with active count
    - Services (AppstoreOutlined) - Badge with unhealthy count
    - Dependencies (NodeIndexOutlined)
    - Incidents (ExclamationCircleOutlined) - Badge with open count
    - Reports (BarChartOutlined)
    - Settings (SettingOutlined)
  </Menu>
</Layout.Sider>
```

#### Main Content Area (24px padding, responsive grid)
```typescript
<Layout.Content className="dashboard-content">
  <Row gutter={[24, 24]}>
    // Top row - Key metrics
    <Col span={24}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}> // System Health Overview Card
        <Col xs={24} sm={12} md={6}> // Active Alerts Card  
        <Col xs={24} sm={12} md={6}> // Service Status Card
        <Col xs={24} sm={12} md={6}> // Performance Metrics Card
      </Row>
    </Col>
    
    // Middle row - Alert timeline and service map
    <Col xs={24} lg={16}> // Alert Timeline Component
    <Col xs={24} lg={8}>  // Mini Service Map Component
    
    // Bottom row - Recent activity and trends
    <Col xs={24} xl={12}> // Recent Incidents Table
    <Col xs={24} xl={12}> // Service Health Trends Chart
  </Row>
</Layout.Content>
```

### Specific UI Components

#### 1. System Health Overview Card
```typescript
<Card title="System Health" extra={<InfoCircleOutlined />} className="metric-card">
  <Statistic
    title="Overall Status"
    value="Healthy"
    valueStyle={{ color: '#52c41a' }}
    prefix={<CheckCircleOutlined />}
  />
  <Progress 
    percent={98.5} 
    status="active" 
    strokeColor="#52c41a"
    format={() => "98.5% Available"}
  />
  <div className="sub-metrics">
    <Text type="secondary">Services: 127/129 Healthy</Text>
    <Text type="secondary">Critical Paths: All Clear</Text>
  </div>
</Card>
```

#### 2. Active Alerts Card
```typescript
<Card 
  title="Active Alerts" 
  extra={<Button type="link" size="small">View All</Button>}
  className="alert-card"
>
  <Row gutter={16}>
    <Col span={8}>
      <Statistic title="Critical" value={3} valueStyle={{ color: '#ff4d4f' }} />
    </Col>
    <Col span={8}>
      <Statistic title="Warning" value={12} valueStyle={{ color: '#faad14' }} />
    </Col>
    <Col span={8}>
      <Statistic title="Info" value={28} valueStyle={{ color: '#1890ff' }} />
    </Col>
  </Row>
  <Button type="primary" block className="mt-3">
    Triage Alerts
  </Button>
</Card>
```

#### 3. Alert Timeline Component
```typescript
<Card title="Alert Timeline - Last 24 Hours" className="alert-timeline">
  <Timeline>
    {alerts.map(alert => (
      <Timeline.Item 
        key={alert.id}
        color={alert.severity === 'critical' ? 'red' : 'orange'}
        label={<Text type="secondary">{alert.timestamp}</Text>}
      >
        <div className="timeline-alert">
          <Text strong>{alert.service}</Text>
          <Tag color={alert.severityColor}>{alert.severity}</Tag>
          <div>{alert.description}</div>
          <Button type="link" size="small">Investigate →</Button>
        </div>
      </Timeline.Item>
    ))}
  </Timeline>
</Card>
```

#### 4. Mini Service Map Component
```typescript
<Card title="Service Dependencies" extra={<Button type="link">Full Map</Button>}>
  <div className="mini-map-container" style={{ height: 300 }}>
    // Cytoscape.js visualization with:
    // - Nodes: circles colored by health (green/yellow/red)
    // - Edges: arrows showing dependency direction
    // - Alert overlays: pulsing rings on affected services
    // - Click interactions: node click → service detail page
  </div>
  <div className="map-legend">
    <Space>
      <Tag color="success">Healthy</Tag>
      <Tag color="warning">Warning</Tag>
      <Tag color="error">Critical</Tag>
    </Space>
  </div>
</Card>
```

#### 5. Recent Incidents Table
```typescript
<Card title="Recent Incidents" extra={<Button type="link">View History</Button>}>
  <Table
    dataSource={recentIncidents}
    pagination={{ pageSize: 5, simple: true }}
    size="small"
    columns={[
      {
        title: 'Severity',
        dataIndex: 'severity',
        render: (severity) => <Tag color={severityColors[severity]}>{severity}</Tag>,
        width: 100
      },
      {
        title: 'Service',
        dataIndex: 'service',
        render: (text, record) => (
          <Button type="link" onClick={() => navigateToService(record.serviceId)}>
            {text}
          </Button>
        )
      },
      {
        title: 'Started',
        dataIndex: 'startTime',
        render: (time) => moment(time).fromNow()
      },
      {
        title: 'Status',
        dataIndex: 'status',
        render: (status) => <Badge status={statusBadge[status]} text={status} />
      }
    ]}
    onRow={(record) => ({
      onClick: () => navigateToIncident(record.id),
      className: 'clickable-row'
    })}
  />
</Card>
```

### Interactive Elements

#### Navigation Triggers
- **"Triage Alerts" button** → navigates to Alert Management Page with context: `{ source: 'dashboard', activeAlerts: true }`
- **Alert timeline "Investigate" links** → navigates to Service Detail Page with context: `{ alertId, serviceId, investigationMode: true }`
- **Mini service map nodes** → navigates to Service Detail Page with context: `{ serviceId, viewMode: 'dependencies' }`
- **"Full Map" button** → navigates to Service Dependency Map with context: `{ centerOn: null, showAllServices: true }`
- **Recent incidents table rows** → navigates to Investigation Workspace with context: `{ incidentId, services: relatedServiceIds }`

#### Hover States
- **Service health cards** → Tooltip showing detailed metrics: "127 healthy, 2 warning, 0 critical services"
- **Alert timeline items** → Popover with full alert details, affected services, and quick actions
- **Mini map nodes** → Tooltip with service name, status, and dependency count

### Data Display Details

#### Refresh Behavior
- **Auto-refresh interval**: 30 seconds for metrics, 10 seconds for active alerts
- **Manual refresh**: Button in header triggers full page refresh with loading states
- **Real-time updates**: WebSocket connection for new alerts (toast notifications)

#### Loading States
- **Initial page load**: Skeleton components for all cards
- **Metric updates**: Subtle loading spinners on individual cards
- **Chart loading**: Spin component overlay on visualization areas

---

## Page 2: Alert Management Page

### Page Purpose & User Goals
- **Primary Goal**: Triage and investigate active alerts efficiently
- **Secondary Goals**: Acknowledge alerts, assign ownership, escalate issues
- **User Context**: SRE responding to notifications, conducting alert review, shift handover

### Layout Structure

#### Header (Same as Dashboard)
```typescript
// Breadcrumb navigation added
<Breadcrumb className="page-breadcrumb">
  <Breadcrumb.Item><Link to="/dashboard">Dashboard</Link></Breadcrumb.Item>
  <Breadcrumb.Item>Alerts</Breadcrumb.Item>
</Breadcrumb>
```

#### Page Title Section
```typescript
<PageHeader
  title="Alert Management"
  subTitle={`${activeAlerts.length} active alerts requiring attention`}
  extra={[
    <Button key="refresh" icon={<ReloadOutlined />}>Refresh</Button>,
    <Button key="settings" icon={<SettingOutlined />}>Configure</Button>
  ]}
  tags={<Tag color="red">3 Critical</Tag>}
/>
```

#### Filter and Control Panel
```typescript
<Card className="alert-controls" bodyStyle={{ padding: 16 }}>
  <Row gutter={16} align="middle">
    <Col flex="auto">
      <Space wrap>
        <Select
          placeholder="Filter by Severity"
          mode="multiple"
          style={{ minWidth: 150 }}
          options={[
            { value: 'critical', label: 'Critical' },
            { value: 'warning', label: 'Warning' },
            { value: 'info', label: 'Info' }
          ]}
        />
        <Select
          placeholder="Filter by Service"
          mode="multiple"
          style={{ minWidth: 200 }}
          showSearch
          filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
        />
        <Select
          placeholder="Status"
          style={{ width: 120 }}
          options={[
            { value: 'all', label: 'All' },
            { value: 'new', label: 'New' },
            { value: 'acknowledged', label: 'Acknowledged' },
            { value: 'assigned', label: 'Assigned' }
          ]}
        />
        <RangePicker placeholder={['Start Date', 'End Date']} />
      </Space>
    </Col>
    <Col>
      <Space>
        <Button icon={<BulkActionOutlined />}>Bulk Actions</Button>
        <Button type="primary" icon={<PlusOutlined />}>Create Alert Rule</Button>
      </Space>
    </Col>
  </Row>
</Card>
```

#### Main Alert Table
```typescript
<Card className="alerts-table-container">
  <Table
    dataSource={filteredAlerts}
    loading={loading}
    scroll={{ x: 1200, y: 600 }}
    sticky={{ offsetHeader: 64 }}
    rowSelection={{
      type: 'checkbox',
      onChange: handleBulkSelection
    }}
    columns={[
      {
        title: 'Severity',
        dataIndex: 'severity',
        width: 100,
        fixed: 'left',
        render: (severity) => (
          <Badge 
            status={severityStatus[severity]} 
            text={severity.toUpperCase()}
            className={`severity-${severity}`}
          />
        ),
        filters: [
          { text: 'Critical', value: 'critical' },
          { text: 'Warning', value: 'warning' },
          { text: 'Info', value: 'info' }
        ],
        sorter: (a, b) => severityWeight[a.severity] - severityWeight[b.severity]
      },
      {
        title: 'Alert Name',
        dataIndex: 'name',
        width: 250,
        fixed: 'left',
        render: (text, record) => (
          <div>
            <Button 
              type="link" 
              className="alert-name-link"
              onClick={() => openAlertDetails(record.id)}
            >
              {text}
            </Button>
            <div className="alert-source">
              <Text type="secondary" size="small">{record.source}</Text>
            </div>
          </div>
        ),
        sorter: (a, b) => a.name.localeCompare(b.name)
      },
      {
        title: 'Affected Services',
        dataIndex: 'services',
        width: 200,
        render: (services) => (
          <div>
            {services.slice(0, 2).map(service => (
              <Tag key={service.id} className="service-tag">
                {service.name}
              </Tag>
            ))}
            {services.length > 2 && (
              <Tag>+{services.length - 2} more</Tag>
            )}
          </div>
        )
      },
      {
        title: 'Started',
        dataIndex: 'startTime',
        width: 150,
        render: (time) => (
          <div>
            <div>{moment(time).format('MMM DD, HH:mm')}</div>
            <Text type="secondary" size="small">
              {moment(time).fromNow()}
            </Text>
          </div>
        ),
        sorter: (a, b) => moment(b.startTime).valueOf() - moment(a.startTime).valueOf(),
        defaultSortOrder: 'descend'
      },
      {
        title: 'Duration',
        dataIndex: 'duration',
        width: 100,
        render: (_, record) => {
          const duration = moment.duration(moment().diff(record.startTime));
          const color = duration.asHours() > 1 ? 'red' : 'orange';
          return <Text type={color}>{duration.humanize()}</Text>;
        }
      },
      {
        title: 'Status',
        dataIndex: 'status',
        width: 120,
        render: (status, record) => {
          const statusConfig = {
            new: { color: 'red', text: 'New' },
            acknowledged: { color: 'orange', text: 'Acknowledged' },
            assigned: { color: 'blue', text: 'Assigned' },
            resolved: { color: 'green', text: 'Resolved' }
          };
          return <Tag color={statusConfig[status].color}>{statusConfig[status].text}</Tag>;
        }
      },
      {
        title: 'Assignee',
        dataIndex: 'assignee',
        width: 120,
        render: (assignee) => assignee ? (
          <div className="assignee-info">
            <Avatar size="small" src={assignee.avatar}>{assignee.name[0]}</Avatar>
            <Text className="assignee-name">{assignee.name}</Text>
          </div>
        ) : (
          <Button size="small" type="dashed">Assign</Button>
        )
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 150,
        fixed: 'right',
        render: (_, record) => (
          <Space size="small">
            <Tooltip title="Acknowledge">
              <Button 
                icon={<CheckOutlined />} 
                size="small"
                type={record.status === 'acknowledged' ? 'primary' : 'default'}
                onClick={() => acknowledgeAlert(record.id)}
              />
            </Tooltip>
            <Tooltip title="View Service">
              <Button 
                icon={<EyeOutlined />} 
                size="small"
                onClick={() => navigateToService(record.primaryService.id)}
              />
            </Tooltip>
            <Dropdown menu={{
              items: [
                { key: 'assign', label: 'Assign to Me', icon: <UserOutlined /> },
                { key: 'escalate', label: 'Escalate', icon: <ArrowUpOutlined /> },
                { key: 'snooze', label: 'Snooze', icon: <ClockCircleOutlined /> },
                { key: 'resolve', label: 'Mark Resolved', icon: <CheckCircleOutlined /> }
              ],
              onClick: ({ key }) => handleAlertAction(key, record)
            }}>
              <Button icon={<MoreOutlined />} size="small" />
            </Dropdown>
          </Space>
        )
      }
    ]}
    pagination={{
      total: totalAlerts,
      pageSize: 50,
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} alerts`
    }}
    onRow={(record) => ({
      onDoubleClick: () => openAlertDetails(record.id),
      className: `alert-row alert-row-${record.severity}`
    })}
  />
</Card>
```

### Interactive Elements

#### Alert Detail Modal
```typescript
<Modal
  title={
    <div className="alert-detail-header">
      <Badge status={severityStatus[selectedAlert.severity]} />
      <span className="alert-title">{selectedAlert.name}</span>
      <Tag color={severityColors[selectedAlert.severity]}>
        {selectedAlert.severity.toUpperCase()}
      </Tag>
    </div>
  }
  open={alertDetailVisible}
  width={800}
  footer={[
    <Button key="close">Close</Button>,
    <Button key="acknowledge" type="default" onClick={handleAcknowledge}>
      Acknowledge
    </Button>,
    <Button key="investigate" type="primary" onClick={handleInvestigate}>
      Start Investigation
    </Button>
  ]}
  onCancel={() => setAlertDetailVisible(false)}
>
  <Descriptions bordered column={2}>
    <Descriptions.Item label="Source">{selectedAlert.source}</Descriptions.Item>
    <Descriptions.Item label="Started">{selectedAlert.startTime}</Descriptions.Item>
    <Descriptions.Item label="Status">{selectedAlert.status}</Descriptions.Item>
    <Descriptions.Item label="Assignee">{selectedAlert.assignee || 'Unassigned'}</Descriptions.Item>
  </Descriptions>
  
  <Divider>Description</Divider>
  <Text>{selectedAlert.description}</Text>
  
  <Divider>Affected Services</Divider>
  <Space wrap>
    {selectedAlert.services.map(service => (
      <Button 
        key={service.id} 
        type="link"
        onClick={() => navigateToService(service.id, { fromAlert: selectedAlert.id })}
      >
        {service.name}
      </Button>
    ))}
  </Space>
  
  <Divider>Related Metrics</Divider>
  // Mini chart showing relevant metrics
</Modal>
```

#### Bulk Actions Dropdown
```typescript
<Dropdown 
  open={bulkMenuVisible}
  menu={{
    items: [
      { 
        key: 'acknowledge', 
        label: `Acknowledge (${selectedRows.length})`,
        icon: <CheckOutlined />,
        disabled: selectedRows.length === 0
      },
      { 
        key: 'assign', 
        label: `Assign to Me (${selectedRows.length})`,
        icon: <UserOutlined />,
        disabled: selectedRows.length === 0
      },
      { 
        key: 'escalate', 
        label: `Escalate (${selectedRows.length})`,
        icon: <ArrowUpOutlined />,
        disabled: selectedRows.length === 0
      }
    ],
    onClick: handleBulkAction
  }}
>
  <Button icon={<BulkActionOutlined />} disabled={selectedRows.length === 0}>
    Bulk Actions ({selectedRows.length})
  </Button>
</Dropdown>
```

### Navigation Triggers

- **Alert name links** → opens Alert Detail Modal with context: `{ alertId, previousPage: 'alerts' }`
- **"Start Investigation" button in modal** → navigates to Investigation Workspace with context: `{ alertId, relatedServices, investigationMode: true }`
- **Service tags in table** → navigates to Service Detail Page with context: `{ serviceId, fromAlert: alertId, showAlerts: true }`
- **"View Service" action button** → navigates to Service Detail Page with context: `{ serviceId, highlightAlert: alertId }`

### Context Preservation

```typescript
// Alert context passed between pages
interface AlertContext {
  alertId: string;
  severity: 'critical' | 'warning' | 'info';
  affectedServices: ServiceId[];
  startTime: string;
  source: 'dashboard' | 'notification' | 'direct';
  investigationStarted?: boolean;
}

// Stored in React Context or URL parameters for deep linking
const alertContext = useAlertContext();
```

---

## Page 3: Service Catalog/Overview

### Page Purpose & User Goals
- **Primary Goal**: Browse and monitor all services in the system
- **Secondary Goals**: Quickly assess service health, access service details, understand service relationships
- **User Context**: Regular health checks, service discovery, troubleshooting entry point

### Layout Structure

#### Page Header
```typescript
<PageHeader
  title="Service Catalog"
  subTitle={`${services.length} services monitored`}
  extra={[
    <Statistic 
      title="Healthy" 
      value={healthyCount} 
      valueStyle={{ color: '#52c41a' }}
      suffix={`/ ${services.length}`}
    />,
    <Button key="refresh" icon={<ReloadOutlined />}>Refresh</Button>,
    <Button key="add" type="primary" icon={<PlusOutlined />}>Add Service</Button>
  ]}
/>
```

#### Filter and View Controls
```typescript
<Card className="service-controls" bodyStyle={{ padding: 16 }}>
  <Row gutter={16} align="middle">
    <Col flex="auto">
      <Space wrap size="middle">
        <Input.Search
          placeholder="Search services..."
          style={{ width: 300 }}
          allowClear
          onSearch={handleServiceSearch}
        />
        <Select
          placeholder="Filter by Health"
          style={{ width: 150 }}
          options={[
            { value: 'all', label: 'All Services' },
            { value: 'healthy', label: 'Healthy' },
            { value: 'warning', label: 'Warning' },
            { value: 'critical', label: 'Critical' },
            { value: 'unknown', label: 'Unknown' }
          ]}
        />
        <Select
          placeholder="Environment"
          mode="multiple"
          style={{ width: 200 }}
          options={environments.map(env => ({ value: env, label: env }))}
        />
        <Select
          placeholder="Team/Owner"
          style={{ width: 150 }}
          showSearch
          options={teams.map(team => ({ value: team.id, label: team.name }))}
        />
        <Select
          placeholder="Technology"
          mode="multiple"
          style={{ width: 180 }}
          options={technologies.map(tech => ({ value: tech, label: tech }))}
        />
      </Space>
    </Col>
    <Col>
      <Radio.Group 
        value={viewMode} 
        onChange={(e) => setViewMode(e.target.value)}
        buttonStyle="solid"
      >
        <Radio.Button value="cards">
          <AppstoreOutlined /> Cards
        </Radio.Button>
        <Radio.Button value="table">
          <UnorderedListOutlined /> Table
        </Radio.Button>
        <Radio.Button value="map">
          <NodeIndexOutlined /> Map
        </Radio.Button>
      </Radio.Group>
    </Col>
  </Row>
</Card>
```

### Cards View Mode

```typescript
<Row gutter={[16, 16]} className="services-grid">
  {filteredServices.map(service => (
    <Col xs={24} sm={12} md={8} lg={6} xl={4} key={service.id}>
      <Card
        className={`service-card service-card-${service.healthStatus}`}
        hoverable
        onClick={() => navigateToService(service.id)}
        cover={
          <div className="service-card-header">
            <div className="service-status-indicator">
              <Badge 
                status={healthStatusBadge[service.healthStatus]} 
                text={service.healthStatus.toUpperCase()}
              />
            </div>
            <div className="service-type-icon">
              <Icon component={serviceTypeIcons[service.type]} />
            </div>
          </div>
        }
        actions={[
          <Tooltip title="View Dependencies">
            <Button 
              type="text" 
              icon={<NodeIndexOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                navigateToMap(service.id);
              }}
            />
          </Tooltip>,
          <Tooltip title="View Metrics">
            <Button 
              type="text" 
              icon={<LineChartOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                openMetricsModal(service.id);
              }}
            />
          </Tooltip>,
          <Dropdown 
            menu={{
              items: [
                { key: 'logs', label: 'View Logs', icon: <FileTextOutlined /> },
                { key: 'alerts', label: 'Alert Rules', icon: <AlertOutlined /> },
                { key: 'config', label: 'Configuration', icon: <SettingOutlined /> }
              ],
              onClick: ({ key }) => handleServiceAction(key, service)
            }}
            trigger={['click']}
            onClick={(e) => e.stopPropagation()}
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        ]}
      >
        <Meta
          title={
            <div className="service-title">
              <Text strong className="service-name">{service.name}</Text>
              {service.activeAlerts > 0 && (
                <Badge 
                  count={service.activeAlerts} 
                  size="small"
                  style={{ backgroundColor: alertSeverityColors[service.maxAlertSeverity] }}
                />
              )}
            </div>
          }
          description={
            <div className="service-details">
              <Text type="secondary" className="service-description">
                {service.description}
              </Text>
              <div className="service-metadata">
                <Space size="small" wrap>
                  <Tag size="small">{service.environment}</Tag>
                  <Tag size="small" color="blue">{service.technology}</Tag>
                  {service.team && <Tag size="small" color="green">{service.team}</Tag>}
                </Space>
              </div>
              <div className="service-metrics">
                <Row gutter={8}>
                  <Col span={8}>
                    <Statistic 
                      title="Uptime" 
                      value={service.uptime} 
                      precision={2}
                      suffix="%" 
                      valueStyle={{ fontSize: 12 }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic 
                      title="Response" 
                      value={service.avgResponseTime} 
                      suffix="ms"
                      valueStyle={{ fontSize: 12 }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic 
                      title="Errors" 
                      value={service.errorRate} 
                      precision={2}
                      suffix="%" 
                      valueStyle={{ 
                        fontSize: 12, 
                        color: service.errorRate > 1 ? '#ff4d4f' : '#52c41a' 
                      }}
                    />
                  </Col>
                </Row>
              </div>
            </div>
          }
        />
      </Card>
    </Col>
  ))}
</Row>
```

### Table View Mode

```typescript
<Table
  dataSource={filteredServices}
  loading={loading}
  scroll={{ x: 1400 }}
  pagination={{
    total: totalServices,
    pageSize: 50,
    showSizeChanger: true,
    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} services`
  }}
  columns={[
    {
      title: 'Health',
      dataIndex: 'healthStatus',
      width: 100,
      fixed: 'left',
      render: (status) => (
        <Badge 
          status={healthStatusBadge[status]} 
          text={status}
          className={`health-${status}`}
        />
      ),
      filters: [
        { text: 'Healthy', value: 'healthy' },
        { text: 'Warning', value: 'warning' },
        { text: 'Critical', value: 'critical' },
        { text: 'Unknown', value: 'unknown' }
      ],
      sorter: (a, b) => healthWeight[a.healthStatus] - healthWeight[b.healthStatus]
    },
    {
      title: 'Service Name',
      dataIndex: 'name',
      width: 200,
      fixed: 'left',
      render: (text, record) => (
        <div className="service-name-cell">
          <Button 
            type="link" 
            onClick={() => navigateToService(record.id)}
            className="service-name-link"
          >
            <Icon component={serviceTypeIcons[record.type]} className="service-icon" />
            {text}
          </Button>
          {record.activeAlerts > 0 && (
            <Badge 
              count={record.activeAlerts} 
              size="small" 
              style={{ marginLeft: 8 }}
            />
          )}
        </div>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name)
    },
    {
      title: 'Environment',
      dataIndex: 'environment',
      width: 120,
      render: (env) => <Tag color={environmentColors[env]}>{env}</Tag>,
      filters: environments.map(env => ({ text: env, value: env }))
    },
    {
      title: 'Technology',
      dataIndex: 'technology',
      width: 120,
      render: (tech) => <Tag color="blue">{tech}</Tag>
    },
    {
      title: 'Team/Owner',
      dataIndex: 'team',
      width: 150,
      render: (team) => team ? (
        <div className="team-info">
          <Avatar.Group size="small" maxCount={2}>
            {team.members.map(member => (
              <Avatar key={member.id} src={member.avatar}>{member.name[0]}</Avatar>
            ))}
          </Avatar.Group>
          <Text className="team-name">{team.name}</Text>
        </div>
      ) : <Text type="secondary">Unassigned</Text>
    },
    {
      title: 'Uptime %',
      dataIndex: 'uptime',
      width: 100,
      render: (uptime) => (
        <Text style={{ color: uptime >= 99.5 ? '#52c41a' : uptime >= 99 ? '#faad14' : '#ff4d4f' }}>
          {uptime.toFixed(2)}%
        </Text>
      ),
      sorter: (a, b) => a.uptime - b.uptime
    },
    {
      title: 'Response Time',
      dataIndex: 'avgResponseTime',
      width: 120,
      render: (time) => `${time}ms`,
      sorter: (a, b) => a.avgResponseTime - b.avgResponseTime
    },
    {
      title: 'Error Rate',
      dataIndex: 'errorRate',
      width: 100,
      render: (rate) => (
        <Text style={{ color: rate > 1 ? '#ff4d4f' : '#52c41a' }}>
          {rate.toFixed(2)}%
        </Text>
      ),
      sorter: (a, b) => a.errorRate - b.errorRate
    },
    {
      title: 'Dependencies',
      dataIndex: 'dependencyCount',
      width: 120,
      render: (count, record) => (
        <Button 
          type="link" 
          size="small"
          onClick={() => navigateToMap(record.id)}
        >
          {count} services
        </Button>
      )
    },
    {
      title: 'Last Updated',
      dataIndex: 'lastSeen',
      width: 150,
      render: (time) => (
        <div>
          <div>{moment(time).format('MMM DD, HH:mm')}</div>
          <Text type="secondary" size="small">{moment(time).fromNow()}</Text>
        </div>
      ),
      sorter: (a, b) => moment(b.lastSeen).valueOf() - moment(a.lastSeen).valueOf()
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Dependencies">
            <Button 
              icon={<NodeIndexOutlined />} 
              size="small"
              onClick={() => navigateToMap(record.id)}
            />
          </Tooltip>
          <Tooltip title="View Metrics">
            <Button 
              icon={<LineChartOutlined />} 
              size="small"
              onClick={() => openMetricsModal(record.id)}
            />
          </Tooltip>
          <Dropdown 
            menu={{
              items: [
                { key: 'edit', label: 'Edit Service', icon: <EditOutlined /> },
                { key: 'alerts', label: 'Alert Rules', icon: <AlertOutlined /> },
                { key: 'logs', label: 'View Logs', icon: <FileTextOutlined /> }
              ],
              onClick: ({ key }) => handleServiceAction(key, record)
            }}
          >
            <Button icon={<MoreOutlined />} size="small" />
          </Dropdown>
        </Space>
      )
    }
  ]}
  onRow={(record) => ({
    onDoubleClick: () => navigateToService(record.id),
    className: `service-row service-row-${record.healthStatus}`
  })}
/>
```

### Map View Mode

```typescript
<Card className="service-map-container" bodyStyle={{ padding: 0 }}>
  <div className="map-toolbar">
    <Space>
      <Select 
        defaultValue="force-directed" 
        style={{ width: 150 }}
        options={[
          { value: 'force-directed', label: 'Force Directed' },
          { value: 'hierarchical', label: 'Hierarchical' },
          { value: 'circular', label: 'Circular' }
        ]}
        onChange={handleLayoutChange}
      />
      <Button icon={<ZoomInOutlined />} onClick={handleZoomFit}>Fit to Screen</Button>
      <Button icon={<ExpandOutlined />} onClick={() => navigateToFullMap()}>
        Full Screen Map
      </Button>
    </Space>
  </div>
  
  <div className="service-map-view" style={{ height: 600 }}>
    // Cytoscape.js visualization
    // - Nodes: services with health color coding
    // - Edges: dependencies with directional arrows
    // - Clustering: group related services
    // - Interactive: click to select, hover for details
    // - Legend: health status and node type indicators
  </div>
  
  <div className="map-legend">
    <Space wrap>
      <Tag color="success" icon={<CheckCircleOutlined />}>Healthy</Tag>
      <Tag color="warning" icon={<ExclamationCircleOutlined />}>Warning</Tag>
      <Tag color="error" icon={<CloseCircleOutlined />}>Critical</Tag>
      <Tag color="default" icon={<QuestionCircleOutlined />}>Unknown</Tag>
    </Space>
  </div>
</Card>
```

### Interactive Elements

#### Service Quick Actions
- **Service card/row click** → navigates to Service Detail Page with context: `{ serviceId, previousPage: 'catalog', viewMode: currentViewMode }`
- **Dependencies button** → navigates to Service Dependency Map with context: `{ centerServiceId: serviceId, showRelated: true }`
- **Metrics button** → opens metrics modal with recent performance data
- **Alert rules action** → opens alert configuration modal

#### Context Preservation
```typescript
interface ServiceCatalogContext {
  viewMode: 'cards' | 'table' | 'map';
  filters: {
    search?: string;
    health?: string[];
    environment?: string[];
    team?: string[];
    technology?: string[];
  };
  sorting: {
    field: string;
    order: 'asc' | 'desc';
  };
  pagination: {
    current: number;
    pageSize: number;
  };
}
```

---

## Page 4: Individual Service Detail Page

### Page Purpose & User Goals
- **Primary Goal**: Deep dive analysis of a specific service's health, performance, and dependencies
- **Secondary Goals**: Investigate service issues, understand impact scope, access service operations
- **User Context**: Service troubleshooting, performance analysis, impact assessment during incidents

### Layout Structure

#### Dynamic Page Header
```typescript
<PageHeader
  onBack={() => navigateBack()}
  title={
    <Space align="center">
      <Icon component={serviceTypeIcons[service.type]} style={{ fontSize: 24 }} />
      {service.name}
      <Badge 
        status={healthStatusBadge[service.healthStatus]} 
        text={service.healthStatus.toUpperCase()}
      />
    </Space>
  }
  subTitle={`${service.environment} • ${service.technology} • Team: ${service.team?.name || 'Unassigned'}`}
  tags={[
    service.activeAlerts > 0 && (
      <Tag color="red" key="alerts">
        {service.activeAlerts} Active Alert{service.activeAlerts !== 1 ? 's' : ''}
      </Tag>
    ),
    <Tag color="blue" key="version">v{service.version}</Tag>
  ].filter(Boolean)}
  extra={[
    <Button key="refresh" icon={<ReloadOutlined />}>Refresh</Button>,
    <Button key="logs" icon={<FileTextOutlined />}>View Logs</Button>,
    <Button key="metrics" icon={<LineChartOutlined />}>Metrics Dashboard</Button>,
    <Dropdown 
      key="actions"
      menu={{
        items: [
          { key: 'edit', label: 'Edit Service', icon: <EditOutlined /> },
          { key: 'alerts', label: 'Configure Alerts', icon: <AlertOutlined /> },
          { key: 'deploy', label: 'Deploy', icon: <RocketOutlined /> },
          { key: 'restart', label: 'Restart Service', icon: <ReloadOutlined />, danger: true }
        ],
        onClick: handleServiceAction
      }}
    >
      <Button icon={<MoreOutlined />}>Actions</Button>
    </Dropdown>
  ]}
/>
```

#### Service Overview Section
```typescript
<Row gutter={[24, 24]} className="service-overview">
  {/* Health Status Card */}
  <Col xs={24} sm={12} md={6}>
    <Card className="health-status-card">
      <Statistic
        title="Health Status"
        value={service.healthStatus}
        valueStyle={{ 
          color: healthColors[service.healthStatus],
          textTransform: 'capitalize'
        }}
        prefix={<Icon component={healthIcons[service.healthStatus]} />}
      />
      <Progress
        percent={service.healthScore}
        strokeColor={healthColors[service.healthStatus]}
        format={() => `${service.healthScore}/100`}
      />
      <div className="health-details">
        <Text type="secondary">Last check: {moment(service.lastHealthCheck).fromNow()}</Text>
      </div>
    </Card>
  </Col>

  {/* Performance Metrics */}
  <Col xs={24} sm={12} md={6}>
    <Card className="performance-card">
      <Statistic
        title="Uptime (30d)"
        value={service.uptime}
        precision={2}
        suffix="%"
        valueStyle={{ color: service.uptime >= 99.5 ? '#52c41a' : '#faad14' }}
      />
      <div className="metric-row">
        <Text type="secondary">Avg Response: {service.avgResponseTime}ms</Text>
      </div>
      <div className="metric-row">
        <Text type="secondary">Error Rate: {service.errorRate.toFixed(2)}%</Text>
      </div>
    </Card>
  </Col>

  {/* Active Alerts */}
  <Col xs={24} sm={12} md={6}>
    <Card className="alerts-card">
      <Statistic
        title="Active Alerts"
        value={service.activeAlerts}
        valueStyle={{ color: service.activeAlerts > 0 ? '#ff4d4f' : '#52c41a' }}
        prefix={<AlertOutlined />}
      />
      {service.alerts.slice(0, 2).map(alert => (
        <div key={alert.id} className="alert-preview">
          <Tag color={alertSeverityColors[alert.severity]} size="small">
            {alert.severity}
          </Tag>
          <Text size="small">{alert.name}</Text>
        </div>
      ))}
      {service.alerts.length > 2 && (
        <Button type="link" size="small" onClick={() => setActiveTab('alerts')}>
          View all {service.alerts.length} alerts
        </Button>
      )}
    </Card>
  </Col>

  {/* Dependencies Summary */}
  <Col xs={24} sm={12} md={6}>
    <Card className="dependencies-card">
      <Statistic
        title="Dependencies"
        value={service.dependencyCount}
        prefix={<NodeIndexOutlined />}
      />
      <div className="dependency-health">
        <Text type="secondary">
          {service.healthyDependencies}/{service.dependencyCount} Healthy
        </Text>
      </div>
      <Button 
        type="link" 
        size="small"
        onClick={() => setActiveTab('dependencies')}
      >
        View dependency map
      </Button>
    </Card>
  </Col>
</Row>
```

#### Tabbed Content Area
```typescript
<Card className="service-details-tabs">
  <Tabs 
    activeKey={activeTab} 
    onChange={setActiveTab}
    items={[
      {
        key: 'overview',
        label: (
          <span>
            <DashboardOutlined />
            Overview
          </span>
        ),
        children: <ServiceOverviewTab service={service} />
      },
      {
        key: 'dependencies',
        label: (
          <span>
            <NodeIndexOutlined />
            Dependencies ({service.dependencyCount})
          </span>
        ),
        children: <ServiceDependenciesTab serviceId={service.id} />
      },
      {
        key: 'alerts',
        label: (
          <span>
            <AlertOutlined />
            Alerts ({service.activeAlerts})
            {service.activeAlerts > 0 && <Badge dot status="error" />}
          </span>
        ),
        children: <ServiceAlertsTab serviceId={service.id} />
      },
      {
        key: 'metrics',
        label: (
          <span>
            <LineChartOutlined />
            Metrics
          </span>
        ),
        children: <ServiceMetricsTab serviceId={service.id} />
      },
      {
        key: 'traces',
        label: (
          <span>
            <BranchesOutlined />
            Traces
          </span>
        ),
        children: <ServiceTracesTab serviceId={service.id} />
      },
      {
        key: 'config',
        label: (
          <span>
            <SettingOutlined />
            Configuration
          </span>
        ),
        children: <ServiceConfigTab serviceId={service.id} />
      }
    ]}
  />
</Card>
```

### Tab Content Components

#### Overview Tab
```typescript
const ServiceOverviewTab = ({ service }) => (
  <Row gutter={[24, 24]}>
    {/* Service Information */}
    <Col xs={24} lg={12}>
      <Card title="Service Information" size="small">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Description">
            {service.description || <Text type="secondary">No description</Text>}
          </Descriptions.Item>
          <Descriptions.Item label="Repository">
            <Button type="link" href={service.repository} target="_blank">
              {service.repository}
            </Button>
          </Descriptions.Item>
          <Descriptions.Item label="Documentation">
            <Button type="link" href={service.documentation} target="_blank">
              View Docs
            </Button>
          </Descriptions.Item>
          <Descriptions.Item label="Deployment">
            <Tag color="blue">{service.deploymentType}</Tag>
            <Text type="secondary" className="ml-2">
              Last deployed: {moment(service.lastDeployment).fromNow()}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Monitoring">
            <Space wrap>
              <Tag color={service.healthCheckEnabled ? 'green' : 'red'}>
                Health Checks: {service.healthCheckEnabled ? 'Enabled' : 'Disabled'}
              </Tag>
              <Tag color={service.metricsEnabled ? 'green' : 'red'}>
                Metrics: {service.metricsEnabled ? 'Enabled' : 'Disabled'}
              </Tag>
            </Space>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </Col>

    {/* Recent Activity */}
    <Col xs={24} lg={12}>
      <Card title="Recent Activity" size="small">
        <Timeline size="small">
          {service.recentActivity.map(activity => (
            <Timeline.Item 
              key={activity.id}
              color={activityColors[activity.type]}
            >
              <div className="activity-item">
                <Text strong>{activity.title}</Text>
                <div className="activity-meta">
                  <Text type="secondary" size="small">
                    {moment(activity.timestamp).fromNow()} • {activity.user}
                  </Text>
                </div>
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
      </Card>
    </Col>

    {/* Performance Trends */}
    <Col xs={24}>
      <Card title="Performance Trends (24h)" size="small">
        <Row gutter={16}>
          <Col xs={24} md={8}>
            // Response Time Chart (Mini line chart)
            <div className="metric-chart">
              <Text strong>Response Time</Text>
              // Chart component showing 24h trend
            </div>
          </Col>
          <Col xs={24} md={8}>
            // Error Rate Chart
            <div className="metric-chart">
              <Text strong>Error Rate</Text>
              // Chart component
            </div>
          </Col>
          <Col xs={24} md={8}>
            // Request Volume Chart
            <div className="metric-chart">
              <Text strong>Request Volume</Text>
              // Chart component
            </div>
          </Col>
        </Row>
      </Card>
    </Col>
  </Row>
);
```

#### Dependencies Tab
```typescript
const ServiceDependenciesTab = ({ serviceId }) => {
  return (
    <Row gutter={[24, 24]}>
      {/* Dependency Graph */}
      <Col xs={24} lg={16}>
        <Card title="Dependency Map" size="small" 
          extra={<Button icon={<ExpandOutlined />} onClick={() => navigateToFullMap(serviceId)}>
            Full Screen
          </Button>}
        >
          <div className="dependency-map" style={{ height: 400 }}>
            // Cytoscape.js visualization focused on this service
            // - Center node: current service (highlighted)
            // - Connected nodes: dependencies and dependents
            // - Edge directions: arrows showing dependency flow
            // - Health indicators: node colors
            // - Alert overlays: pulsing rings on problematic services
          </div>
        </Card>
      </Col>

      {/* Dependency Details */}
      <Col xs={24} lg={8}>
        <Card title="Upstream Dependencies" size="small" className="mb-3">
          <List
            size="small"
            dataSource={service.upstreamDependencies}
            renderItem={dep => (
              <List.Item
                actions={[
                  <Button 
                    type="link" 
                    size="small"
                    onClick={() => navigateToService(dep.id)}
                  >
                    View
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<Badge status={healthStatusBadge[dep.health]} />}
                  title={dep.name}
                  description={`${dep.avgResponseTime}ms • ${dep.reliability}% reliable`}
                />
              </List.Item>
            )}
          />
        </Card>

        <Card title="Downstream Services" size="small">
          <List
            size="small"
            dataSource={service.downstreamServices}
            renderItem={dep => (
              <List.Item
                actions={[
                  <Button 
                    type="link" 
                    size="small"
                    onClick={() => navigateToService(dep.id)}
                  >
                    View
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<Badge status={healthStatusBadge[dep.health]} />}
                  title={dep.name}
                  description={`Impact: ${dep.impactLevel}`}
                />
              </List.Item>
            )}
          />
        </Card>
      </Col>
    </Row>
  );
};
```

#### Alerts Tab
```typescript
const ServiceAlertsTab = ({ serviceId }) => (
  <Row gutter={[24, 24]}>
    <Col xs={24}>
      <Card title="Active Alerts" size="small">
        <Table
          dataSource={service.alerts}
          size="small"
          pagination={false}
          columns={[
            {
              title: 'Severity',
              dataIndex: 'severity',
              width: 100,
              render: (severity) => (
                <Tag color={alertSeverityColors[severity]}>{severity}</Tag>
              )
            },
            {
              title: 'Alert Name',
              dataIndex: 'name',
              render: (text, record) => (
                <Button type="link" onClick={() => openAlertDetail(record.id)}>
                  {text}
                </Button>
              )
            },
            {
              title: 'Started',
              dataIndex: 'startTime',
              width: 150,
              render: (time) => moment(time).fromNow()
            },
            {
              title: 'Status',
              dataIndex: 'status',
              width: 120,
              render: (status) => <Tag>{status}</Tag>
            },
            {
              title: 'Actions',
              key: 'actions',
              width: 150,
              render: (_, record) => (
                <Space size="small">
                  <Button size="small" onClick={() => acknowledgeAlert(record.id)}>
                    Ack
                  </Button>
                  <Button size="small" onClick={() => investigateAlert(record.id)}>
                    Investigate
                  </Button>
                </Space>
              )
            }
          ]}
        />
      </Card>
    </Col>

    <Col xs={24}>
      <Card title="Alert History (7 days)" size="small">
        <Timeline>
          {service.alertHistory.map(alert => (
            <Timeline.Item 
              key={alert.id}
              color={alertSeverityColors[alert.severity]}
            >
              <div className="alert-history-item">
                <Text strong>{alert.name}</Text>
                <Tag color={alertSeverityColors[alert.severity]} size="small">
                  {alert.severity}
                </Tag>
                <div className="alert-duration">
                  <Text type="secondary" size="small">
                    {moment(alert.startTime).format('MMM DD, HH:mm')} - 
                    {alert.endTime ? moment(alert.endTime).format('HH:mm') : 'ongoing'} 
                    {alert.duration && `(${alert.duration})`}
                  </Text>
                </div>
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
      </Card>
    </Col>
  </Row>
);
```

### Interactive Elements

#### Navigation Triggers
- **Back button** → returns to previous page (Service Catalog or Alert Management) with preserved context
- **Dependency service links** → navigates to Service Detail Page with context: `{ serviceId: depId, fromService: currentServiceId, highlightRelationship: true }`
- **"Full Screen" dependency map** → navigates to Service Dependency Map with context: `{ centerServiceId: serviceId, fullscreen: true }`
- **Alert investigation buttons** → navigates to Investigation Workspace with context: `{ alertId, serviceId, investigationMode: true }`

#### Context Preservation
```typescript
interface ServiceDetailContext {
  serviceId: string;
  activeTab: string;
  fromPage: 'catalog' | 'alerts' | 'dashboard' | 'map';
  highlightAlert?: string;
  investigationMode?: boolean;
  relatedServices?: string[];
}
```

---

## Page 5: Service Dependency Map

### Page Purpose & User Goals
- **Primary Goal**: Visual exploration of service relationships and dependency chains
- **Secondary Goals**: Impact analysis, bottleneck identification, architecture understanding
- **User Context**: Incident impact assessment, architecture review, troubleshooting complex issues

### Layout Structure

#### Full-Screen Layout
```typescript
<Layout className="dependency-map-layout">
  <Layout.Header className="map-header">
    <Row justify="space-between" align="middle">
      <Col>
        <Space>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigateBack()}
          >
            Back
          </Button>
          <Divider type="vertical" />
          <Typography.Title level={4} className="map-title">
            Service Dependency Map
          </Typography.Title>
          {centerService && (
            <Tag color="blue">Centered on: {centerService.name}</Tag>
          )}
        </Space>
      </Col>
      <Col>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            Refresh
          </Button>
          <Button icon={<SettingOutlined />} onClick={() => setShowSettings(true)}>
            Settings
          </Button>
          <Button icon={<FullscreenOutlined />} onClick={toggleFullscreen}>
            Fullscreen
          </Button>
        </Space>
      </Col>
    </Row>
  </Layout.Header>

  <Layout>
    <Layout.Sider width={320} className="map-sidebar" collapsible>
      // Control Panel Content
    </Layout.Sider>
    
    <Layout.Content className="map-content">
      // Main Map Visualization
    </Layout.Content>
  </Layout>
</Layout>
```

#### Sidebar Control Panel
```typescript
<div className="map-controls">
  {/* Search and Focus */}
  <Card size="small" title="Focus & Search" className="mb-3">
    <Input.Search
      placeholder="Search services..."
      onSearch={handleServiceSearch}
      className="mb-2"
    />
    <Select
      placeholder="Center on service..."
      style={{ width: '100%' }}
      showSearch
      filterOption={(input, option) => 
        option.label.toLowerCase().includes(input.toLowerCase())
      }
      options={allServices.map(s => ({ value: s.id, label: s.name }))}
      onChange={handleCenterService}
    />
  </Card>

  {/* Layout Controls */}
  <Card size="small" title="Layout" className="mb-3">
    <div className="layout-controls">
      <Text strong>Algorithm:</Text>
      <Radio.Group 
        value={layoutAlgorithm} 
        onChange={(e) => setLayoutAlgorithm(e.target.value)}
        size="small"
      >
        <Radio.Button value="force-directed">Force</Radio.Button>
        <Radio.Button value="hierarchical">Tree</Radio.Button>
        <Radio.Button value="circular">Circle</Radio.Button>
      </Radio.Group>
      
      <div className="layout-options mt-2">
        <Text strong>Options:</Text>
        <Checkbox 
          checked={showClusters} 
          onChange={(e) => setShowClusters(e.target.checked)}
        >
          Group by Team
        </Checkbox>
        <Checkbox 
          checked={showLabels} 
          onChange={(e) => setShowLabels(e.target.checked)}
        >
          Show Labels
        </Checkbox>
      </div>
      
      <div className="zoom-controls mt-2">
        <Text strong>Zoom:</Text>
        <Space>
          <Button size="small" icon={<ZoomInOutlined />} onClick={handleZoomIn} />
          <Button size="small" icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
          <Button size="small" onClick={handleZoomFit}>Fit</Button>
        </Space>
      </div>
    </div>
  </Card>

  {/* Filters */}
  <Card size="small" title="Filters" className="mb-3">
    <div className="filter-controls">
      <div className="filter-group mb-2">
        <Text strong>Health Status:</Text>
        <Checkbox.Group 
          value={healthFilters}
          onChange={setHealthFilters}
          options={[
            { label: 'Healthy', value: 'healthy' },
            { label: 'Warning', value: 'warning' },
            { label: 'Critical', value: 'critical' },
            { label: 'Unknown', value: 'unknown' }
          ]}
        />
      </div>
      
      <div className="filter-group mb-2">
        <Text strong>Environment:</Text>
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="All environments"
          value={environmentFilters}
          onChange={setEnvironmentFilters}
          options={environments.map(env => ({ value: env, label: env }))}
        />
      </div>
      
      <div className="filter-group mb-2">
        <Text strong>Technology:</Text>
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="All technologies"
          value={technologyFilters}
          onChange={setTechnologyFilters}
          options={technologies.map(tech => ({ value: tech, label: tech }))}
        />
      </div>
      
      <div className="filter-group">
        <Text strong>Show Alerts:</Text>
        <Switch 
          checked={showAlerts}
          onChange={setShowAlerts}
          checkedChildren="On"
          unCheckedChildren="Off"
        />
      </div>
    </div>
  </Card>

  {/* Selected Service Info */}
  {selectedService && (
    <Card size="small" title="Selected Service" className="mb-3">
      <div className="selected-service-info">
        <div className="service-header">
          <Badge status={healthStatusBadge[selectedService.health]} />
          <Text strong>{selectedService.name}</Text>
        </div>
        <Descriptions size="small" column={1}>
          <Descriptions.Item label="Health">
            {selectedService.health}
          </Descriptions.Item>
          <Descriptions.Item label="Dependencies">
            {selectedService.dependencyCount}
          </Descriptions.Item>
          <Descriptions.Item label="Dependents">
            {selectedService.dependentCount}
          </Descriptions.Item>
        </Descriptions>
        <div className="service-actions mt-2">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button 
              type="primary" 
              block 
              size="small"
              onClick={() => navigateToService(selectedService.id)}
            >
              View Details
            </Button>
            <Button 
              block 
              size="small"
              onClick={() => highlightDependencyPath(selectedService.id)}
            >
              Highlight Path
            </Button>
            {selectedService.activeAlerts > 0 && (
              <Button 
                danger 
                block 
                size="small"
                onClick={() => navigateToAlerts(selectedService.id)}
              >
                View Alerts ({selectedService.activeAlerts})
              </Button>
            )}
          </Space>
        </div>
      </div>
    </Card>
  )}

  {/* Legend */}
  <Card size="small" title="Legend">
    <div className="map-legend">
      <div className="legend-section">
        <Text strong>Health Status:</Text>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-node healthy"></div>
            <Text>Healthy</Text>
          </div>
          <div className="legend-item">
            <div className="legend-node warning"></div>
            <Text>Warning</Text>
          </div>
          <div className="legend-item">
            <div className="legend-node critical"></div>
            <Text>Critical</Text>
          </div>
          <div className="legend-item">
            <div className="legend-node unknown"></div>
            <Text>Unknown</Text>
          </div>
        </div>
      </div>
      
      {showAlerts && (
        <div className="legend-section mt-2">
          <Text strong>Alerts:</Text>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-alert critical-alert"></div>
              <Text>Critical Alert</Text>
            </div>
            <div className="legend-item">
              <div className="legend-alert warning-alert"></div>
              <Text>Warning Alert</Text>
            </div>
          </div>
        </div>
      )}
      
      <div className="legend-section mt-2">
        <Text strong>Connections:</Text>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-edge normal"></div>
            <Text>Dependency</Text>
          </div>
          <div className="legend-item">
            <div className="legend-edge highlighted"></div>
            <Text>Selected Path</Text>
          </div>
        </div>
      </div>
    </div>
  </Card>
</div>
```

#### Main Map Visualization
```typescript
<div className="dependency-map-container">
  <div 
    ref={mapRef} 
    className="cytoscape-container"
    style={{ width: '100%', height: '100vh' }}
  >
    // Cytoscape.js Configuration:
    // 
    // Nodes (Services):
    // - Size: based on dependency count or importance
    // - Color: health status (green/yellow/red/gray)
    // - Shape: different shapes for service types
    // - Labels: service names (toggleable)
    // - Badges: alert count indicators
    // - Clusters: grouping by team/environment
    //
    // Edges (Dependencies):
    // - Direction: arrows showing dependency flow
    // - Color: connection health or criticality
    // - Weight: thickness based on traffic/importance
    // - Style: dashed for external services
    //
    // Interactions:
    // - Click: select node/edge
    // - Double-click: navigate to service detail
    // - Hover: show service info tooltip
    // - Right-click: context menu with actions
    // - Pan: drag background
    // - Zoom: mouse wheel
    //
    // Overlays:
    // - Alert indicators: pulsing rings on affected services
    // - Path highlighting: when tracing dependencies
    // - Search highlighting: when service is found
    // - Impact zones: during incident analysis
  </div>

  {/* Map Overlay Controls */}
  <div className="map-overlay-controls">
    <Space direction="vertical">
      <Tooltip title="Reset View" placement="left">
        <Button 
          shape="circle" 
          icon={<HomeOutlined />} 
          onClick={handleResetView}
        />
      </Tooltip>
      <Tooltip title="Zoom In" placement="left">
        <Button 
          shape="circle" 
          icon={<ZoomInOutlined />} 
          onClick={handleZoomIn}
        />
      </Tooltip>
      <Tooltip title="Zoom Out" placement="left">
        <Button 
          shape="circle" 
          icon={<ZoomOutOutlined />} 
          onClick={handleZoomOut}
        />
      </Tooltip>
      <Tooltip title="Fit to Screen" placement="left">
        <Button 
          shape="circle" 
          icon={<ExpandOutlined />} 
          onClick={handleZoomFit}
        />
      </Tooltip>
      <Tooltip title="Export Image" placement="left">
        <Button 
          shape="circle" 
          icon={<DownloadOutlined />} 
          onClick={handleExportImage}
        />
      </Tooltip>
    </Space>
  </div>
</div>
```

### Interactive Elements

#### Node Context Menu
```typescript
const nodeContextMenu = {
  items: [
    {
      id: 'view-details',
      content: 'View Service Details',
      onClickFunction: (event) => navigateToService(event.target.id()),
      hasTrailingDivider: true
    },
    {
      id: 'center-here',
      content: 'Center Map Here',
      onClickFunction: (event) => centerMapOn(event.target.id())
    },
    {
      id: 'highlight-dependencies',
      content: 'Highlight Dependencies',
      onClickFunction: (event) => highlightDependencies(event.target.id())
    },
    {
      id: 'trace-path',
      content: 'Trace Dependency Path',
      onClickFunction: (event) => tracePath(event.target.id()),
      hasTrailingDivider: true
    },
    {
      id: 'view-alerts',
      content: 'View Active Alerts',
      onClickFunction: (event) => navigateToServiceAlerts(event.target.id()),
      disabled: (node) => node.data('activeAlerts') === 0
    },
    {
      id: 'view-metrics',
      content: 'View Metrics',
      onClickFunction: (event) => openMetricsModal(event.target.id())
    }
  ]
};
```

#### Service Info Tooltip
```typescript
const ServiceTooltip = ({ service }) => (
  <div className="service-tooltip">
    <div className="tooltip-header">
      <Badge status={healthStatusBadge[service.health]} />
      <Text strong>{service.name}</Text>
    </div>
    <div className="tooltip-content">
      <div className="tooltip-row">
        <Text type="secondary">Environment:</Text>
        <Tag size="small">{service.environment}</Tag>
      </div>
      <div className="tooltip-row">
        <Text type="secondary">Technology:</Text>
        <Tag color="blue" size="small">{service.technology}</Tag>
      </div>
      <div className="tooltip-row">
        <Text type="secondary">Dependencies:</Text>
        <Text>{service.dependencyCount}</Text>
      </div>
      <div className="tooltip-row">
        <Text type="secondary">Uptime:</Text>
        <Text style={{ color: service.uptime >= 99.5 ? '#52c41a' : '#faad14' }}>
          {service.uptime.toFixed(1)}%
        </Text>
      </div>
      {service.activeAlerts > 0 && (
        <div className="tooltip-row">
          <Text type="secondary">Alerts:</Text>
          <Tag color="red" size="small">{service.activeAlerts}</Tag>
        </div>
      )}
    </div>
    <div className="tooltip-footer">
      <Text type="secondary" size="small">
        Double-click for details • Right-click for actions
      </Text>
    </div>
  </div>
);
```

### Navigation Triggers

- **Node double-click** → navigates to Service Detail Page with context: `{ serviceId, fromMap: true, mapCenter: currentCenter }`
- **"View Details" button** → navigates to Service Detail Page with context: `{ serviceId, fromMap: true, preserveMapState: true }`
- **Alert indicators** → navigates to Alert Management with context: `{ serviceId, showServiceAlerts: true }`
- **Back button** → returns to previous page with context: `{ previousMapState: saved }`

### Context Preservation
```typescript
interface MapContext {
  centerServiceId?: string;
  layout: string;
  filters: {
    health: string[];
    environment: string[];
    technology: string[];
    showAlerts: boolean;
  };
  viewState: {
    zoom: number;
    pan: { x: number; y: number };
  };
  selectedServices: string[];
  highlightedPath?: string[];
}
```

---

## Page 6: Investigation Workspace

### Page Purpose & User Goals
- **Primary Goal**: Coordinate incident response with visual service context
- **Secondary Goals**: Track investigation progress, collaborate with team, document findings
- **User Context**: Active incident response, post-incident analysis, complex troubleshooting

### Layout Structure

#### Investigation Header
```typescript
<PageHeader
  title="Investigation Workspace"
  subTitle={investigation.title}
  tags={[
    <Tag color="red" key="severity">
      {investigation.severity} Severity
    </Tag>,
    <Tag color="blue" key="status">
      {investigation.status}
    </Tag>,
    <Tag key="duration">
      Duration: {moment.duration(investigation.duration).humanize()}
    </Tag>
  ]}
  extra={[
    <Button key="timeline" icon={<ClockCircleOutlined />}>
      Investigation Timeline
    </Button>,
    <Button key="collaborate" icon={<TeamOutlined />}>
      Collaborate
    </Button>,
    <Button key="escalate" icon={<ArrowUpOutlined />} danger>
      Escalate
    </Button>,
    <Button key="resolve" type="primary" icon={<CheckCircleOutlined />}>
      Mark Resolved
    </Button>
  ]}
  breadcrumb={{
    items: [
      { title: <Link to="/dashboard">Dashboard</Link> },
      { title: <Link to="/alerts">Alerts</Link> },
      { title: 'Investigation' }
    ]
  }}
/>
```

#### Investigation Summary Panel
```typescript
<Card className="investigation-summary" size="small">
  <Row gutter={16}>
    <Col xs={24} md={6}>
      <Statistic 
        title="Affected Services"
        value={investigation.affectedServices.length}
        prefix={<ExclamationCircleOutlined />}
        valueStyle={{ color: '#ff4d4f' }}
      />
    </Col>
    <Col xs={24} md={6}>
      <Statistic 
        title="Active Alerts"
        value={investigation.activeAlerts}
        prefix={<AlertOutlined />}
      />
    </Col>
    <Col xs={24} md={6}>
      <Statistic 
        title="Impact Score"
        value={investigation.impactScore}
        suffix="/ 100"
        valueStyle={{ 
          color: investigation.impactScore > 70 ? '#ff4d4f' : 
                 investigation.impactScore > 40 ? '#faad14' : '#52c41a' 
        }}
      />
    </Col>
    <Col xs={24} md={6}>
      <Statistic 
        title="Team Members"
        value={investigation.teamMembers.length}
        prefix={<TeamOutlined />}
      />
    </Col>
  </Row>
  
  <div className="investigation-description mt-3">
    <Text strong>Issue Description:</Text>
    <div className="mt-1">
      <Text>{investigation.description}</Text>
      <Button type="link" size="small" onClick={() => setEditingDescription(true)}>
        Edit
      </Button>
    </div>
  </div>
</Card>
```

#### Three-Panel Layout
```typescript
<Row gutter={[16, 16]} className="investigation-layout">
  {/* Left Panel - Service Map & Context */}
  <Col xs={24} lg={8}>
    <Card title="Impact Map" size="small" className="mb-3">
      <div className="impact-map-container" style={{ height: 300 }}>
        // Focused service map showing:
        // - Affected services highlighted in red
        // - Healthy dependencies in green  
        // - Unknown status in gray
        // - Alert indicators as pulsing rings
        // - Impact flow arrows
      </div>
      <div className="impact-controls mt-2">
        <Button size="small" onClick={() => navigateToFullMap(investigation.id)}>
          View Full Map
        </Button>
        <Button size="small" onClick={() => refreshImpactAnalysis()}>
          Refresh Impact
        </Button>
      </div>
    </Card>
    
    <Card title="Affected Services" size="small">
      <List
        size="small"
        dataSource={investigation.affectedServices}
        renderItem={service => (
          <List.Item 
            className="affected-service-item"
            actions={[
              <Button 
                type="link" 
                size="small"
                onClick={() => navigateToService(service.id, { investigation: investigation.id })}
              >
                Details
              </Button>
            ]}
          >
            <List.Item.Meta
              avatar={<Badge status={healthStatusBadge[service.status]} />}
              title={service.name}
              description={
                <div>
                  <div>
                    <Text type="secondary">
                      Impact: {service.impactLevel} • 
                      Alerts: {service.activeAlerts}
                    </Text>
                  </div>
                  <div className="service-metrics">
                    <Text type="secondary" size="small">
                      Error Rate: {service.errorRate}% • 
                      Response: {service.responseTime}ms
                    </Text>
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  </Col>

  {/* Center Panel - Timeline & Actions */}
  <Col xs={24} lg={10}>
    <Card 
      title="Investigation Timeline" 
      size="small"
      extra={
        <Button 
          type="primary" 
          size="small" 
          onClick={() => setAddingTimelineEntry(true)}
        >
          Add Update
        </Button>
      }
      className="timeline-card"
    >
      <Timeline className="investigation-timeline">
        {investigation.timeline.map(entry => (
          <Timeline.Item 
            key={entry.id}
            color={timelineColors[entry.type]}
            dot={<Icon component={timelineIcons[entry.type]} />}
          >
            <div className="timeline-entry">
              <div className="timeline-header">
                <Text strong>{entry.title}</Text>
                <Tag size="small" color={timelineColors[entry.type]}>
                  {entry.type}
                </Tag>
                <Text type="secondary" size="small" className="timeline-time">
                  {moment(entry.timestamp).format('HH:mm:ss')}
                </Text>
              </div>
              <div className="timeline-content">
                <Text>{entry.description}</Text>
                {entry.user && (
                  <div className="timeline-meta">
                    <Avatar size="small" src={entry.user.avatar} />
                    <Text type="secondary" size="small">
                      {entry.user.name}
                    </Text>
                  </div>
                )}
                {entry.actions && (
                  <div className="timeline-actions mt-1">
                    <Space size="small">
                      {entry.actions.map(action => (
                        <Button 
                          key={action.id}
                          type="link" 
                          size="small"
                          onClick={() => handleTimelineAction(action)}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </Space>
                  </div>
                )}
              </div>
            </div>
          </Timeline.Item>
        ))}
      </Timeline>
    </Card>
    
    {/* Quick Actions */}
    <Card title="Quick Actions" size="small" className="mt-3">
      <Row gutter={[8, 8]}>
        <Col span={12}>
          <Button 
            type="default" 
            block 
            icon={<ReloadOutlined />}
            onClick={() => restartAffectedServices()}
          >
            Restart Services
          </Button>
        </Col>
        <Col span={12}>
          <Button 
            type="default" 
            block 
            icon={<SwapOutlined />}
            onClick={() => enableFailover()}
          >
            Enable Failover
          </Button>
        </Col>
        <Col span={12}>
          <Button 
            type="default" 
            block 
            icon={<PauseOutlined />}
            onClick={() => pauseDeployments()}
          >
            Pause Deploys
          </Button>
        </Col>
        <Col span={12}>
          <Button 
            type="default" 
            block 
            icon={<MessageOutlined />}
            onClick={() => updateStatusPage()}
          >
            Update Status
          </Button>
        </Col>
      </Row>
    </Card>
  </Col>

  {/* Right Panel - Metrics & Collaboration */}
  <Col xs={24} lg={6}>
    <Card title="Key Metrics" size="small" className="mb-3">
      <div className="investigation-metrics">
        {investigation.keyMetrics.map(metric => (
          <div key={metric.id} className="metric-item mb-2">
            <div className="metric-header">
              <Text strong>{metric.name}</Text>
              <Tag 
                color={metric.status === 'critical' ? 'red' : 
                       metric.status === 'warning' ? 'orange' : 'green'}
              >
                {metric.status}
              </Tag>
            </div>
            <div className="metric-value">
              <Statistic
                value={metric.current}
                suffix={metric.unit}
                precision={metric.precision}
                valueStyle={{ 
                  fontSize: 16,
                  color: metric.status === 'critical' ? '#ff4d4f' : undefined
                }}
              />
              <Text type="secondary" size="small">
                vs normal: {metric.baseline} {metric.unit}
              </Text>
            </div>
            // Mini sparkline chart showing trend
            <div className="metric-trend">
              // Chart component
            </div>
          </div>
        ))}
      </div>
    </Card>
    
    <Card title="Team Collaboration" size="small">
      <div className="investigation-team">
        <div className="team-members mb-2">
          <Avatar.Group size="small" maxCount={4}>
            {investigation.teamMembers.map(member => (
              <Avatar key={member.id} src={member.avatar} title={member.name} />
            ))}
          </Avatar.Group>
          <Button type="link" size="small" onClick={() => inviteToInvestigation()}>
            Invite Others
          </Button>
        </div>
        
        <div className="investigation-notes">
          <Text strong>Investigation Notes:</Text>
          <TextArea
            value={investigation.notes}
            onChange={(e) => updateInvestigationNotes(e.target.value)}
            placeholder="Add investigation findings, hypotheses, or next steps..."
            rows={4}
            className="mt-1"
          />
        </div>
        
        <div className="chat-section mt-3">
          <Text strong>Team Chat:</Text>
          <div className="chat-messages" style={{ height: 150, overflowY: 'auto' }}>
            {investigation.chatMessages.map(message => (
              <div key={message.id} className="chat-message">
                <div className="chat-header">
                  <Text strong size="small">{message.user.name}</Text>
                  <Text type="secondary" size="small">
                    {moment(message.timestamp).fromNow()}
                  </Text>
                </div>
                <div className="chat-content">
                  <Text size="small">{message.content}</Text>
                </div>
              </div>
            ))}
          </div>
          <Input.TextArea
            placeholder="Type a message..."
            rows={2}
            onPressEnter={sendChatMessage}
            className="mt-1"
          />
        </div>
      </div>
    </Card>
  </Col>
</Row>
```

### Interactive Elements

#### Timeline Entry Modal
```typescript
<Modal
  title="Add Investigation Update"
  open={addingTimelineEntry}
  onOk={handleAddTimelineEntry}
  onCancel={() => setAddingTimelineEntry(false)}
  width={600}
>
  <Form layout="vertical">
    <Form.Item label="Update Type" required>
      <Select placeholder="Select update type">
        <Option value="action">Action Taken</Option>
        <Option value="finding">Finding/Discovery</Option>
        <Option value="hypothesis">Hypothesis</Option>
        <Option value="resolution">Resolution Step</Option>
        <Option value="escalation">Escalation</Option>
      </Select>
    </Form.Item>
    
    <Form.Item label="Title" required>
      <Input placeholder="Brief title for this update" />
    </Form.Item>
    
    <Form.Item label="Description" required>
      <TextArea 
        placeholder="Detailed description of the update..."
        rows={4}
      />
    </Form.Item>
    
    <Form.Item label="Attach Evidence">
      <Upload>
        <Button icon={<UploadOutlined />}>
          Upload Screenshots/Logs
        </Button>
      </Upload>
    </Form.Item>
    
    <Form.Item label="Related Services">
      <Select
        mode="multiple"
        placeholder="Select related services"
        options={allServices.map(s => ({ value: s.id, label: s.name }))}
      />
    </Form.Item>
  </Form>
</Modal>
```

#### Investigation Resolution Modal
```typescript
<Modal
  title="Mark Investigation Resolved"
  open={resolvingInvestigation}
  onOk={handleResolveInvestigation}
  onCancel={() => setResolvingInvestigation(false)}
  width={700}
>
  <Form layout="vertical">
    <Form.Item label="Root Cause" required>
      <TextArea 
        placeholder="Describe the root cause of the issue..."
        rows={3}
      />
    </Form.Item>
    
    <Form.Item label="Resolution Summary" required>
      <TextArea 
        placeholder="Summarize how the issue was resolved..."
        rows={3}
      />
    </Form.Item>
    
    <Form.Item label="Impact Assessment">
      <Row gutter={16}>
        <Col span={8}>
          <Text>Users Affected:</Text>
          <Input placeholder="Number or percentage" />
        </Col>
        <Col span={8}>
          <Text>Duration:</Text>
          <Input placeholder="e.g., 45 minutes" />
        </Col>
        <Col span={8}>
          <Text>Business Impact:</Text>
          <Select placeholder="Select impact level">
            <Option value="low">Low</Option>
            <Option value="medium">Medium</Option>
            <Option value="high">High</Option>
            <Option value="critical">Critical</Option>
          </Select>
        </Col>
      </Row>
    </Form.Item>
    
    <Form.Item label="Follow-up Actions">
      <TextArea 
        placeholder="List any follow-up actions needed (monitoring, fixes, process improvements)..."
        rows={2}
      />
    </Form.Item>
    
    <Form.Item>
      <Checkbox>Create post-incident report</Checkbox>
      <Checkbox>Schedule post-mortem meeting</Checkbox>
      <Checkbox>Update runbooks/documentation</Checkbox>
    </Form.Item>
  </Form>
</Modal>
```

### Navigation Triggers

- **Service details in affected list** → navigates to Service Detail Page with context: `{ serviceId, investigation: investigationId, highlightIssues: true }`
- **"View Full Map" button** → navigates to Service Dependency Map with context: `{ investigation: investigationId, highlightAffected: true }`
- **Timeline action buttons** → trigger specific actions or navigate to related pages
- **Investigation resolution** → navigates to post-incident report page or returns to alerts dashboard

### Context Preservation
```typescript
interface InvestigationContext {
  investigationId: string;
  alertIds: string[];
  affectedServices: string[];
  severity: string;
  startTime: string;
  teamMembers: string[];
  status: 'active' | 'resolved' | 'escalated';
  impactScope: 'service' | 'system' | 'customer-facing';
}
```

---

## Cross-Page Navigation Patterns

### Global Navigation Context
```typescript
interface GlobalNavigationContext {
  // Current user context
  user: {
    id: string;
    role: 'sre' | 'developer' | 'manager';
    permissions: string[];
    preferences: {
      defaultDashboard: string;
      alertNotifications: boolean;
      theme: 'light' | 'dark';
    };
  };
  
  // Active investigation context
  activeInvestigation?: {
    id: string;
    title: string;
    severity: string;
    affectedServices: string[];
  };
  
  // Recent navigation history
  navigationHistory: {
    page: string;
    context: any;
    timestamp: string;
  }[];
  
  // Global filters/preferences
  globalFilters: {
    environment: string[];
    team: string[];
    timeRange: { start: string; end: string };
  };
}
```

### Breadcrumb Navigation Rules
1. **Always show current location** with proper hierarchy
2. **Make intermediate levels clickable** to allow quick navigation
3. **Preserve context when navigating up** the hierarchy
4. **Show investigation context** when in investigation mode

### URL Structure for Deep Linking
```
/dashboard
/alerts?severity=critical&status=new
/services?health=warning&environment=production
/services/{serviceId}?tab=alerts&alert={alertId}
/map?center={serviceId}&layout=force-directed
/investigation/{investigationId}?tab=timeline
```

---

## Responsive Design Specifications

### Breakpoints
- **Mobile**: < 576px (xs)
- **Tablet**: 576px - 768px (sm)  
- **Desktop**: 768px - 992px (md)
- **Large Desktop**: 992px - 1200px (lg)
- **XL Desktop**: > 1200px (xl)

### Mobile Adaptations
- **Sidebar**: Collapses to drawer overlay
- **Tables**: Horizontal scroll with sticky first column
- **Cards**: Stack vertically with full width
- **Service map**: Touch gestures for pan/zoom
- **Metrics**: Simplified mini charts

### Loading States
- **Skeleton components** for initial page loads
- **Inline spinners** for data updates
- **Progressive loading** for large datasets
- **Error boundaries** for failed components

---

## Implementation Notes

### Ant Design Component Specifications
- Use **Ant Design v5** latest components and tokens
- Apply **consistent spacing**: 16px base, 24px section gaps
- Use **standard color palette**: success (#52c41a), warning (#faad14), error (#ff4d4f)
- Implement **proper form validation** with field-level error states
- Apply **consistent typography**: Title levels, Text variants, proper hierarchy

### Performance Considerations
- **Virtual scrolling** for tables with > 100 rows
- **Lazy loading** for service map visualization
- **Debounced search** with 300ms delay
- **Memoized components** for expensive renders
- **Connection pooling** for database queries

### Accessibility Requirements
- **ARIA labels** on all interactive elements
- **Keyboard navigation** support throughout
- **Screen reader compatibility** for critical information
- **Color contrast** meeting WCAG AA standards
- **Focus management** for modal interactions

This design specification provides the foundation for implementing a comprehensive SRE service dependency mapping tool. Each page specification includes exact component requirements, interaction patterns, and context preservation that will enable your development team to build a cohesive, user-friendly interface for incident response and service monitoring.