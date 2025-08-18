# Description of Project
We're building a tool that dynamically constructs real-time service dependency maps using OpenTelemetry telemetry data (not just maps from trace data but maps of whole end to end business services including containers, VMs, CICD actions etc.)— without relying on traditional service discovery or static configuration. The system ingests component metadata and dependency relationships directly from emitted telemetry, enabling precise modeling of how services and components relate in any environment. On top of this live topology, we overlay alerts (starting with integrations like Alertmanager) directly onto the graph, showing severity, volume, and propagation paths in real context. This gives SRE and operations teams a powerful visual interface that connects infrastructure and application alerts to the services they affect — something current alerting UIs (like Grafana, PagerDuty, or Datadog) often lack, as they tend to separate alerting from the actual service topology. Our focus is on making alerts meaningful and actionable in context, improving incident response and understanding of systemic risk.

## Current Production Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API    │    │   Database      │
│   (Vercel)      │◄──►│   (Render)       │◄──►│   (Supabase)    │
│                 │    │                  │    │                 │
│ - React + Vite  │    │ - Node.js + TS   │    │ - PostgreSQL    │
│ - Ant Design v5 │    │ - Express.js     │    │ - Session Pool  │
│ - Graph Viz     │    │ - Persistent     │    │ - 15 Conn Limit │
│ - Service Maps  │    │   Containers     │    │ - Optimized     │
└─────────────────┘    │ - Connection     │    │   Indexes       │
                       │   Pooling        │    │ - Materialized  │
┌─────────────────┐    │ - Query Monitor  │    │   Views         │
│ Custom OTel     │    │ - Retry Logic    │    │ - Auto Backups  │
│ Exporter        │◄──►│ - Performance    │    └─────────────────┘
│ (Local/Private) │    │   Monitoring     │                      
│                 │    └──────────────────┘                      
│ - Span Caching  │                                              
│ - Dependency    │    ┌──────────────────┐                      
│   Detection     │    │   Alertmanager   │                      
│ - Call Tracking │◄──►│   Integration    │                      
│ - Valuable IP   │    │   (Webhook)      │                      
└─────────────────┘    └──────────────────┘                      
```

## Technology Stack (Current)

### Frontend (Vercel)
- **Framework**: React 19 + TypeScript + Vite
- **UI Library**: Ant Design v5 (latest)
- **Visualization**: Cytoscape.js, vis-network
- **Build**: Optimized Vite builds
- **Environment**: Serverless edge functions
- **API Integration**: Environment-aware API switching (`VITE_API_BASE_URL`)

### Backend (Render)
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with structured middleware
- **Database**: PostgreSQL (Supabase) with optimized connection pooling
- **Features**: 
  - Persistent containers (not serverless)
  - Connection retry logic with exponential backoff
  - Query timeout handling and monitoring
  - Real-time performance metrics
  - Health check endpoints
- **Monitoring**: Custom query performance tracking, connection pool monitoring
- **Environment**: Production-ready with proper error handling

### Database (Supabase)
- **Type**: Managed PostgreSQL with session pooling
- **Connection Limits**: 15 connections (free tier)
- **Optimizations**: 
  - 15+ strategic indexes for query performance
  - Materialized views for expensive aggregations
  - Connection pooling optimized for Render architecture
- **Backup**: Automatic Supabase backups
- **Migration**: Custom migration system with environment-specific configs

### DevOps & Operations
- **Migration System**: Environment-specific database migrations
- **Local Development**: Easy environment switching with npm scripts
- **Deployment**: Git-based CI/CD with Vercel and Render
- **Monitoring**: Performance endpoints, health checks, recommendations
- **Configuration**: Environment-aware settings, secure credential management

## Development Workflow (Current)

### Local Development Setup
```bash
# Backend (points to local PostgreSQL)
cd backend-api
npm run dev

# Frontend (points to local backend)  
npm run dev:local

# Database migrations
npm run db:migrate:local
```
Full details are in DATABSE_OPERATIONS.MD

### Production Deployment
```bash
# Deploy backend to Render
git push origin main

# Apply database migrations to Supabase
npm run db:migrate:prod

# Frontend automatically deploys to Vercel on git push
```

### Database Operations
- **Local Testing**: `.env.migration.local` for local PostgreSQL
- **Production Updates**: `.env.migration.prod` for Supabase
- **Performance Monitoring**: Real-time endpoints at `/performance/*`
- **Cache Management**: Manual refresh via API or automated scheduling

## Performance Characteristics (Current)

### Response Times (Optimized)
- **Services Overview**: ~200ms (regular), ~50ms (fast mode with cache)
- **Service Details**: ~100ms (with indexes)
- **Alert Queries**: ~80ms (with optimized indexes)
- **Graph Traversals**: ~150ms (persistent connections + indexes)

### Scalability Metrics
- **Database Connections**: 12 max pool (3 connection buffer from 15 limit)
- **Query Monitoring**: Real-time slow query detection (>5s threshold)
- **Error Recovery**: 3 retry attempts with exponential backoff
- **Cache Hit Ratio**: ~80% for dashboard loads (materialized view)

### Reliability Features
- **Connection Retry**: Exponential backoff for network issues
- **Query Timeouts**: 30s default, 60s for critical operations
- **Health Monitoring**: Automated health checks with alerting capability
- **Error Handling**: Structured error responses with correlation IDs

# Reusable Service Map & Filter Components

When creating new pages that need service maps and/or filtering capabilities, use these standardized patterns:

## Quick Setup for Service Map + Filters

  ```typescript
  import { useFilterState } from '../../hooks/useFilterState';
  import { useServiceMapData } from '../../hooks/useServiceMapData';
  import { AlertsFilters } from '../Incidents/AlertsFilters';
  import { ServiceMap } from '../ServiceMap';

  const MyNewPage = () => {
    const { state, actions, helpers } = useFilterState();
    const { data, serviceMapData, fetchData } = useServiceMapData();

    // Fetch data when filters change
    useEffect(() => {
      const filters = helpers.buildGraphFilters();
      const options = {
        includeDependentNamespaces: state.includeDependentNamespaces,
        showFullChain: state.showFullChain
      };
      fetchData(filters, options);
    }, [state.selectedNamespaces, state.selectedSeverities, state.selectedTags, state.searchTerm]);

    return (
      <div>
        {/* Filters */}
        <AlertsFilters
          selectedSeverities={state.selectedSeverities}
          selectedNamespaces={state.selectedNamespaces}
          selectedTags={state.selectedTags}
          searchTerm={state.searchTerm}
          availableNamespaces={state.availableNamespaces}
          availableTags={state.availableTags}
          onSeverityChange={actions.handleSeverityChange}
          onNamespaceChange={actions.handleNamespaceChange}
          onTagsChange={actions.handleTagsChange}
          onSearchChange={actions.handleSearchChange}
          onClearAll={actions.handleClearAll}
        />

        {/* Service Map */}
        <ServiceMap
          alerts={serviceMapData.allAlerts}
          nodes={serviceMapData.nodes}
          edges={serviceMapData.edges}
          loading={data.loading}
          totalServices={data.systemHealth.totalServices}
          config={{
            height: '500px',
            showControls: true,
            showHeader: true,
            showLegend: true
          }}
        />
      </div>
    );
  };

  Architecture Notes

  - useFilterState: Manages all filter state and provides clean handlers
  - useServiceMapData: Handles data fetching with filtering support
  - ServiceMap: Configurable component that can be embedded anywhere
  - AlertsFilters: Reusable filter UI component

  This pattern ensures consistency and makes adding service maps to new pages trivial.

## Agents and experts
You have the following experts and agents available to you that you should use/consult with:

typescript-react-frontend-engineer 
observability-engineer
postgres-typescript-backend-engineer
ui-ux-design-expert
saas-observability-gtm-expert

# Card Library Architecture

  Our application uses a centralized card library for consistent, reusable UI components across all pages.

  ## 📁 Card Library Structure

  src/components/Cards/
  ├── index.ts                    # Central export point - import all cards from here
  ├── Metrics/                    # System-level metrics (services, alerts, counts)
  │   ├── TotalServicesCard.tsx
  │   ├── ServicesWithIssuesCard.tsx
  │   ├── OpenAlertsLast24hCard.tsx
  │   ├── TotalOpenAlertsCard.tsx
  │   └── index.ts
  ├── Performance/               # Performance metrics (MTTR, MTTA, SLA)
  │   ├── MTTACard.tsx
  │   ├── MTTALast24hCard.tsx
  │   ├── MTTRCard.tsx
  │   ├── MTTRLast24hCard.tsx
  │   └── index.ts
  └── Services/                  # Service-specific cards (health, alerts, connectivity)
      ├── ServiceHealthCard.tsx  # (will be moved here during refactoring)
      ├── ServiceAlertsCard.tsx  # (will be moved here during refactoring)
      └── index.ts

  ## 🎯 **Card Design Principles**

  ### 1. Self-Contained Components
  Each card is a complete, standalone component with:
  - Clean props interface
  - Consistent Ant Design styling (Card + Statistic)
  - Loading states
  - Appropriate icons and colors

  ### 2. Standard Props Pattern
  ```typescript
  interface CardProps {
    value: number | string;
    loading?: boolean;
    // Additional card-specific props as needed
  }

  3. Organized by Purpose

  - Metrics/: System-wide counts and totals
  - Performance/: Time-based performance metrics
  - Services/: Service-specific detailed cards

  💡 Usage Examples

  Import from centralized location:

  import {
    TotalServicesCard,
    ServicesWithIssuesCard,
    MTTACard,
    ServiceHealthCard
  } from '../Cards';

  Use in any layout:

  <Row gutter={[16, 16]}>
    <Col span={6}>
      <TotalServicesCard value={totalServices} loading={loading} />
    </Col>
    <Col span={6}>
      <ServicesWithIssuesCard value={servicesWithIssues} loading={loading} />
    </Col>
  </Row>

  🔄 Migration Strategy

  When refactoring existing pages:
  1. Check if cards exist in the library before creating new ones
  2. Move existing cards from src/components/Services/ to appropriate library location
  3. Update imports to use centralized Cards export
  4. Follow Mission Control as the production standard template

  ⚠️ Important Notes

  - Mission Control (FilteredDashboard.tsx) is the reference implementation
  - Don't duplicate cards - reuse existing ones or create new ones in the library
  - Maintain consistency - all cards should follow the established patterns
  - Pages decide layout - cards are building blocks, layouts are page-specific

  This gives future sessions a clear roadmap for maintaining and extending the card library!


