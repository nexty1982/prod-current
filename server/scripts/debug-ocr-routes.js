#!/usr/bin/env node
/**
 * Debug script to check OCR routes and church existence
 */

const http = require('http');

const BASE_URL = process.argv[2] || 'http://localhost:3001';
const CHURCH_ID = process.argv[3] || '46';

function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request({
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Accept': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed,
          raw: data,
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function debug() {
  console.log('='.repeat(70));
  console.log('OCR Routes Debug');
  console.log('='.repeat(70));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Church ID: ${CHURCH_ID}`);
  console.log('');

  // Test 1: Check if church exists
  console.log('[1] Testing church existence via settings endpoint...');
  try {
    const settings = await makeRequest('GET', `/api/church/${CHURCH_ID}/ocr/settings`);
    console.log(`    Status: ${settings.statusCode}`);
    console.log(`    Response:`, JSON.stringify(settings.data, null, 2).substring(0, 200));
  } catch (err) {
    console.log(`    Error: ${err.message}`);
  }

  // Test 2: Check jobs endpoint
  console.log('\n[2] Testing jobs list endpoint...');
  try {
    const jobs = await makeRequest('GET', `/api/church/${CHURCH_ID}/ocr/jobs`);
    console.log(`    Status: ${jobs.statusCode}`);
    console.log(`    Response:`, JSON.stringify(jobs.data, null, 2).substring(0, 300));
    if (jobs.statusCode === 404) {
      console.log(`    ⚠️  404 - Check if church ${CHURCH_ID} exists in database`);
    }
  } catch (err) {
    console.log(`    Error: ${err.message}`);
  }

  // Test 3: Check if job 1 exists
  console.log('\n[3] Testing job detail endpoint...');
  try {
    const job = await makeRequest('GET', `/api/church/${CHURCH_ID}/ocr/jobs/1`);
    console.log(`    Status: ${job.statusCode}`);
    console.log(`    Response:`, JSON.stringify(job.data, null, 2).substring(0, 300));
    if (job.statusCode === 404) {
      console.log(`    ⚠️  404 - Check if job ID 1 exists for church ${CHURCH_ID}`);
    }
  } catch (err) {
    console.log(`    Error: ${err.message}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('Debug Complete');
  console.log('='.repeat(70));
  console.log('\nNext steps:');
  console.log('1. Check server logs for route registration');
  console.log('2. Verify church exists: SELECT * FROM churches WHERE id = ?');
  console.log('3. Verify job exists: SELECT * FROM ocr_jobs WHERE id = 1 AND church_id = ?');
  console.log('4. Restart server if code was recently updated');
}

debug().catch(console.error);
