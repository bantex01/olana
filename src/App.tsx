import React, { useState } from 'react';
import { Layout, Menu, theme, Typography, Breadcrumb } from 'antd';
import {
  HomeOutlined,
  NodeIndexOutlined,
  AlertOutlined,
  BarChartOutlined,
  SettingOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import 'antd/dist/reset.css';
import { DashboardHome } from './components/Dashboard/DashboardHome';
import { ServiceGraphPage } from './components/ServiceGraph/ServiceGraphPage';
import { IncidentsPage } from './components/Incidents/IncidentsPage';
import { ServicesPage } from './components/Services/ServicesPage';


const siderResponsiveStyle = `
  @media (max-width: 768px) {
    .ant-layout-sider-collapsed {
      margin-left: -240px !important;
    }
  }
`;


const { Header, Content, Sider } = Layout;
const { Title } = Typography;

// Menu items configuration
const menuItems = [
  {
    key: 'home',
    icon: <HomeOutlined />,
    label: 'Dashboard',
  },
  {
    key: 'services',
    icon: <NodeIndexOutlined />,
    label: 'Services',
    children: [
      {
        key: 'services-overview',
        label: 'Overview',
      },
      {
        key: 'services-catalog',
        label: 'Service Catalog',
      },
      {
        key: 'services-dependencies',
        label: 'Dependencies',
      },
      {
        key: 'services-health',
        label: 'Health & Status',
      },
    ],
  },
  {
    key: 'service-map',
    icon: <DatabaseOutlined />,
    label: 'Service Map',
  },
  {
    key: 'incidents',
    icon: <AlertOutlined />,
    label: 'Incidents',
  },
  {
    key: 'analytics',
    icon: <BarChartOutlined />,
    label: 'Analytics',
  },
  {
    key: 'admin',
    icon: <SettingOutlined />,
    label: 'Administration',
  },
];

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState('home');
  const [dashboardLastUpdated, setDashboardLastUpdated] = useState<Date | null>(null);
  
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // Get page title based on selected menu
  const getPageTitle = (key: string) => {
    const item = menuItems.find(item => item.key === key);
    return item?.label || 'Dashboard';
  };

  // Get breadcrumb items
  const getBreadcrumbs = (key: string) => {
    return [
      { title: 'Alert Hub' },
      { title: getPageTitle(key) }
    ];
  };

  // Render content based on selected menu
    const renderContent = () => {
      switch (selectedKey) {
        case 'home':
          return <DashboardHome onLastUpdatedChange={setDashboardLastUpdated} />;
        case 'services-overview':
        case 'services-catalog':
        case 'services-dependencies': 
        case 'services-health':
          return <ServicesPage activeTab={selectedKey} />;
        case 'service-map':
          return <ServiceGraphPage />;
        case 'incidents':
          return <IncidentsPage />;
        case 'analytics':
          return <div>Analytics page (coming soon)</div>;
        case 'admin':
          return <div>Admin page (coming soon)</div>;
        default:
          return <DashboardHome onLastUpdatedChange={setDashboardLastUpdated} />;
      }
    };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Left Sidebar */}
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        theme="dark"
        width={240}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100vh',
          zIndex: 100,
          transition: 'all 0.2s ease',
          overflow: 'auto',
        }}
      >
        {/* Logo/Brand Area */}
        <div style={{
          height: 64,
          margin: 16,
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: collapsed ? '14px' : '16px',
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}>
          {collapsed ? (
            <img 
              src="/olana.png"
              alt="Logo" 
              style={{ 
                height: 32, 
                width: 32, 
                objectFit: 'contain' 
              }} 
            />
          ) : (
            <img 
              src="/olana.png" 
              alt="Alert Hub" 
              style={{ 
                height: 40, 
                maxWidth: '180px', 
                objectFit: 'contain' 
              }} 
            />
          )}
        </div>

        {/* Navigation Menu */}
        <Menu
          theme="dark"
          selectedKeys={[selectedKey]}
          mode="inline"
          items={menuItems}
          onSelect={({ key }) => setSelectedKey(key)}
        />
      </Sider>

      {/* Main Layout */}
      <Layout style={{ 
        marginLeft: collapsed ? 80 : 240,
        transition: 'margin-left 0.2s ease'
      }}>
        {/* Header */}
        <Header 
        style={{ 
            padding: '0 24px', 
            background: colorBgContainer,
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
        }}
        >
        <div style={{ paddingTop: 8, paddingBottom: 8 }}>
        <Title level={3} style={{ margin: 0, lineHeight: 1.2 }}>
            {getPageTitle(selectedKey)}
        </Title>
        </div>
            <div style={{ color: '#666', alignSelf: 'flex-start', paddingTop: 8 }}>
            {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })}
            </div>
        </Header>

        {/* Content Area */}
        <Content style={{ margin: '0 16px' }}>
          {/* Breadcrumb */}
          <Breadcrumb 
            style={{ margin: '16px 0' }}
            items={getBreadcrumbs(selectedKey)}
          />

          {/* Main Content */}
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            {renderContent()}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;