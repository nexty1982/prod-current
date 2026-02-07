#!/usr/bin/env node
/**
 * Meta Normalization Test
 * Tests the normalizeMeta function with various input types
 * 
 * Run: node server/src/tests/test-meta-normalization.js
 */

// Mock the normalizeMeta function for testing
function normalizeMeta(meta) {
  // Handle null/undefined
  if (meta === null || meta === undefined) {
    return null;
  }

  // Handle string (JSON)
  if (typeof meta === 'string') {
    const trimmed = meta.trim();
    
    // Empty string becomes null
    if (trimmed === '') {
      return null;
    }
    
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(trimmed);
      
      // Ensure parsed result is an object (not array or primitive)
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('meta must be a JSON object, not array or primitive');
      }
      
      return parsed;
    } catch (e) {
      throw new Error(`meta must be valid JSON: ${e.message}`);
    }
  }

  // Handle object (already parsed)
  if (typeof meta === 'object' && !Array.isArray(meta)) {
    return meta;
  }

  // Invalid type
  throw new Error('meta must be a JSON string or object');
}

// Test cases
const tests = [
  {
    name: 'null meta',
    input: null,
    expected: null,
    shouldPass: true,
  },
  {
    name: 'undefined meta',
    input: undefined,
    expected: null,
    shouldPass: true,
  },
  {
    name: 'empty string meta',
    input: '',
    expected: null,
    shouldPass: true,
  },
  {
    name: 'whitespace string meta',
    input: '   ',
    expected: null,
    shouldPass: true,
  },
  {
    name: 'valid JSON string meta',
    input: '{"chip":"NEW","chipColor":"primary"}',
    expected: { chip: 'NEW', chipColor: 'primary' },
    shouldPass: true,
  },
  {
    name: 'valid object meta',
    input: { chip: 'NEW', chipColor: 'primary' },
    expected: { chip: 'NEW', chipColor: 'primary' },
    shouldPass: true,
  },
  {
    name: 'invalid JSON string meta',
    input: '{invalid json}',
    expected: null,
    shouldPass: false,
    expectedError: 'meta must be valid JSON',
  },
  {
    name: 'array meta (invalid)',
    input: ['item1', 'item2'],
    expected: null,
    shouldPass: false,
    expectedError: 'meta must be a JSON string or object',
  },
  {
    name: 'number meta (invalid)',
    input: 123,
    expected: null,
    shouldPass: false,
    expectedError: 'meta must be a JSON string or object',
  },
  {
    name: 'JSON string with array (invalid)',
    input: '["item1","item2"]',
    expected: null,
    shouldPass: false,
    expectedError: 'meta must be a JSON object, not array or primitive',
  },
];

// Run tests
console.log('🧪 Running Meta Normalization Tests\n');

let passed = 0;
let failed = 0;

tests.forEach((test, index) => {
  try {
    const result = normalizeMeta(test.input);
    
    if (test.shouldPass) {
      const resultStr = JSON.stringify(result);
      const expectedStr = JSON.stringify(test.expected);
      
      if (resultStr === expectedStr) {
        console.log(`✅ Test ${index + 1}: ${test.name} - PASSED`);
        passed++;
      } else {
        console.log(`❌ Test ${index + 1}: ${test.name} - FAILED`);
        console.log(`   Expected: ${expectedStr}`);
        console.log(`   Got: ${resultStr}`);
        failed++;
      }
    } else {
      console.log(`❌ Test ${index + 1}: ${test.name} - FAILED (expected error but got result)`);
      console.log(`   Result: ${JSON.stringify(result)}`);
      failed++;
    }
  } catch (error) {
    if (!test.shouldPass) {
      const errorMsg = error.message || String(error);
      if (errorMsg.includes(test.expectedError)) {
        console.log(`✅ Test ${index + 1}: ${test.name} - PASSED (error as expected)`);
        passed++;
      } else {
        console.log(`❌ Test ${index + 1}: ${test.name} - FAILED (wrong error)`);
        console.log(`   Expected error containing: ${test.expectedError}`);
        console.log(`   Got: ${errorMsg}`);
        failed++;
      }
    } else {
      console.log(`❌ Test ${index + 1}: ${test.name} - FAILED (unexpected error)`);
      console.log(`   Error: ${error.message || String(error)}`);
      failed++;
    }
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${tests.length} tests`);

if (failed === 0) {
  console.log('✅ All tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed!');
  process.exit(1);
}
