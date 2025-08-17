import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Initialize theme from localStorage or default to light
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('app-theme') as Theme;
    return savedTheme || 'light';
  });

  // Update localStorage and CSS custom properties when theme changes
  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    
    // Update CSS custom properties on document root
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.style.setProperty('--bg-primary', '#0a0f1c');
      root.style.setProperty('--bg-secondary', '#1a1f2e');
      root.style.setProperty('--bg-tertiary', '#374151');
      root.style.setProperty('--text-primary', '#a0a6b8');
      root.style.setProperty('--text-secondary', '#a0a6b8');
      root.style.setProperty('--accent-primary', '#00d4aa');
      root.style.setProperty('--accent-hover', '#00f0c0');
      root.style.setProperty('--status-critical', '#ff4d4f');
      root.style.setProperty('--status-warning', '#ff7a00');
      root.style.setProperty('--border', '#374151');
      root.style.setProperty('--border-secondary', '#2d3748');
    } else {
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#fafafa');
      root.style.setProperty('--bg-tertiary', '#f0f0f0');
      root.style.setProperty('--text-primary', '#000000');
      root.style.setProperty('--text-secondary', '#666666');
      root.style.setProperty('--accent-primary', '#1890ff');
      root.style.setProperty('--accent-hover', '#40a9ff');
      root.style.setProperty('--status-critical', '#ff4d4f');
      root.style.setProperty('--status-warning', '#faad14');
      root.style.setProperty('--border', '#d9d9d9');
      root.style.setProperty('--border-secondary', '#f0f0f0');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};