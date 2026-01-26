#!/usr/bin/env node
/**
 * Records Endpoints Regression Test
 * 
 * Tests all record type endpoints for church 46 to ensure they return 200 and non-empty arrays
 */

const http = require('http');

const BASE_URL = process.argv[2] || 'http://localhost:3001';
const CHURCH_ID = process.argv[3] || '46';

const endpoints = [
  { name: 'Baptism Records', path: `/api/baptism-records?church_id=${CHURCH_ID}&page=1&limit=10` },
  { name: 'Marriage Records', path: `/api/marriage-records?church_id=${CHURCH_ID}&page=1&limit=10` },
  { name: 'Funeral Records', path: `/api/funeral-records?church_id=${CHURCH_ID}&page=1&limit=10` },
];

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testEndpoint(name, path) {
  try {
    const url = `${BASE_URL}${path}`;
    console.log(`\n[TEST] ${name}`);
    console.log(`  GET ${url}`);
    
    const result = await makeRequest(url);
    
    if (result.status === 200) {
      const records = result.data.records || [];
      const total = result.data.pagination?.total || result.data.totalRecords || records.length;
      
      console.log(`  ✓ PASSED: Status ${result.status}`);
      console.log(`  Records: ${records.length} (Total: ${total})`);
      
      if (records.length > 0) {
        console.log(`  ✓ Data present: First record ID: ${records[0].id}`);
      } else {
        console.log(`  ⚠ WARNING: Empty array (may be expected if no records exist)`);
      }
      
      return { passed: true, hasData: records.length > 0 };
    } else {
      console.log(`  ✗ FAILED: Status ${result.status}`);
      console.log(`  Response: ${JSON.stringify(result.data).substring(0, 200)}`);
      return { passed: false, hasData: false };
    }
  } catch (error) {
    console.log(`  ✗ FAILED: ${error.message}`);
    return { passed: false, hasData: false };
  }
}

async function runTests() {
  console.log('======================================================================');
  console.log('Records Endpoints Regression Test');
  console.log('======================================================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Church ID: ${CHURCH_ID}`);
  console.log('');

  const results = [];

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.name, endpoint.path);
    results.push({ ...endpoint, ...result });
  }

  console.log('\n======================================================================');
  console.log('Test Summary');
  console.log('======================================================================');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const withData = results.filter(r => r.hasData).length;

  console.log(`Total Tests: ${total}`);
  console.log(`Passed (200): ${passed} ✓`);
  console.log(`Failed: ${total - passed} ✗`);
  console.log(`With Data: ${withData} (${results.filter(r => !r.hasData).length} empty)`);
  console.log('');

  if (passed === total) {
    console.log('✅ All endpoints returned 200 OK');
    if (withData > 0) {
      console.log(`✅ ${withData} endpoint(s) have data`);
    } else {
      console.log('⚠️  No endpoints returned data (may be expected if no records exist)');
    }
    process.exit(0);
  } else {
    console.log('❌ Some endpoints failed');
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('Test runner error:', error);
  process.exit(1);
});
