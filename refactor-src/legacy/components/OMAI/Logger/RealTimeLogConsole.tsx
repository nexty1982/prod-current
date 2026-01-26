import React, { useState, useEffect, useRef } from 'react';
import { LogEntry, LogLevel } from './types.ts';
import { useLogStream } from './hooks.ts';
import { mockRealTimeLogs, generateMockLogEntry } from './mockData.ts';
import { 
  formatTimestamp, 
  getLogLevelColor, 
  getLogLevelBadgeColor, 
  formatLogSource,
  truncateMessage,
  formatMetadata 
} from './utils';

interface RealTimeLogConsoleProps {
  autoScroll?: boolean;
  maxLogs?: number;
  onLogCount?: (count: number) => void;
}

export const RealTimeLogConsole: React.FC<RealTimeLogConsoleProps> = ({
  autoScroll = true,
  maxLogs = 300,
  onLogCount
}) => {
  const { logs: streamLogs, connected, error, clearLogs } = useLogStream(true);
  const [logs, setLogs] = useState<LogEntry[]>(mockRealTimeLogs);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(autoScroll);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Use stream logs if available, otherwise use mock data with simulation
  useEffect(() => {
    if (streamLogs.length > 0) {
      setLogs(streamLogs);
    } else {
      // Simulate real-time logs when no real stream is available
      const interval = setInterval(() => {
        const newLog = generateMockLogEntry();
        setLogs(prev => [newLog, ...prev.slice(0, maxLogs - 1)]);
      }, 3000 + Math.random() * 2000); // Random interval between 3-5 seconds

      return () => clearInterval(interval);
    }
  }, [streamLogs, maxLogs]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isAutoScrollEnabled && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs, isAutoScrollEnabled]);

  // Notify parent of log count changes
  useEffect(() => {
    if (onLogCount) {
      onLogCount(logs.length);
    }
  }, [logs.length, onLogCount]);

  const handleToggleExpand = (logId: number) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  const handleClearLogs = () => {
    if (clearLogs) {
      clearLogs();
    }
    setLogs([]);
  };

  const displayLogs = logs.slice(0, maxLogs);

  const getTerminalLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'ERROR': return 'text-red-400';
      case 'WARN': return 'text-yellow-400';
      case 'SUCCESS': return 'text-green-400';
      case 'INFO': return 'text-cyan-400';
      case 'DEBUG': return 'text-purple-400';
      default: return 'text-white';
    }
  };

  const getTerminalLevelBg = (level: LogLevel) => {
    switch (level) {
      case 'ERROR': return 'bg-red-500/30 border-red-400/50 text-red-300';
      case 'WARN': return 'bg-yellow-500/30 border-yellow-400/50 text-yellow-300';
      case 'SUCCESS': return 'bg-green-500/30 border-green-400/50 text-green-300';
      case 'INFO': return 'bg-cyan-500/30 border-cyan-400/50 text-cyan-300';
      case 'DEBUG': return 'bg-purple-500/30 border-purple-400/50 text-purple-300';
      default: return 'bg-white/30 border-white/50 text-white';
    }
  };

  return (
    <div className="bg-black border border-green-400/40 h-full flex flex-col shadow-2xl shadow-green-500/20 rounded-lg overflow-hidden">
      {/* Header with neon styling */}
      <div className="bg-gradient-to-r from-green-900/50 to-black p-3 border-b border-green-400/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-green-400 font-bold text-sm tracking-wide font-mono flex items-center gap-2">
              <span className="text-green-500">▶</span>
              Real-Time Logs
            </h3>
            <div className={`px-2 py-1 rounded text-xs font-bold font-mono border ${
              connected || logs.length > 0
                ? 'bg-green-500/30 text-green-300 border-green-400/50 animate-pulse' 
                : 'bg-red-500/30 text-red-300 border-red-400/50'
            }`}>
              {connected || logs.length > 0 ? 'LIVE' : 'DISCONNECTED'}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAutoScrollEnabled(!isAutoScrollEnabled)}
              className={`px-2 py-1 rounded text-xs font-bold font-mono transition-all border ${
                isAutoScrollEnabled
                  ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400/50 shadow-cyan-500/20'
                  : 'bg-gray-600/30 text-gray-400 border-gray-500/50'
              }`}
            >
              Auto-scroll: {isAutoScrollEnabled ? 'ON' : 'OFF'}
            </button>
            
            <div className="text-xs text-green-400 font-bold font-mono bg-green-500/20 px-2 py-1 rounded border border-green-500/40">
              {displayLogs.length} logs
            </div>
            
            <button
              onClick={handleClearLogs}
              className="px-2 py-1 rounded text-xs font-bold font-mono bg-red-500/30 text-red-300 border border-red-400/50 hover:bg-red-500/40 transition-all hover:shadow-red-500/20"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Terminal-style content area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0 bg-black/95"
        style={{ fontFamily: 'Consolas, Monaco, "Courier New", monospace' }}
      >
        {error && (
          <div className="bg-red-900/40 border border-red-400/60 rounded p-2 mb-2 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="text-red-400">⚠</span>
              <span className="text-red-300 text-xs font-mono font-bold">WebSocket connection failed</span>
            </div>
            <p className="text-red-200 text-xs mt-1 ml-6 font-mono">{error}</p>
          </div>
        )}

        {displayLogs.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-green-400 text-sm font-mono">
              <div className="mb-2 animate-pulse">⚡ Initializing log stream...</div>
              <div className="text-xs text-green-500/70">Waiting for incoming logs...</div>
            </div>
          </div>
        ) : (
          displayLogs.map((log, index) => (
            <div
              key={log.id || index}
              className="group border border-gray-700/40 rounded bg-black/80 hover:bg-gray-900/60 transition-all duration-200 hover:border-green-400/30"
            >
              <div className="flex items-start gap-2 p-2 text-sm">
                {/* Timestamp with neon glow */}
                <div className="text-xs text-green-500/80 font-mono min-w-[90px] mt-0.5 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                  {formatTimestamp(log.timestamp).split(' ')[1]}
                </div>

                {/* Log Level Badge with neon effect */}
                <div className={`px-2 py-0.5 rounded text-xs font-bold font-mono border ${getTerminalLevelBg(log.level)} shadow-lg`}>
                  {log.level}
                </div>

                {/* Source with color coding */}
                <div className="text-xs text-cyan-400/90 font-mono min-w-[85px] mt-0.5 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20">
                  {formatLogSource(log.source)}
                </div>

                {/* Message with syntax highlighting */}
                <div className="flex-1">
                  <div className={`text-sm font-mono leading-tight ${getTerminalLevelColor(log.level)}`}>
                    {expandedLogId === log.id ? log.message : truncateMessage(log.message, 100)}
                  </div>
                  
                  {/* Service and user info */}
                  {(log.service || log.user_email || log.session_id) && (
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-mono">
                      {log.service && <span className="text-blue-400">svc:{log.service}</span>}
                      {log.user_email && <span className="text-purple-400">usr:{log.user_email.split('@')[0]}</span>}
                      {log.session_id && <span className="text-yellow-400">sess:{log.session_id.substring(0, 8)}...</span>}
                    </div>
                  )}
                  
                  {/* IP Address */}
                  {log.ip_address && (
                    <div className="text-xs text-orange-400 font-mono mt-1">
                      IP: {log.ip_address}
                    </div>
                  )}
                  
                  {/* Expanded metadata with terminal styling */}
                  {expandedLogId === log.id && log.meta && (
                    <div className="mt-2 p-2 bg-gray-900/80 rounded border border-gray-600/40">
                      <div className="text-xs text-green-400 font-mono font-bold mb-1">METADATA:</div>
                      <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                        {formatMetadata(log.meta)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Expand button with hover effect */}
                {log.meta && (
                  <button
                    onClick={() => handleToggleExpand(log.id)}
                    className="text-gray-500 hover:text-green-400 transition-colors mt-0.5 p-1 hover:bg-green-500/10 rounded"
                  >
                    <span className="text-xs font-mono font-bold">
                      {expandedLogId === log.id ? '−' : '+'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RealTimeLogConsole;