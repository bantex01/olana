# ServiceMap Components

This directory contains the unified service map implementation for the entire application.

## 🎯 Quick Start

**Use `ServiceMapEasy` everywhere** - it's the single, unified service map component for the entire app.

```typescript
import { ServiceMapEasy } from '../ServiceMap';

// Minimal usage (all defaults)
<ServiceMapEasy />

// With filters and config
<ServiceMapEasy
  filters={{
    namespaces: ['production', 'staging'],
    severities: ['critical', 'fatal'],
    search: 'api'
  }}
  config={{
    height: '500px',
    showControls: true,
    showHeader: true,
    showLegend: true
  }}
  onRefresh={() => console.log('Refreshed!')}
/>
```

## 📁 Architecture

```
ServiceMap/
├── ServiceMapEasy.tsx    ← USE THIS EVERYWHERE (clean 2-5 prop interface)
├── ServiceMap.tsx        ← Internal rendering engine (don't use directly)
├── index.ts              ← Only exports ServiceMapEasy
└── README.md             ← This file
```

## 🔧 ServiceMapEasy Props

### `filters?` (optional)
```typescript
{
  namespaces?: string[];   // Filter to specific namespaces
  severities?: string[];   // Filter by alert severity: 'fatal', 'critical', 'warning'
  tags?: string[];         // Filter by alert tags
  search?: string;         // Search term for services/alerts
}
```

### `config?` (optional)
```typescript
{
  height?: string;                              // Default: '400px'
  showControls?: boolean;                       // Default: true
  showHeader?: boolean;                         // Default: true
  showLegend?: boolean;                         // Default: true
  enableFocusMode?: boolean;                    // Default: true
  enableRefresh?: boolean;                      // Default: true
  enableAutoRefresh?: boolean;                  // Default: false
  defaultLayout?: 'hierarchical' | 'static';   // Default: 'hierarchical'
  defaultIncludeDependentNamespaces?: boolean;  // Default: false
  defaultShowFullChain?: boolean;               // Default: false
}
```

### `onRefresh?` (optional)
```typescript
() => void  // Called when map is refreshed
```

### `onToggleChange?` (optional)
```typescript
(includeDependentNamespaces: boolean, showFullChain: boolean) => void
// Called when user changes map view toggles
```

## 📋 Usage Examples

### Mission Control Dashboard
```typescript
<ServiceMapEasy
  filters={filterState}
  config={{
    height: '500px',
    showControls: true,
    showHeader: true,
    showLegend: true,
    enableFocusMode: true,
    enableRefresh: true,
    enableAutoRefresh: true,
    defaultLayout: 'static'
  }}
  onRefresh={handleRefresh}
  onToggleChange={handleToggleChange}
/>
```

### Service Health Page
```typescript
// Just use defaults - ServiceMapEasy handles everything
<ServiceMapEasy />
```

### Service Drill-Down (scoped to one service)
```typescript
<ServiceMapEasy
  filters={{
    namespaces: [serviceNamespace]  // Show only this service's namespace
  }}
  config={{
    height: '320px',
    showControls: false,
    showHeader: false,
    showLegend: false,
    defaultLayout: 'hierarchical'
  }}
/>
```

### Compact Widget
```typescript
<ServiceMapEasy
  config={{
    height: '200px',
    showControls: false,
    showHeader: false
  }}
/>
```

## 🏗️ How It Works

1. **ServiceMapEasy** provides a clean interface (2-5 props vs old 17+ props)
2. **Internally uses proven hooks**: `useServiceMapData` + `useFilterState`
3. **Passes data to ServiceMap**: The complex vis-network rendering engine
4. **Automatic data fetching**: No manual hook management needed

## ✅ Migration from Old Patterns

**❌ Old way (complex)**:
```typescript
// DON'T DO THIS ANYMORE
const { state, actions } = useFilterState();
const { data, serviceMapData, fetchData } = useServiceMapData();
// ... 20+ lines of useEffect and callback setup
<ServiceMap 
  alerts={serviceMapData.allAlerts}
  nodes={serviceMapData.nodes}
  edges={serviceMapData.edges}
  loading={data.loading}
  totalServices={data.systemHealth.totalServices}
  // ... 12+ more props
/>
```

**✅ New way (clean)**:
```typescript
// DO THIS INSTEAD
<ServiceMapEasy 
  filters={{ namespaces: ['production'] }}
  config={{ height: '500px' }}
/>
```

## 🎯 Design Principles

- **One component to rule them all**: ServiceMapEasy is used everywhere
- **Simple interface**: 2-5 props maximum, sensible defaults
- **Reuses proven logic**: Same hooks and patterns as Mission Control
- **Internal complexity hidden**: ServiceMap.tsx handles vis-network complexity
- **Consistent behavior**: Same alerts, same styling, same interactions everywhere

## 🔍 Current Usage

- ✅ Mission Control dashboard
- ✅ Service Health page  
- ✅ Service drill-down modals
- ✅ Rich service detail views

---

**💡 Remember**: Always use `ServiceMapEasy` - never import `ServiceMap` directly!