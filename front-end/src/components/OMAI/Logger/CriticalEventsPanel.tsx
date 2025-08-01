import React, { useState, useEffect } from 'react';
import { LogEntry } from './types';
import { useLogs } from './hooks';
import { mockCriticalEvents } from './mockData';
import { formatTimestamp, getRelativeTime, formatMetadata } from './utils';

interface CriticalEventsPanelProps {
  maxEvents?: number;
  onAlertCount?: (count: number) => void;
}

export const CriticalEventsPanel: React.FC<CriticalEventsPanelProps> = ({
  maxEvents = 10,
  onAlertCount
}) => {
  const { logs: apiLogs, loading, error, refetch } = useLogs(
    { level: 'ERROR', limit: maxEvents },
    true
  );
  
  const [events, setEvents] = useState<LogEntry[]>(mockCriticalEvents);
  const [expandedEventId, setExpandedEventId] = useState<number | null>(null);
  
  // Use API logs if available, otherwise use mock data
  useEffect(() => {
    if (apiLogs.length > 0) {
      setEvents(apiLogs.filter(log => log.level === 'ERROR'));
    } else {
      setEvents(mockCriticalEvents);
    }
  }, [apiLogs]);

  // Notify parent of alert count changes
  useEffect(() => {
    if (onAlertCount) {
      onAlertCount(events.length);
    }
  }, [events.length, onAlertCount]);

  const handleToggleExpand = (eventId: number) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId);
  };

  const getEventIcon = (message: string) => {
    const msg = message.toLowerCase();
    if (msg.includes('security') || msg.includes('breach')) return '🛡️';
    if (msg.includes('database') || msg.includes('connection')) return '🗄️';
    if (msg.includes('ssl') || msg.includes('certificate')) return '🔒';
    if (msg.includes('rate') || msg.includes('limit')) return '⚡';
    if (msg.includes('timeout') || msg.includes('failed')) return '⏱️';
    if (msg.includes('memory') || msg.includes('cpu')) return '💻';
    if (msg.includes('disk') || msg.includes('storage')) return '💽';
    return '❌';
  };

  const getSeverityLevel = (message: string) => {
    const msg = message.toLowerCase();
    if (msg.includes('critical') || msg.includes('breach') || msg.includes('security')) {
      return { 
        level: 'CRITICAL', 
        color: 'text-red-300', 
        bg: 'bg-red-500/40', 
        border: 'border-red-400/60',
        glow: 'shadow-red-500/30'
      };
    }
    if (msg.includes('ssl') || msg.includes('certificate') || msg.includes('timeout')) {
      return { 
        level: 'HIGH', 
        color: 'text-orange-300', 
        bg: 'bg-orange-500/30', 
        border: 'border-orange-400/50',
        glow: 'shadow-orange-500/20'
      };
    }
    return { 
      level: 'ERROR', 
      color: 'text-yellow-300', 
      bg: 'bg-yellow-500/30', 
      border: 'border-yellow-400/50',
      glow: 'shadow-yellow-500/20'
    };
  };

  return (
    <div className="bg-black border border-red-400/40 h-full flex flex-col shadow-2xl shadow-red-500/20 rounded-lg overflow-hidden">
      {/* Header with neon red styling */}
      <div className="bg-gradient-to-r from-red-900/50 to-black p-3 border-b border-red-400/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-red-400 font-bold text-sm tracking-wide font-mono flex items-center gap-2">
              <span className="text-red-500 animate-pulse">⚠</span>
              Critical Events
            </h3>
            <div className="text-xs text-red-400 font-bold font-mono bg-red-500/20 px-2 py-1 rounded border border-red-500/40 animate-pulse">
              {events.length} alerts
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={refetch}
              className="px-2 py-1 rounded text-xs font-bold font-mono bg-red-500/30 text-red-300 border border-red-400/50 hover:bg-red-500/40 transition-all hover:shadow-red-500/20"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0 bg-black/95">
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-400 mx-auto mb-2"></div>
            <div className="text-red-400/70 text-xs font-mono">Scanning for threats...</div>
          </div>
        )}

        {error && !events.length && (
          <div className="text-center py-8">
            <div className="text-red-400 mb-2">❌</div>
            <div className="text-red-300 text-xs font-mono mb-1">Security scan failed</div>
            <div className="text-red-400/70 text-xs font-mono">{error}</div>
          </div>
        )}

        {events.length === 0 && !loading && !error ? (
          <div className="text-center py-8">
            <div className="text-green-400 text-sm font-mono">
              <div className="mb-2">🛡️ All Systems Secure</div>
              <div className="text-xs text-green-500/70">No critical events detected</div>
            </div>
          </div>
        ) : (
          events.map((event, index) => {
            const severity = getSeverityLevel(event.message);
            const icon = getEventIcon(event.message);
            
            return (
              <div
                key={event.id || index}
                className={`group border rounded bg-black/80 hover:bg-gray-900/60 transition-all duration-200 ${severity.border} ${severity.glow} hover:${severity.glow}`}
              >
                <div className="flex items-start gap-3 p-3">
                  {/* Alert indicator with pulsing animation */}
                  <div className="flex flex-col items-center gap-2">
                    <div className={`text-2xl ${severity.level === 'CRITICAL' ? 'animate-pulse' : ''}`}>
                      {icon}
                    </div>
                    <div className={`px-2 py-0.5 rounded text-xs font-bold font-mono border ${severity.bg} ${severity.border} ${severity.color} shadow-lg`}>
                      {severity.level}
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="flex-1">
                    {/* Alert message with highlighting */}
                    <div className="text-red-300 text-sm font-mono leading-tight mb-2 font-medium">
                      {expandedEventId === event.id ? event.message : (
                        event.message.length > 80 ? event.message.substring(0, 80) + '...' : event.message
                      )}
                    </div>
                    
                    {/* Timestamp and source info */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 font-mono mb-1">
                      <span className="text-red-400/80 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                        {formatTimestamp(event.timestamp)}
                      </span>
                      {event.source && (
                        <span className="text-cyan-400/80 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20">
                          [{event.source}]
                        </span>
                      )}
                      {event.service && (
                        <span className="text-blue-400/80 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                          {event.service}
                        </span>
                      )}
                    </div>
                    
                    {/* IP and Session Info with threat-style highlighting */}
                    {(event.ip_address || event.session_id || event.user_email) && (
                      <div className="flex items-center gap-4 text-xs font-mono mt-2">
                        {event.ip_address && (
                          <span className="text-orange-400 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">
                            IP: {event.ip_address}
                          </span>
                        )}
                        {event.user_email && (
                          <span className="text-purple-400 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
                            User: {event.user_email}
                          </span>
                        )}
                        {event.session_id && (
                          <span className="text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20">
                            Session: {event.session_id.substring(0, 8)}...
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Expanded technical details */}
                    {expandedEventId === event.id && event.meta && (
                      <div className="mt-3 p-3 bg-red-900/20 rounded border border-red-600/40">
                        <div className="text-xs text-red-400 font-mono font-bold mb-2 flex items-center gap-2">
                          <span>🔍</span>
                          THREAT ANALYSIS:
                        </div>
                        <pre className="text-xs text-red-300/90 font-mono whitespace-pre-wrap bg-black/50 p-2 rounded border border-red-500/20">
                          {formatMetadata(event.meta)}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Actions and time */}
                  <div className="flex flex-col items-center gap-2">
                    {/* Relative time with urgency indicator */}
                    <div className={`text-xs font-mono px-2 py-1 rounded border ${
                      getRelativeTime(event.timestamp).includes('min') 
                        ? 'text-red-400 bg-red-500/20 border-red-500/40 animate-pulse' 
                        : 'text-gray-500 bg-gray-500/10 border-gray-500/20'
                    }`}>
                      {getRelativeTime(event.timestamp)}
                    </div>
                    
                    {/* Expand button */}
                    {(event.meta || event.message.length > 80) && (
                      <button
                        onClick={() => handleToggleExpand(event.id)}
                        className="text-gray-500 hover:text-red-400 transition-colors p-1 hover:bg-red-500/10 rounded border border-transparent hover:border-red-500/20"
                      >
                        <span className="text-xs font-mono font-bold">
                          {expandedEventId === event.id ? '−' : '+'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CriticalEventsPanel;