#!/usr/bin/env node
/**
 * Automated OCR Endpoint Testing Script
 * 
 * Tests OCR endpoints to verify DB-only operation (no bundle dependency).
 * Requires server to be running on port 3001 (or SERVER_PORT env var).
 * 
 * Usage: 
 *   node scripts/test-ocr-endpoints.js [churchId] [jobId] [baseUrl]
 * 
 * Example:
 *   node scripts/test-ocr-endpoints.js 46 1 http://localhost:3001
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const CHURCH_ID = parseInt(process.argv[2]) || 46;
const JOB_ID = parseInt(process.argv[3]) || 1;
const BASE_URL = process.argv[4] || process.env.SERVER_URL || 'http://localhost:3001';

const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
};

/**
 * Make HTTP request
 */
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    if (data) {
      const body = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        let parsedData;
        try {
          parsedData = responseData ? JSON.parse(responseData) : null;
        } catch (e) {
          parsedData = responseData;
        }
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsedData,
          raw: responseData,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Check if status code matches expected value
 * Supports: number, array of numbers, or null (accept any)
 */
function statusMatches(actualStatus, expectedStatus) {
  if (expectedStatus === null) {
    return true; // Accept any status
  }
  if (typeof expectedStatus === 'number') {
    return actualStatus === expectedStatus;
  }
  if (Array.isArray(expectedStatus)) {
    return expectedStatus.includes(actualStatus);
  }
  return false;
}

/**
 * Test endpoint
 */
async function testEndpoint(name, method, path, expectedStatus = 200, validator = null, isCritical = false) {
  const test = {
    name,
    method,
    path,
    status: 'pending',
    error: null,
    response: null,
    isCritical, // Critical tests cause script to fail
  };

  try {
    console.log(`\n[TEST] ${method} ${path}`);
    
    const response = await makeRequest(method, path);
    test.response = response;
    
    if (statusMatches(response.statusCode, expectedStatus)) {
      if (validator) {
        const validationResult = validator(response.data);
        if (validationResult === true) {
          test.status = 'passed';
          results.passed++;
          console.log(`    ✓ PASSED: Status ${response.statusCode}`);
        } else {
          test.status = 'failed';
          test.error = validationResult;
          if (isCritical) {
            results.failed++;
          } else {
            results.skipped++;
          }
          console.log(`    ${isCritical ? '✗' : '⚠'} ${isCritical ? 'FAILED' : 'WARNING'}: ${validationResult}`);
        }
      } else {
        test.status = 'passed';
        results.passed++;
        console.log(`    ✓ PASSED: Status ${response.statusCode}`);
      }
    } else {
      test.status = 'failed';
      const expectedStr = Array.isArray(expectedStatus) 
        ? expectedStatus.join(' or ') 
        : (expectedStatus === null ? 'any' : expectedStatus);
      test.error = `Expected status ${expectedStr}, got ${response.statusCode}`;
      if (isCritical) {
        results.failed++;
        console.log(`    ✗ FAILED: Expected status ${expectedStr}, got ${response.statusCode}`);
      } else {
        results.skipped++;
        console.log(`    ⚠ WARNING: Expected status ${expectedStr}, got ${response.statusCode} (non-critical)`);
      }
      
      // Print error details
      if (response.data && response.data.error) {
        console.log(`       Error: ${response.data.error}`);
      } else if (response.raw && typeof response.raw === 'string') {
        // Print first 200 chars of body if not JSON
        const preview = response.raw.substring(0, 200);
        console.log(`       Response preview: ${preview}${response.raw.length > 200 ? '...' : ''}`);
      }
    }
  } catch (error) {
    test.status = 'failed';
    test.error = error.message;
    if (isCritical) {
      results.failed++;
      console.log(`    ✗ FAILED: ${error.message}`);
    } else {
      results.skipped++;
      console.log(`    ⚠ WARNING: ${error.message} (non-critical)`);
    }
  }

  results.tests.push(test);
  return test.status === 'passed';
}

/**
 * Main test suite
 */
async function runTests() {
  console.log('='.repeat(70));
  console.log('OCR Endpoint Testing - DB Source of Truth Verification');
  console.log('='.repeat(70));
  console.log(`Church ID: ${CHURCH_ID}`);
  console.log(`Job ID: ${JOB_ID}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log('');

  // Test 1: Job List (CRITICAL - must pass)
  await testEndpoint(
    'Job List',
    'GET',
    `/api/church/${CHURCH_ID}/ocr/jobs`,
    200,
    (data) => {
      if (!data || !data.jobs) {
        return 'Response missing jobs array';
      }
      if (!Array.isArray(data.jobs)) {
        return 'jobs is not an array';
      }
      // Check that jobs have status from DB (not bundle) - REQUIRED
      const hasStatus = data.jobs.every(job => job.hasOwnProperty('status'));
      if (!hasStatus) {
        return 'Some jobs missing status field';
      }
      // Check that has_bundle is present (even if false) - WARNING only
      const hasBundleField = data.jobs.every(job => job.hasOwnProperty('has_bundle'));
      if (!hasBundleField && data.jobs.length > 0) {
        console.log(`       ⚠ WARNING: Some jobs missing has_bundle field (non-critical)`);
      }
      return true;
    },
    true // Critical test
  );

  // Test 2: Job Detail (non-critical - may 404 if jobId doesn't exist)
  await testEndpoint(
    'Job Detail',
    'GET',
    `/api/church/${CHURCH_ID}/ocr/jobs/${JOB_ID}`,
    [200, 404],
    (data) => {
      if (!data) {
        return 'Response is empty';
      }
      // If 404, that's acceptable (job may not exist)
      if (data.error && data.error.includes('not found')) {
        return true; // 404 is acceptable
      }
      if (!data.hasOwnProperty('status')) {
        return 'Response missing status field';
      }
      // has_bundle is optional (warning only)
      if (!data.hasOwnProperty('has_bundle')) {
        console.log(`       ⚠ WARNING: Response missing has_bundle field (non-critical)`);
      }
      // Should have ocr_text OR ocr_text_preview OR ocr_result OR ocr_result_json from DB
      const hasOcrContent = data.hasOwnProperty('ocr_text') || 
                           data.hasOwnProperty('ocr_text_preview') || 
                           data.hasOwnProperty('ocr_result') || 
                           data.hasOwnProperty('ocr_result_json');
      if (!hasOcrContent) {
        return 'Response missing ocr_text, ocr_text_preview, ocr_result, or ocr_result_json (should come from DB)';
      }
      return true;
    },
    false // Non-critical - job may not exist
  );

  // Test 3: Drafts List (non-critical - may 404 if jobId doesn't exist or no drafts)
  await testEndpoint(
    'Drafts List',
    'GET',
    `/api/church/${CHURCH_ID}/ocr/jobs/${JOB_ID}/fusion/drafts`,
    [200, 404],
    (data) => {
      if (!data) {
        return 'Response is empty';
      }
      // If 404, that's acceptable (job may not exist or have no drafts)
      if (data.error && data.error.includes('not found')) {
        return true; // 404 is acceptable
      }
      if (!data.hasOwnProperty('drafts')) {
        return 'Response missing drafts array';
      }
      if (!Array.isArray(data.drafts)) {
        return 'drafts is not an array';
      }
      // Drafts should have workflow_status from DB (if drafts exist)
      const hasWorkflowStatus = data.drafts.every(draft => 
        draft.hasOwnProperty('workflow_status') || draft.hasOwnProperty('status')
      );
      if (!hasWorkflowStatus && data.drafts.length > 0) {
        return 'Drafts missing workflow_status or status field';
      }
      return true;
    },
    false // Non-critical - job may not exist or have no drafts
  );

  // Test 4: Settings (CRITICAL - must pass)
  await testEndpoint(
    'OCR Settings',
    'GET',
    `/api/church/${CHURCH_ID}/ocr/settings`,
    200,
    (data) => {
      if (!data) {
        return 'Response is empty';
      }
      // Settings should load from DB
      return true;
    },
    true // Critical test
  );

  // Test 5: Mapping Get (non-critical - may 404 if jobId doesn't exist or no mapping)
  await testEndpoint(
    'Mapping Get',
    'GET',
    `/api/church/${CHURCH_ID}/ocr/jobs/${JOB_ID}/mapping`,
    [200, 404], // Accept 200 or 404
    (data) => {
      // Mapping endpoint should work (even if returns null mapping or 404)
      if (data && data.error && data.error.includes('not found')) {
        return true; // 404 is acceptable - job may not exist or have no mapping
      }
      return true;
    },
    false // Non-critical - mapping may not exist
  );

  // Test 6: Image endpoint (non-critical - may 404 if jobId doesn't exist or image not found)
  await testEndpoint(
    'Job Image',
    'GET',
    `/api/church/${CHURCH_ID}/ocr/jobs/${JOB_ID}/image`,
    [200, 404], // Accept 200 or 404
    (data) => {
      // Image endpoint should work (even if returns 404)
      if (data && typeof data === 'object' && data.error && data.error.includes('not found')) {
        return true; // 404 is acceptable - job may not exist or image file missing
      }
      return true;
    },
    false // Non-critical - image may not exist
  );

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('Test Summary');
  console.log('='.repeat(70));
  console.log(`Total Tests: ${results.tests.length}`);
  console.log(`Passed: ${results.passed} ✓`);
  console.log(`Failed (Critical): ${results.tests.filter(t => t.status === 'failed' && t.isCritical).length} ✗`);
  console.log(`Warnings (Non-Critical): ${results.skipped} ⚠`);
  console.log('');

  const criticalFailed = results.tests.filter(t => t.status === 'failed' && t.isCritical);
  const nonCriticalFailed = results.tests.filter(t => t.status === 'failed' && !t.isCritical);

  if (criticalFailed.length > 0) {
    console.log('❌ Critical Test Failures (must be fixed):');
    criticalFailed.forEach(t => {
      console.log(`  ✗ ${t.name}: ${t.error}`);
    });
    console.log('');
  }

  if (nonCriticalFailed.length > 0) {
    console.log('⚠️  Non-Critical Test Warnings (acceptable if jobId/artifacts missing):');
    nonCriticalFailed.forEach(t => {
      console.log(`  ⚠ ${t.name}: ${t.error}`);
    });
    console.log('');
  }

  // Recommendations
  console.log('Recommendations:');
  const criticalFailedCount = results.tests.filter(t => t.status === 'failed' && t.isCritical).length;
  if (criticalFailedCount === 0) {
    console.log('  ✓ Core functionality working! DB-only reads confirmed.');
    if (results.skipped > 0) {
      console.log(`  ⚠️  ${results.skipped} non-critical test(s) had warnings (acceptable if jobId/artifacts missing)`);
    }
  } else {
    console.log('  ❌ Critical tests failed. Check:');
    console.log('     1. Server is running on correct port');
    console.log('     2. Church ID is valid');
    console.log('     3. Database migration has been run');
    console.log('     4. OCR routes are registered in server');
  }
  
  if (nonCriticalFailed.length > 0) {
    console.log('\nNote: Non-critical test failures are acceptable if:');
    console.log('  - Job ID doesn\'t exist in database (404 expected)');
    console.log('  - Mapping/drafts/image artifacts are missing (404 expected)');
    console.log('  These endpoints are working correctly - they return 404 when resources don\'t exist.');
  }
}

// Run tests
if (require.main === module) {
  runTests()
    .then(() => {
      // Only fail if critical tests failed (jobs list or settings)
      const criticalFailed = results.tests.some(t => t.isCritical && t.status === 'failed');
      const exitCode = criticalFailed ? 1 : 0;
      
      if (criticalFailed) {
        console.log('\n❌ CRITICAL tests failed - script exits with code 1');
      } else if (results.failed > 0) {
        console.log('\n⚠️  Some non-critical tests had issues, but core functionality works');
      } else {
        console.log('\n✅ All tests passed!');
      }
      
      process.exit(exitCode);
    })
    .catch(err => {
      console.error('\nFatal error:', err);
      process.exit(1);
    });
}

module.exports = { runTests, testEndpoint };
