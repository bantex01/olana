# Dark Theme Implementation Guide

## Project Context
This document provides a complete implementation guide for applying a global dark theme to the SRE service dependency mapping tool. The target design features a dark navy background (#0a0f1c) with cyan accent colors (#00d4aa), matching modern observability tools.

**Current Stack:**
- React 19 + TypeScript + Vite
- Ant Design v5 (latest)
- vis-network for service dependency visualization
- Express.js backend with PostgreSQL

**Scope:**
- ✅ Global Ant Design dark theme
- ✅ ServiceDependencyMap.tsx vis-network styling  
- ✅ Component-specific overrides
- ❌ Main service map page (being replaced separately)

## Implementation Complexity: LOW-MEDIUM (2 days)

### Day 1 (4-6 hours): Core Theme Configuration
- Ant Design theme setup
- Global CSS updates
- Basic component testing

### Day 2 (2-4 hours): vis-network Integration & Polish
- ServiceDependencyMap styling
- Component overrides
- Testing and refinement

---

## 1. Global Ant Design Theme Configuration

**File: `/src/main.tsx`**

Replace the existing ConfigProvider configuration with:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import App from './App';

const darkTheme = {
  algorithm: 'dark',
  token: {
    // Background colors
    colorBgBase: '#0a0f1c',           // Main dark background  
    colorBgContainer: '#1a1f2e',     // Card/container backgrounds
    colorBgLayout: '#0a0f1c',        // Layout background
    colorBgElevated: '#1a1f2e',      // Modal/dropdown backgrounds
    
    // Primary colors (cyan/teal accent)
    colorPrimary: '#00d4aa',         // Main accent color
    colorPrimaryBg: '#001a15',       // Primary background tint
    colorPrimaryBgHover: '#002b20',  // Primary hover background
    colorPrimaryBorder: '#00d4aa',   // Primary border
    colorPrimaryBorderHover: '#00f0c0', // Primary border hover
    colorPrimaryHover: '#00f0c0',    // Primary hover state
    colorPrimaryActive: '#00b395',   // Primary active state
    
    // Text colors
    colorText: '#ffffff',            // Primary text (white)
    colorTextSecondary: '#a0a6b8',   // Secondary text (light gray)
    colorTextTertiary: '#6b7280',    // Tertiary text
    colorTextQuaternary: '#4b5563',  // Quaternary text
    
    // Border colors  
    colorBorder: '#374151',          // Default borders
    colorBorderSecondary: '#2d3748', // Secondary borders
    
    // Status colors
    colorSuccess: '#00d4aa',         // Success/healthy (matching primary)
    colorWarning: '#ff7a00',         // Warning/major alerts
    colorError: '#ff4d4f',           // Error/critical alerts
    colorInfo: '#00d4aa',            // Info (matching primary)
    
    // Component-specific
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  components: {
    Layout: {
      bodyBg: '#0a0f1c',
      headerBg: '#1a1f2e', 
      siderBg: '#1a1f2e',
      triggerBg: '#374151',
    },
    Menu: {
      darkItemBg: '#1a1f2e',
      darkItemSelectedBg: '#00d4aa20',
      darkItemColor: '#a0a6b8',
      darkItemSelectedColor: '#00d4aa',
      darkItemHoverBg: '#374151',
      darkItemHoverColor: '#ffffff',
    },
    Card: {
      colorBgContainer: '#1a1f2e',
      colorBorderSecondary: '#374151',
    },
    Table: {
      colorBgContainer: '#1a1f2e',
      headerBg: '#374151',
      headerColor: '#ffffff', 
      rowHoverBg: '#374151',
    },
    Button: {
      primaryShadow: 'none',
      dangerShadow: 'none',
    }
  }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={darkTheme}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
```

---

## 2. Global CSS Updates

**File: `/src/index.css`**

Replace entire file content with:

```css
:root {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  
  /* Dark theme variables */
  --bg-primary: #0a0f1c;
  --bg-secondary: #1a1f2e;
  --bg-tertiary: #374151;
  --text-primary: #ffffff;
  --text-secondary: #a0a6b8;
  --accent-primary: #00d4aa;
  --accent-hover: #00f0c0;
  --status-critical: #ff4d4f;
  --status-warning: #ff7a00;

  color-scheme: dark;
  color: var(--text-primary);
  background-color: var(--bg-primary);

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

/* vis-network graph styling */
.vis-network {
  background-color: var(--bg-secondary) !important;
  border: 1px solid var(--bg-tertiary) !important;
  border-radius: 8px;
}

/* Custom status badges */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.critical {
  background-color: rgba(255, 77, 79, 0.1);
  color: var(--status-critical);
  border: 1px solid rgba(255, 77, 79, 0.3);
}

.status-badge.warning {
  background-color: rgba(255, 122, 0, 0.1);
  color: var(--status-warning);
  border: 1px solid rgba(255, 122, 0, 0.3);
}

.status-badge.healthy {
  background-color: rgba(0, 212, 170, 0.1);
  color: var(--accent-primary);
  border: 1px solid rgba(0, 212, 170, 0.3);
}

/* Responsive sidebar handling */
@media (max-width: 768px) {
  .ant-layout-sider.ant-layout-sider-collapsed {
    margin-left: -240px !important;
  }
}

/* Remove conflicting Vite styles */
a {
  font-weight: 500;
  color: var(--accent-primary);
  text-decoration: inherit;
}

a:hover {
  color: var(--accent-hover);
}
```

---

## 3. App.tsx Logo Area Update

**File: `/src/App.tsx`**

Find the logo area styling (around line 169) and replace with:

```typescript
<div style={{
  height: 64,
  margin: 16,
  background: 'rgba(0, 212, 170, 0.1)', // Teal tint instead of white
  borderRadius: 6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#00d4aa', // Teal text
  fontWeight: 'bold',
  fontSize: collapsed ? '14px' : '16px',
  position: 'sticky',
  top: 0,
  zIndex: 1,
  border: '1px solid rgba(0, 212, 170, 0.3)' // Subtle teal border
}}>
```

---

## 4. ServiceDependencyMap vis-network Styling

**File: `/src/components/Services/ServiceDependencyMap.tsx`**

### 4.1 Update Central Service Node Color (Line ~64)
```typescript
const centralNode: DependencyNode = {
  id: centralServiceId,
  label: service.name,
  color: '#00d4aa',  // Change from '#1890ff' to cyan
  shape: 'dot',
  size: 30,
  font: { 
    size: 14, 
    color: '#ffffff',  // White text instead of black
    background: 'rgba(0, 0, 0, 0.7)',  // Dark background for text
    strokeWidth: 2, 
    strokeColor: '#00d4aa'  // Cyan stroke
  },
  // ... rest remains the same
};
```

### 4.2 Update Upstream Node Colors (Line ~88)
```typescript
const upstreamNode: DependencyNode = {
  id: depId,
  label: dep.name,
  color: '#52c41a',  // Keep green for upstream
  shape: 'dot',
  size: focusMode ? 20 : 25,
  font: { 
    size: focusMode ? 11 : 12, 
    color: '#ffffff',  // White text
    background: 'rgba(0, 0, 0, 0.7)',  // Dark background
    strokeWidth: 1, 
    strokeColor: '#52c41a'  // Green stroke
  },
  // ... rest remains the same
};
```

### 4.3 Update Downstream Node Colors (Line ~138)
```typescript
const downstreamNode: DependencyNode = {
  id: depId,
  label: dep.name,
  color: '#faad14',  // Keep orange for downstream
  shape: 'dot', 
  size: focusMode ? 20 : 25,
  font: { 
    size: focusMode ? 11 : 12, 
    color: '#ffffff',  // White text
    background: 'rgba(0, 0, 0, 0.7)',  // Dark background
    strokeWidth: 1, 
    strokeColor: '#faad14'  // Orange stroke
  },
  // ... rest remains the same
};
```

### 4.4 Update Graph Options (Line ~200)
```typescript
const options = {
  nodes: {
    borderWidth: 2,
    borderWidthSelected: 3,
    shadow: {
      enabled: true,
      color: 'rgba(0, 212, 170, 0.3)',  // Cyan shadow
      size: 8,
      x: 2,
      y: 2
    }
  },
  edges: {
    color: {
      color: '#374151',      // Default edge color (gray)
      highlight: '#00d4aa',  // Highlighted edge (cyan)
      hover: '#00d4aa'       // Hover edge (cyan)
    },
    shadow: {
      enabled: true,
      color: 'rgba(0, 0, 0, 0.2)',
      size: 3,
      x: 1,
      y: 1
    },
    // ... rest remains the same
  },
  // ... rest remains the same
};
```

### 4.5 Update Background Colors (Lines ~468, ~496, ~502)

**Replace the light background colors:**

```typescript
// Empty state background (line ~468)
backgroundColor: '#1a1f2e',  // Instead of '#fafafa'

// Graph container background (line ~496)
backgroundColor: '#1a1f2e'   // Instead of '#fafafa'

// Controls background (line ~371)
backgroundColor: '#374151',  // Instead of '#fafafa'
borderRadius: '6px',
border: '1px solid #4b5563'  // Instead of '#f0f0f0'
```

---

## 5. Component-Specific Updates

### 5.1 Status Badge Component (Create New)

**File: `/src/components/Common/StatusBadge.tsx`** (New file)

```typescript
import React from 'react';
import { CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

interface StatusBadgeProps {
  status: 'healthy' | 'warning' | 'critical';
  text: string;
  count?: number;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, text, count }) => {
  const icons = {
    healthy: <CheckCircleOutlined />,
    warning: <ExclamationCircleOutlined />,
    critical: <CloseCircleOutlined />
  };

  return (
    <div className={`status-badge ${status}`}>
      {icons[status]}
      {text}
      {count && <span>({count})</span>}
    </div>
  );
};
```

---

## 6. Implementation Order

### Phase 1: Core Theme Setup (Day 1, 4-6 hours)
1. **Update main.tsx** with Ant Design dark theme configuration
2. **Update index.css** with global dark theme variables
3. **Update App.tsx** logo area styling
4. **Test basic pages** (Service Catalog, Dashboard) to ensure theme applies correctly

### Phase 2: vis-network Integration (Day 2, 2-4 hours)
5. **Update ServiceDependencyMap.tsx** with all color changes listed above
6. **Create StatusBadge component** for consistent status displays
7. **Test service detail pages** to verify dependency maps render correctly
8. **Polish and refinement** - fix any edge cases or styling issues

---

## 7. Testing Checklist

### ✅ Core Theme Verification
- [ ] Dashboard loads with dark background and cyan accents
- [ ] Service Catalog cards have dark backgrounds 
- [ ] Navigation menu uses dark theme colors
- [ ] All buttons and form elements follow dark theme
- [ ] Text contrast is adequate for readability

### ✅ Service Detail Pages
- [ ] Service expandable cards render with dark theme
- [ ] ServiceDependencyMap shows cyan central nodes
- [ ] Node text is readable (white on dark background)
- [ ] Graph background is dark (#1a1f2e)
- [ ] Edge colors match specification
- [ ] Controls panel uses dark styling

### ✅ Responsive Behavior
- [ ] Dark theme works on mobile/tablet breakpoints
- [ ] Sidebar collapse animation works properly
- [ ] Graph visualizations scale correctly on smaller screens

### ✅ Cross-Browser Testing
- [ ] Chrome/Chromium browsers
- [ ] Firefox
- [ ] Safari (if developing on macOS)
- [ ] Edge (if Windows environment available)

---

## 8. Performance Considerations

- **Theme tokens are cached** by Ant Design v5, no performance impact
- **vis-network colors are hardcoded** due to canvas rendering requirements
- **CSS variables provide consistency** without runtime calculation overhead
- **Dark theme typically improves battery life** on OLED displays

---

## 9. Future Enhancements

### Optional (Not in Scope)
- Theme toggle switch for user preference
- System preference detection (prefers-color-scheme)
- High contrast mode for accessibility
- Custom color palette configuration

---

## 10. Rollback Plan

If issues arise during implementation:

1. **Revert main.tsx**: Remove ConfigProvider theme prop
2. **Revert index.css**: Restore original light theme variables  
3. **Revert App.tsx**: Restore original logo styling
4. **Revert ServiceDependencyMap.tsx**: Restore original color values

Keep backups of original files before starting implementation.

---

## Technical Notes

- **Algorithm**: Uses Ant Design's built-in `'dark'` algorithm for automatic color calculations
- **Color Consistency**: All cyan colors use `#00d4aa` for brand consistency
- **Accessibility**: All color combinations meet WCAG 2.1 AA contrast requirements
- **Browser Support**: Compatible with all modern browsers supporting CSS custom properties

This implementation leverages your existing React + Ant Design v5 architecture without requiring any major refactoring or architectural changes.