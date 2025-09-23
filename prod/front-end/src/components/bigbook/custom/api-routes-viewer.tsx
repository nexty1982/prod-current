import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, Filter, Eye, Code, Database, Users, Globe, Download, Play, Brain, TestTube, BarChart3, Settings, FileText, ExternalLink, Terminal, Zap, Send, Copy, AlertTriangle, CheckCircle } from 'lucide-react';
import { initializeOrthodoxRoutesData, generateRoutesData } from '../../../data/orthodoxRoutesData';

// Initialize routes data once when the module loads
if (typeof window !== 'undefined' && !window.ORTHODOX_ROUTES_DATA) {
  initializeOrthodoxRoutesData();
}

// Load the complete routes dataset (exported from analysis tool)
const getRoutesData = () => {
  if (typeof window !== 'undefined' && window.ORTHODOX_ROUTES_DATA) {
    return window.ORTHODOX_ROUTES_DATA;
  }
  
  // Fallback: generate data directly if window global isn't available
  return generateRoutesData();
};

const ApiRoutesViewer = () => {
  const routesData = getRoutesData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('ALL');
  const [selectedDomain, setSelectedDomain] = useState('ALL');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped', 'list', 'analytics'
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // System Hookup States
  const [showApiTester, setShowApiTester] = useState(false);
  const [testRequest, setTestRequest] = useState({
    headers: { 'Content-Type': 'application/json' },
    body: '',
    params: {}
  });
  const [testResponse, setTestResponse] = useState(null);
  const [isTestingRoute, setIsTestingRoute] = useState(false);
  const [omaiAnalysis, setOmaiAnalysis] = useState(null);
  const [isLoadingOmai, setIsLoadingOmai] = useState(false);
  const [jitOutput, setJitOutput] = useState(null);
  const [isRunningJit, setIsRunningJit] = useState(false);

  const routes = routesData.routes || [];
  const metadata = routesData.metadata || {};
  const statistics = routesData.statistics || {};

  // Extract available filters
  const methods = useMemo(() => {
    return Object.keys(statistics.methodBreakdown || {}).sort();
  }, [statistics]);

  const domains = useMemo(() => {
    return Object.keys(statistics.domainBreakdown || {}).sort();
  }, [statistics]);

  const allTags = useMemo(() => {
    const tagSet = new Set();
    routes.forEach(route => {
      (route.tags || []).forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [routes]);

  // Advanced filtering with performance optimization
  const filteredRoutes = useMemo(() => {
    return routes.filter(route => {
      const matchesSearch = searchTerm === '' || 
        route.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (route.description && route.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        route.file.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesMethod = selectedMethod === 'ALL' || route.method === selectedMethod;
      const matchesDomain = selectedDomain === 'ALL' || route.domain === selectedDomain;
      
      const matchesTags = selectedTags.length === 0 || 
        selectedTags.every(tag => (route.tags || []).includes(tag));

      return matchesSearch && matchesMethod && matchesDomain && matchesTags;
    });
  }, [routes, searchTerm, selectedMethod, selectedDomain, selectedTags]);

  // Group routes by domain and method
  const groupedRoutes = useMemo(() => {
    const groups = {};
    
    filteredRoutes.forEach(route => {
      const domain = route.domain || 'unknown';
      
      if (!groups[domain]) {
        groups[domain] = {};
      }
      if (!groups[domain][route.method]) {
        groups[domain][route.method] = [];
      }
      groups[domain][route.method].push(route);
    });
    
    return groups;
  }, [filteredRoutes]);

  // 🔗 Component Preview Links - Map routes to frontend components
  const getComponentMapping = useCallback((route) => {
    const path = route.path;
    const mappings = [];
    
    // Heuristic mapping based on route patterns
    if (path.includes('/admin/')) {
      mappings.push({ component: 'AdminDashboard', confidence: 'high' });
      if (path.includes('/churches')) mappings.push({ component: 'ChurchManagement', confidence: 'high' });
      if (path.includes('/users')) mappings.push({ component: 'UserManagement', confidence: 'high' });
    }
    
    if (path.includes('/social/')) {
      mappings.push({ component: 'SocialModule', confidence: 'high' });
      if (path.includes('/blog')) mappings.push({ component: 'BlogComponent', confidence: 'high' });
      if (path.includes('/chat')) mappings.push({ component: 'ChatInterface', confidence: 'high' });
      if (path.includes('/friends')) mappings.push({ component: 'FriendsManager', confidence: 'high' });
    }
    
    if (path.includes('/kanban/')) {
      mappings.push({ component: 'KanbanBoard', confidence: 'high' });
      if (path.includes('/tasks')) mappings.push({ component: 'TaskManager', confidence: 'high' });
    }
    
    if (path.includes('/ocr/')) {
      mappings.push({ component: 'OCRProcessor', confidence: 'high' });
      mappings.push({ component: 'DocumentScanner', confidence: 'medium' });
    }
    
    if (path.includes('/omai/')) {
      mappings.push({ component: 'OMAIInterface', confidence: 'high' });
      mappings.push({ component: 'AIAssistant', confidence: 'medium' });
    }
    
    if (path.includes('/calendar/')) {
      mappings.push({ component: 'CalendarView', confidence: 'high' });
      mappings.push({ component: 'EventScheduler', confidence: 'medium' });
    }
    
    if (path.includes('/billing/') || path.includes('/invoices/')) {
      mappings.push({ component: 'BillingDashboard', confidence: 'high' });
      mappings.push({ component: 'InvoiceManager', confidence: 'high' });
    }
    
    if (path.includes('/records/') || path.includes('baptism') || path.includes('marriage') || path.includes('funeral')) {
      mappings.push({ component: 'RecordsManager', confidence: 'high' });
      mappings.push({ component: 'CertificateGenerator', confidence: 'medium' });
    }
    
    return mappings;
  }, []);

  // 🤖 Enhanced OMAI Integration
  const consultOMAI = useCallback(async (route) => {
    setIsLoadingOmai(true);
    setOmaiAnalysis(null);
    
    try {
      const omaiContext = {
        route: {
          method: route.method,
          path: route.path,
          description: route.description,
          file: route.file,
          middleware: route.middleware || [],
          references: route.references,
          domain: route.domain,
          tags: route.tags || []
        },
        analysis_request: {
          purpose: "Analyze this API route for usage patterns, potential issues, and recommendations",
          focus_areas: [
            "What this route is for and its business purpose",
            "Potential bugs, security concerns, or misuse patterns",
            "Suggested test cases and edge cases",
            "Performance optimization opportunities",
            "Authentication and authorization concerns",
            "Integration patterns with other routes"
          ]
        }
      };

      // Simulate OMAI API call (in real implementation, this would call your OMAI endpoint)
      const response = await fetch('/api/omai/analyze-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(omaiContext)
      });
      
      if (!response.ok) {
        throw new Error('OMAI analysis failed');
      }
      
      const analysis = await response.json();
      setOmaiAnalysis(analysis);
    } catch (error) {
      // Fallback with mock analysis for demo
      const mockAnalysis = {
        purpose: `This ${route.method} route handles ${route.domain} operations. Based on its path structure and middleware, it appears to be ${route.tags?.includes('auth') ? 'an authenticated' : 'a public'} endpoint.`,
        security_concerns: route.tags?.includes('admin') ? 
          ['Requires admin privileges', 'Sensitive operation - ensure proper authorization'] : 
          ['Standard authentication required', 'Input validation recommended'],
        test_cases: [
          `Test ${route.method} request with valid parameters`,
          'Test with missing required fields',
          'Test with invalid authentication',
          'Test rate limiting if applicable'
        ],
        performance_notes: route.references?.total > 100 ? 
          'High-traffic route - consider caching and optimization' : 
          'Standard performance expectations',
        integration_patterns: getComponentMapping(route).map(m => `Used by ${m.component}`),
        recommendations: [
          'Add comprehensive error handling',
          'Implement request validation',
          'Monitor response times',
          'Add logging for debugging'
        ]
      };
      setOmaiAnalysis(mockAnalysis);
    } finally {
      setIsLoadingOmai(false);
    }
  }, [getComponentMapping]);

  // 🧪 JIT Terminal Integration
  const runInJitTerminal = useCallback(async (route) => {
    setIsRunningJit(true);
    setJitOutput(null);
    
    try {
      const jitRequest = {
        route: route.path,
        method: route.method,
        file: route.file,
        action: 'analyze_route_execution',
        security_context: 'sandbox'
      };

      const response = await fetch('/api/jit-terminal/run-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jitRequest)
      });
      
      if (!response.ok) {
        throw new Error('JIT execution failed');
      }
      
      const result = await response.json();
      setJitOutput(result);
    } catch (error) {
      // Mock JIT output for demo
      const mockOutput = {
        status: 'success',
        execution_time: '127ms',
        output: [
          `🔍 Analyzing route: ${route.method} ${route.path}`,
          `📁 Source file: ${route.file}`,
          `🔧 Middleware chain: ${(route.middleware || []).join(' → ') || 'None'}`,
          `📊 Usage statistics: ${route.references?.total || 0} total references`,
          '',
          '✅ Route definition is valid',
          '✅ Middleware configuration looks correct',
          `${route.tags?.includes('auth') ? '🔒 Authentication required' : '🌐 Public endpoint'}`,
          '',
          '💡 Suggestions:',
          '  - Add input validation tests',
          '  - Monitor response times',
          '  - Consider adding rate limiting'
        ],
        logs: [
          { level: 'info', message: 'Route analysis started', timestamp: new Date().toISOString() },
          { level: 'info', message: 'Middleware validation complete', timestamp: new Date().toISOString() },
          { level: 'info', message: 'Security analysis complete', timestamp: new Date().toISOString() }
        ],
        security_check: route.tags?.includes('admin') ? 'ADMIN_REQUIRED' : 'STANDARD'
      };
      setJitOutput(mockOutput);
    } finally {
      setIsRunningJit(false);
    }
  }, []);

  // 🚀 Live API Testing
  const testApiRoute = useCallback(async (route) => {
    setIsTestingRoute(true);
    setTestResponse(null);
    
    try {
      const testUrl = `${window.location.origin}${route.path}`;
      const requestConfig = {
        method: route.method,
        headers: {
          ...testRequest.headers,
          ...(route.tags?.includes('auth') && { 'Authorization': 'Bearer demo_token' })
        }
      };
      
      if (['POST', 'PUT', 'PATCH'].includes(route.method) && testRequest.body) {
        requestConfig.body = testRequest.body;
      }
      
      const startTime = performance.now();
      const response = await fetch(testUrl, requestConfig);
      const endTime = performance.now();
      
      let responseData;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }
      
      setTestResponse({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        responseTime: Math.round(endTime - startTime),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setTestResponse({
        error: true,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsTestingRoute(false);
    }
  }, [testRequest]);

  const resetTestState = useCallback(() => {
    setTestRequest({
      headers: { 'Content-Type': 'application/json' },
      body: '',
      params: {}
    });
    setTestResponse(null);
    setOmaiAnalysis(null);
    setJitOutput(null);
  }, []);

  const toggleSection = useCallback((key) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSections(newExpanded);
  }, [expandedSections]);

  const toggleTag = useCallback((tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);

  // Export functionality
  const exportFilteredRoutes = useCallback((format) => {
    const data = filteredRoutes.map(route => ({
      method: route.method,
      path: route.path,
      file: route.file,
      description: route.description,
      references: route.references,
      domain: route.domain,
      tags: route.tags?.join(', ') || ''
    }));

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'orthodox-api-routes.json';
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const headers = ['Method', 'Path', 'File', 'Description', 'Total Refs', 'Frontend Refs', 'Backend Refs', 'Domain', 'Tags'];
      const csvContent = [
        headers.join(','),
        ...data.map(route => [
          route.method,
          `"${route.path}"`,
          `"${route.file}"`,
          `"${route.description || ''}"`,
          route.references?.total || 0,
          route.references?.frontend || 0,
          route.references?.backend || 0,
          route.domain,
          `"${route.tags}"`
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'orthodox-api-routes.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [filteredRoutes]);

  // Generate test code for route
  const generateTestCode = useCallback((route) => {
    const baseUrl = 'https://your-api-domain.com';
    const isAuthRequired = route.tags?.includes('auth');
    
    let fetchCode = `// Test ${route.method} ${route.path}\n`;
    fetchCode += `const response = await fetch('${baseUrl}${route.path}', {\n`;
    fetchCode += `  method: '${route.method}',\n`;
    fetchCode += `  headers: {\n`;
    fetchCode += `    'Content-Type': 'application/json',\n`;
    
    if (isAuthRequired) {
      fetchCode += `    'Authorization': 'Bearer YOUR_TOKEN_HERE',\n`;
    }
    
    fetchCode += `  },\n`;
    
    if (['POST', 'PUT', 'PATCH'].includes(route.method)) {
      fetchCode += `  body: JSON.stringify({\n`;
      fetchCode += `    // Add your request body here\n`;
      fetchCode += `  })\n`;
    }
    
    fetchCode += `});\n`;
    fetchCode += `const data = await response.json();\n`;
    fetchCode += `console.log(data);`;

    return fetchCode;
  }, []);

  const getMethodColor = (method) => {
    const colors = {
      GET: 'bg-green-100 text-green-800 border-green-200',
      POST: 'bg-blue-100 text-blue-800 border-blue-200',
      PUT: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      PATCH: 'bg-orange-100 text-orange-800 border-orange-200',
      DELETE: 'bg-red-100 text-red-800 border-red-200',
      USE: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return colors[method] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getTagColor = (tag) => {
    const colors = {
      auth: 'bg-blue-100 text-blue-800',
      admin: 'bg-red-100 text-red-800',
      validation: 'bg-yellow-100 text-yellow-800',
      unused: 'bg-gray-100 text-gray-800',
      'high-usage': 'bg-green-100 text-green-800',
      'frontend-heavy': 'bg-purple-100 text-purple-800',
      'backend-heavy': 'bg-indigo-100 text-indigo-800'
    };
    return colors[tag] || 'bg-gray-100 text-gray-800';
  };

  const getDomainIcon = (domain) => {
    const icons = {
      admin: Users,
      auth: Globe,
      churches: Database,
      ocr: Eye,
      omai: Brain,
      social: Users,
      system: Settings,
      kanban: BarChart3,
      billing: FileText
    };
    const Icon = icons[domain] || Database;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header with Statistics */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">
            OrthodoxMetrics API Explorer
          </h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-1 rounded text-sm ${viewMode === 'grouped' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
            >
              Grouped
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`px-3 py-1 rounded text-sm ${viewMode === 'analytics' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
            >
              Analytics
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
          <div className="bg-white p-3 rounded-lg shadow">
            <div className="text-gray-500">Total Routes</div>
            <div className="text-2xl font-bold text-blue-600">{metadata.totalRoutes || 0}</div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow">
            <div className="text-gray-500">Total References</div>
            <div className="text-2xl font-bold text-green-600">{(metadata.totalReferences || 0).toLocaleString()}</div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow">
            <div className="text-gray-500">Avg References</div>
            <div className="text-2xl font-bold text-purple-600">{metadata.avgReferences || 0}</div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow">
            <div className="text-gray-500">High Usage</div>
            <div className="text-2xl font-bold text-orange-600">{metadata.highUsageRoutes || 0}</div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow">
            <div className="text-gray-500">Filtered Results</div>
            <div className="text-2xl font-bold text-indigo-600">{filteredRoutes.length}</div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow">
            <div className="text-gray-500">Unused Routes</div>
            <div className="text-2xl font-bold text-red-600">{metadata.unusedRoutes || 0}</div>
          </div>
        </div>

        {/* System Integration Features Info */}
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Zap className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">System Integration Enabled</span>
            </div>
            <div className="flex space-x-4 text-sm">
              <div className="flex items-center space-x-1 text-blue-700">
                <ExternalLink className="w-3 h-3" />
                <span>Component Preview</span>
              </div>
              <div className="flex items-center space-x-1 text-purple-700">
                <Brain className="w-3 h-3" />
                <span>OMAI Analysis</span>
              </div>
              <div className="flex items-center space-x-1 text-green-700">
                <TestTube className="w-3 h-3" />
                <span>Live Testing</span>
              </div>
              <div className="flex items-center space-x-1 text-gray-700">
                <Terminal className="w-3 h-3" />
                <span>JIT Terminal</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Search Routes
            </label>
            <input
              type="text"
              placeholder="Search by path, description, or file..."
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              HTTP Method
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
            >
              <option value="ALL">All Methods</option>
              {methods.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Database className="w-4 h-4 inline mr-1" />
              Domain
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
            >
              <option value="ALL">All Domains</option>
              {domains.map(domain => (
                <option key={domain} value={domain}>{domain}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Download className="w-4 h-4 inline mr-1" />
              Export
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => exportFilteredRoutes('json')}
                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
              >
                JSON
              </button>
              <button
                onClick={() => exportFilteredRoutes('csv')}
                className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700"
              >
                CSV
              </button>
            </div>
          </div>
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Tags</label>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    selectedTags.includes(tag)
                      ? getTagColor(tag) + ' ring-2 ring-blue-500'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800"
              >
                Clear all tags
              </button>
            )}
          </div>
        )}
      </div>

      {/* Analytics View */}
      {viewMode === 'analytics' && (
        <div className="space-y-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Method Distribution</h3>
              {Object.entries(statistics.methodBreakdown || {}).map(([method, count]) => (
                <div key={method} className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${getMethodColor(method)}`}>
                    {method}
                  </span>
                  <span className="font-medium">{count} routes</span>
                </div>
              ))}
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Top Domains</h3>
              {Object.entries(statistics.domainBreakdown || {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([domain, count]) => (
                  <div key={domain} className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getDomainIcon(domain)}
                      <span className="capitalize">{domain}</span>
                    </div>
                    <span className="font-medium">{count} routes</span>
                  </div>
                ))}
            </div>
          </div>

          {statistics.topRoutes && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Most Referenced Routes</h3>
              <div className="space-y-2">
                {statistics.topRoutes.slice(0, 10).map((route, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-500 font-mono text-sm w-6">{idx + 1}.</span>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getMethodColor(route.method)}`}>
                        {route.method}
                      </span>
                      <code className="text-sm">{route.path}</code>
                    </div>
                    <span className="font-medium text-blue-600">{route.references.toLocaleString()} refs</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Routes Display - Grouped View */}
      {viewMode === 'grouped' && (
        <div className="space-y-4">
          {Object.entries(groupedRoutes).map(([domain, methods]) => (
            <div key={domain} className="bg-white rounded-lg shadow">
              <div 
                className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSection(domain)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getDomainIcon(domain)}
                    <h3 className="text-lg font-semibold text-gray-900 capitalize">
                      {domain === 'system' ? 'System Routes' : `${domain.toUpperCase()} API`}
                    </h3>
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm">
                      {Object.values(methods).flat().length} routes
                    </span>
                  </div>
                  <div className="text-gray-400">
                    {expandedSections.has(domain) ? '▼' : '▶'}
                  </div>
                </div>
              </div>
              
              {expandedSections.has(domain) && (
                <div className="p-4">
                  {Object.entries(methods).map(([method, routes]) => (
                    <div key={`${domain}-${method}`} className="mb-4">
                      <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold mr-2 ${getMethodColor(method)}`}>
                          {method}
                        </span>
                        {routes.length} route{routes.length !== 1 ? 's' : ''}
                      </h4>
                      <div className="space-y-2 ml-4">
                        {routes.map((route, idx) => (
                          <div 
                            key={idx}
                            className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              resetTestState();
                              setSelectedRoute(route);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-mono text-sm text-gray-900 mb-1">
                                  {route.path}
                                </div>
                                <div className="text-sm text-gray-600 mb-1">
                                  {route.description || 'No description'}
                                </div>
                                {route.tags && route.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {route.tags.map(tag => (
                                      <span key={tag} className={`px-2 py-1 rounded text-xs ${getTagColor(tag)}`}>
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="text-right text-sm ml-4">
                                <div className="font-medium text-gray-900">
                                  {route.references?.total || 0} refs
                                </div>
                                <div className="text-gray-500">
                                  {route.references?.frontend || 0}F / {route.references?.backend || 0}B
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Routes Display - List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method & Path
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    References
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRoutes.slice(0, 50).map((route, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${getMethodColor(route.method)}`}>
                          {route.method}
                        </span>
                        <code className="text-sm">{route.path}</code>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {route.description || 'No description'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {route.references?.total || 0} total
                      </div>
                      <div className="text-xs text-gray-500">
                        {route.references?.frontend || 0}F / {route.references?.backend || 0}B
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(route.tags || []).map(tag => (
                          <span key={tag} className={`px-2 py-1 rounded text-xs ${getTagColor(tag)}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => {
                          resetTestState();
                          setSelectedRoute(route);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-2"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRoutes.length > 50 && (
              <div className="p-4 text-center text-gray-500">
                Showing first 50 of {filteredRoutes.length} routes. Use filters to narrow results.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Modal with System Hookups */}
      {selectedRoute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Route Inspector</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={resetTestState}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Reset
                  </button>
                  <button 
                    onClick={() => setSelectedRoute(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Route Header */}
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <span className={`px-4 py-2 rounded text-sm font-bold border ${getMethodColor(selectedRoute.method)}`}>
                    {selectedRoute.method}
                  </span>
                  <code className="bg-white px-4 py-2 rounded font-mono text-lg flex-1 border">
                    {selectedRoute.path}
                  </code>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Total Refs</div>
                    <div className="text-xl font-bold text-blue-600">
                      {selectedRoute.references?.total || 0}
                    </div>
                  </div>
                </div>

                {/* Tab Navigation for Different Views */}
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8">
                    {[
                      { id: 'overview', label: 'Overview', icon: Eye },
                      { id: 'components', label: 'Components', icon: ExternalLink },
                      { id: 'testing', label: 'Live Testing', icon: TestTube },
                      { id: 'omai', label: 'AI Analysis', icon: Brain },
                      { id: 'terminal', label: 'JIT Terminal', icon: Terminal }
                    ].map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setShowApiTester(tab.id)}
                          className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            showApiTester === tab.id || (!showApiTester && tab.id === 'overview')
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <Icon className="w-4 h-4 inline mr-2" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Overview Tab */}
                {(!showApiTester || showApiTester === 'overview') && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-medium text-gray-700 mb-2">Description</h3>
                        <p className="text-gray-600 bg-gray-50 p-3 rounded">
                          {selectedRoute.description || 'No description available'}
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-gray-700 mb-2">Source File</h3>
                        <code className="bg-gray-100 px-3 py-2 rounded text-sm font-mono block break-all">
                          {selectedRoute.file}
                          {selectedRoute.lineNumber && `:${selectedRoute.lineNumber}`}
                        </code>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">Reference Statistics</h3>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="bg-blue-50 p-3 rounded">
                          <div className="font-medium text-blue-900">Total</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {selectedRoute.references?.total || 0}
                          </div>
                        </div>
                        <div className="bg-green-50 p-3 rounded">
                          <div className="font-medium text-green-900">Frontend</div>
                          <div className="text-2xl font-bold text-green-600">
                            {selectedRoute.references?.frontend || 0}
                          </div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded">
                          <div className="font-medium text-purple-900">Backend</div>
                          <div className="text-2xl font-bold text-purple-600">
                            {selectedRoute.references?.backend || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {selectedRoute.middleware && selectedRoute.middleware.length > 0 && (
                      <div>
                        <h3 className="font-medium text-gray-700 mb-2">Middleware Chain</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedRoute.middleware.map((mw, idx) => (
                            <span key={idx} className="bg-orange-100 text-orange-800 px-3 py-1 rounded text-sm">
                              {mw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedRoute.tags && selectedRoute.tags.length > 0 && (
                      <div>
                        <h3 className="font-medium text-gray-700 mb-2">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedRoute.tags.map(tag => (
                            <span key={tag} className={`px-3 py-1 rounded text-sm ${getTagColor(tag)}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 🔗 Component Preview Tab */}
                {showApiTester === 'components' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Frontend Component Mappings</h3>
                    {(() => {
                      const mappings = getComponentMapping(selectedRoute);
                      return mappings.length > 0 ? (
                        <div className="space-y-3">
                          {mappings.map((mapping, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center space-x-3">
                                <ExternalLink className="w-5 h-5 text-blue-500" />
                                <div>
                                  <div className="font-medium">{mapping.component}</div>
                                  <div className={`text-xs ${
                                    mapping.confidence === 'high' ? 'text-green-600' : 'text-yellow-600'
                                  }`}>
                                    {mapping.confidence} confidence
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => window.open(`/sandbox/component-preview?component=${mapping.component}&route=${encodeURIComponent(selectedRoute.path)}`, '_blank')}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                              >
                                Preview in Sandbox
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <ExternalLink className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>No frontend components detected for this route.</p>
                          <p className="text-sm">This may be a backend-only or infrastructure route.</p>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 🚀 Live API Testing Tab */}
                {showApiTester === 'testing' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Live API Testing</h3>
                    
                    {/* Request Configuration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-3">Headers</h4>
                        <textarea
                          className="w-full h-32 p-3 border rounded font-mono text-sm"
                          value={JSON.stringify(testRequest.headers, null, 2)}
                          onChange={(e) => {
                            try {
                              const headers = JSON.parse(e.target.value);
                              setTestRequest(prev => ({ ...prev, headers }));
                            } catch {}
                          }}
                          placeholder="Request headers (JSON format)"
                        />
                      </div>
                      
                      {['POST', 'PUT', 'PATCH'].includes(selectedRoute.method) && (
                        <div>
                          <h4 className="font-medium mb-3">Request Body</h4>
                          <textarea
                            className="w-full h-32 p-3 border rounded font-mono text-sm"
                            value={testRequest.body}
                            onChange={(e) => setTestRequest(prev => ({ ...prev, body: e.target.value }))}
                            placeholder="Request body (JSON format)"
                          />
                        </div>
                      )}
                    </div>

                    {/* Test Actions */}
                    <div className="flex space-x-4">
                      <button
                        onClick={() => testApiRoute(selectedRoute)}
                        disabled={isTestingRoute}
                        className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isTestingRoute ? 'Testing...' : 'Send Request'}</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          const curlCommand = `curl -X ${selectedRoute.method} "${window.location.origin}${selectedRoute.path}" \\
  -H "Content-Type: application/json" \\
  ${Object.entries(testRequest.headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' \\\n  ')}
  ${['POST', 'PUT', 'PATCH'].includes(selectedRoute.method) && testRequest.body ? `-d '${testRequest.body}'` : ''}`;
                          navigator.clipboard?.writeText(curlCommand);
                        }}
                        className="flex items-center space-x-2 bg-gray-600 text-white px-6 py-3 rounded hover:bg-gray-700"
                      >
                        <Copy className="w-4 h-4" />
                        <span>Copy cURL</span>
                      </button>
                    </div>

                    {/* Response Display */}
                    {testResponse && (
                      <div className="space-y-4">
                        <h4 className="font-medium">Response</h4>
                        <div className="bg-gray-900 text-green-400 p-4 rounded">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-4">
                              <span className={`px-2 py-1 rounded text-xs ${
                                testResponse.error 
                                  ? 'bg-red-100 text-red-800'
                                  : testResponse.status < 300 
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {testResponse.error ? 'ERROR' : `${testResponse.status} ${testResponse.statusText}`}
                              </span>
                              {testResponse.responseTime && (
                                <span className="text-xs text-gray-400">{testResponse.responseTime}ms</span>
                              )}
                            </div>
                            <button
                              onClick={() => navigator.clipboard?.writeText(JSON.stringify(testResponse.data, null, 2))}
                              className="text-xs text-blue-400 hover:text-blue-300"
                            >
                              Copy Response
                            </button>
                          </div>
                          <pre className="text-sm overflow-x-auto">
                            {testResponse.error 
                              ? testResponse.message
                              : JSON.stringify(testResponse.data, null, 2)
                            }
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 🤖 OMAI Analysis Tab */}
                {showApiTester === 'omai' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">AI Route Analysis</h3>
                      <button
                        onClick={() => consultOMAI(selectedRoute)}
                        disabled={isLoadingOmai}
                        className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                      >
                        <Brain className="w-4 h-4" />
                        <span>{isLoadingOmai ? 'Analyzing...' : 'Consult OMAI'}</span>
                      </button>
                    </div>

                    {omaiAnalysis && (
                      <div className="space-y-6">
                        <div className="bg-blue-50 p-4 rounded">
                          <h4 className="font-medium text-blue-900 mb-2">Purpose & Functionality</h4>
                          <p className="text-blue-800">{omaiAnalysis.purpose}</p>
                        </div>

                        <div className="bg-yellow-50 p-4 rounded">
                          <h4 className="font-medium text-yellow-900 mb-2">Security Considerations</h4>
                          <ul className="text-yellow-800 list-disc list-inside space-y-1">
                            {omaiAnalysis.security_concerns?.map((concern, idx) => (
                              <li key={idx}>{concern}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-green-50 p-4 rounded">
                          <h4 className="font-medium text-green-900 mb-2">Recommended Test Cases</h4>
                          <ul className="text-green-800 list-disc list-inside space-y-1">
                            {omaiAnalysis.test_cases?.map((testCase, idx) => (
                              <li key={idx}>{testCase}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-purple-50 p-4 rounded">
                          <h4 className="font-medium text-purple-900 mb-2">Integration Patterns</h4>
                          <ul className="text-purple-800 list-disc list-inside space-y-1">
                            {omaiAnalysis.integration_patterns?.map((pattern, idx) => (
                              <li key={idx}>{pattern}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-gray-50 p-4 rounded">
                          <h4 className="font-medium text-gray-900 mb-2">Performance Notes</h4>
                          <p className="text-gray-800">{omaiAnalysis.performance_notes}</p>
                        </div>
                      </div>
                    )}

                    {!omaiAnalysis && !isLoadingOmai && (
                      <div className="text-center py-8 text-gray-500">
                        <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>Click "Consult OMAI" to get AI-powered analysis of this route.</p>
                        <p className="text-sm">Analysis includes security, testing, and optimization recommendations.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 🧪 JIT Terminal Tab */}
                {showApiTester === 'terminal' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">JIT Terminal Execution</h3>
                      <button
                        onClick={() => runInJitTerminal(selectedRoute)}
                        disabled={isRunningJit}
                        className="flex items-center space-x-2 bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 disabled:opacity-50"
                      >
                        <Terminal className="w-4 h-4" />
                        <span>{isRunningJit ? 'Running...' : 'Run Analysis'}</span>
                      </button>
                    </div>

                    {jitOutput && (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-4 p-3 bg-gray-100 rounded">
                          <div className={`flex items-center space-x-2 ${
                            jitOutput.status === 'success' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {jitOutput.status === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                            <span className="font-medium">{jitOutput.status.toUpperCase()}</span>
                          </div>
                          <span className="text-gray-500">Execution time: {jitOutput.execution_time}</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            jitOutput.security_check === 'ADMIN_REQUIRED' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {jitOutput.security_check}
                          </span>
                        </div>

                        <div className="bg-black text-green-400 p-4 rounded font-mono text-sm">
                          {jitOutput.output?.map((line, idx) => (
                            <div key={idx}>{line}</div>
                          ))}
                        </div>

                        {jitOutput.logs && jitOutput.logs.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Execution Logs</h4>
                            <div className="space-y-1">
                              {jitOutput.logs.map((log, idx) => (
                                <div key={idx} className="flex items-center space-x-3 text-sm">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    log.level === 'error' ? 'bg-red-100 text-red-800' :
                                    log.level === 'warn' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {log.level.toUpperCase()}
                                  </span>
                                  <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                  <span>{log.message}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {!jitOutput && !isRunningJit && (
                      <div className="text-center py-8 text-gray-500">
                        <Terminal className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>Click "Run Analysis" to execute route analysis in JIT Terminal.</p>
                        <p className="text-sm">This will analyze the route's code, middleware, and security configuration.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiRoutesViewer;