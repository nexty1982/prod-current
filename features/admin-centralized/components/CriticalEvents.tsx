import React, { useState, useEffect } from 'react';

interface CriticalEvent {
  id: number;
  timestamp: string;
  level: 'ERROR' | 'CRITICAL';
  source: string;
  message: string;
  ip_address?: string;
  user_email?: string;
  severity: 'high' | 'medium' | 'low';
}

interface CriticalEventsProps {
  isDarkMode: boolean;
  onNewCriticalEvent?: (event: CriticalEvent) => void;
}

export const CriticalEvents: React.FC<CriticalEventsProps> = ({ 
  isDarkMode, 
  onNewCriticalEvent 
}) => {
  const [events, setEvents] = useState<CriticalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastEventId, setLastEventId] = useState<number | null>(null);

  useEffect(() => {
    const fetchCriticalEvents = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/logs/database/critical?limit=20');
        const data = await response.json();
        
        const criticalEvents: CriticalEvent[] = (data.events || [])
          .map((log: any, index: number) => ({
            id: log.id || index,
            timestamp: log.timestamp,
            level: 'ERROR' as const,
            source: log.source,
            message: log.message,
            ip_address: log.ip_address,
            user_email: log.user_email,
            severity: log.severity || 'medium' as const
          }));

        setEvents(criticalEvents);
        
        // Check for new critical events and trigger callback
        if (onNewCriticalEvent && criticalEvents.length > 0) {
          const latestEvent = criticalEvents[0];
          if (lastEventId === null || latestEvent.id > lastEventId) {
            setLastEventId(latestEvent.id);
            if (lastEventId !== null) { // Don't trigger on initial load
              onNewCriticalEvent(latestEvent);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to fetch critical events, using mock data');
        // Mock data fallback
        const mockEvents: CriticalEvent[] = [
          {
            id: 1,
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            source: 'security-monitor',
            message: 'Multiple failed login attempts detected',
            ip_address: '192.168.1.100',
            severity: 'high'
          },
          {
            id: 2,
            timestamp: new Date(Date.now() - 300000).toISOString(),
            level: 'ERROR',
            source: 'database',
            message: 'Database connection pool exhausted',
            severity: 'high'
          }
        ];
        setEvents(mockEvents);
      } finally {
        setLoading(false);
      }
    };

    fetchCriticalEvents();
    const interval = setInterval(fetchCriticalEvents, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚠️';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-500/50 bg-red-500/10';
      case 'medium': return 'border-yellow-500/50 bg-yellow-500/10';
      case 'low': return 'border-green-500/50 bg-green-500/10';
      default: return 'border-gray-500/50 bg-gray-500/10';
    }
  };

  return (
    <div className={`h-full rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300'} shadow-lg`}>
      {/* Header */}
      <div className={`p-4 border-b ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            ⚠️ Critical Events
          </h3>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              50 alerts
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 h-80">
        {loading ? (
          <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            Loading critical events...
          </div>
        ) : events.length === 0 ? (
          <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="text-6xl mb-4">✅</div>
            <div className="text-lg font-medium mb-2">No critical events detected</div>
            <div className="text-sm">System is running normally</div>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className={`p-4 rounded-lg border ${getSeverityColor(event.severity)} ${
                  isDarkMode ? 'bg-slate-900/50' : 'bg-white/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">
                    {getSeverityIcon(event.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium mb-1 ${
                      event.severity === 'high' 
                        ? 'text-red-400' 
                        : event.severity === 'medium' 
                        ? 'text-yellow-400' 
                        : 'text-green-400'
                    }`}>
                      {event.message}
                    </div>
                    <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                      {formatTimestamp(event.timestamp)}
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className={`px-2 py-1 rounded ${isDarkMode ? 'bg-slate-700 text-cyan-400' : 'bg-gray-100 text-blue-600'}`}>
                        [{event.source}]
                      </span>
                      {event.ip_address && (
                        <span className={`${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                          IP: {event.ip_address}
                        </span>
                      )}
                      {event.user_email && (
                        <span className={`${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                          User: {event.user_email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
