import React, { useState, useEffect } from 'react';
import { LogEntry, LogLevel, LogFilter } from './types.ts';
import { useLogs } from './hooks.ts';
import { mockHistoricalLogs } from './mockData.ts';
import { formatDate, formatTimestamp, getLogLevelBadgeColor, formatMetadata, groupLogsByTimeWindow } from './utils.ts';

interface HistoricalLogViewerProps {
  maxLogs?: number;
  onLogCount?: (count: number) => void;
}

export const HistoricalLogViewer: React.FC<HistoricalLogViewerProps> = ({
  maxLogs = 300,
  onLogCount
}) => {
  const [selectedDate, setSelectedDate] = useState('today');
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>(mockHistoricalLogs);

  // Build filter based on selections
  const filter: LogFilter = {
    limit: maxLogs,
    ...(selectedLevel !== 'all' && { level: selectedLevel }),
    ...(searchTerm && { search: searchTerm })
  };

  // Add date filtering
  if (selectedDate !== 'all') {
    const today = new Date();
    if (selectedDate === 'today') {
      filter.start_date = today.toISOString().split('T')[0];
    } else if (selectedDate === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      filter.start_date = weekAgo.toISOString().split('T')[0];
    } else if (selectedDate === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(today.getMonth() - 1);
      filter.start_date = monthAgo.toISOString().split('T')[0];
    }
  }

  const { logs: apiLogs, loading, error, refetch, totalCount } = useLogs(filter, false);

  // Use API logs if available, otherwise use mock data
  useEffect(() => {
    if (apiLogs.length > 0) {
      setLogs(apiLogs);
    } else {
      // Filter mock data based on selections
      let filteredLogs = [...mockHistoricalLogs];
      
      if (selectedLevel !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.level === selectedLevel);
      }
      
      if (searchTerm) {
        filteredLogs = filteredLogs.filter(log => 
          log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (log.service && log.service.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
      
      setLogs(filteredLogs.slice(0, maxLogs));
    }
  }, [apiLogs, selectedLevel, searchTerm, maxLogs]);

  // Notify parent of log count changes
  useEffect(() => {
    if (onLogCount) {
      onLogCount(logs.length);
    }
  }, [logs.length, onLogCount]);

  const handleToggleExpand = (logId: number) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  const getLogIcon = (log: LogEntry) => {
    switch (log.level) {
      case 'ERROR': return '❌';
      case 'WARN': return '⚠️';
      case 'SUCCESS': return '✅';
      case 'INFO': return 'ℹ️';
      case 'DEBUG': return '🔍';
      default: return '📄';
    }
  };

  const getLogLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'ERROR': return 'text-red-400';
      case 'WARN': return 'text-yellow-400';
      case 'SUCCESS': return 'text-green-400';
      case 'INFO': return 'text-cyan-400';
      case 'DEBUG': return 'text-purple-400';
      default: return 'text-white';
    }
  };

  const getLogBorder = (level: LogLevel) => {
    switch (level) {
      case 'ERROR': return 'border-red-500/40';
      case 'WARN': return 'border-yellow-500/40';
      case 'SUCCESS': return 'border-green-500/40';
      case 'INFO': return 'border-cyan-500/40';
      case 'DEBUG': return 'border-purple-500/40';
      default: return 'border-gray-600/40';
    }
  };

  const getLogGlow = (level: LogLevel) => {
    switch (level) {
      case 'ERROR': return 'hover:shadow-red-500/20';
      case 'WARN': return 'hover:shadow-yellow-500/20';
      case 'SUCCESS': return 'hover:shadow-green-500/20';
      case 'INFO': return 'hover:shadow-cyan-500/20';
      case 'DEBUG': return 'hover:shadow-purple-500/20';
      default: return 'hover:shadow-gray-500/20';
    }
  };

  return (
    <div className="bg-black border border-purple-400/40 h-full flex flex-col shadow-2xl shadow-purple-500/20 rounded-lg overflow-hidden">
      {/* Header with neon purple styling */}
      <div className="bg-gradient-to-r from-purple-900/50 to-black p-3 border-b border-purple-400/30">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-purple-400 font-bold text-sm tracking-wide font-mono flex items-center gap-2">
            <span className="text-purple-500">📊</span>
            Historical Logs
          </h3>
          
          <div className="flex items-center gap-2">
            <div className="text-xs text-purple-400 font-bold font-mono bg-purple-500/20 px-2 py-1 rounded border border-purple-500/40">
              {logs.length} entries
            </div>
            
            <button
              onClick={refetch}
              className="px-2 py-1 rounded text-xs font-bold font-mono bg-purple-500/30 text-purple-300 border border-purple-400/50 hover:bg-purple-500/40 transition-all hover:shadow-purple-500/20"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Range with neon styling */}
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-black/80 border border-purple-500/40 text-purple-300 text-xs font-mono px-2 py-1 rounded focus:outline-none focus:border-purple-400/70 focus:shadow-purple-500/20"
          >
            <option value="today">Today</option>
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
            <option value="all">All Time</option>
          </select>

          {/* Log Level Filter */}
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value as LogLevel | 'all')}
            className="bg-black/80 border border-purple-500/40 text-purple-300 text-xs font-mono px-2 py-1 rounded focus:outline-none focus:border-purple-400/70 focus:shadow-purple-500/20"
          >
            <option value="all">All Levels</option>
            <option value="ERROR">Error</option>
            <option value="WARN">Warning</option>
            <option value="INFO">Info</option>
            <option value="SUCCESS">Success</option>
            <option value="DEBUG">Debug</option>
          </select>

          {/* Search with neon glow */}
          <input
            type="text"
            placeholder="Search historical data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-black/80 border border-purple-500/40 text-purple-300 text-xs font-mono px-2 py-1 rounded focus:outline-none focus:border-purple-400/70 focus:shadow-purple-500/20 placeholder-purple-500/60 flex-1 min-w-32"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0 bg-black/95">
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400 mx-auto mb-2"></div>
            <div className="text-purple-400/70 text-xs font-mono">Analyzing historical data...</div>
          </div>
        )}

        {error && !logs.length && (
          <div className="text-center py-8">
            <div className="text-red-400 mb-2">❌</div>
            <div className="text-red-300 text-xs font-mono mb-1">Historical analysis failed</div>
            <div className="text-red-400/70 text-xs font-mono">{error}</div>
          </div>
        )}

        {logs.length === 0 && !loading && !error ? (
          <div className="text-center py-8">
            <div className="text-purple-400 text-sm font-mono">
              <div className="mb-2">📭 No Historical Data</div>
              <div className="text-xs text-purple-500/70">No logs found for selected criteria</div>
            </div>
          </div>
        ) : (
          logs.map((log, index) => {
            const logColor = getLogLevelColor(log.level);
            const logBorder = getLogBorder(log.level);
            const logGlow = getLogGlow(log.level);
            const icon = getLogIcon(log);
            
            return (
              <div
                key={log.id || index}
                className={`group border rounded bg-black/80 hover:bg-gray-900/60 transition-all duration-200 ${logBorder} ${logGlow}`}
              >
                <div className="flex items-start gap-2 p-2">
                  {/* Date and Icon */}
                  <div className="flex flex-col items-center gap-1 min-w-[70px]">
                    <div className="text-xs text-purple-400/80 font-mono bg-purple-500/10 px-1 py-0.5 rounded border border-purple-500/20">
                      {formatDate(log.timestamp)}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {formatTimestamp(log.timestamp).split(' ')[1]}
                    </div>
                    <div className="text-sm">{icon}</div>
                  </div>

                  {/* Log Level Badge with enhanced styling */}
                  <div className={`px-2 py-0.5 rounded text-xs font-bold font-mono border ${getLogLevelBadgeColor(log.level)} min-w-[60px] text-center shadow-lg`}>
                    {log.level}
                  </div>

                  {/* Source with enhanced styling */}
                  <div className="text-xs text-cyan-400/90 font-mono min-w-[85px] mt-0.5 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    [{log.source}]
                  </div>

                  {/* Message */}
                  <div className="flex-1">
                    <div className={`text-xs font-mono leading-tight ${logColor}`}>
                      {expandedLogId === log.id ? log.message : (
                        log.message.length > 80 ? log.message.substring(0, 80) + '...' : log.message
                      )}
                    </div>
                    
                    {/* Service and user metadata */}
                    {(log.service || log.user_email) && (
                      <div className="flex items-center gap-2 mt-1 text-xs font-mono">
                        {log.service && (
                          <span className="text-blue-400 bg-blue-500/10 px-1 py-0.5 rounded border border-blue-500/20">
                            {log.service}
                          </span>
                        )}
                        {log.user_email && (
                          <span className="text-green-400 bg-green-500/10 px-1 py-0.5 rounded border border-green-500/20">
                            {log.user_email}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Expanded technical details */}
                    {expandedLogId === log.id && log.meta && (
                      <div className="mt-2 p-2 bg-gray-900/80 rounded border border-gray-600/40">
                        <div className="text-xs text-purple-400 font-mono font-bold mb-1 flex items-center gap-1">
                          <span>🔍</span>
                          DETAILED ANALYSIS:
                        </div>
                        <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap bg-black/50 p-2 rounded border border-purple-500/20">
                          {formatMetadata(log.meta)}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Expand button */}
                  {(log.meta || log.message.length > 80) && (
                    <button
                      onClick={() => handleToggleExpand(log.id)}
                      className="text-gray-500 hover:text-purple-400 transition-colors p-1 hover:bg-purple-500/10 rounded border border-transparent hover:border-purple-500/20"
                    >
                      <span className="text-xs font-mono font-bold">
                        {expandedLogId === log.id ? '−' : '+'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default HistoricalLogViewer;