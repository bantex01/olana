# ServiceMap Component Usage Guide

## ✅ Plug-and-Play Usage (Recommended)

Use `ServiceMapWrapper` for new implementations - it handles all data correlation automatically:

```tsx
import { ServiceMapWrapper } from '../ServiceMap/ServiceMapWrapper';

// Simple usage - just pass raw data
<ServiceMapWrapper
  alerts={allAlerts}           // Raw alert array from API
  nodes={rawNodes}            // Raw node array (no alertCount needed)
  edges={edges}               // Edge connections
  config={{
    height: '500px',
    showControls: true,
    showHeader: true,
    showLegend: true
  }}
/>
```

## ⚠️ Legacy Usage (Mission Control)

The original `ServiceMap` component requires pre-processed data:

```tsx
import { ServiceMap } from '../ServiceMap/ServiceMap';

// Requires nodes with alertCount/highestSeverity already set
<ServiceMap
  alerts={allAlerts}
  nodes={nodesWithAlertCorrelation}  // Must have alertCount/highestSeverity
  edges={edges}
  loading={loading}
  totalServices={totalServices}
  lastUpdated={new Date()}
  includeDependentNamespaces={includeDependentNamespaces}
  showFullChain={showFullChain}
  onIncludeDependentNamespacesChange={setIncludeDependentNamespaces}
  onShowFullChainChange={setShowFullChain}
  onRefresh={refreshData}
  config={{...}}
/>
```

## 🔧 Required Data Structures

### Alert Structure
```typescript
type Alert = {
  service_namespace: string;  // Used for node correlation
  service_name: string;       // Used for node correlation  
  severity: 'fatal' | 'critical' | 'warning' | 'none';
  // ... other properties
}
```

### Node Structure
```typescript
type Node = {
  id: string;                 // Must match "${service_namespace}::${service_name}"
  label: string;
  nodeType: 'service' | 'namespace';
  // ServiceMapWrapper auto-adds these:
  alertCount?: number;        // Auto-computed from alerts
  highestSeverity?: string;   // Auto-computed from alerts
  // ... other properties
}
```

## 🚀 Migration Guide

**From ServiceMap to ServiceMapWrapper:**
1. Replace `ServiceMap` import with `ServiceMapWrapper`
2. Remove any manual `alertCount`/`highestSeverity` computation
3. Pass raw nodes and alerts - wrapper handles correlation
4. Keep all other props the same

**Benefits:**
- ✅ Truly plug-and-play
- ✅ Automatic alert correlation
- ✅ No hidden data dependencies
- ✅ Works anywhere with any data
- ✅ Built-in debugging for development

## 🐛 Troubleshooting

**If nodes don't pulse:**
1. Check browser console for `[ServiceMapWrapper]` debug logs
2. Verify node IDs match `${alert.service_namespace}::${alert.service_name}`
3. Ensure alerts array contains expected data structure
4. Verify nodes have `nodeType: 'service'`

**If modal/sizing issues:**
1. Use proper height values (`'500px'`, `'100%'`, `calc(100vh - 100px)`)
2. Ensure parent container has defined height
3. Check for CSS conflicts with positioning

## ✅ Current Implementation Status

- **Mission Control**: Uses legacy `ServiceMap` (works due to backend correlation)
- **Service Health Drill-down**: Uses new `ServiceMapWrapper` (fully plug-and-play)
- **Future implementations**: Should use `ServiceMapWrapper`

This ensures consistent behavior and eliminates the integration complexity we experienced.