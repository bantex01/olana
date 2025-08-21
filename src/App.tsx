import React, { useState } from 'react';
import { Layout, Menu, theme, Typography, Breadcrumb } from 'antd';
import {
  HomeOutlined,
  NodeIndexOutlined,
  AlertOutlined,
  BarChartOutlined,
  SettingOutlined
} from '@ant-design/icons';
import 'antd/dist/reset.css';
import { FilteredDashboard } from './components/Dashboard/FilteredDashboard';
import { IncidentsPage } from './components/Incidents/IncidentsPage';
import { ServicesPage } from './components/Services/ServicesPage';
import { ServiceDetailPage } from './components/Services/ServiceDetailPage';
import { ServiceHealthPage } from './components/Operations/ServiceHealthPage';
import { ThemeToggle } from './components/Common/ThemeToggle';


const { Header, Content, Sider } = Layout;
const { Title } = Typography;

// Menu items configuration
const menuItems = [
  {
    key: 'home',
    icon: <HomeOutlined />,
    label: 'Mission Control',
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
    key: 'operations',
    icon: <AlertOutlined />,
    label: 'Operations',
    children: [
      {
        key: 'operations-service-health',
        label: 'Service Health',
      },
    ],
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
  const [serviceDetailParams, setServiceDetailParams] = useState<{namespace: string, name: string} | null>(null);
  const [, setDashboardLastUpdated] = useState<Date | null>(null);
  
  const {
    token: { colorBgContainer, borderRadiusLG, colorPrimary },
  } = theme.useToken();

  // Detect if we're in dark mode - check for dark background colors
  const isDarkMode = colorBgContainer && (
    colorBgContainer.includes('#1') || 
    colorBgContainer.includes('#0') ||
    colorBgContainer === 'rgb(20, 20, 20)' ||
    parseInt(colorBgContainer.replace('#', ''), 16) < 0x808080
  );
  
  console.log('Theme debug:', { 
    colorBgContainer, 
    colorPrimary,
    isDarkMode 
  });

  // Get page title based on selected menu
  const getPageTitle = (key: string) => {
    if (serviceDetailParams) {
      return `${serviceDetailParams.namespace}/${serviceDetailParams.name}`;
    }
    const item = menuItems.find(item => item.key === key);
    return item?.label || 'Mission Control';
  };


  // Get breadcrumb items
  const getBreadcrumbs = (key: string) => {
    if (serviceDetailParams) {
      return [
        { title: 'Alert Hub' },
        { title: 'Service Catalog' },
        { title: `${serviceDetailParams.namespace}/${serviceDetailParams.name}` }
      ];
    }
    return [
      { title: 'Alert Hub' },
      { title: getPageTitle(key) }
    ];
  };


  // Render content based on selected menu
  const renderContent = () => {
    // Check if we're viewing a service detail
    if (serviceDetailParams) {
      return <ServiceDetailPage 
        namespace={serviceDetailParams.namespace} 
        name={serviceDetailParams.name}
        onBack={() => {
          setServiceDetailParams(null);
          setSelectedKey('services-catalog');
        }}
      />;
    }

    switch (selectedKey) {
      case 'home':
        return <FilteredDashboard onLastUpdatedChange={setDashboardLastUpdated} />;
      case 'services-overview':
      case 'services-catalog':
      case 'services-dependencies':
      case 'services-health':
        return <ServicesPage 
          activeTab={selectedKey} 
          onServiceSelect={(namespace: string, name: string) => setServiceDetailParams({namespace, name})}
        />;
      case 'operations-service-health':
        return <ServiceHealthPage />;
      case 'incidents':
        return <IncidentsPage />;
      case 'analytics':
        return <div>Analytics page (coming soon)</div>;
      case 'admin':
        return <div>Admin page (coming soon)</div>;
      default:
        return <FilteredDashboard onLastUpdatedChange={setDashboardLastUpdated} />;
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
          background: 'transparent', // Remove grey background
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#a0a6b8', // Use same grey as other text
          fontWeight: 'bold',
          fontSize: collapsed ? '14px' : '16px',
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}>
          {collapsed ? (
            <img 
              src="olana5.png"
              alt="Logo" 
              style={{ 
                height: 50, 
                width: 50, 
                objectFit: 'contain' 
              }} 
            />
          ) : (
            <img 
              src="olana5.png" 
              alt="Alert Hub" 
              style={{ 
                height: 100, 
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
        transition: 'margin-left 0.2s ease',
        borderLeft: '1px solid #a0a6b8' // Grey left border to separate menu from content
      }}>
        {/* Header */}
        <Header 
        style={{ 
            padding: '0 24px', 
            background: colorBgContainer,
            borderBottom: '1px solid #a0a6b8', // Grey border under header
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
        }}
        >
        <div style={{ paddingTop: 8, paddingBottom: 8 }}>
        <Title level={3} style={{ 
          margin: 0, 
          lineHeight: 1.2,
          fontWeight: 'normal',
          color: isDarkMode ? '#1dd1a1' : undefined  // Match the active menu item teal color
        }}>
            {getPageTitle(selectedKey)}
        </Title>
        </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 16,
              alignSelf: 'flex-start', 
              paddingTop: 8 
            }}>
              <div style={{ color: '#666' }}>
                {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })}
              </div>
              <ThemeToggle />
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