#!/usr/bin/env node

/**
 * Test script for OMAI endpoints to identify 500 errors
 * Task 132: Fix critical OMAI API endpoint issues
 */

const http = require('http');
const https = require('https');

// OMAI endpoints to test
const endpoints = [
  '/api/omai/status',
  '/api/omai/health', 
  '/api/omai/stats'
];

const testEndpoint = (path) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            path,
            status: res.statusCode,
            success: res.statusCode === 200,
            response: response
          });
        } catch (e) {
          resolve({
            path,
            status: res.statusCode,
            success: false,
            error: 'Invalid JSON response',
            response: data
          });
        }
      });
    });

    req.on('error', (err) => {
      reject({
        path,
        error: err.message
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject({
        path,
        error: 'Request timeout'
      });
    });

    req.end();
  });
};

async function testOMAIEndpoints() {
  console.log('🔍 Testing OMAI endpoints for 500 errors...\n');
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint}...`);
      const result = await testEndpoint(endpoint);
      results.push(result);
      
      if (result.success) {
        console.log(`✅ ${endpoint} - Status: ${result.status}`);
      } else {
        console.log(`❌ ${endpoint} - Status: ${result.status}, Error: ${result.error || 'Failed'}`);
      }
    } catch (error) {
      results.push(error);
      console.log(`❌ ${endpoint} - Connection Error: ${error.error}`);
    }
  }
  
  console.log('\n📊 Summary:');
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n🔧 Issues found - OMAI endpoints need fixing');
    results.filter(r => !r.success).forEach(result => {
      console.log(`- ${result.path}: ${result.error || `Status ${result.status}`}`);
    });
  } else {
    console.log('\n🎉 All OMAI endpoints working correctly!');
  }
  
  return results;
}

// Run the test
if (require.main === module) {
  testOMAIEndpoints()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Test failed:', err);
      process.exit(1);
    });
}

module.exports = { testOMAIEndpoints };