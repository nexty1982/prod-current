import { adminAPI } from '@/api/admin.api';
import { apiClient } from '@/api/utils/axiosInstance';
import { useAuth } from '@/context/AuthContext';
import { CustomizerContext } from '@/context/CustomizerContext';
import {
    Alert, alpha, Autocomplete,
    Badge,
    Box,
    Button, ButtonGroup,
    Card, CardContent,
    Chip,
    CircularProgress,
    Collapse, Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    Grid,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Pagination,
    Paper,
    Select,
    Snackbar,
    Stack,
    Tab,
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TableSortLabel,
    Tabs,
    TextField,
    Tooltip,
    Typography,
    useTheme
} from '@mui/material';
import {
    IconActivity,
    IconAlertCircle,
    IconAlertTriangle,
    IconBug,
    IconCalendar,
    IconCheck,
    IconChevronDown, IconChevronUp,
    IconClock,
    IconDatabase,
    IconDevices,
    IconEye,
    IconFile,
    IconFilter,
    IconInfoCircle,
    IconLock, IconMessage,
    IconPlayerPause, IconPlayerPlay,
    IconRefresh,
    IconSearch,
    IconServer,
    IconShieldOff,
    IconShieldX,
    IconTerminal2,
    IconTrash,
    IconUser,
    IconUsers,
    IconX
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';

dayjs.extend(relativeTime);

// ─── Interfaces ─────────────────────────────────────────────────────────────
interface LogEntry {
  id: number;
  hash: string;
  timestamp: string;
  level: string;
  source: string;
  message: string;
  meta: Record<string, any>;
  user_email: string | null;
  service: string | null;
  source_component: string | null;
  session_id: string | null;
  request_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  first_seen: string | null;
  occurrences: number;
  isFocused?: boolean;
}

interface LogStats {
  total: number;
  levels: Record<string, number>;
  errors24h: number;
  warnings24h: number;
  topSources: { source: string; count: number }[];
  errorRate: { lastHour: number; prevHour: number };
}

interface SearchResult {
  rows: LogEntry[];
  total: number;
  page: number;
  pages: number;
}

interface ActivityLogData {
  id: number;
  user_id: number;
  action: string;
  changes: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user_email?: string;
  first_name?: string;
  last_name?: string;
  user_role?: string;
}

interface ActivityLogStats {
  total_activities: number;
  unique_users: number;
  active_days: number;
  unique_actions: number;
}

interface SessionData {
  session_id: string;
  user_id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  church_name?: string;
  ip_address?: string;
  user_agent?: string;
  login_time: string;
  expires?: string;
  is_active: boolean;
  minutes_until_expiry: number;
}

interface SessionStats {
  total_sessions: number;
  active_sessions: number;
  expired_sessions: number;
  unique_users: number;
  unique_ips: number;
  latest_login: string;
  earliest_login: string;
}

interface FilterOptions {
  sources: string[];
  services: string[];
  recentUsers: Array<{ email: string; name: string; last_login: string }>;
}

interface ServerLogFile {
  name: string;
  path?: string;
  type?: string;
  unit?: string;
  size?: number;
  modified?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const levelColors: Record<string, 'error' | 'warning' | 'info' | 'success' | 'default'> = {
  ERROR: 'error', WARN: 'warning', INFO: 'info', SUCCESS: 'success', DEBUG: 'default'
};
const levelIcons: Record<string, React.ReactNode> = {
  ERROR: <IconAlertCircle size={14} />,
  WARN: <IconAlertTriangle size={14} />,
  INFO: <IconInfoCircle size={14} />,
  DEBUG: <IconBug size={14} />,
  SUCCESS: <IconCheck size={14} />,
};

const ALL_LEVELS = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'SUCCESS'];

const STAT_CARD = (color: string) => ({
  borderLeft: `4px solid ${color}`,
  transition: 'box-shadow 0.2s',
  '&:hover': { boxShadow: 4 },
});

const SERVER_LOG_LABELS: Record<string, string> = {
  'nginx-access': 'Nginx Access',
  'nginx-error': 'Nginx Error',
  'mariadb-error': 'MariaDB Error',
  'journal-backend': 'Backend Journal',
  'journal-omai': 'OMAI Journal',
};

// ─── Component ──────────────────────────────────────────────────────────────
const LogSearch: React.FC = () => {
  const theme = useTheme();
  const { isLayout } = useContext(CustomizerContext);
  const { hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  // ── Log Search state ──────────────────────────────────────────────────────
  const [logStats, setLogStats] = useState<LogStats | null>(null);
  const [logResults, setLogResults] = useState<SearchResult | null>(null);
  const [logLoading, setLogLoading] = useState(false);
  const [logStatsLoading, setLogStatsLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [contextDialog, setContextDialog] = useState<{ open: boolean; rows: LogEntry[]; targetId: number | null }>({ open: false, rows: [], targetId: null });
  const [contextLoading, setContextLoading] = useState(false);
  const [logQuery, setLogQuery] = useState('');
  const [logLevel, setLogLevel] = useState('');
  const [logSource, setLogSource] = useState('');
  const [logService, setLogService] = useState('');
  const [logUserEmail, setLogUserEmail] = useState('');
  const [logDateFrom, setLogDateFrom] = useState('');
  const [logDateTo, setLogDateTo] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [logLimit] = useState(50);

  // ── Filter dropdown options ───────────────────────────────────────────────
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ sources: [], services: [], recentUsers: [] });

  // ── Server log files ──────────────────────────────────────────────────────
  const [serverLogFiles, setServerLogFiles] = useState<ServerLogFile[]>([]);
  const [activeLogSource, setActiveLogSource] = useState<string>('system');
  const [serverLogLines, setServerLogLines] = useState<string[]>([]);
  const [serverLogLoading, setServerLogLoading] = useState(false);
  const [serverLogSearch, setServerLogSearch] = useState('');
  const [serverLogLineCount, setServerLogLineCount] = useState(200);

  // ── Auto-refresh ──────────────────────────────────────────────────────────
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval] = useState(10);
  const [countdown, setCountdown] = useState(10);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // ── Level exclude toggles ────────────────────────────────────────────────
  const [excludedLevels, setExcludedLevels] = useState<string[]>([]);

  // ── Sorting ───────────────────────────────────────────────────────────────
  const [sortField, setSortField] = useState<string>('timestamp');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC');

  // ── Activity Logs state ───────────────────────────────────────────────────
  const [activities, setActivities] = useState<ActivityLogData[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityLogStats | null>(null);
  const [topActions, setTopActions] = useState<Array<{ action: string; count: number }>>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activitySearch, setActivitySearch] = useState('');
  const [activityActionFilter, setActivityActionFilter] = useState('');
  const [activityDateFrom, setActivityDateFrom] = useState('');
  const [activityDateTo, setActivityDateTo] = useState('');
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLogData | null>(null);
  const [activityViewDialog, setActivityViewDialog] = useState(false);
  const [cleanupDialog, setCleanupDialog] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(90);
  const ACTIVITY_PER_PAGE = 25;

  // ── Session Management state ──────────────────────────────────────────────
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionStatusFilter, setSessionStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionTotalPages, setSessionTotalPages] = useState(1);
  const [terminateDialog, setTerminateDialog] = useState<{ open: boolean; session: SessionData | null }>({ open: false, session: null });
  const [terminateAllDialog, setTerminateAllDialog] = useState<{ open: boolean; session: SessionData | null }>({ open: false, session: null });
  const [lockoutDialog, setLockoutDialog] = useState<{ open: boolean; session: SessionData | null }>({ open: false, session: null });
  const [sessionCleanupDialog, setSessionCleanupDialog] = useState(false);
  const [killAllDialog, setKillAllDialog] = useState(false);
  const [messageDialog, setMessageDialog] = useState<{ open: boolean; session: SessionData | null }>({ open: false, session: null });
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const SESSION_PER_PAGE = 20;

  const showSnack = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnackbar({ open: true, message, severity });

  // ═══════════════════════════════════════════════════════════════════════════
  // LOG SEARCH HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  const fetchLogStats = useCallback(async () => {
    setLogStatsLoading(true);
    try {
      const res: any = await apiClient.get('/admin/log-search/stats');
      setLogStats(res);
    } catch (err) { console.error('Failed to load log stats:', err); }
    finally { setLogStatsLoading(false); }
  }, []);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const res: any = await apiClient.get('/admin/log-search/filters');
      setFilterOptions(res);
    } catch (err) { console.error('Failed to load filter options:', err); }
  }, []);

  const fetchServerLogFiles = useCallback(async () => {
    try {
      const res: any = await apiClient.get('/admin/log-search/server-logs');
      setServerLogFiles(res.files || []);
    } catch (err) { console.error('Failed to load server log files:', err); }
  }, []);

  const fetchServerLog = useCallback(async (name: string, lines = 200, search = '') => {
    setServerLogLoading(true);
    try {
      const params: Record<string, string | number> = { lines };
      if (search) params.search = search;
      const res: any = await apiClient.get(`/admin/log-search/server-logs/${name}`, { params });
      setServerLogLines(res.lines || []);
    } catch (err) {
      console.error('Failed to load server log:', err);
      setServerLogLines(['Error loading log file']);
    }
    finally { setServerLogLoading(false); }
  }, []);

  const fetchLogs = useCallback(async (p = logPage) => {
    setLogLoading(true);
    try {
      const params: Record<string, string | number> = { page: p, limit: logLimit, sort: sortField, sort_dir: sortDir };
      if (logQuery) params.q = logQuery;
      if (logLevel) params.level = logLevel;
      if (logSource) params.source = logSource;
      if (logService) params.service = logService;
      if (logUserEmail) params.user_email = logUserEmail;
      if (logDateFrom) params.from = logDateFrom;
      if (logDateTo) params.to = logDateTo;
      if (excludedLevels.length > 0) params.exclude_levels = excludedLevels.join(',');
      const res: any = await apiClient.get('/admin/log-search', { params });
      setLogResults(res);
    } catch (err) { console.error('Failed to search logs:', err); }
    finally { setLogLoading(false); }
  }, [logQuery, logLevel, logSource, logService, logUserEmail, logDateFrom, logDateTo, logPage, logLimit, sortField, sortDir, excludedLevels]);

  const fetchContext = async (logId: number) => {
    setContextLoading(true);
    try {
      const res: any = await apiClient.get(`/admin/log-search/context/${logId}`);
      setContextDialog({ open: true, rows: res.rows, targetId: res.targetId });
    } catch (err) { console.error('Failed to load context:', err); }
    finally { setContextLoading(false); }
  };

  // ── Sort handler ──────────────────────────────────────────────────────────
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortField(field);
      setSortDir('DESC');
    }
  };

  // ── Auto-refresh ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoRefresh && activeTab === 0) {
      setCountdown(refreshInterval);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) return refreshInterval;
          return prev - 1;
        });
      }, 1000);
      autoRefreshRef.current = setInterval(() => {
        if (activeLogSource === 'system') {
          fetchLogs();
          fetchLogStats();
        } else {
          fetchServerLog(activeLogSource, serverLogLineCount, serverLogSearch);
        }
      }, refreshInterval * 1000);
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [autoRefresh, activeTab, refreshInterval, activeLogSource]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-fetch when sort changes ────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 0 && activeLogSource === 'system') {
      fetchLogs(1);
      setLogPage(1);
    }
  }, [sortField, sortDir]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-fetch when excluded levels change ──────────────────────────────────
  useEffect(() => {
    if (activeTab === 0 && activeLogSource === 'system') {
      fetchLogs(1);
      setLogPage(1);
    }
  }, [excludedLevels]); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIVITY LOG HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  const fetchActivities = useCallback(async () => {
    setActivityLoading(true);
    try {
      const filters: any = {
        search: activitySearch || undefined,
        action_filter: activityActionFilter || undefined,
        date_from: activityDateFrom || undefined,
        date_to: activityDateTo || undefined,
        limit: ACTIVITY_PER_PAGE,
        offset: (activityPage - 1) * ACTIVITY_PER_PAGE,
      };
      const response: any = await adminAPI.activityLogs.getAll(filters);
      setActivities(response.activities || []);
      setActivityStats(response.stats);
      setTopActions(response.topActions || []);
      setActivityTotalPages(response.pagination?.pages || 1);
    } catch (err) { console.error('Failed to fetch activities:', err); showSnack('Failed to load activity logs', 'error'); }
    finally { setActivityLoading(false); }
  }, [activitySearch, activityActionFilter, activityDateFrom, activityDateTo, activityPage]);

  const handleViewActivity = async (activity: ActivityLogData) => {
    try {
      const detailedActivity: any = await adminAPI.activityLogs.getById(activity.id);
      setSelectedActivity(detailedActivity);
      setActivityViewDialog(true);
    } catch (err) { showSnack('Failed to load activity details', 'error'); }
  };

  const handleActivityCleanup = async () => {
    try {
      const response = await (adminAPI.activityLogs as any).cleanup(cleanupDays);
      showSnack(`Cleaned up ${response.records_deleted || 0} old activity records`);
      setCleanupDialog(false);
      fetchActivities();
    } catch (err) { showSnack('Failed to cleanup activity logs', 'error'); }
  };

  const formatAction = (action: string) => action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const getActionColor = (action: string): any => {
    if (action.includes('login') || action.includes('authenticate')) return 'success';
    if (action.includes('logout') || action.includes('terminate')) return 'warning';
    if (action.includes('delete') || action.includes('remove')) return 'error';
    if (action.includes('create') || action.includes('add')) return 'primary';
    if (action.includes('update') || action.includes('modify')) return 'info';
    return 'default';
  };
  const getUserDisplay = (a: ActivityLogData) => {
    if (a.first_name || a.last_name) return `${a.first_name || ''} ${a.last_name || ''}`.trim();
    return a.user_email || `User ${a.user_id}`;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SESSION HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  const fetchSessions = useCallback(async () => {
    setSessionLoading(true);
    try {
      const filters: any = {
        search: sessionSearch || undefined,
        status: sessionStatusFilter === 'all' ? undefined : sessionStatusFilter,
        limit: SESSION_PER_PAGE,
        offset: (sessionPage - 1) * SESSION_PER_PAGE,
      };
      const response = await adminAPI.sessions.getAll(filters);
      const transformed = (response.sessions || []).map((s: any) => {
        const u = s.user || {};
        return {
          session_id: s.session_id,
          user_id: u.id || u.user_id || 0,
          email: u.email || 'Unknown',
          first_name: u.first_name || u.firstName || '',
          last_name: u.last_name || u.lastName || '',
          role: u.role || 'unknown',
          church_name: u.church_name || u.churchName || '',
          ip_address: s.ip_address || 'N/A',
          user_agent: s.user_agent || 'Unknown',
          login_time: s.login_time || s.created_at || new Date().toISOString(),
          expires: s.expires || s.expires_readable,
          is_active: s.is_active === 1 || s.is_active === true,
          minutes_until_expiry: s.minutes_until_expiry || 0,
        };
      });
      setSessions(transformed);
      setSessionTotalPages(Math.ceil((response.total || transformed.length) / SESSION_PER_PAGE));
    } catch (err) { showSnack('Failed to load sessions', 'error'); }
    finally { setSessionLoading(false); }
  }, [sessionSearch, sessionStatusFilter, sessionPage]);

  const fetchSessionStats = useCallback(async () => {
    try {
      const response = await adminAPI.sessions.getStats();
      const bs = response.stats || response.statistics || response;
      if (bs) {
        setSessionStats({
          total_sessions: bs.total_sessions || 0,
          active_sessions: bs.active_sessions || 0,
          expired_sessions: bs.expired_sessions || 0,
          unique_users: bs.unique_users || 0,
          unique_ips: bs.unique_ips || 0,
          latest_login: bs.newest_session || bs.latest_login || '',
          earliest_login: bs.oldest_session || bs.earliest_login || '',
        });
      }
    } catch (err) { console.error('Failed to fetch session stats:', err); }
  }, []);

  const handleTerminateSession = async (session: SessionData) => {
    try {
      await adminAPI.sessions.terminate(session.session_id);
      showSnack(`Session terminated for ${session.email}`);
      setTerminateDialog({ open: false, session: null });
      fetchSessions(); fetchSessionStats();
    } catch (err) { showSnack('Failed to terminate session', 'error'); }
  };

  const handleTerminateAllUserSessions = async (session: SessionData) => {
    try {
      await adminAPI.sessions.terminateAllForUser(session.user_id);
      showSnack(`All sessions terminated for ${session.email}`);
      setTerminateAllDialog({ open: false, session: null });
      fetchSessions(); fetchSessionStats();
    } catch (err) { showSnack('Failed to terminate sessions', 'error'); }
  };

  const handleLockoutUser = async (session: SessionData) => {
    try {
      if (session.is_active) await adminAPI.sessions.terminate(session.session_id);
      await adminAPI.users.toggleStatus(session.user_id);
      showSnack(`User ${session.email} deactivated`);
      setLockoutDialog({ open: false, session: null });
      fetchSessions(); fetchSessionStats();
    } catch (err) { showSnack('Failed to lockout user', 'error'); }
  };

  const handleSessionCleanup = async () => {
    try {
      await adminAPI.sessions.cleanup(7);
      showSnack('Expired sessions cleaned up');
      setSessionCleanupDialog(false);
      fetchSessions(); fetchSessionStats();
    } catch (err) { showSnack('Failed to cleanup sessions', 'error'); }
  };

  const handleKillAllSessions = async () => {
    try {
      await adminAPI.sessions.terminateAll();
      showSnack('All sessions terminated');
      setKillAllDialog(false);
      fetchSessions(); fetchSessionStats();
    } catch (err) { showSnack('Failed to terminate all sessions', 'error'); }
  };

  const handleSendMessage = async () => {
    if (!messageDialog.session || !messageText.trim()) return;
    try {
      setSendingMessage(true);
      await adminAPI.messages.sendToSession(messageDialog.session.session_id, messageText);
      showSnack(`Message sent to ${messageDialog.session.email}`);
      setMessageDialog({ open: false, session: null });
      setMessageText('');
    } catch (err) { showSnack('Failed to send message', 'error'); }
    finally { setSendingMessage(false); }
  };

  const getRoleColor = (role: string): any => {
    switch (role) {
      case 'super_admin': return 'error';
      case 'admin': return 'warning';
      case 'manager': return 'info';
      default: return 'primary';
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS — load data on mount / tab change
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    fetchLogStats();
    fetchLogs(1);
    fetchFilterOptions();
    fetchServerLogFiles();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchLogs(); }, [logPage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 1) fetchActivities();
  }, [activeTab, activityPage, activitySearch, activityActionFilter, activityDateFrom, activityDateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 2) { fetchSessions(); fetchSessionStats(); }
  }, [activeTab, sessionSearch, sessionStatusFilter, sessionPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load server log when source changes
  useEffect(() => {
    if (activeLogSource !== 'system') {
      fetchServerLog(activeLogSource, serverLogLineCount, serverLogSearch);
    }
  }, [activeLogSource]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogSearch = () => { setLogPage(1); fetchLogs(1); };
  const handleLogKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleLogSearch(); };

  const errorRateTrend = logStats ? logStats.errorRate.lastHour - logStats.errorRate.prevHour : 0;

  // Toggle level exclusion
  const toggleLevelExclusion = (level: string) => {
    setExcludedLevels(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  // ── Server log search handler ─────────────────────────────────────────────
  const handleServerLogRefresh = () => {
    if (activeLogSource !== 'system') {
      fetchServerLog(activeLogSource, serverLogLineCount, serverLogSearch);
    }
  };

  // Filter server log lines client-side for the search highlight
  const filteredServerLogLines = serverLogSearch
    ? serverLogLines.filter(line => line.toLowerCase().includes(serverLogSearch.toLowerCase()))
    : serverLogLines;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <Box sx={{ maxWidth: isLayout === 'full' ? '100%' : 1400, mx: 'auto', px: { xs: 1, md: 3 }, py: 3 }}>
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <Box sx={{
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        borderRadius: 3, p: 3, mb: 3, color: 'white',
      }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <IconTerminal2 size={36} />
          <Box>
            <Typography variant="h4" fontWeight={700}>System Logs & Monitoring</Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              Search logs, audit user activity, and manage active sessions
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': { py: 2, fontWeight: 600, fontSize: '0.9rem' },
            '& .MuiTabs-indicator': { height: 3, borderRadius: 2 },
          }}
        >
          <Tab
            icon={<IconSearch size={20} />}
            iconPosition="start"
            label={
              <Badge badgeContent={logStats?.errors24h || 0} color="error" max={999} sx={{ '& .MuiBadge-badge': { right: -12, top: 2 } }}>
                Log Search
              </Badge>
            }
          />
          <Tab icon={<IconActivity size={20} />} iconPosition="start" label="Activity Logs" />
          <Tab
            icon={<IconUsers size={20} />}
            iconPosition="start"
            label={
              <Badge badgeContent={sessionStats?.active_sessions || 0} color="success" max={99} sx={{ '& .MuiBadge-badge': { right: -12, top: 2 } }}>
                Sessions
              </Badge>
            }
          />
        </Tabs>
      </Paper>

      {/* ═══════════════════════════════════════════════════════════════
           TAB 0 — LOG SEARCH
         ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 0 && (
        <>
          {/* Log Source Selector */}
          <Card sx={{ mb: 3, borderRadius: 2 }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap>
                <Typography variant="subtitle2" color="text.secondary" sx={{ minWidth: 80 }}>
                  <IconServer size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Log Source:
                </Typography>
                <Chip
                  label="System Logs"
                  icon={<IconDatabase size={16} />}
                  color={activeLogSource === 'system' ? 'primary' : 'default'}
                  variant={activeLogSource === 'system' ? 'filled' : 'outlined'}
                  onClick={() => setActiveLogSource('system')}
                  clickable
                />
                {serverLogFiles.map(f => (
                  <Chip
                    key={f.name}
                    label={SERVER_LOG_LABELS[f.name] || f.name}
                    icon={<IconFile size={16} />}
                    color={activeLogSource === f.name ? 'primary' : 'default'}
                    variant={activeLogSource === f.name ? 'filled' : 'outlined'}
                    onClick={() => setActiveLogSource(f.name)}
                    clickable
                    sx={{ fontSize: '0.8rem' }}
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>

          {activeLogSource === 'system' ? (
            <>
              {/* Stats Cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                  { label: 'Total Logs', value: logStats?.total ?? 0, color: theme.palette.primary.main, icon: <IconDatabase size={28} /> },
                  { label: 'Errors (24h)', value: logStats?.errors24h ?? 0, color: theme.palette.error.main, icon: <IconAlertCircle size={28} /> },
                  { label: 'Warnings (24h)', value: logStats?.warnings24h ?? 0, color: theme.palette.warning.main, icon: <IconAlertTriangle size={28} /> },
                  { label: 'Error Rate (1h)', value: logStats?.errorRate.lastHour ?? 0, color: errorRateTrend > 0 ? theme.palette.error.main : theme.palette.success.main, icon: <IconActivity size={28} />, suffix: errorRateTrend !== 0 ? ` (${errorRateTrend > 0 ? '+' : ''}${errorRateTrend})` : '' },
                ].map((s, i) => (
                  <Grid size={{ xs: 6, md: 3 }} key={i}>
                    <Card sx={STAT_CARD(s.color)}>
                      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Box sx={{ color: s.color }}>{s.icon}</Box>
                          <Box>
                            <Typography variant="h5" fontWeight={700}>
                              {logStatsLoading ? <CircularProgress size={20} /> : s.value.toLocaleString()}{(s as any).suffix || ''}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Filter Bar */}
              <Card sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent sx={{ pb: '16px !important' }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        fullWidth size="small" label="Search logs"
                        value={logQuery} onChange={e => setLogQuery(e.target.value)} onKeyDown={handleLogKeyDown}
                        InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={18} /></InputAdornment> }}
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Level</InputLabel>
                        <Select value={logLevel} label="Level" onChange={e => setLogLevel(e.target.value)}>
                          <MenuItem value="">All</MenuItem>
                          <MenuItem value="ERROR">Error</MenuItem>
                          <MenuItem value="WARN">Warning</MenuItem>
                          <MenuItem value="INFO">Info</MenuItem>
                          <MenuItem value="DEBUG">Debug</MenuItem>
                          <MenuItem value="SUCCESS">Success</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={filterOptions.sources}
                        value={logSource}
                        onInputChange={(_, val) => setLogSource(val)}
                        renderInput={(params) => <TextField {...params} label="Source" onKeyDown={handleLogKeyDown} />}
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={filterOptions.services}
                        value={logService}
                        onInputChange={(_, val) => setLogService(val)}
                        renderInput={(params) => <TextField {...params} label="Service" onKeyDown={handleLogKeyDown} />}
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={filterOptions.recentUsers}
                        getOptionLabel={(option) => {
                          if (typeof option === 'string') return option;
                          const name = option.name ? `${option.name} ` : '';
                          const ago = option.last_login ? ` - ${dayjs(option.last_login).fromNow()}` : '';
                          return `${name}(${option.email})${ago}`;
                        }}
                        value={logUserEmail}
                        onInputChange={(_, val) => {
                          // Extract email from the display format
                          const emailMatch = val.match(/\(([^)]+)\)/);
                          setLogUserEmail(emailMatch ? emailMatch[1] : val);
                        }}
                        renderOption={(props, option) => {
                          if (typeof option === 'string') return <li {...props}>{option}</li>;
                          return (
                            <li {...props}>
                              <Box>
                                <Typography variant="body2">{option.name || option.email}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {option.email}{option.last_login ? ` - last login ${dayjs(option.last_login).fromNow()}` : ''}
                                </Typography>
                              </Box>
                            </li>
                          );
                        }}
                        renderInput={(params) => <TextField {...params} label="User email" onKeyDown={handleLogKeyDown} />}
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <TextField fullWidth size="small" label="From" type="datetime-local" value={logDateFrom} onChange={e => setLogDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <TextField fullWidth size="small" label="To" type="datetime-local" value={logDateTo} onChange={e => setLogDateTo(e.target.value)} InputLabelProps={{ shrink: true }} />
                    </Grid>

                    {/* Level Exclude Toggles */}
                    <Grid size={{ xs: 12, md: 8 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Exclude:</Typography>
                        {ALL_LEVELS.map(level => (
                          <Chip
                            key={level}
                            label={level}
                            size="small"
                            icon={levelIcons[level] as React.ReactElement}
                            color={excludedLevels.includes(level) ? 'default' : (levelColors[level] || 'default')}
                            variant={excludedLevels.includes(level) ? 'filled' : 'outlined'}
                            onClick={() => toggleLevelExclusion(level)}
                            clickable
                            sx={{
                              fontSize: '0.7rem',
                              opacity: excludedLevels.includes(level) ? 0.5 : 1,
                              textDecoration: excludedLevels.includes(level) ? 'line-through' : 'none',
                            }}
                          />
                        ))}
                      </Stack>
                    </Grid>

                    <Grid size={12} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Button variant="contained" onClick={handleLogSearch} startIcon={<IconSearch size={18} />}>Search</Button>
                      <Button variant="outlined" onClick={() => { setLogQuery(''); setLogLevel(''); setLogSource(''); setLogService(''); setLogUserEmail(''); setLogDateFrom(''); setLogDateTo(''); setExcludedLevels([]); setLogPage(1); setSortField('timestamp'); setSortDir('DESC'); setTimeout(() => fetchLogs(1), 0); }}>Clear</Button>

                      {/* Auto-Refresh Toggle */}
                      <ButtonGroup variant="outlined" size="small">
                        <Button
                          onClick={() => { fetchLogStats(); fetchLogs(); }}
                          startIcon={<IconRefresh size={18} />}
                        >
                          Refresh
                        </Button>
                        <Tooltip title={autoRefresh ? `Auto-refresh ON (${countdown}s)` : 'Enable auto-refresh'}>
                          <Button
                            onClick={() => setAutoRefresh(prev => !prev)}
                            color={autoRefresh ? 'success' : 'inherit'}
                            sx={{
                              bgcolor: autoRefresh ? alpha(theme.palette.success.main, 0.1) : undefined,
                              minWidth: 40,
                            }}
                          >
                            {autoRefresh ? <IconPlayerPause size={18} /> : <IconPlayerPlay size={18} />}
                            {autoRefresh && (
                              <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 700, minWidth: 16 }}>
                                {countdown}
                              </Typography>
                            )}
                          </Button>
                        </Tooltip>
                      </ButtonGroup>

                      <Typography variant="caption" color="text.secondary" sx={{ mx: 1 }}>Quick:</Typography>
                      {[
                        { label: 'Errors', preset: () => { setLogLevel('ERROR'); setLogQuery(''); setLogPage(1); setTimeout(() => fetchLogs(1), 0); } },
                        { label: 'Warnings', preset: () => { setLogLevel('WARN'); setLogQuery(''); setLogPage(1); setTimeout(() => fetchLogs(1), 0); } },
                        { label: 'Auth', preset: () => { setLogQuery('auth'); setLogLevel(''); setLogPage(1); setTimeout(() => fetchLogs(1), 0); } },
                        { label: 'OCR', preset: () => { setLogQuery('ocr'); setLogLevel(''); setLogPage(1); setTimeout(() => fetchLogs(1), 0); } },
                        { label: 'DB', preset: () => { setLogQuery('database'); setLogLevel(''); setLogPage(1); setTimeout(() => fetchLogs(1), 0); } },
                        { label: 'Crash', preset: () => { setLogQuery('crash'); setLogLevel('ERROR'); setLogPage(1); setTimeout(() => fetchLogs(1), 0); } },
                      ].map(q => (
                        <Chip key={q.label} label={q.label} size="small" variant="outlined" clickable onClick={q.preset} sx={{ fontSize: '0.72rem' }} />
                      ))}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Results Table */}
              <Card sx={{ borderRadius: 2 }}>
                <TableContainer sx={{ maxHeight: 'calc(100vh - 520px)', overflow: 'auto' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.06) } }}>
                        <TableCell width={40} />
                        <TableCell sortDirection={sortField === 'timestamp' ? (sortDir.toLowerCase() as 'asc' | 'desc') : false}>
                          <TableSortLabel active={sortField === 'timestamp'} direction={sortField === 'timestamp' ? (sortDir.toLowerCase() as 'asc' | 'desc') : 'desc'} onClick={() => handleSort('timestamp')}>
                            Timestamp
                          </TableSortLabel>
                        </TableCell>
                        <TableCell width={100} sortDirection={sortField === 'level' ? (sortDir.toLowerCase() as 'asc' | 'desc') : false}>
                          <TableSortLabel active={sortField === 'level'} direction={sortField === 'level' ? (sortDir.toLowerCase() as 'asc' | 'desc') : 'desc'} onClick={() => handleSort('level')}>
                            Level
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sortDirection={sortField === 'source' ? (sortDir.toLowerCase() as 'asc' | 'desc') : false}>
                          <TableSortLabel active={sortField === 'source'} direction={sortField === 'source' ? (sortDir.toLowerCase() as 'asc' | 'desc') : 'desc'} onClick={() => handleSort('source')}>
                            Source
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 400 }} sortDirection={sortField === 'message' ? (sortDir.toLowerCase() as 'asc' | 'desc') : false}>
                          <TableSortLabel active={sortField === 'message'} direction={sortField === 'message' ? (sortDir.toLowerCase() as 'asc' | 'desc') : 'desc'} onClick={() => handleSort('message')}>
                            Message
                          </TableSortLabel>
                        </TableCell>
                        <TableCell width={60} align="center" sortDirection={sortField === 'occurrences' ? (sortDir.toLowerCase() as 'asc' | 'desc') : false}>
                          <TableSortLabel active={sortField === 'occurrences'} direction={sortField === 'occurrences' ? (sortDir.toLowerCase() as 'asc' | 'desc') : 'desc'} onClick={() => handleSort('occurrences')}>
                            Occ.
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sortDirection={sortField === 'user_email' ? (sortDir.toLowerCase() as 'asc' | 'desc') : false}>
                          <TableSortLabel active={sortField === 'user_email'} direction={sortField === 'user_email' ? (sortDir.toLowerCase() as 'asc' | 'desc') : 'desc'} onClick={() => handleSort('user_email')}>
                            User
                          </TableSortLabel>
                        </TableCell>
                        <TableCell width={60} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {logLoading ? (
                        <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}><CircularProgress /><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Loading logs...</Typography></TableCell></TableRow>
                      ) : !logResults?.rows.length ? (
                        <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}><IconSearch size={40} style={{ opacity: 0.2 }} /><Typography color="text.secondary" sx={{ mt: 1 }}>No logs found. Try adjusting your filters.</Typography></TableCell></TableRow>
                      ) : (
                        logResults.rows.map(row => (
                          <React.Fragment key={row.id}>
                            <TableRow hover sx={{ cursor: 'pointer', '& td': { borderBottom: expandedRow === row.id ? 'none' : undefined } }} onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}>
                              <TableCell>{expandedRow === row.id ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}</TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                                <Tooltip title={dayjs(row.timestamp).format('YYYY-MM-DD HH:mm:ss.SSS')}><span>{dayjs(row.timestamp).fromNow()}</span></Tooltip>
                              </TableCell>
                              <TableCell>
                                <Chip size="small" label={row.level} color={levelColors[row.level] || 'default'} icon={levelIcons[row.level] as React.ReactElement || undefined} sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.8rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.source}</TableCell>
                              <TableCell sx={{ fontSize: '0.8rem', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.message}</TableCell>
                              <TableCell align="center">{row.occurrences > 1 && <Chip size="small" label={row.occurrences} variant="outlined" sx={{ fontSize: '0.7rem' }} />}</TableCell>
                              <TableCell sx={{ fontSize: '0.8rem' }}>{row.user_email || '-'}</TableCell>
                              <TableCell>
                                <Tooltip title="View surrounding context">
                                  <IconButton size="small" onClick={e => { e.stopPropagation(); fetchContext(row.id); }} disabled={contextLoading}><IconEye size={16} /></IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell colSpan={8} sx={{ py: 0, px: 0 }}>
                                <Collapse in={expandedRow === row.id} timeout="auto" unmountOnExit>
                                  <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
                                    <Grid container spacing={2}>
                                      <Grid size={12}>
                                        <Typography variant="subtitle2" gutterBottom>Full Message</Typography>
                                        <Paper sx={{ p: 1.5, bgcolor: 'background.default', fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 200, overflow: 'auto' }}>{row.message}</Paper>
                                      </Grid>
                                      {row.meta && Object.keys(row.meta).length > 0 && (
                                        <Grid size={{ xs: 12, md: 6 }}>
                                          <Typography variant="subtitle2" gutterBottom>Meta</Typography>
                                          <Paper sx={{ p: 1.5, bgcolor: 'background.default', fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>{JSON.stringify(row.meta, null, 2)}</Paper>
                                        </Grid>
                                      )}
                                      <Grid size={{ xs: 12, md: 6 }}>
                                        <Typography variant="subtitle2" gutterBottom>Details</Typography>
                                        <Box sx={{ fontSize: '0.8rem', '& > div': { mb: 0.5 } }}>
                                          <div><strong>ID:</strong> {row.id}</div>
                                          <div><strong>Hash:</strong> {row.hash}</div>
                                          <div><strong>Timestamp:</strong> {dayjs(row.timestamp).format('YYYY-MM-DD HH:mm:ss')}</div>
                                          {row.first_seen && <div><strong>First seen:</strong> {dayjs(row.first_seen).format('YYYY-MM-DD HH:mm:ss')}</div>}
                                          {row.session_id && <div><strong>Session ID:</strong> {row.session_id}</div>}
                                          {row.request_id && <div><strong>Request ID:</strong> {row.request_id}</div>}
                                          {row.ip_address && <div><strong>IP:</strong> {row.ip_address}</div>}
                                          {row.user_agent && <div><strong>User Agent:</strong> {row.user_agent}</div>}
                                          {row.service && <div><strong>Service:</strong> {row.service}</div>}
                                          {row.source_component && <div><strong>Component:</strong> {row.source_component}</div>}
                                        </Box>
                                      </Grid>
                                    </Grid>
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                {logResults && logResults.pages > 1 && (
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">{logResults.total.toLocaleString()} results — page {logResults.page} of {logResults.pages}</Typography>
                    <Pagination count={logResults.pages} page={logResults.page} onChange={(_, p) => setLogPage(p)} color="primary" size="small" />
                  </Stack>
                )}
              </Card>
            </>
          ) : (
            /* ── Server Log File Viewer ────────────────────────────────── */
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6" fontWeight={600}>
                    {SERVER_LOG_LABELS[activeLogSource] || activeLogSource}
                  </Typography>
                  <TextField
                    size="small"
                    label="Search in log"
                    value={serverLogSearch}
                    onChange={e => setServerLogSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleServerLogRefresh(); }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment> }}
                    sx={{ width: 250 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <InputLabel>Lines</InputLabel>
                    <Select value={serverLogLineCount} label="Lines" onChange={e => setServerLogLineCount(Number(e.target.value))}>
                      <MenuItem value={100}>100</MenuItem>
                      <MenuItem value={200}>200</MenuItem>
                      <MenuItem value={500}>500</MenuItem>
                      <MenuItem value={1000}>1000</MenuItem>
                    </Select>
                  </FormControl>
                  <Button variant="outlined" startIcon={<IconRefresh size={18} />} onClick={handleServerLogRefresh} disabled={serverLogLoading}>
                    Refresh
                  </Button>
                  {serverLogLoading && <CircularProgress size={20} />}
                </Stack>

                <Paper
                  sx={{
                    p: 2,
                    bgcolor: '#1e1e1e',
                    color: '#d4d4d4',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    lineHeight: 1.6,
                    maxHeight: 'calc(100vh - 400px)',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    borderRadius: 1,
                  }}
                >
                  {serverLogLoading ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <CircularProgress size={24} sx={{ color: '#d4d4d4' }} />
                      <Typography variant="body2" sx={{ color: '#888', mt: 1 }}>Loading log...</Typography>
                    </Box>
                  ) : filteredServerLogLines.length === 0 ? (
                    <Typography sx={{ color: '#888', textAlign: 'center', py: 4 }}>No log lines found</Typography>
                  ) : (
                    filteredServerLogLines.map((line, i) => (
                      <Box
                        key={i}
                        sx={{
                          py: 0.15,
                          px: 1,
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          color: line.toLowerCase().includes('error') ? '#f48771'
                            : line.toLowerCase().includes('warn') ? '#cca700'
                            : '#d4d4d4',
                        }}
                      >
                        <Typography component="span" sx={{ color: '#666', mr: 1, fontSize: '0.7rem', userSelect: 'none' }}>
                          {i + 1}
                        </Typography>
                        {line}
                      </Box>
                    ))
                  )}
                </Paper>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Showing {filteredServerLogLines.length} line{filteredServerLogLines.length !== 1 ? 's' : ''}
                  {serverLogSearch && ` (filtered from ${serverLogLines.length})`}
                </Typography>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
           TAB 1 — ACTIVITY LOGS
         ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 1 && (
        <>
          {/* Stats Cards */}
          {activityStats && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {[
                { label: 'Total Activities (30d)', value: activityStats.total_activities, color: theme.palette.primary.main, icon: <IconActivity size={28} /> },
                { label: 'Active Users', value: activityStats.unique_users, color: theme.palette.success.main, icon: <IconUser size={28} /> },
                { label: 'Active Days', value: activityStats.active_days, color: theme.palette.warning.main, icon: <IconCalendar size={28} /> },
                { label: 'Action Types', value: activityStats.unique_actions, color: theme.palette.secondary.main, icon: <IconFilter size={28} /> },
              ].map((s, i) => (
                <Grid size={{ xs: 6, md: 3 }} key={i}>
                  <Card sx={STAT_CARD(s.color)}>
                    <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box sx={{ color: s.color }}>{s.icon}</Box>
                        <Box>
                          <Typography variant="h5" fontWeight={700}>{s.value.toLocaleString()}</Typography>
                          <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Top Actions */}
          {topActions.length > 0 && (
            <Card sx={{ mb: 3, borderRadius: 2 }}>
              <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Top Actions (Last 7 Days)</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {topActions.slice(0, 12).map(a => (
                    <Chip key={a.action} label={`${formatAction(a.action)} (${a.count})`} color={getActionColor(a.action)} variant="outlined" size="small" />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Filter Bar */}
          <Card sx={{ mb: 3, borderRadius: 2 }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField fullWidth size="small" label="Search" placeholder="Actions, users, changes..."
                    value={activitySearch} onChange={e => setActivitySearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={18} /></InputAdornment> }}
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Action</InputLabel>
                    <Select value={activityActionFilter} label="Action" onChange={e => setActivityActionFilter(e.target.value)}>
                      <MenuItem value="">All Actions</MenuItem>
                      <MenuItem value="login">Login</MenuItem>
                      <MenuItem value="logout">Logout</MenuItem>
                      <MenuItem value="terminate_session">Terminate Session</MenuItem>
                      <MenuItem value="create_user">Create User</MenuItem>
                      <MenuItem value="update_user">Update User</MenuItem>
                      <MenuItem value="lockout_user">Lockout User</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 6, md: 2 }}>
                  <TextField fullWidth size="small" label="From" type="date" value={activityDateFrom} onChange={e => setActivityDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid size={{ xs: 6, md: 2 }}>
                  <TextField fullWidth size="small" label="To" type="date" value={activityDateTo} onChange={e => setActivityDateTo(e.target.value)} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }} sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="outlined" startIcon={<IconRefresh size={18} />} onClick={fetchActivities} disabled={activityLoading}>Refresh</Button>
                  <Button variant="outlined" onClick={() => { setActivitySearch(''); setActivityActionFilter(''); setActivityDateFrom(''); setActivityDateTo(''); setActivityPage(1); }}>Clear</Button>
                  {hasRole(['super_admin']) && (
                    <Button variant="outlined" color="warning" startIcon={<IconTrash size={18} />} onClick={() => setCleanupDialog(true)}>Cleanup</Button>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Activity Table */}
          <Card sx={{ borderRadius: 2 }}>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 520px)', overflow: 'auto' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.06) } }}>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Details</TableCell>
                    <TableCell>IP Address</TableCell>
                    <TableCell width={60} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activityLoading ? (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}><CircularProgress /><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Loading activities...</Typography></TableCell></TableRow>
                  ) : !activities.length ? (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}><IconActivity size={40} style={{ opacity: 0.2 }} /><Typography color="text.secondary" sx={{ mt: 1 }}>No activity logs found</Typography></TableCell></TableRow>
                  ) : (
                    activities.map(a => (
                      <TableRow key={a.id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                          <Tooltip title={new Date(a.created_at).toLocaleString()}><span>{dayjs(a.created_at).fromNow()}</span></Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{getUserDisplay(a)}</Typography>
                          <Typography variant="caption" color="text.secondary">{a.user_email}</Typography>
                          {a.user_role && <Chip label={a.user_role} size="small" color={a.user_role === 'super_admin' ? 'error' : 'primary'} variant="outlined" sx={{ ml: 0.5, height: 20, fontSize: '0.65rem' }} />}
                        </TableCell>
                        <TableCell><Chip label={formatAction(a.action)} color={getActionColor(a.action)} variant="outlined" size="small" /></TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', maxWidth: 200 }}>
                          {a.changes && typeof a.changes === 'object' && Object.keys(a.changes).length > 0 ? `${Object.keys(a.changes).length} changes` : '-'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{a.ip_address || '-'}</TableCell>
                        <TableCell>
                          <Tooltip title="View Details"><IconButton size="small" onClick={() => handleViewActivity(a)}><IconEye size={16} /></IconButton></Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {activityTotalPages > 1 && (
              <Stack direction="row" justifyContent="center" sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Pagination count={activityTotalPages} page={activityPage} onChange={(_, p) => setActivityPage(p)} color="primary" size="small" />
              </Stack>
            )}
          </Card>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
           TAB 2 — SESSIONS
         ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 2 && (
        <>
          {/* Stats Cards */}
          {sessionStats && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {[
                { label: 'Active Sessions', value: sessionStats.active_sessions, color: theme.palette.success.main, icon: <IconUsers size={28} /> },
                { label: 'Expired Sessions', value: sessionStats.expired_sessions, color: theme.palette.warning.main, icon: <IconClock size={28} /> },
                { label: 'Unique Users', value: sessionStats.unique_users, color: theme.palette.primary.main, icon: <IconUser size={28} /> },
                { label: 'Unique IPs', value: sessionStats.unique_ips, color: theme.palette.secondary.main, icon: <IconDevices size={28} /> },
              ].map((s, i) => (
                <Grid size={{ xs: 6, md: 3 }} key={i}>
                  <Card sx={STAT_CARD(s.color)}>
                    <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box sx={{ color: s.color }}>{s.icon}</Box>
                        <Box>
                          <Typography variant="h5" fontWeight={700}>{s.value}</Typography>
                          <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Controls */}
          <Card sx={{ mb: 3, borderRadius: 2 }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField fullWidth size="small" label="Search by email, name, or IP"
                    value={sessionSearch} onChange={e => setSessionSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={18} /></InputAdornment> }}
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select value={sessionStatusFilter} label="Status" onChange={e => setSessionStatusFilter(e.target.value as any)}>
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="expired">Expired</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 7 }} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button variant="outlined" startIcon={<IconRefresh size={18} />} onClick={() => { fetchSessions(); fetchSessionStats(); }}>Refresh</Button>
                  <Button variant="outlined" color="warning" startIcon={<IconX size={18} />} onClick={() => setSessionCleanupDialog(true)}>Cleanup Expired</Button>
                  <Button variant="contained" color="error" startIcon={<IconAlertTriangle size={18} />} onClick={() => setKillAllDialog(true)}>Kill All Sessions</Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Sessions Table */}
          <Card sx={{ borderRadius: 2 }}>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 520px)', overflow: 'auto' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.06) } }}>
                    <TableCell>User</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Church</TableCell>
                    <TableCell>IP</TableCell>
                    <TableCell>Login</TableCell>
                    <TableCell>Expires</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell width={140}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessionLoading ? (
                    <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6 }}><CircularProgress /><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Loading sessions...</Typography></TableCell></TableRow>
                  ) : !sessions.length ? (
                    <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6 }}><IconUsers size={40} style={{ opacity: 0.2 }} /><Typography color="text.secondary" sx={{ mt: 1 }}>No sessions found</Typography></TableCell></TableRow>
                  ) : (
                    sessions.map(s => (
                      <TableRow key={s.session_id} hover>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{s.first_name && s.last_name ? `${s.first_name} ${s.last_name}` : 'N/A'}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{s.email}</TableCell>
                        <TableCell><Chip label={s.role} color={getRoleColor(s.role)} size="small" sx={{ fontSize: '0.7rem' }} /></TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{s.church_name || '-'}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{s.ip_address || '-'}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                          <Tooltip title={new Date(s.login_time).toLocaleString()}><span>{dayjs(s.login_time).fromNow()}</span></Tooltip>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>
                          {s.expires ? dayjs(s.expires).fromNow() : '-'}
                          {s.is_active && s.minutes_until_expiry > 0 && (
                            <Typography variant="caption" display="block" color="text.secondary">{s.minutes_until_expiry}m left</Typography>
                          )}
                        </TableCell>
                        <TableCell>{s.is_active ? <Chip label="Active" color="success" size="small" sx={{ fontSize: '0.7rem' }} /> : <Chip label="Expired" size="small" sx={{ fontSize: '0.7rem' }} />}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            {s.is_active && (
                              <Tooltip title="Terminate Session"><IconButton size="small" color="error" onClick={() => setTerminateDialog({ open: true, session: s })}><IconShieldX size={16} /></IconButton></Tooltip>
                            )}
                            <Tooltip title="Terminate All User Sessions"><IconButton size="small" color="error" onClick={() => setTerminateAllDialog({ open: true, session: s })}><IconShieldOff size={16} /></IconButton></Tooltip>
                            {s.is_active && (
                              <Tooltip title="Send Message"><IconButton size="small" color="primary" onClick={() => setMessageDialog({ open: true, session: s })}><IconMessage size={16} /></IconButton></Tooltip>
                            )}
                            <Tooltip title="Lockout User"><IconButton size="small" color="warning" onClick={() => setLockoutDialog({ open: true, session: s })}><IconLock size={16} /></IconButton></Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {sessionTotalPages > 1 && (
              <Stack direction="row" justifyContent="center" sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Pagination count={sessionTotalPages} page={sessionPage} onChange={(_, p) => setSessionPage(p)} color="primary" size="small" />
              </Stack>
            )}
          </Card>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
           DIALOGS
         ═══════════════════════════════════════════════════════════════ */}

      {/* Log Context Dialog */}
      <Dialog open={contextDialog.open} onClose={() => setContextDialog({ open: false, rows: [], targetId: null })} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Log Context</DialogTitle>
        <DialogContent>
          <TableContainer sx={{ maxHeight: 500 }}>
            <Table size="small">
              <TableHead>
                <TableRow><TableCell>Timestamp</TableCell><TableCell>Level</TableCell><TableCell>Source</TableCell><TableCell>Message</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {contextDialog.rows.map(row => (
                  <TableRow key={row.id} sx={{ bgcolor: row.isFocused ? 'action.selected' : undefined, fontWeight: row.isFocused ? 700 : 400 }}>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{dayjs(row.timestamp).format('HH:mm:ss.SSS')}</TableCell>
                    <TableCell><Chip size="small" label={row.level} color={levelColors[row.level] || 'default'} sx={{ fontSize: '0.7rem' }} /></TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{row.source}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', maxWidth: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions><Button onClick={() => setContextDialog({ open: false, rows: [], targetId: null })}>Close</Button></DialogActions>
      </Dialog>

      {/* Activity View Dialog */}
      <Dialog open={activityViewDialog} onClose={() => setActivityViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Activity Details</DialogTitle>
        <DialogContent>
          {selectedActivity && (
            <Box>
              <Grid container spacing={2}>
                <Grid size={6}><Typography variant="subtitle2" color="text.secondary">Timestamp</Typography><Typography>{new Date(selectedActivity.created_at).toLocaleString()}</Typography></Grid>
                <Grid size={6}><Typography variant="subtitle2" color="text.secondary">Action</Typography><Chip label={formatAction(selectedActivity.action)} color={getActionColor(selectedActivity.action)} variant="outlined" /></Grid>
                <Grid size={6}><Typography variant="subtitle2" color="text.secondary">User</Typography><Typography>{getUserDisplay(selectedActivity)} ({selectedActivity.user_email})</Typography></Grid>
                <Grid size={6}><Typography variant="subtitle2" color="text.secondary">Role</Typography><Typography>{selectedActivity.user_role || 'Unknown'}</Typography></Grid>
                <Grid size={6}><Typography variant="subtitle2" color="text.secondary">IP Address</Typography><Typography fontFamily="monospace">{selectedActivity.ip_address || 'Unknown'}</Typography></Grid>
                <Grid size={6}><Typography variant="subtitle2" color="text.secondary">User Agent</Typography><Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{selectedActivity.user_agent || 'Unknown'}</Typography></Grid>
              </Grid>
              {selectedActivity.changes && (
                <Box mt={3}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Changes / Details</Typography>
                  <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.03), fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>
                    {JSON.stringify(selectedActivity.changes, null, 2)}
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setActivityViewDialog(false)}>Close</Button></DialogActions>
      </Dialog>

      {/* Activity Cleanup Dialog */}
      <Dialog open={cleanupDialog} onClose={() => setCleanupDialog(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Cleanup Old Activity Logs</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>Permanently delete activity log records older than the specified number of days.</Typography>
          <TextField fullWidth label="Days to keep" type="number" value={cleanupDays} onChange={e => setCleanupDays(parseInt(e.target.value) || 90)} helperText="Records older than this will be deleted" sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCleanupDialog(false)}>Cancel</Button>
          <Button onClick={handleActivityCleanup} color="warning" variant="contained">Delete Old Logs</Button>
        </DialogActions>
      </Dialog>

      {/* Terminate Session Dialog */}
      <Dialog open={terminateDialog.open} onClose={() => setTerminateDialog({ open: false, session: null })}>
        <DialogTitle sx={{ fontWeight: 700 }}>Terminate Session</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to terminate the session for <strong>{terminateDialog.session?.email}</strong>?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>This will immediately log out the user.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTerminateDialog({ open: false, session: null })}>Cancel</Button>
          <Button onClick={() => terminateDialog.session && handleTerminateSession(terminateDialog.session)} color="error" variant="contained">Terminate</Button>
        </DialogActions>
      </Dialog>

      {/* Terminate All User Sessions Dialog */}
      <Dialog open={terminateAllDialog.open} onClose={() => setTerminateAllDialog({ open: false, session: null })}>
        <DialogTitle sx={{ fontWeight: 700 }}>Terminate All Sessions</DialogTitle>
        <DialogContent>
          <Typography>Terminate ALL sessions for <strong>{terminateAllDialog.session?.email}</strong>?</Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>This will log out the user from all devices. They can log back in immediately.</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTerminateAllDialog({ open: false, session: null })}>Cancel</Button>
          <Button onClick={() => terminateAllDialog.session && handleTerminateAllUserSessions(terminateAllDialog.session)} color="warning" variant="contained">Terminate All</Button>
        </DialogActions>
      </Dialog>

      {/* Lockout User Dialog */}
      <Dialog open={lockoutDialog.open} onClose={() => setLockoutDialog({ open: false, session: null })}>
        <DialogTitle sx={{ fontWeight: 700 }}>Lockout User</DialogTitle>
        <DialogContent>
          <Typography>Deactivate <strong>{lockoutDialog.session?.email}</strong> and terminate all their sessions?</Typography>
          <Alert severity="error" sx={{ mt: 2 }}>The user will not be able to log in until reactivated by an admin.</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLockoutDialog({ open: false, session: null })}>Cancel</Button>
          <Button onClick={() => lockoutDialog.session && handleLockoutUser(lockoutDialog.session)} color="error" variant="contained">Lockout</Button>
        </DialogActions>
      </Dialog>

      {/* Session Cleanup Dialog */}
      <Dialog open={sessionCleanupDialog} onClose={() => setSessionCleanupDialog(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Cleanup Expired Sessions</DialogTitle>
        <DialogContent>
          <Typography>Permanently delete all expired sessions older than 7 days.</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSessionCleanupDialog(false)}>Cancel</Button>
          <Button onClick={handleSessionCleanup} color="warning" variant="contained">Cleanup</Button>
        </DialogActions>
      </Dialog>

      {/* Kill All Sessions Dialog */}
      <Dialog open={killAllDialog} onClose={() => setKillAllDialog(false)}>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Kill All Active Sessions</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            This will terminate ALL active sessions for ALL users, including your own. Everyone will be forced to log in again.
          </Alert>
          <Typography variant="body2" fontWeight={700} color="error">Use this only in emergency situations!</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKillAllDialog(false)}>Cancel</Button>
          <Button onClick={handleKillAllSessions} color="error" variant="contained">Kill All Sessions</Button>
        </DialogActions>
      </Dialog>

      {/* Send Message Dialog */}
      <Dialog open={messageDialog.open} onClose={() => { setMessageDialog({ open: false, session: null }); setMessageText(''); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Send Message</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Send an instant message to <strong>{messageDialog.session?.email}</strong></Typography>
          <TextField autoFocus fullWidth multiline rows={4} label="Message" value={messageText} onChange={e => setMessageText(e.target.value)} placeholder="Enter your message..." sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setMessageDialog({ open: false, session: null }); setMessageText(''); }} disabled={sendingMessage}>Cancel</Button>
          <Button onClick={handleSendMessage} color="primary" variant="contained" disabled={!messageText.trim() || sendingMessage}
            startIcon={sendingMessage ? <CircularProgress size={16} /> : <IconMessage size={18} />}>
            {sendingMessage ? 'Sending...' : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Global Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default LogSearch;
