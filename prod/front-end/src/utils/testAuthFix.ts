/**
 * Test utility to verify 401 error handling and retry logic
 * Use this to test the authentication error fixes
 */

import { is401Error, shouldRetry, incrementRetry, resetRetry, createRetryKey } from './authErrorHandler';

interface TestResults {
  test: string;
  passed: boolean;
  details: string;
}

/**
 * Run tests to verify the authentication error handling
 */
export function testAuthErrorHandling(): TestResults[] {
  const results: TestResults[] = [];

  // Test 1: 401 Error Detection
  try {
    const error401 = { response: { status: 401 } };
    const error404 = { response: { status: 404 } };
    const errorUnauth = { message: 'Unauthorized access' };
    const normalError = { message: 'Network error' };

    const test1Passed = 
      is401Error(error401) === true &&
      is401Error(error404) === false &&
      is401Error(errorUnauth) === true &&
      is401Error(normalError) === false;

    results.push({
      test: '401 Error Detection',
      passed: test1Passed,
      details: test1Passed ? 'All 401 error formats detected correctly' : 'Failed to detect 401 errors properly'
    });
  } catch (error) {
    results.push({
      test: '401 Error Detection',
      passed: false,
      details: `Test failed with error: ${error}`
    });
  }

  // Test 2: Retry Logic
  try {
    const testKey = 'test_function';
    resetRetry(testKey);

    // Should allow retries up to limit
    const retry1 = shouldRetry(testKey, 3);
    incrementRetry(testKey);
    const retry2 = shouldRetry(testKey, 3);
    incrementRetry(testKey);
    const retry3 = shouldRetry(testKey, 3);
    incrementRetry(testKey);
    const retry4 = shouldRetry(testKey, 3);

    const test2Passed = retry1 && retry2 && retry3 && !retry4;

    results.push({
      test: 'Retry Logic',
      passed: test2Passed,
      details: test2Passed ? 'Retry logic works correctly (allows 3 retries then stops)' : 'Retry logic failed'
    });

    resetRetry(testKey); // Clean up
  } catch (error) {
    results.push({
      test: 'Retry Logic',
      passed: false,
      details: `Test failed with error: ${error}`
    });
  }

  // Test 3: Retry Key Generation
  try {
    const key1 = createRetryKey('fetchChurches');
    const key2 = createRetryKey('fetchChurches', 123);
    const key3 = createRetryKey('fetchChurches', 123, { search: 'test' });

    const test3Passed = 
      key1 === 'fetchChurches_' &&
      key2 === 'fetchChurches_123' &&
      key3.includes('fetchChurches_123_');

    results.push({
      test: 'Retry Key Generation',
      passed: test3Passed,
      details: test3Passed ? 'Retry keys generated correctly' : `Generated keys: ${key1}, ${key2}, ${key3}`
    });
  } catch (error) {
    results.push({
      test: 'Retry Key Generation',
      passed: false,
      details: `Test failed with error: ${error}`
    });
  }

  return results;
}

/**
 * Print test results to console
 */
export function printTestResults(results: TestResults[]): void {
  console.log('\n🧪 Authentication Error Handling Test Results:');
  console.log('================================================');
  
  results.forEach((result, index) => {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${index + 1}. ${result.test}: ${status}`);
    console.log(`   Details: ${result.details}\n`);
  });

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  console.log(`Summary: ${passedCount}/${totalCount} tests passed`);
  
  if (passedCount === totalCount) {
    console.log('🎉 All tests passed! Authentication error handling is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.');
  }
}

/**
 * Run all tests and print results
 */
export function runAuthTests(): void {
  const results = testAuthErrorHandling();
  printTestResults(results);
}

/**
 * Test the fix in browser console
 * Call this in browser dev tools: testAuthFix()
 */
declare global {
  interface Window {
    testAuthFix: () => void;
  }
}

if (typeof window !== 'undefined') {
  window.testAuthFix = runAuthTests;
} 