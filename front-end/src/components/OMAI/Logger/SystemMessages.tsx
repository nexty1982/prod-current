import React, { useState, useEffect } from 'react';
import { LogEntry } from './types';
import { useLogs } from './hooks';
import { mockSystemMessages } from './mockData';
import { formatTimestamp, getRelativeTime, formatMetadata } from './utils';

interface SystemMessagesProps {
  maxMessages?: number;
  onMessageCount?: (count: number) => void;
}

export const SystemMessages: React.FC<SystemMessagesProps> = ({
  maxMessages = 20,
  onMessageCount
}) => {
  const { logs: apiLogs, loading, error, refetch } = useLogs(
    { level: 'INFO', source: 'system', limit: maxMessages },
    true
  );
  
  const [messages, setMessages] = useState<LogEntry[]>(mockSystemMessages);
  const [expandedMessageId, setExpandedMessageId] = useState<number | null>(null);
  
  // Use API logs if available, otherwise use mock data
  useEffect(() => {
    if (apiLogs.length > 0) {
      setMessages(apiLogs.filter(log => 
        log.level === 'INFO' || log.level === 'WARN' || log.source.toLowerCase().includes('system')
      ));
    } else {
      setMessages(mockSystemMessages);
    }
  }, [apiLogs]);

  // Notify parent of message count changes
  useEffect(() => {
    if (onMessageCount) {
      onMessageCount(messages.length);
    }
  }, [messages.length, onMessageCount]);

  const handleToggleExpand = (messageId: number) => {
    setExpandedMessageId(expandedMessageId === messageId ? null : messageId);
  };

  const getMessageIcon = (log: LogEntry) => {
    const msg = log.message.toLowerCase();
    const source = log.source.toLowerCase();
    
    if (msg.includes('performance') || msg.includes('alert')) return '⚡';
    if (msg.includes('config') || msg.includes('setting')) return '⚙️';
    if (msg.includes('backup') || msg.includes('restore')) return '💾';
    if (msg.includes('update') || msg.includes('upgrade')) return '🔄';
    if (msg.includes('security') || msg.includes('auth')) return '🛡️';
    if (msg.includes('database') || msg.includes('db')) return '🗄️';
    if (msg.includes('network') || msg.includes('connection')) return '🌐';
    if (msg.includes('memory') || msg.includes('cpu')) return '💻';
    if (msg.includes('disk') || msg.includes('storage')) return '💽';
    if (source.includes('api')) return '🔌';
    if (log.level === 'WARN') return '⚠️';
    return '📋';
  };

  const getMessageType = (log: LogEntry) => {
    const msg = log.message.toLowerCase();
    
    if (msg.includes('performance') || msg.includes('alert')) {
      return { 
        type: 'PERFORMANCE', 
        color: 'text-yellow-300', 
        bg: 'bg-yellow-500/30', 
        border: 'border-yellow-400/50',
        glow: 'shadow-yellow-500/20'
      };
    }
    if (msg.includes('config') || msg.includes('update')) {
      return { 
        type: 'CONFIG', 
        color: 'text-blue-300', 
        bg: 'bg-blue-500/30', 
        border: 'border-blue-400/50',
        glow: 'shadow-blue-500/20'
      };
    }
    if (msg.includes('security') || msg.includes('auth')) {
      return { 
        type: 'SECURITY', 
        color: 'text-purple-300', 
        bg: 'bg-purple-500/30', 
        border: 'border-purple-400/50',
        glow: 'shadow-purple-500/20'
      };
    }
    if (log.level === 'WARN') {
      return { 
        type: 'WARNING', 
        color: 'text-orange-300', 
        bg: 'bg-orange-500/30', 
        border: 'border-orange-400/50',
        glow: 'shadow-orange-500/20'
      };
    }
    return { 
      type: 'INFO', 
      color: 'text-green-300', 
      bg: 'bg-green-500/30', 
      border: 'border-green-400/50',
      glow: 'shadow-green-500/20'
    };
  };

  return (
    <div className="bg-black border border-blue-400/40 h-full flex flex-col shadow-2xl shadow-blue-500/20 rounded-lg overflow-hidden">
      {/* Header with neon blue styling */}
      <div className="bg-gradient-to-r from-blue-900/50 to-black p-3 border-b border-blue-400/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-blue-400 font-bold text-sm tracking-wide font-mono flex items-center gap-2">
              <span className="text-blue-500">💬</span>
              System Messages
            </h3>
            <div className="text-xs text-blue-400 font-bold font-mono bg-blue-500/20 px-2 py-1 rounded border border-blue-500/40">
              {messages.length} messages
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={refetch}
              className="px-2 py-1 rounded text-xs font-bold font-mono bg-blue-500/30 text-blue-300 border border-blue-400/50 hover:bg-blue-500/40 transition-all hover:shadow-blue-500/20"
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
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto mb-2"></div>
            <div className="text-blue-400/70 text-xs font-mono">Loading system status...</div>
          </div>
        )}

        {error && !messages.length && (
          <div className="text-center py-8">
            <div className="text-red-400 mb-2">❌</div>
            <div className="text-red-300 text-xs font-mono mb-1">System scan failed</div>
            <div className="text-red-400/70 text-xs font-mono">{error}</div>
          </div>
        )}

        {messages.length === 0 && !loading && !error ? (
          <div className="text-center py-8">
            <div className="text-blue-400 text-sm font-mono">
              <div className="mb-2">📭 No Messages</div>
              <div className="text-xs text-blue-500/70">No system messages available</div>
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const messageType = getMessageType(message);
            const icon = getMessageIcon(message);
            
            return (
              <div
                key={message.id || index}
                className={`group border rounded bg-black/80 hover:bg-gray-900/60 transition-all duration-200 ${messageType.border} hover:${messageType.glow}`}
              >
                <div className="flex items-start gap-3 p-3">
                  {/* Message type indicator */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-xl">{icon}</div>
                    <div className={`px-2 py-0.5 rounded text-xs font-bold font-mono border ${messageType.bg} ${messageType.border} ${messageType.color} shadow-lg`}>
                      {messageType.type}
                    </div>
                  </div>

                  {/* Message Details */}
                  <div className="flex-1">
                    {/* Message title */}
                    <div className="text-white text-sm font-mono leading-tight mb-2 font-medium">
                      {expandedMessageId === message.id ? message.message : (
                        message.message.length > 100 ? message.message.substring(0, 100) + '...' : message.message
                      )}
                    </div>
                    
                    {/* Timestamp and source info */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 font-mono mb-1">
                      <span className="text-blue-400/80 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                        {formatTimestamp(message.timestamp)}
                      </span>
                      {message.source && (
                        <span className="text-cyan-400/80 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20">
                          [{message.source}]
                        </span>
                      )}
                      {message.service && (
                        <span className="text-purple-400/80 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
                          {message.service}
                        </span>
                      )}
                    </div>
                    
                    {/* Additional context */}
                    {(message.user_email || message.ip_address) && (
                      <div className="flex items-center gap-4 text-xs font-mono mt-2">
                        {message.user_email && (
                          <span className="text-green-400 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                            User: {message.user_email}
                          </span>
                        )}
                        {message.ip_address && (
                          <span className="text-orange-400 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">
                            IP: {message.ip_address}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Expanded technical details */}
                    {expandedMessageId === message.id && message.meta && (
                      <div className="mt-3 p-3 bg-blue-900/20 rounded border border-blue-600/40">
                        <div className="text-xs text-blue-400 font-mono font-bold mb-2 flex items-center gap-2">
                          <span>📊</span>
                          SYSTEM DETAILS:
                        </div>
                        <pre className="text-xs text-blue-300/90 font-mono whitespace-pre-wrap bg-black/50 p-2 rounded border border-blue-500/20">
                          {formatMetadata(message.meta)}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Actions and time */}
                  <div className="flex flex-col items-center gap-2">
                    {/* Relative time */}
                    <div className="text-xs text-gray-500 font-mono px-2 py-1 rounded border border-gray-500/20 bg-gray-500/10">
                      {getRelativeTime(message.timestamp)}
                    </div>
                    
                    {/* Expand button */}
                    {(message.meta || message.message.length > 100) && (
                      <button
                        onClick={() => handleToggleExpand(message.id)}
                        className="text-gray-500 hover:text-blue-400 transition-colors p-1 hover:bg-blue-500/10 rounded border border-transparent hover:border-blue-500/20"
                      >
                        <span className="text-xs font-mono font-bold">
                          {expandedMessageId === message.id ? '−' : '+'}
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

export default SystemMessages;