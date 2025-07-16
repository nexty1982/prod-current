/**
 * useOcrTests Hook
 * React hook for managing OCR admin tests
 */

import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';

export interface TestResult {
  testName: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message: string;
  details?: any;
  duration?: number;
}

export const useOcrTests = (churchId: string, userEmail?: string) => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');

  // Check if user is superadmin
  const isSuperAdmin = userEmail === 'superadmin@orthodoxmetrics.com';

  // Update test result
  const updateTestResult = useCallback((
    testName: string, 
    status: TestResult['status'], 
    message: string, 
    details?: any, 
    duration?: number
  ) => {
    setTestResults(prev => {
      const existing = prev.find(t => t.testName === testName);
      const newResult = { testName, status, message, details, duration };
      
      if (existing) {
        return prev.map(t => t.testName === testName ? newResult : t);
      } else {
        return [...prev, newResult];
      }
    });
  }, []);

  // Run individual test
  const runTest = useCallback(async (testName: string, endpoint: string) => {
    if (!isSuperAdmin) {
      toast.error('Access denied. SuperAdmin privileges required.');
      return;
    }

    setCurrentTest(testName);
    updateTestResult(testName, 'running', 'Running test...');
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': userEmail || '',
        },
        body: JSON.stringify({ churchId, userEmail })
      });

      const result = await response.json();
      const duration = Date.now() - startTime;

      if (response.ok && result.success) {
        updateTestResult(testName, 'passed', result.message || 'Test passed', result.details, duration);
        toast.success(`${testName} passed`);
      } else {
        updateTestResult(testName, 'failed', result.message || 'Test failed', result.details, duration);
        toast.error(`${testName} failed`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateTestResult(testName, 'failed', `Error: ${errorMessage}`, null, duration);
      toast.error(`${testName} failed: ${errorMessage}`);
    }
  }, [churchId, userEmail, isSuperAdmin, updateTestResult]);

  // Run basic test suite
  const runBasicTest = useCallback(async () => {
    if (!isSuperAdmin) return;

    setIsRunning(true);
    setTestResults([]);
    
    try {
      await runTest('Database Connection', '/api/admin/test/database-connection');
      await runTest('OCR Schema Validation', '/api/admin/test/ocr-schema');
      await runTest('Google Vision API', '/api/admin/test/google-vision');
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  }, [isSuperAdmin, runTest]);

  // Run advanced test suite
  const runAdvancedTest = useCallback(async () => {
    if (!isSuperAdmin) return;

    setIsRunning(true);
    setTestResults([]);
    
    try {
      // Basic tests
      await runTest('Database Connection', '/api/admin/test/database-connection');
      await runTest('OCR Schema Validation', '/api/admin/test/ocr-schema');
      await runTest('Google Vision API', '/api/admin/test/google-vision');
      
      // Advanced tests
      await runTest('OCR Processing Queue', '/api/admin/test/ocr-queue');
      await runTest('Entity Extraction', '/api/admin/test/entity-extraction');
      await runTest('Cross-Database Connectivity', '/api/admin/test/cross-database');
      await runTest('Translation Service', '/api/admin/test/translation');
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  }, [isSuperAdmin, runTest]);

  // Run full test suite
  const runFullTest = useCallback(async () => {
    if (!isSuperAdmin) return;

    setIsRunning(true);
    setTestResults([]);
    
    try {
      // Basic tests
      await runTest('Database Connection', '/api/admin/test/database-connection');
      await runTest('OCR Schema Validation', '/api/admin/test/ocr-schema');
      await runTest('Google Vision API', '/api/admin/test/google-vision');
      
      // Advanced tests
      await runTest('OCR Processing Queue', '/api/admin/test/ocr-queue');
      await runTest('Entity Extraction', '/api/admin/test/entity-extraction');
      await runTest('Cross-Database Connectivity', '/api/admin/test/cross-database');
      await runTest('Translation Service', '/api/admin/test/translation');
      
      // Full integration tests
      await runTest('End-to-End OCR Upload', '/api/admin/test/e2e-upload');
      await runTest('Field Mapping Service', '/api/admin/test/field-mapping');
      await runTest('Record Transfer Pipeline', '/api/admin/test/record-transfer');
      await runTest('User Permissions', '/api/admin/test/permissions');
      await runTest('System Performance', '/api/admin/test/performance');
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  }, [isSuperAdmin, runTest]);

  // Retry failed jobs
  const retryFailedJobs = useCallback(async () => {
    if (!isSuperAdmin) return;

    setIsRunning(true);
    
    try {
      const response = await fetch('/api/admin/test/retry-failed-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': userEmail || '',
        },
        body: JSON.stringify({ churchId, userEmail })
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`Retried ${result.retriedCount || 0} failed jobs`);
        updateTestResult('Retry Failed Jobs', 'passed', `Successfully retried ${result.retriedCount || 0} jobs`, result);
      } else {
        throw new Error(result.message || 'Failed to retry jobs');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to retry jobs: ${errorMessage}`);
      updateTestResult('Retry Failed Jobs', 'failed', errorMessage);
    } finally {
      setIsRunning(false);
    }
  }, [churchId, userEmail, isSuperAdmin, updateTestResult]);

  // Get overall test status
  const getOverallStatus = useCallback(() => {
    if (testResults.length === 0) return { status: 'none', message: 'No tests run' };
    
    const hasRunning = testResults.some(t => t.status === 'running');
    const hasFailed = testResults.some(t => t.status === 'failed');
    const allPassed = testResults.every(t => t.status === 'passed');
    
    if (hasRunning) return { status: 'running', message: 'Tests in progress...' };
    if (hasFailed) return { status: 'failed', message: `${testResults.filter(t => t.status === 'failed').length} test(s) failed` };
    if (allPassed) return { status: 'passed', message: `All ${testResults.length} tests passed!` };
    
    return { status: 'partial', message: 'Some tests completed' };
  }, [testResults]);

  return {
    testResults,
    isRunning,
    currentTest,
    isSuperAdmin,
    runBasicTest,
    runAdvancedTest,
    runFullTest,
    retryFailedJobs,
    getOverallStatus
  };
};
