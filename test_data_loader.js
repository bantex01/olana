#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const CONFIG_FILE = process.argv[2] || 'test_data.json';

// Helper function to make HTTP requests
async function makeRequest(endpoint, method = 'POST', data = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(result)}`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Failed to ${method} ${endpoint}:`, error.message);
    throw error;
  }
}

// Load and validate configuration file
function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    console.error(`❌ Configuration file not found: ${CONFIG_FILE}`);
    console.log(`📝 Create a ${CONFIG_FILE} file with your test data (see example below)`);
    process.exit(1);
  }
  
  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf8');
    const config = JSON.parse(content);
    
    // Validate structure
    if (!config.services || !Array.isArray(config.services)) {
      throw new Error('Configuration must have a "services" array');
    }
    
    if (!config.alerts || !Array.isArray(config.alerts)) {
      throw new Error('Configuration must have an "alerts" array');
    }
    
    return config;
  } catch (error) {
    console.error(`❌ Error reading configuration file:`, error.message);
    process.exit(1);
  }
}

// Create services
async function createServices(services) {
  console.log(`\n📡 Creating ${services.length} services...`);
  
  for (const service of services) {
    try {
      const result = await makeRequest('/telemetry', 'POST', service);
      console.log(`✅ Created service: ${service.service_namespace}::${service.service_name}`);
      
      // Add small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ Failed to create service ${service.service_namespace}::${service.service_name}`);
    }
  }
}

// Create alerts
async function createAlerts(alerts) {
  console.log(`\n🚨 Creating ${alerts.length} alerts...`);
  
  for (const alert of alerts) {
    try {
      const result = await makeRequest('/alerts', 'POST', alert);
      console.log(`✅ Created alert: [${alert.severity}] ${alert.service_namespace}::${alert.service_name} - ${alert.message}`);
      
      // Add small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ Failed to create alert for ${alert.service_namespace}::${alert.service_name}`);
    }
  }
}

// Create namespace dependencies
async function createNamespaceDependencies(dependencies) {
  if (!dependencies || dependencies.length === 0) {
    console.log('\n🔗 No namespace dependencies to create');
    return;
  }
  
  console.log(`\n🔗 Creating ${dependencies.length} namespace dependencies...`);
  
  for (const dep of dependencies) {
    try {
      const result = await makeRequest('/namespace-dependencies', 'POST', dep);
      console.log(`✅ Created namespace dependency: ${dep.from_namespace} → ${dep.to_namespace}`);
      
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ Failed to create namespace dependency ${dep.from_namespace} → ${dep.to_namespace}`);
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting test data loader...');
  console.log(`📁 Configuration file: ${CONFIG_FILE}`);
  console.log(`🌐 API Base URL: ${API_BASE_URL}`);
  
  // Check if fetch is available (Node.js 18+)
  if (typeof fetch === 'undefined') {
    console.error('❌ This script requires Node.js 18+ for fetch support');
    console.log('💡 Or install node-fetch: npm install node-fetch');
    process.exit(1);
  }
  
  // Test API connectivity
  try {
    console.log('\n🔍 Testing API connectivity...');
    await makeRequest('/health', 'GET');
    console.log('✅ API is reachable');
  } catch (error) {
    console.error('❌ Cannot reach API. Make sure the backend is running.');
    process.exit(1);
  }
  
  // Load configuration
  const config = loadConfig();
  console.log(`✅ Loaded configuration: ${config.services.length} services, ${config.alerts.length} alerts`);
  
  // Create data
  try {
    await createServices(config.services);
    
    if (config.namespace_dependencies) {
      await createNamespaceDependencies(config.namespace_dependencies);
    }
    
    await createAlerts(config.alerts);
    
    console.log('\n🎉 Test data loading completed!');
    console.log('🌐 Check your application at http://localhost:3000');
    
  } catch (error) {
    console.error('\n💥 Test data loading failed:', error.message);
    process.exit(1);
  }
}

// Show usage if no arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
📖 Test Data Loader Usage:

  node test_data_loader.js [config_file]

Environment Variables:
  API_BASE_URL    Base URL for the API (default: http://localhost:3001)

Examples:
  node test_data_loader.js                    # Uses test_data.json
  node test_data_loader.js my_test_data.json  # Uses custom file
  API_BASE_URL=http://localhost:3001 node test_data_loader.js

The configuration file should be a JSON file with this structure:
{
  "services": [...],
  "alerts": [...],
  "namespace_dependencies": [...]
}
`);
  process.exit(0);
}

// Run the script
main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});