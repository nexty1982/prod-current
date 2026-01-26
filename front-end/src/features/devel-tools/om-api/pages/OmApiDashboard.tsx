/**
 * OM API Dashboard - Interactive API Development Tool
 * Displays discovered endpoints and provides testing interface
 */

import React, { useState, useEffect } from 'react';
import { endpointInspector, EndpointSpec } from '../lib/inspector';

const OmApiDashboard: React.FC = () => {
  const [endpoints, setEndpoints] = useState<EndpointSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointSpec | null>(null);
  const [requestMethod, setRequestMethod] = useState('GET');
  const [requestUrl, setRequestUrl] = useState('');
  const [requestHeaders, setRequestHeaders] = useState('');
  const [requestBody, setRequestBody] = useState('');
  const [response, setResponse] = useState<any>(null);

  // Load endpoints on component mount
  useEffect(() => {
    loadEndpoints();
  }, []);

  const loadEndpoints = async () => {
    setLoading(true);
    try {
      const index = await endpointInspector.loadIndex();
      setEndpoints(index.endpoints);
    } catch (error) {
      console.error('Failed to load endpoints:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectEndpoint = (endpoint: EndpointSpec) => {
    setSelectedEndpoint(endpoint);
    setRequestMethod(endpoint.method);
    setRequestUrl(endpoint.path);
    setRequestHeaders('Content-Type: application/json\nAuthorization: Bearer <token>');
    if (endpoint.method !== 'GET' && endpoint.method !== 'DELETE') {
      setRequestBody('{\n  "key": "value"\n}');
    } else {
      setRequestBody('');
    }
  };

  const sendRequest = async () => {
    if (!requestUrl) return;

    try {
      const headers: Record<string, string> = {};
      requestHeaders.split('\n').forEach(line => {
        const [key, value] = line.split(':').map(s => s.trim());
        if (key && value) {
          headers[key] = value;
        }
      });

      const requestOptions: RequestInit = {
        method: requestMethod,
        headers,
      };

      if (requestBody && (requestMethod === 'POST' || requestMethod === 'PUT' || requestMethod === 'PATCH')) {
        requestOptions.body = requestBody;
      }

      const startTime = Date.now();
      const response = await fetch(requestUrl, requestOptions);
      const endTime = Date.now();

      const responseBody = await response.text();
      let parsedBody;
      try {
        parsedBody = JSON.parse(responseBody);
      } catch {
        parsedBody = responseBody;
      }

      setResponse({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: parsedBody,
        timing: {
          duration: endTime - startTime,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      setResponse({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-800';
      case 'POST': return 'bg-blue-100 text-blue-800';
      case 'PUT': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'PATCH': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading API endpoints...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-xl">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">OM API Dashboard</h1>
              <p className="text-gray-600">API development, testing, and documentation tools</p>
            </div>
            <button 
              onClick={loadEndpoints}
              className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{endpoints.length}</div>
                <div className="text-sm text-gray-600">Total Endpoints</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {endpoints.filter(e => e.method === 'GET').length}
                </div>
                <div className="text-sm text-gray-600">GET Endpoints</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {endpoints.filter(e => e.method === 'POST').length}
                </div>
                <div className="text-sm text-gray-600">POST Endpoints</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {new Set(endpoints.map(e => e.file)).size}
                </div>
                <div className="text-sm text-gray-600">Source Files</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Endpoint List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">API Endpoints</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {endpoints.map((endpoint, index) => (
                  <div 
                    key={index}
                    onClick={() => selectEndpoint(endpoint)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedEndpoint?.path === endpoint.path && selectedEndpoint?.method === endpoint.method
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getMethodColor(endpoint.method)}`}>
                        {endpoint.method}
                      </span>
                      <span className="font-mono text-sm">{endpoint.path}</span>
                    </div>
                    {endpoint.description && (
                      <p className="text-xs text-gray-600">{endpoint.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500">{endpoint.file}</span>
                      {endpoint.tags && endpoint.tags.map(tag => (
                        <span key={tag} className="px-1 py-0.5 bg-gray-200 text-gray-700 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                
                {endpoints.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p>No endpoints discovered</p>
                    <p className="text-xs mt-1">Click refresh to scan for API endpoints</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Request Builder & Response */}
          <div className="lg:col-span-2 space-y-6">
            {/* Request Builder */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Request Builder</h2>
              
              <div className="space-y-4">
                {/* Method and URL */}
                <div className="grid grid-cols-4 gap-2">
                  <select 
                    value={requestMethod}
                    onChange={(e) => setRequestMethod(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option>GET</option>
                    <option>POST</option>
                    <option>PUT</option>
                    <option>DELETE</option>
                    <option>PATCH</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="/api/endpoint" 
                    value={requestUrl}
                    onChange={(e) => setRequestUrl(e.target.value)}
                    className="col-span-3 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Headers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Headers</label>
                  <textarea 
                    rows={3}
                    placeholder="Content-Type: application/json&#10;Authorization: Bearer token"
                    value={requestHeaders}
                    onChange={(e) => setRequestHeaders(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                {/* Request Body */}
                {(requestMethod === 'POST' || requestMethod === 'PUT' || requestMethod === 'PATCH') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Request Body (JSON)</label>
                    <textarea 
                      rows={6}
                      placeholder='{"key": "value"}'
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                )}

                {/* Send Button */}
                <div className="flex items-center gap-3">
                  <button 
                    onClick={sendRequest}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send Request
                  </button>
                </div>
              </div>
            </div>

            {/* Response */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Response</h2>
              {response ? (
                <div className="space-y-4">
                  {response.error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium text-red-800">Request Failed</span>
                      </div>
                      <p className="text-red-700 text-sm">{response.error}</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4 pb-4 border-b">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          response.status >= 200 && response.status < 300 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {response.status} {response.statusText}
                        </span>
                        {response.timing && (
                          <span className="text-sm text-gray-600">
                            {response.timing.duration}ms
                          </span>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Response Body</h3>
                        <pre className="bg-gray-50 rounded-lg p-4 text-sm overflow-auto max-h-64 border">
                          {JSON.stringify(response.body, null, 2)}
                        </pre>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                  <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <p>Send a request to see the response</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-green-800 font-medium">OM API Dashboard Active!</span>
          </div>
          <p className="text-green-700 text-sm mt-1">
            {endpoints.length > 0 
              ? `Discovered ${endpoints.length} API endpoints. Click any endpoint to test it.`
              : 'Endpoint discovery ready. Click refresh to scan for API endpoints.'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default OmApiDashboard;
