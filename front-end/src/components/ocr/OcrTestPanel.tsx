/**
 * OCR Test Panel Component
 * Administrative testing interface for superadmin users
 * Mirrors backend command line testing scripts with UI controls
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  TestTube,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Database,
  Upload,
  Zap,
  Shield,
  Bug,
  Activity,
  BarChart3
} from 'lucide-react';
import { useOcrTests, TestResult } from '../../hooks/useOcrTests';

interface OcrTestPanelProps {
  churchId: string;
}

export const OcrTestPanel: React.FC<OcrTestPanelProps> = ({ churchId }) => {
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  
  const {
    testResults,
    isRunning,
    currentTest,
    isSuperAdmin,
    runBasicTest,
    runAdvancedTest,
    runFullTest,
    retryFailedJobs,
    getOverallStatus
  } = useOcrTests(churchId);

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Shield className="h-8 w-8 text-gray-400 mr-3" />
          <span className="text-gray-600">Access restricted to system administrators</span>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Running</Badge>;
      case 'passed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Passed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const overall = getOverallStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center text-xl">
                <TestTube className="h-6 w-6 mr-2" />
                OCR System Test Panel
              </CardTitle>
              <CardDescription>
                Administrative testing interface - mirrors backend command line scripts
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                <Shield className="h-3 w-3 mr-1" />
                SuperAdmin
              </Badge>
              {overall.status !== 'none' && (
                <Badge 
                  variant={overall.status === 'passed' ? 'default' : overall.status === 'failed' ? 'destructive' : 'secondary'}
                  className={
                    overall.status === 'passed' ? 'bg-green-100 text-green-800' :
                    overall.status === 'running' ? 'bg-blue-100 text-blue-800' : ''
                  }
                >
                  {overall.message}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Test Suites</CardTitle>
          <CardDescription>
            Choose a test suite to validate OCR system functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              onClick={runBasicTest}
              disabled={isRunning}
              className="flex flex-col items-center p-6 h-auto bg-green-600 hover:bg-green-700"
            >
              <Database className="h-8 w-8 mb-2" />
              <span className="font-medium">Basic Test</span>
              <span className="text-xs opacity-90">3 core tests</span>
            </Button>

            <Button
              onClick={runAdvancedTest}
              disabled={isRunning}
              className="flex flex-col items-center p-6 h-auto bg-blue-600 hover:bg-blue-700"
            >
              <Zap className="h-8 w-8 mb-2" />
              <span className="font-medium">Advanced Test</span>
              <span className="text-xs opacity-90">7 comprehensive tests</span>
            </Button>

            <Button
              onClick={runFullTest}
              disabled={isRunning}
              className="flex flex-col items-center p-6 h-auto bg-purple-600 hover:bg-purple-700"
            >
              <BarChart3 className="h-8 w-8 mb-2" />
              <span className="font-medium">Full Test</span>
              <span className="text-xs opacity-90">12 complete tests</span>
            </Button>

            <Button
              onClick={retryFailedJobs}
              disabled={isRunning}
              variant="outline"
              className="flex flex-col items-center p-6 h-auto border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <Bug className="h-8 w-8 mb-2" />
              <span className="font-medium">Retry Failed</span>
              <span className="text-xs opacity-90">Reset error jobs</span>
            </Button>
          </div>

          {isRunning && currentTest && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <RefreshCw className="h-4 w-4 text-blue-500 animate-spin mr-2" />
                <span className="text-blue-800">Running: {currentTest}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Activity className="h-5 w-5 mr-2" />
              Test Results
            </CardTitle>
            <CardDescription>
              {testResults.length} test(s) executed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center flex-1">
                    <div className="mr-3">
                      {getStatusIcon(result.status)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {result.testName}
                        </span>
                        {result.duration && (
                          <span className="text-xs text-gray-500">
                            ({result.duration}ms)
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {result.message}
                      </p>
                      
                      {result.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                            View Details
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    {getStatusBadge(result.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Descriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Test Suite Descriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-green-700 dark:text-green-300 mb-2">Basic Test (3 tests)</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Database Connection</li>
                <li>• OCR Schema Validation</li>
                <li>• Google Vision API</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Advanced Test (7 tests)</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• All basic tests</li>
                <li>• OCR Processing Queue</li>
                <li>• Entity Extraction</li>
                <li>• Cross-Database Connectivity</li>
                <li>• Translation Service</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-purple-700 dark:text-purple-300 mb-2">Full Test (12 tests)</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• All advanced tests</li>
                <li>• End-to-End OCR Upload</li>
                <li>• Field Mapping Service</li>
                <li>• Record Transfer Pipeline</li>
                <li>• User Permissions</li>
                <li>• System Performance</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
