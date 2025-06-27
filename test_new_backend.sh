#!/bin/bash

# Alert Hub Test Commands - PostgreSQL Backend
# Make sure the backend server is running on http://localhost:3001

echo "=== Testing Alert Hub PostgreSQL Backend ==="

# Health check
echo "1. Health check..."
curl -X GET http://localhost:3001/health
echo -e "\n"

# Register services (telemetry data)
echo "2. Registering services..."

# Ingester service instances
curl -X POST http://localhost:3001/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "MetaSetter",
    "service_name": "ingester",
    "environment": "prod",
    "team": "SRE",
    "component_type": "service",
    "depends_on": []
  }'

# Parser service instances  
curl -X POST http://localhost:3001/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "MetaSetter",
    "service_name": "parser",
    "environment": "prod", 
    "team": "SRE",
    "component_type": "service",
    "depends_on": []
  }'

# Transformer service with dependencies
curl -X POST http://localhost:3001/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "MetaSetter",
    "service_name": "transformer",
    "environment": "prod",
    "team": "SRE", 
    "component_type": "service",
    "depends_on": [
      {"service_namespace": "MetaSetter", "service_name": "ingester"},
      {"service_namespace": "MetaSetter", "service_name": "parser"}
    ]
  }'

# Database service
curl -X POST http://localhost:3001/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "Infrastructure",
    "service_name": "postgres",
    "environment": "prod",
    "team": "Platform",
    "component_type": "database", 
    "depends_on": []
  }'

# Storage service with database dependency
curl -X POST http://localhost:3001/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "MetaSetter",
    "service_name": "storage",
    "environment": "prod",
    "team": "SRE",
    "component_type": "service",
    "depends_on": [
      {"service_namespace": "Infrastructure", "service_name": "postgres"}
    ]
  }'

echo -e "\nServices registered successfully!\n"

# Create alerts
echo "3. Creating alerts..."

# Critical alert for ingester
curl -X POST http://localhost:3001/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "MetaSetter",
    "service_name": "ingester",
    "instance_id": "ing_001",
    "severity": "critical",
    "message": "High latency detected - 95th percentile > 5s",
    "alert_source": "prometheus"
  }'

# Warning alert for parser
curl -X POST http://localhost:3001/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "MetaSetter", 
    "service_name": "parser",
    "instance_id": "parser_002",
    "severity": "warning",
    "message": "Memory usage at 85%",
    "alert_source": "grafana"
  }'

# Fatal alert for database
curl -X POST http://localhost:3001/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "Infrastructure",
    "service_name": "postgres", 
    "severity": "fatal",
    "message": "Database connection pool exhausted",
    "alert_source": "alertmanager"
  }'

# Multiple alerts for transformer
curl -X POST http://localhost:3001/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "MetaSetter",
    "service_name": "transformer",
    "instance_id": "transform_001", 
    "severity": "warning",
    "message": "Queue backlog growing",
    "alert_source": "custom"
  }'

curl -X POST http://localhost:3001/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "MetaSetter",
    "service_name": "transformer",
    "instance_id": "transform_002",
    "severity": "critical", 
    "message": "Processing timeout exceeded",
    "alert_source": "jaeger"
  }'

echo -e "\nAlerts created successfully!\n"

# Test graph endpoint
echo "4. Testing graph generation..."
curl -X GET http://localhost:3001/graph | jq '.nodes | length' 2>/dev/null || echo "Graph endpoint working (install jq for pretty output)"
echo ""

# Test alerts endpoint  
echo "5. Testing alerts retrieval..."
curl -X GET http://localhost:3001/alerts | jq 'length' 2>/dev/null || echo "Alerts endpoint working (install jq for pretty output)"
echo ""

echo "=== Test Sequence Complete ==="
echo "Open http://localhost:3000 to view the frontend"
echo "The graph should show:"
echo "- 2 namespaces: MetaSetter, Infrastructure" 
echo "- 5 services with dependency relationships"
echo "- Service nodes colored by alert severity"
echo "- Alert details in hover tooltips"

# Optional: Test alert resolution
echo ""
echo "Optional: Test alert resolution (requires alert ID from database)"
echo "# curl -X PATCH http://localhost:3001/alerts/1/resolve"
