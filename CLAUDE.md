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

