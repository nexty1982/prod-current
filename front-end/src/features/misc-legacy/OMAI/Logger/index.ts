// OMAI Ultimate Logger - Export all components and utilities

// Main component
export { OMAIUltimateLogger } from './OMAIUltimateLogger';

// Individual panel components
export { RealTimeLogConsole } from './RealTimeLogConsole';
export { CriticalEventsPanel } from './CriticalEventsPanel';
export { SystemMessages } from './SystemMessages';
export { HistoricalLogViewer } from './HistoricalLogViewer';

// Types
export type {
  LogLevel,
  LogEntry,
  LogStats,
  LogFilter,
  OMAIUltimateLoggerProps,
  WebSocketLogMessage
} from './types';

// Hooks
export {
  useLogs,
  useLogStats,
  useLogStream,
  usePagination,
  useLogFilter
} from './hooks';

// Utilities
export {
  formatTimestamp,
  formatDate,
  getLogLevelColor,
  getLogLevelBadgeColor,
  getLogLevelIcon,
  truncateMessage,
  formatLogSource,
  groupLogsByTimeWindow,
  filterLogs,
  formatMetadata,
  getRelativeTime
} from './utils';

// Default export
export default OMAIUltimateLogger;
