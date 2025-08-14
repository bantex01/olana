import React from 'react';
import { Button, Tooltip } from 'antd';
import { BulbOutlined, BulbFilled } from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  
  const isDark = theme === 'dark';
  
  return (
    <Tooltip title={`Switch to ${isDark ? 'light' : 'dark'} theme`}>
      <Button
        type="text"
        icon={isDark ? <BulbFilled /> : <BulbOutlined />}
        onClick={toggleTheme}
        style={{
          color: isDark ? '#00d4aa' : '#1890ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      />
    </Tooltip>
  );
};