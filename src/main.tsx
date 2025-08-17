import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import App from './App';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

// Theme configurations for Ant Design
const getAntTheme = (currentTheme: 'light' | 'dark') => {
  if (currentTheme === 'dark') {
    return {
      algorithm: theme.darkAlgorithm,
      token: {
        // Background colors - match menu background for seamless blend
        colorBgBase: '#1a1f2e', // Match menu background
        colorBgContainer: '#1a1f2e', // Keep card backgrounds
        colorBgLayout: '#1a1f2e', // Match menu background
        colorBgElevated: '#1a1f2e', // Keep elevated components like modals
        
        // Primary colors (cyan/teal accent)
        colorPrimary: '#00d4aa',
        colorPrimaryBg: '#001a15',
        colorPrimaryBgHover: '#002b20',
        colorPrimaryBorder: '#00d4aa',
        colorPrimaryBorderHover: '#00f0c0',
        colorPrimaryHover: '#00f0c0',
        colorPrimaryActive: '#00b395',
        
        // Text colors
        colorText: '#a0a6b8', // Match unselected menu item color
        colorTextSecondary: '#a0a6b8',
        colorTextTertiary: '#6b7280',
        colorTextQuaternary: '#4b5563',
        
        // Border colors
        colorBorder: '#374151',
        colorBorderSecondary: '#2d3748',
        
        // Status colors
        colorSuccess: '#00d4aa',
        colorWarning: '#ff7a00',
        colorError: '#ff4d4f',
        colorInfo: '#00d4aa',
        
        // Component-specific
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      },
      components: {
        Layout: {
          bodyBg: '#1a1f2e', // Match menu background for seamless blend
          headerBg: '#1a1f2e',
          siderBg: '#1a1f2e', // Keep menu background
          triggerBg: '#374151',
        },
        Menu: {
          darkItemBg: '#1a1f2e',
          darkItemSelectedBg: '#00d4aa20',
          darkItemColor: '#a0a6b8',
          darkItemSelectedColor: '#00d4aa',
          darkItemHoverBg: '#374151',
          darkItemHoverColor: '#a0a6b8',
        },
        Card: {
          colorBgContainer: '#1a1f2e',
          colorBorderSecondary: '#374151',
        },
        Table: {
          colorBgContainer: '#1a1f2e',
          headerBg: '#374151',
          headerColor: '#a0a6b8',
          rowHoverBg: '#374151',
        },
        Button: {
          primaryShadow: 'none',
          dangerShadow: 'none',
        }
      }
    };
  }
  
  // Light theme (default Ant Design with slight customizations)
  return {
    token: {
      colorPrimary: '#1890ff',
      borderRadius: 8,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }
  };
};

// Wrapper component to access theme context
const ThemedApp: React.FC = () => {
  const { theme: currentTheme } = useTheme();
  
  return (
    <ConfigProvider theme={getAntTheme(currentTheme)}>
      <App />
    </ConfigProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  </React.StrictMode>
);

