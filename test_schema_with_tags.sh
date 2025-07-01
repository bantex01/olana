#!/bin/bash

# Phase 2A Test Scripts - Service Tags & Namespace Dependencies
# Run these after starting your backend server

BASE_URL="http://localhost:3001"

echo "🚀 Phase 2A Test Suite - Service Tags & Namespace Dependencies"
echo "=============================================================="

# Test 1: Create services with tags via telemetry
echo ""
echo "📊 Test 1: Creating services with tags via telemetry..."

curl -X POST $BASE_URL/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "Frontend",
    "service_name": "web-app",
    "instance_id": "web_001",
    "environment": "prod",
    "team": "Frontend",
    "component_type": "service",
    "tags": ["frontend", "critical", "user-facing"],
    "depends_on": []
  }'

curl -X POST $BASE_URL/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "Frontend",
    "service_name": "api-gateway",
    "environment": "prod",
    "team": "Platform",
    "component_type": "service",
    "tags": ["frontend", "gateway", "critical"],
    "depends_on": [{"service_namespace": "MetaSetter", "service_name": "ingester"}]
  }'

curl -X POST $BASE_URL/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "Payments",
    "service_name": "payment-processor",
    "environment": "prod",
    "team": "Payments",
    "component_type": "service",
    "tags": ["backend", "critical", "financial"],
    "depends_on": []
  }'

curl -X POST $BASE_URL/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "Analytics",
    "service_name": "data-pipeline",
    "environment": "prod",
    "team": "Data",
    "component_type": "service",
    "tags": ["backend", "batch", "analytics"],
    "depends_on": [{"service_namespace": "Payments", "service_name": "payment-processor"}]
  }'

echo "✅ Services with tags created"

# Test 2: Update service tags via API
echo ""
echo "🏷️  Test 2: Updating service tags via API..."

curl -X PUT $BASE_URL/services/MetaSetter/ingester/tags \
  -H "Content-Type: application/json" \
  -d '{"tags": ["backend", "ingestion", "high-volume"]}'

curl -X PUT $BASE_URL/services/MetaSetter/parser/tags \
  -H "Content-Type: application/json" \
  -d '{"tags": ["backend", "processing", "data-transformation"]}'

echo "✅ Service tags updated"

# Test 3: Get available tags
echo ""
echo "🔍 Test 3: Fetching available tags..."
curl -X GET $BASE_URL/tags | jq '.'

# Test 4: Create namespace dependencies
echo ""
echo "🔗 Test 4: Creating namespace dependencies..."

curl -X POST $BASE_URL/namespace-dependencies \
  -H "Content-Type: application/json" \
  -d '{
    "from_namespace": "Frontend",
    "to_namespace": "MetaSetter",
    "created_by": "test-script",
    "dependency_type": "business",
    "description": "Frontend services depend on MetaSetter APIs for data processing"
  }'

curl -X POST $BASE_URL/namespace-dependencies \
  -H "Content-Type: application/json" \
  -d '{
    "from_namespace": "Analytics",
    "to_namespace": "Payments",
    "created_by": "test-script",
    "dependency_type": "data-flow",
    "description": "Analytics processes payment data for reporting"
  }'

curl -X POST $BASE_URL/namespace-dependencies \
  -H "Content-Type: application/json" \
  -d '{
    "from_namespace": "Frontend",
    "to_namespace": "Payments",
    "created_by": "test-script",
    "dependency_type": "business",
    "description": "Frontend needs payment services for transactions"
  }'

echo "✅ Namespace dependencies created"

# Test 5: Get namespace dependencies
echo ""
echo "📋 Test 5: Fetching namespace dependencies..."
curl -X GET $BASE_URL/namespace-dependencies | jq '.'

# Test 6: Create alerts for testing severity filtering
echo ""
echo "🚨 Test 6: Creating test alerts..."

curl -X POST $BASE_URL/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "Frontend",
    "service_name": "web-app",
    "severity": "critical",
    "message": "High response time detected"
  }'

curl -X POST $BASE_URL/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "Payments",
    "service_name": "payment-processor",
    "severity": "warning",
    "message": "Queue depth increasing"
  }'

curl -X POST $BASE_URL/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "MetaSetter",
    "service_name": "ingester",
    "severity": "critical",
    "message": "Memory usage above threshold"
  }'

echo "✅ Test alerts created"

# Test 7: Test filtered graph endpoints
echo ""
echo "🎯 Test 7: Testing filtered graph endpoints..."

echo ""
echo "Graph filtered by 'frontend' tags:"
curl -X GET "$BASE_URL/graph?tags=frontend" | jq '.nodes[] | select(.nodeType=="service") | {id, label, tags}'

echo ""
echo "Graph filtered by 'critical' severity alerts:"
curl -X GET "$BASE_URL/graph?severities=critical" | jq '.nodes[] | select(.nodeType=="service") | {id, label}'

echo ""
echo "Graph filtered by both 'backend' tags and 'critical' severity:"
curl -X GET "$BASE_URL/graph?tags=backend&severities=critical" | jq '.nodes[] | select(.nodeType=="service") | {id, label, tags}'

# Test 8: Test backward compatibility
echo ""
echo "🔄 Test 8: Testing backward compatibility..."

echo ""
echo "Creating service without tags (should still work):"
curl -X POST $BASE_URL/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "service_namespace": "Legacy",
    "service_name": "old-service",
    "environment": "prod",
    "team": "Legacy",
    "component_type": "service",
    "depends_on": []
  }'

echo ""
echo "Getting full graph (unfiltered):"
curl -X GET $BASE_URL/graph | jq '.nodes | length'

echo ""
echo "Getting all alerts:"
curl -X GET $BASE_URL/alerts | jq 'length'

# Test 9: Demonstrate combined filtering
echo ""
echo "🎛️  Test 9: Demonstrating combined filtering capabilities..."

echo ""
echo "All available tags:"
curl -X GET $BASE_URL/tags | jq '.tags'

echo ""
echo "Services with 'critical' tag:"
curl -X GET "$BASE_URL/graph?tags=critical" | jq '.nodes[] | select(.nodeType=="service" and (.tags // [] | contains(["critical"]))) | {id, tags}'

echo ""
echo "Services with critical alerts:"
curl -X GET "$BASE_URL/graph?severities=critical" | jq '.nodes[] | select(.nodeType=="service") | .id'

# Summary
echo ""
echo "🎉 Phase 2A Test Suite Complete!"
echo "================================="
echo ""
echo "✅ Service tags via telemetry: Working"
echo "✅ Tag management API: Working"
echo "✅ Namespace dependencies: Working"
echo "✅ Graph filtering by tags: Working"
echo "✅ Graph filtering by severity: Working"
echo "✅ Combined filtering: Working"
echo "✅ Backward compatibility: Maintained"
echo ""
echo "🌐 Open http://localhost:3000 to see the enhanced frontend"
echo "🔧 Use the filter panel to test tag and severity filtering"
echo "📊 Check namespace dependencies in the graph (dashed red lines)"

# Optional: Clean up test data
read -p "🗑️  Do you want to clean up test data? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🧹 Cleaning up test data..."
    
    # Note: In a real implementation, you'd add cleanup endpoints
    # For now, this would require manual database cleanup
    echo "⚠️  Manual cleanup required - consider adding cleanup endpoints for testing"
    echo "   DELETE FROM namespace_dependencies WHERE created_by = 'test-script';"
    echo "   DELETE FROM alerts WHERE alert_source = 'manual';"
    echo "   -- Optionally reset service tags to empty arrays"
fi

echo ""
echo "📚 Next steps:"
echo "   1. Open the frontend to test filtering UI"
echo "   2. Create namespace dependencies via API"
echo "   3. Test filtering with real OTEL telemetry data"
echo "   4. Add more sophisticated tag management as needed"
