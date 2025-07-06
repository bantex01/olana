# Service Dependency Visualization App

A real-time service dependency visualization tool that constructs interactive service topology graphs from OpenTelemetry telemetry data, featuring automatic dependency detection and comprehensive alert overlays.

![Service Graph](docs/service-graph-screenshot.png)

## 🌟 Features

### 📊 **Dynamic Service Topology**
- **Real-time graph generation** from OpenTelemetry data without static configuration
- **Automatic dependency detection** via span parent-child relationship analysis
- **Namespace-level dependencies** for business service relationships
- **Interactive graph visualization** with zoom, pan, and node selection

### 🔍 **External Dependency Enrichment**
- **HTTP API call tracking** - External REST/HTTP calls with host, method, path, and frequency
- **Database interaction visibility** - Database operations with system type, host, operation details
- **RPC service discovery** - gRPC and other RPC calls with service names and methods
- **Smart filtering** - Automatically excludes internal/localhost calls while tracking external dependencies

### 🚨 **Comprehensive Alert Integration**
- **Alert overlay on topology** - Visual indication of service health directly on the graph
- **Severity-based coloring** - Critical (red), Warning (orange), Fatal (black) service nodes
- **Alert aggregation** - Multiple alerts per service with count indicators
- **Real-time alert updates** - Live alert status updates without page refresh

### 🎛️ **Advanced Filtering & Navigation**
- **Multi-dimensional filtering** by tags, namespaces, teams, alert severity
- **Dependency blast radius** - Show upstream/downstream dependencies of selected namespaces
- **Tag-based service discovery** - Filter services by technology stack, criticality, or custom tags
- **Interactive tooltips** - Rich service metadata including alerts, dependencies, and external calls

### 📈 **Operational Intelligence**
- **Service metadata enrichment** - Team ownership, environment, component type, technology stack
- **Dependency change tracking** - Historical view of how service relationships evolve
- **Performance correlation** - Link service dependencies to alert patterns
- **Namespace dependency management** - Business-level service relationship modeling

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Applications  │───▶│  OTEL Exporter  │───▶│   Backend API   │
│  (Instrumented) │    │ (Custom Built)  │    │  (Node.js/TS)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
                                            ┌─────────────────┐
                                            │   PostgreSQL    │
                                            │   (Database)    │
                                            └─────────────────┘
                                                       ▲
                                                       │
┌─────────────────┐    ┌─────────────────┐           │
│  React Frontend │◄───│   Vis.js Graph  │───────────┘
│   (TypeScript)  │    │ (Visualization) │
└─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 12+
- **OpenTelemetry instrumented applications** with the custom service discovery exporter

### 1. Database Setup

```bash
# Create database
createdb alert_hub

# Run schema
psql -d alert_hub -f schema.sql
```

### 2. Backend Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Start backend
npm run dev
```

### 3. Frontend Setup

```bash
# In a separate terminal
cd frontend

# Install dependencies  
npm install

# Start development server
npm start
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 📊 Database Schema

### Core Tables

```sql
-- Services table with enrichment data
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    service_namespace VARCHAR(255) NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    environment VARCHAR(100),
    team VARCHAR(100),
    component_type VARCHAR(50),
    tags TEXT[] DEFAULT '{}',
    external_calls JSONB DEFAULT '[]',    -- NEW: HTTP API calls
    database_calls JSONB DEFAULT '[]',    -- NEW: Database interactions  
    rpc_calls JSONB DEFAULT '[]',         -- NEW: RPC service calls
    created_at TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),
    UNIQUE(service_namespace, service_name)
);

-- Service dependencies (trace-based)
CREATE TABLE service_dependencies (
    id SERIAL PRIMARY KEY,
    from_service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    to_service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),
    UNIQUE(from_service_id, to_service_id)
);

-- Namespace dependencies (business-level)
CREATE TABLE namespace_dependencies (
    id SERIAL PRIMARY KEY,
    from_namespace VARCHAR(255) NOT NULL,
    to_namespace VARCHAR(255) NOT NULL,
    created_by VARCHAR(255),
    dependency_type VARCHAR(50) DEFAULT 'manual',
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(from_namespace, to_namespace)
);

-- Alerts with deduplication
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    instance_id VARCHAR(255) DEFAULT '',
    severity VARCHAR(20) CHECK (severity IN ('fatal', 'critical', 'warning', 'none')),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'firing' CHECK (status IN ('firing', 'resolved')),
    count INTEGER DEFAULT 1,
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    alert_source VARCHAR(100) DEFAULT 'manual',
    external_alert_id VARCHAR(255),
    UNIQUE(service_id, instance_id, severity, message)
);
```

## 🔌 API Endpoints

### Service Data Management

#### `POST /telemetry`
Receives service metadata and enrichment data from OpenTelemetry exporter.

**Request Body:**
```json
{
  "service_namespace": "ecommerce",
  "service_name": "checkout-service",
  "environment": "production", 
  "team": "payments",
  "component_type": "service",
  "tags": ["critical", "golang"],
  "depends_on": [
    {"service_namespace": "ecommerce", "service_name": "payment-service"}
  ],
  "external_calls": [
    {"host": "api.stripe.com", "method": "POST", "path": "/v1/charges", "count": 45}
  ],
  "database_calls": [
    {"system": "postgresql", "name": "checkout_db", "host": "postgres:5432", "operation": "SELECT", "count": 234}
  ],
  "rpc_calls": [
    {"service": "PaymentService", "method": "ProcessPayment", "count": 23}
  ]
}
```

#### `GET /graph`
Returns service topology with enrichment data for visualization.

**Query Parameters:**
- `tags`: Filter by service tags (comma-separated)
- `namespaces`: Filter by namespaces (comma-separated)  
- `severities`: Filter by alert severity (comma-separated)
- `includeDependents`: Include dependent namespaces (boolean)

**Response:**
```json
{
  "nodes": [
    {
      "id": "ecommerce::checkout-service",
      "label": "checkout-service", 
      "nodeType": "service",
      "team": "payments",
      "tags": ["critical", "golang"],
      "alertCount": 2,
      "highestSeverity": "critical",
      "external_calls": [...],
      "database_calls": [...], 
      "rpc_calls": [...]
    }
  ],
  "edges": [
    {
      "from": "ecommerce::checkout-service",
      "to": "ecommerce::payment-service",
      "edgeType": "service"
    }
  ]
}
```

### Alert Management

#### `POST /alerts`
Creates or updates alerts with automatic deduplication.

**Request Body:**
```json
{
  "service_namespace": "ecommerce",
  "service_name": "checkout-service",
  "instance_id": "checkout-001",
  "severity": "critical",
  "message": "High response time detected",
  "alert_source": "prometheus"
}
```

#### `GET /alerts`
Retrieves active alerts with filtering support.

**Query Parameters:**
- `tags`: Filter by service tags
- `namespaces`: Filter by namespaces
- `severities`: Filter by alert severity

### Namespace Dependencies

#### `POST /namespace-dependencies`
Creates business-level namespace dependencies.

#### `GET /namespace-dependencies`
Lists all namespace dependencies.

#### `DELETE /namespace-dependencies/:id`
Removes a namespace dependency.

### Utility Endpoints

#### `GET /tags`
Returns all available service tags.

#### `PUT /services/:namespace/:name/tags`
Updates tags for a specific service.

#### `GET /health`
Health check endpoint.

## 🎨 Frontend Features

### Interactive Graph Visualization

**Built with:**
- **React** + **TypeScript** for type-safe development
- **Vis.js Network** for interactive graph rendering
- **Modern CSS** with responsive design

**Graph Features:**
- **Physics-based layout** with force-directed positioning
- **Smooth animations** and transitions
- **Zoom and pan** controls
- **Node clustering** for large topologies
- **Edge styling** for different dependency types

### Advanced Filtering Interface

```typescript
// Filter by multiple dimensions
const filters = {
  tags: ['critical', 'frontend'],
  namespaces: ['ecommerce', 'payments'],
  severities: ['critical', 'warning'],
  includeDependents: true  // Show blast radius
};
```

### Rich Tooltips with Enrichment Data

Tooltips display comprehensive service information:

```
checkout-service
Type: service
Team: payments
Environment: production
Component: service
Tags: critical, golang, version:1.2.3

External HTTP Calls:
• POST api.stripe.com/v1/charges (45x)
• POST api.sendgrid.com/v3/mail/send (12x)

Database Calls:
• SELECT postgresql (checkout_db) @ postgres:5432 (234x)
• GET redis @ redis:6379 (89x)

RPC Calls:
• PaymentService.ProcessPayment (23x)
• InventoryService.ReserveItems (19x)

Alerts:
• [critical] High response time detected (checkout-001) [x3] - Last: 2025-01-15 10:30:00
• [warning] Memory usage high (checkout-002) [x1] - Last: 2025-01-15 10:25:00
```

### Real-time Updates

- **Automatic polling** for graph and alert data
- **Change detection** to minimize unnecessary re-renders
- **Smooth transitions** when topology changes
- **Live alert status** updates

## ⚙️ Configuration

### Environment Variables

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=alert_hub
DB_USER=postgres
DB_PASSWORD=password

# Application Configuration  
PORT=3001
NODE_ENV=development

# Optional: API Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # requests per window
```

### Frontend Configuration

```typescript
// src/config.ts
export const config = {
  apiBaseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  pollInterval: 30000,  // 30 seconds
  maxNodes: 1000,       // Graph performance limit
  enableDebugLogging: process.env.NODE_ENV === 'development'
};
```

## 🔧 Development

### Backend Development

```bash
# Install dependencies
npm install

# Run in development mode with hot reload
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Build for production
npm run build
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build
```

### Database Migrations

```bash
# Run migrations
npm run migrate

# Reset database (development only)
npm run db:reset

# Seed test data
npm run db:seed
```

## 📊 Sample Data

### Test Service Data

```bash
# Create sample services with enrichment
curl -X POST http://localhost:3001/telemetry -H "Content-Type: application/json" -d '{
  "service_namespace": "ecommerce",
  "service_name": "frontend",
  "environment": "production",
  "team": "frontend",
  "component_type": "frontend",
  "tags": ["critical", "nodejs"],
  "depends_on": [
    {"service_namespace": "ecommerce", "service_name": "api-gateway"}
  ],
  "external_calls": [
    {"host": "api.google.com", "method": "GET", "path": "/analytics", "count": 150}
  ],
  "rpc_calls": [
    {"service": "UserService", "method": "GetProfile", "count": 89}
  ]
}'

# Create sample alerts
curl -X POST http://localhost:3001/alerts -H "Content-Type: application/json" -d '{
  "service_namespace": "ecommerce",
  "service_name": "frontend",
  "severity": "warning",
  "message": "High response time detected"
}'
```

### Load Test Data

```bash
# Load comprehensive test dataset
npm run load-test-data
```

## 🚀 Deployment

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Backend
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Frontend build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

WORKDIR /app
EXPOSE 3001

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - DB_HOST=postgres
      - DB_NAME=alert_hub
      - DB_USER=postgres
      - DB_PASSWORD=password
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=alert_hub
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./schema.sql:/docker-entrypoint-initdb.d/schema.sql

volumes:
  postgres_data:
```

### Kubernetes Deployment

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: service-dependency-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: service-dependency-app
  template:
    metadata:
      labels:
        app: service-dependency-app
    spec:
      containers:
      - name: app
        image: your-registry/service-dependency-app:latest
        ports:
        - containerPort: 3001
        env:
        - name: DB_HOST
          value: postgres-service
        - name: DB_NAME
          value: alert_hub
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: service-dependency-app
spec:
  selector:
    app: service-dependency-app
  ports:
  - port: 80
    targetPort: 3001
  type: LoadBalancer
```

## 🔍 Monitoring & Observability

### Application Metrics

The app exposes metrics for monitoring:

- **Service topology metrics**: Node/edge counts, update frequency
- **Alert metrics**: Alert counts by severity, resolution times
- **API performance**: Response times, error rates
- **Database metrics**: Query performance, connection pool usage

### Health Checks

```bash
# Application health
curl http://localhost:3001/health

# Database connectivity
curl http://localhost:3001/health/db

# Dependency health  
curl http://localhost:3001/health/deps
```

### Logging

Structured logging with correlation IDs:

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Service topology updated",
  "correlationId": "req-123",
  "services": 45,
  "dependencies": 67,
  "alerts": 12
}
```

## 🛠️ Troubleshooting

### Common Issues

#### **Graph not showing services**
1. Check that the OpenTelemetry exporter is sending data:
   ```bash
   # Check recent telemetry
   curl http://localhost:3001/graph
   ```
2. Verify database connectivity:
   ```bash
   curl http://localhost:3001/health
   ```
3. Check exporter configuration and endpoint URL

#### **Missing enrichment data in tooltips**
1. Verify enrichment is enabled in the exporter config
2. Check that services have external dependencies (HTTP, DB, RPC calls)
3. Ensure JSONB data is being parsed correctly:
   ```sql
   SELECT service_name, external_calls, database_calls, rpc_calls 
   FROM services WHERE external_calls != '[]';
   ```

#### **Alerts not appearing**
1. Check alert endpoint:
   ```bash
   curl http://localhost:3001/alerts
   ```
2. Verify alert data format and severity values
3. Check frontend filtering - alerts may be filtered out

#### **Performance issues with large topologies**
1. Reduce graph physics iterations:
   ```typescript
   physics: {
     stabilization: {iterations: 100}  // Reduce from default
   }
   ```
2. Enable clustering for large graphs
3. Implement pagination for services/alerts

### Debug Mode

Enable debug logging:

```bash
# Backend debug
DEBUG=app:* npm run dev

# Frontend debug  
REACT_APP_DEBUG=true npm start
```

### Database Debugging

```sql
-- Check service distribution
SELECT service_namespace, COUNT(*) 
FROM services 
GROUP BY service_namespace;

-- Check dependency counts
SELECT COUNT(*) as total_dependencies 
FROM service_dependencies;

-- Check alert distribution
SELECT severity, COUNT(*) 
FROM alerts 
WHERE status = 'firing' 
GROUP BY severity;

-- Check enrichment data
SELECT 
  service_name,
  jsonb_array_length(external_calls) as external_count,
  jsonb_array_length(database_calls) as db_count,
  jsonb_array_length(rpc_calls) as rpc_count
FROM services
WHERE external_calls != '[]' OR database_calls != '[]' OR rpc_calls != '[]';
```

## 🤝 Contributing

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Make** your changes with tests
4. **Run** the test suite: `npm test`
5. **Commit** your changes: `git commit -m 'Add amazing feature'`
6. **Push** to the branch: `git push origin feature/amazing-feature`
7. **Open** a Pull Request

### Code Standards

- **TypeScript** for type safety
- **ESLint** + **Prettier** for code formatting
- **Jest** for testing
- **Conventional Commits** for commit messages

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --testNamePattern="graph"

# Run frontend tests
cd frontend && npm test
```

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🎯 Roadmap

### Upcoming Features

- 🔄 **Real-time streaming** updates via WebSockets
- 📊 **Historical topology** tracking and replay
- 🎨 **Custom graph layouts** (hierarchical, circular, etc.)
- 🔍 **Advanced search** and filtering capabilities
- 📈 **Performance metrics** integration with service nodes
- 🤖 **ML-based anomaly** detection for dependencies
- 🔐 **RBAC and multi-tenancy** support
- 📱 **Mobile-responsive** interface

### Current Version: v2.0.0

- ✅ Span attributes analysis for external dependencies
- ✅ HTTP/Database/RPC call tracking and visualization  
- ✅ Enhanced filtering and namespace dependency blast radius
- ✅ Rich tooltips with comprehensive service information
- ✅ Improved performance and memory management

---

**Built with ❤️ for modern microservices observability**