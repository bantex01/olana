#!/bin/bash

# Test Telemetry and Alert Generation Script
# Usage: ./generate_test_data.sh [base_url]
# Default base_url: http://localhost:3001

BASE_URL=${1:-"http://localhost:3001"}

echo "🚀 Generating test telemetry and alerts for $BASE_URL"
echo ""

# Clear any existing data (if you add a clear endpoint later)
# curl -X DELETE "$BASE_URL/clear" 2>/dev/null

echo "📡 Creating telemetry data..."

# MetaSetter namespace services
echo "  → MetaSetter ingester instances"
curl -s -X POST "$BASE_URL/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "MetaSetter",
    "service_name": "ingester",
    "instance_id": "ing_001",
    "environment": "prod",
    "team": "SRE",
    "component_type": "service",
    "depends_on": []                                                               
  }'

curl -s -X POST "$BASE_URL/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "MetaSetter",
    "service_name": "ingester",
    "instance_id": "ing_002",
    "environment": "prod",
    "team": "SRE",
    "component_type": "service",
    "depends_on": []                                                               
  }'

echo "  → MetaSetter parser instances"
curl -s -X POST "$BASE_URL/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "MetaSetter",
    "service_name": "parser",
    "instance_id": "parser_001",
    "environment": "prod",
    "team": "SRE",
    "component_type": "service",
    "depends_on": []                                                               
  }'

curl -s -X POST "$BASE_URL/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "MetaSetter",
    "service_name": "parser",
    "instance_id": "parser_002",
    "environment": "prod",
    "team": "SRE",
    "component_type": "service",
    "depends_on": []                                                               
  }'

echo "  → MetaSetter transformer service (no instances)"
curl -s -X POST "$BASE_URL/telemetry" \
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

# CORE namespace services
echo "  → CORE payment services"
curl -s -X POST "$BASE_URL/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "CORE",
    "service_name": "payment_api",
    "instance_id": "pay_001",
    "environment": "prod",
    "team": "payments",
    "component_type": "api",
    "depends_on": [
      {"service_namespace": "CORE", "service_name": "database"}
    ]
  }'

curl -s -X POST "$BASE_URL/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "CORE",
    "service_name": "payment_api",
    "instance_id": "pay_002",
    "environment": "prod",
    "team": "payments",
    "component_type": "api",
    "depends_on": [
      {"service_namespace": "CORE", "service_name": "database"}
    ]
  }'

echo "  → CORE database service (no instances)"
curl -s -X POST "$BASE_URL/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "CORE",
    "service_name": "database",
    "environment": "prod",
    "team": "platform",
    "component_type": "database",
    "depends_on": []
  }'

echo ""
echo "🚨 Creating test alerts..."

# Alert for specific instance
echo "  → Instance-level alert"
curl -s -X POST "$BASE_URL/alerts" \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "MetaSetter",
    "service_name": "ingester",
    "instance_id": "ing_001",
    "severity": "critical",
    "message": "High latency detected on instance ing_001"
  }'


echo "  → Instance-level alert"
curl -s -X POST "$BASE_URL/alerts" \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "MetaSetter",
    "service_name": "ingester",
    "instance_id": "ing_001",
    "severity": "warning",
    "message": "High CPU detected on instance ing_001"
  }'


# Alert for service (no instance)
echo "  → Service-level alert"
curl -s -X POST "$BASE_URL/alerts" \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "CORE",
    "service_name": "database",
    "severity": "warning",
    "message": "Connection pool nearly exhausted"
  }'

# Another instance alert
echo "  → Another instance alert"
curl -s -X POST "$BASE_URL/alerts" \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "CORE",
    "service_name": "payment_api",
    "instance_id": "pay_002",
    "severity": "fatal",
    "message": "Instance crashed - restarting"
  }'

echo ""
echo "✅ Test data generation complete!"
echo "📊 View your graph at: http://localhost:3000"
echo "🔍 Check graph data: curl $BASE_URL/graph"
echo "🚨 Check alerts: curl $BASE_URL/alerts"
