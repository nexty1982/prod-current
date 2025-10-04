import React, { useState, useCallback, useEffect } from 'react';
import { OMAIUltimateLoggerProps } from './types';
import { useLogStats } from './hooks';
import { mockLogStats, mockRealTimeLogs, mockCriticalEvents, mockSystemMessages, mockHistoricalLogs } from './mockData';
import { formatTimestamp } from './utils';

export const OMAIUltimateLogger: React.FC<OMAIUltimateLoggerProps> = ({
  autoScroll = true,
  defaultFilter = {},
  refreshInterval = 30000
}) => {
  const [isLive, setIsLive] = useState(true);
  const [currentView, setCurrentView] = useState<'all' | 'errors' | 'system' | 'historical'>('all');

  const { stats: apiStats, loading: statsLoading, refetch: refreshStats } = useLogStats(refreshInterval);
  const stats = apiStats || mockLogStats;

  const handleToggleLive = useCallback(() => {
    setIsLive(prev => !prev);
  }, []);

  const handleRefreshAll = useCallback(() => {
    refreshStats();
  }, [refreshStats]);

  return (
    <div className="h-full bg-slate-950 text-white">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-green-400">OMAI Ultimate Logger</h1>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-sm font-medium">{isLive ? 'LIVE' : 'PAUSED'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {stats && (
              <div className="text-sm">
                <span>Total: {stats.totalLogs.toLocaleString()}</span>
                <span className="ml-4">Errors: {stats.recentErrors}</span>
              </div>
            )}
            
            <button
              onClick={handleToggleLive}
              className="px-3 py-1.5 bg-yellow-600 text-white rounded text-sm"
            >
              {isLive ? 'Pause' : 'Resume'}
            </button>
            
            <button
              onClick={handleRefreshAll}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="p-4 h-full">
        <div className="grid grid-cols-2 gap-4 h-full">
          
          {/* Real-Time Logs */}
          <div className="bg-slate-800 rounded-lg border border-green-500 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-green-400 font-bold">Real-Time Logs</h3>
              <span className="bg-green-500 text-white px-2 py-1 rounded text-xs">LIVE</span>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {mockRealTimeLogs.slice(0, 300).map((log, index) => (
                <div key={index} className="bg-slate-900 p-3 rounded border-l-2 border-cyan-400">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400">{formatTimestamp(log.timestamp)}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      log.level === 'ERROR' ? 'bg-red-600 text-white' :
                      log.level === 'WARN' ? 'bg-yellow-600 text-white' :
                      log.level === 'SUCCESS' ? 'bg-green-600 text-white' :
                      'bg-blue-600 text-white'
                    }`}>
                      {log.level}
                    </span>
                    <span className="text-cyan-400 text-xs">[{log.source}]</span>
                  </div>
                  <div className="text-sm text-white">{log.message}</div>
                  {log.service && <div className="text-xs text-gray-400 mt-1">Service: {log.service}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Critical Events */}
          <div className="bg-slate-800 rounded-lg border border-red-500 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-red-400 font-bold">⚠ Critical Events</h3>
              <span className="bg-red-500 text-white px-2 py-1 rounded text-xs">{mockCriticalEvents.length} alerts</span>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {mockCriticalEvents.slice(0, 300).map((event, index) => (
                <div key={index} className="bg-red-900/20 border border-red-500/30 rounded p-3">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">🛡️</div>
                    <div className="flex-1">
                      <div className="text-red-300 font-medium mb-1">{event.message}</div>
                      <div className="text-xs text-gray-400">{formatTimestamp(event.timestamp)}</div>
                      {event.ip_address && (
                        <div className="text-xs text-orange-400 mt-1">IP: {event.ip_address}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Messages */}
          <div className="bg-slate-800 rounded-lg border border-blue-500 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-blue-400 font-bold">💬 System Messages</h3>
              <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs">{mockSystemMessages.length} messages</span>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {mockSystemMessages.slice(0, 300).map((message, index) => (
                <div key={index} className="bg-blue-900/20 border border-blue-500/30 rounded p-3">
                  <div className="flex items-start gap-3">
                    <div className="text-xl">⚡</div>
                    <div className="flex-1">
                      <div className="text-white font-medium mb-1">{message.message}</div>
                      <div className="text-xs text-gray-400">{formatTimestamp(message.timestamp)}</div>
                      {message.source && (
                        <div className="text-xs text-cyan-400 mt-1">[{message.source}]</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Historical Logs */}
          <div className="bg-slate-800 rounded-lg border border-purple-500 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-purple-400 font-bold">📊 Historical Logs</h3>
              <div className="flex gap-2">
                <select className="bg-slate-700 text-white text-xs px-2 py-1 rounded">
                  <option>Today</option>
                  <option>Past Week</option>
                  <option>Past Month</option>
                </select>
                <span className="bg-purple-500 text-white px-2 py-1 rounded text-xs">{mockHistoricalLogs.length} entries</span>
              </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {mockHistoricalLogs.slice(0, 300).map((log, index) => (
                <div key={index} className="bg-slate-900 p-3 rounded border-l-2 border-purple-400">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400">{formatTimestamp(log.timestamp)}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      log.level === 'ERROR' ? 'bg-red-600 text-white' :
                      log.level === 'WARN' ? 'bg-yellow-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {log.level}
                    </span>
                    <span className="text-purple-400 text-xs">[{log.source}]</span>
                  </div>
                  <div className="text-sm text-white">{log.message}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-900 border-t border-slate-700 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span>Status: Live</span>
            <span>Active filters: 0</span>
          </div>
          <div className="flex items-center gap-4">
            <span>OrthodoxMetrics.com</span>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OMAIUltimateLogger;