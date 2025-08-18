import React, { useState, useEffect } from 'react';

/**
 * Simple Log Viewer - Fallback component for debugging
 */
export const SimpleLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      // Test the API endpoint
      const response = await fetch('/api/admin/logs/database?limit=10');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setLogs(data.logs || []);
      
    } catch (err: any) {
      console.error('Failed to fetch logs:', err);
      setError(err.message || 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">
            🔍 Simple Log Viewer (Debug Mode)
          </h1>
          <p className="text-slate-400">
            Basic log viewer for testing API connectivity
          </p>
          
          <button
            onClick={fetchLogs}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            🔄 Refresh Logs
          </button>
        </div>

        {/* Content */}
        <div className="bg-slate-800 rounded-lg p-6">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-slate-400">Loading logs...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
              <h3 className="text-red-400 font-bold mb-2">❌ Error</h3>
              <p className="text-red-300">{error}</p>
              <div className="mt-3 text-sm text-red-200">
                <p>Common issues:</p>
                <ul className="list-disc ml-5 mt-1">
                  <li>Backend server not running on port 3002</li>
                  <li>Database logging tables not created</li>
                  <li>API endpoint not accessible</li>
                </ul>
              </div>
            </div>
          )}

          {!loading && !error && (
            <div>
              <h3 className="text-white font-bold mb-4">
                📋 Recent Logs ({logs.length})
              </h3>
              
              {logs.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p>No logs found in database</p>
                  <p className="text-sm mt-2">
                    Try running some backend operations to generate logs
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div
                      key={log.id || index}
                      className="bg-slate-900/50 border border-slate-700 rounded p-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          log.level === 'ERROR' ? 'bg-red-600 text-white' :
                          log.level === 'WARN' ? 'bg-yellow-600 text-white' :
                          log.level === 'SUCCESS' ? 'bg-green-600 text-white' :
                          'bg-blue-600 text-white'
                        }`}>
                          {log.level || 'INFO'}
                        </span>
                        
                        <div className="flex-1">
                          <div className="text-white text-sm">
                            {log.message || 'No message'}
                          </div>
                          <div className="text-slate-400 text-xs mt-1">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'No timestamp'} 
                            {log.source && ` • ${log.source}`}
                            {log.service && ` • ${log.service}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* API Test Results */}
          <div className="mt-8 pt-6 border-t border-slate-700">
            <h3 className="text-white font-bold mb-4">🔧 API Test Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/50 border border-slate-700 rounded p-3">
                <h4 className="text-slate-300 font-medium mb-2">Database Logs API</h4>
                <p className="text-xs text-slate-400">
                  Endpoint: <code className="bg-slate-800 px-1 rounded">/api/admin/logs/database</code>
                </p>
                <p className="text-xs mt-1">
                  Status: <span className={error ? 'text-red-400' : 'text-green-400'}>
                    {error ? 'Failed' : 'Connected'}
                  </span>
                </p>
              </div>
              
              <div className="bg-slate-900/50 border border-slate-700 rounded p-3">
                <h4 className="text-slate-300 font-medium mb-2">Response Data</h4>
                <p className="text-xs text-slate-400">
                  Logs found: <span className="text-white">{logs.length}</span>
                </p>
                <p className="text-xs text-slate-400">
                  Data structure: <span className="text-white">
                    {logs.length > 0 ? 'Valid' : 'Empty'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleLogViewer;
