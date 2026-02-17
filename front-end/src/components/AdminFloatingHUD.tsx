/**
 * Admin Floating HUD Component
 * Displays system status information for Super Admin users
 * Features: Draggable, auto-polling, version mismatch alerts, OMAI integration
 */

import { Box, Button, Chip, Paper, Tab, Tabs, TextField, Tooltip, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import { Activity, Wrench, AlertCircle, ChevronRight, ChevronDown } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SystemStatus {
  version_string?: string;
  last_git_sha?: string;
  church_count?: number;
  version_mismatch?: boolean;
  uptime?: string;
  environment?: string;
}

interface SessionStats {
  totalSessions: number;
  uniqueUsers: number;
  ratio: number;
  health: string;
}

interface MaintenanceStatus {
  enabled: boolean;
  message?: string;
}

interface LogEntry {
  type: 'error' | 'warning';
  message: string;
  timestamp: string;
  id: string;
}

interface LogStats {
  total: number;
  errors: number;
  warnings: number;
  isMonitoring: boolean;
}

interface OmaiHealth {
  overall: string;
  services: Record<string, string>;
  disk: { size: string; used: string; avail: string; percent: string };
  memory: { totalMB: string; usedMB: string; freeMB: string; availableMB: string };
  errors: { lastHour: number; last24h: number };
}

interface OmaiBriefing {
  date: string;
  summary: {
    commits: number;
    tasksCompleted: number;
    tasksInProgress: number;
    tasksCreated: number;
    errorsToday: number;
  };
}

interface OmaiTaskItem {
  id: number;
  title: string;
  priority: string;
  status: string;
  category: string;
  assigned_to: string | null;
}

interface OmaiTaskStats {
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  completedLast7Days: number;
}

interface OmaiLogsSummary {
  last24h: { total_24h: number; errors_24h: string; warnings_24h: string };
  status: string;
}

interface OmaiLogPattern {
  pattern: string;
  count: number;
}

const DraggableHUD = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  top: 80,
  right: 16,
  zIndex: 9999,
  padding: theme.spacing(2),
  cursor: 'move',
  userSelect: 'none',
  backgroundColor: theme.palette.mode === 'dark' ? '#1a1a2e' : '#ffffff',
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#1e293b',
  boxShadow: theme.palette.mode === 'dark'
    ? '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
    : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  borderRadius: 12,
  transition: 'width 0.3s ease, box-shadow 0.2s ease',
  '&:hover': {
    boxShadow: theme.palette.mode === 'dark'
      ? '0 25px 30px -5px rgba(0, 0, 0, 0.4), 0 15px 15px -5px rgba(0, 0, 0, 0.3)'
      : '0 25px 30px -5px rgba(0, 0, 0, 0.15), 0 15px 15px -5px rgba(0, 0, 0, 0.08)',
  },
  '@keyframes spin': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
  '& .MuiTooltip-popper': {
    zIndex: 10000,
  },
}));

const AdminFloatingHUD: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [isInMaintenance, setIsInMaintenance] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isHidden, setIsHidden] = useState(false);
  const [logStats, setLogStats] = useState<LogStats>({ total: 0, errors: 0, warnings: 0, isMonitoring: false });
  const [logIssues, setLogIssues] = useState<LogEntry[]>([]);
  const [isArchiving, setIsArchiving] = useState(false);
  const hudRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // OMAI state
  const [isExpanded, setIsExpanded] = useState(false);
  const [omaiTab, setOmaiTab] = useState(0);
  const [omaiConnected, setOmaiConnected] = useState(false);
  const [omaiHealth, setOmaiHealth] = useState<OmaiHealth | null>(null);
  const [omaiBriefing, setOmaiBriefing] = useState<OmaiBriefing | null>(null);
  const [omaiTasks, setOmaiTasks] = useState<OmaiTaskItem[]>([]);
  const [omaiTaskStats, setOmaiTaskStats] = useState<OmaiTaskStats | null>(null);
  const [omaiLogsSummary, setOmaiLogsSummary] = useState<OmaiLogsSummary | null>(null);
  const [omaiLogPatterns, setOmaiLogPatterns] = useState<OmaiLogPattern[]>([]);
  const [commandInput, setCommandInput] = useState('');
  const [commandResult, setCommandResult] = useState('');
  const [isCommandRunning, setIsCommandRunning] = useState(false);

  const LEAK_THRESHOLD = 1.1;

  // Existing status polling
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await axios.get('/api/system/status');
        setStatus(res.data);
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('HUD Fetch Failed', err);
        }
      }
    };

    const fetchSessionStats = async () => {
      try {
        const res = await axios.get('/api/admin/session-stats');
        const data = res.data;
        const totalSessions = data.stats?.totalSessions || 0;
        const uniqueUsers = data.stats?.uniqueUsers || 1;
        const ratio = uniqueUsers > 0 ? totalSessions / uniqueUsers : 0;
        setSessionStats({
          totalSessions,
          uniqueUsers,
          ratio,
          health: data.stats?.health || 'unknown'
        });
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Session stats fetch failed', err);
        }
      }
    };

    const fetchMaintenanceStatus = async () => {
      try {
        const res = await axios.get('/api/maintenance/status');
        setIsInMaintenance(res.data.enabled || false);
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Maintenance status fetch failed', err);
        }
      }
    };

    fetchStatus();
    fetchSessionStats();
    fetchMaintenanceStatus();

    const statusInterval = setInterval(fetchStatus, 10000);
    const sessionInterval = setInterval(fetchSessionStats, 30000);
    const maintenanceInterval = setInterval(fetchMaintenanceStatus, 15000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(sessionInterval);
      clearInterval(maintenanceInterval);
    };
  }, []);

  // Socket.IO connection for real-time log monitoring
  useEffect(() => {
    const socket = io('/admin', {
      path: '/socket.io/',
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[AdminHUD] Socket.IO connected');
      socket.emit('request-stats');
      socket.emit('request-buffer');
    });

    socket.on('log-alert', (logEntry: LogEntry) => {
      setLogIssues(prev => [...prev, logEntry]);
    });

    socket.on('log-stats', (stats: LogStats) => {
      setLogStats(stats);
    });

    socket.on('log-buffer', (buffer: LogEntry[]) => {
      setLogIssues(buffer);
    });

    socket.on('disconnect', () => {
      console.log('[AdminHUD] Socket.IO disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // OMAI always-on polling (connection check + health indicators)
  useEffect(() => {
    const pollOmai = async () => {
      try {
        await axios.get('/omai/status', { timeout: 5000 });
        setOmaiConnected(true);
      } catch {
        setOmaiConnected(false);
      }

      try {
        const res = await axios.get('/omai/briefing/health', { timeout: 5000 });
        if (res.data?.success) {
          setOmaiHealth(res.data.data);
        }
      } catch {
        // health fetch failed silently
      }
    };

    pollOmai();
    const interval = setInterval(pollOmai, 30000);
    return () => clearInterval(interval);
  }, []);

  // OMAI on-demand data fetching when tab changes
  const fetchOmaiTabData = useCallback(async (tab: number) => {
    try {
      if (tab === 0) {
        // Health tab - fetch today's briefing
        const res = await axios.get('/omai/briefing/today', { timeout: 5000 });
        if (res.data?.success) setOmaiBriefing(res.data.data);
      } else if (tab === 1) {
        // Tasks tab
        const [queueRes, statsRes] = await Promise.all([
          axios.get('/omai/tasks/queue?limit=10', { timeout: 5000 }),
          axios.get('/omai/tasks/stats', { timeout: 5000 }),
        ]);
        if (queueRes.data?.success) setOmaiTasks(queueRes.data.data);
        if (statsRes.data?.success) setOmaiTaskStats(statsRes.data.data);
      } else if (tab === 2) {
        // Logs tab
        const [summaryRes, patternsRes] = await Promise.all([
          axios.get('/omai/logs/summary', { timeout: 5000 }),
          axios.get('/omai/logs/patterns?hours=24', { timeout: 5000 }),
        ]);
        if (summaryRes.data?.success) setOmaiLogsSummary(summaryRes.data.data);
        if (patternsRes.data?.success) setOmaiLogPatterns(patternsRes.data.data.patterns || []);
      }
    } catch (err) {
      console.error('[AdminHUD] OMAI tab data fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    if (isExpanded) {
      fetchOmaiTabData(omaiTab);
    }
  }, [isExpanded, omaiTab, fetchOmaiTabData]);

  // Command handler for Tools tab
  const handleCommand = async () => {
    if (!commandInput.trim() || isCommandRunning) return;
    setIsCommandRunning(true);
    setCommandResult('Running...');

    const input = commandInput.trim();
    const parts = input.split(/\s+/);
    const action = parts[0].toLowerCase();
    const rest = parts.slice(1).join(' ');

    try {
      let res;
      switch (action) {
        case 'sql':
          res = await axios.get('/omai/db/query', { params: { sql: rest }, timeout: 15000 });
          break;
        case 'grep':
          const grepParts = rest.split(/\s+/);
          const pattern = grepParts[0] || '';
          const dir = grepParts[1] || '';
          res = await axios.get('/omai/search/grep', { params: { pattern, dir: dir || undefined }, timeout: 15000 });
          break;
        case 'preflight':
          res = await axios.get('/omai/deploy/preflight', { timeout: 15000 });
          break;
        case 'diff':
          res = await axios.get('/omai/deploy/diff', { timeout: 15000 });
          break;
        case 'tables':
          res = await axios.get('/omai/db/tables', { params: { database: rest || undefined }, timeout: 10000 });
          break;
        case 'schema':
          res = await axios.get(`/omai/db/schema/${rest}`, { timeout: 10000 });
          break;
        case 'health':
          res = await axios.get('/omai/briefing/health', { timeout: 5000 });
          break;
        case 'ocr':
          res = await axios.get('/omai/ocr/stats', { timeout: 10000 });
          break;
        case 'weekly':
          res = await axios.get('/omai/briefing/weekly', { timeout: 10000 });
          break;
        default:
          setCommandResult(`Unknown command: ${action}\nAvailable: sql, grep, preflight, diff, tables, schema, health, ocr, weekly`);
          setIsCommandRunning(false);
          return;
      }
      setCommandResult(JSON.stringify(res.data?.data || res.data, null, 2));
    } catch (err: any) {
      setCommandResult(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsCommandRunning(false);
    }
  };

  const handleClaimTask = async (taskId: number) => {
    try {
      await axios.post(`/omai/tasks/${taskId}/claim`);
      fetchOmaiTabData(1);
    } catch (err) {
      console.error('[AdminHUD] Task claim failed:', err);
    }
  };

  const handleArchiveLogs = async () => {
    setIsArchiving(true);
    try {
      const res = await axios.post('/api/admin/logs/archive', {
        logEntries: logIssues
      });

      if (res.data.success) {
        setLogIssues([]);
        setLogStats({ total: 0, errors: 0, warnings: 0, isMonitoring: logStats.isMonitoring });
        console.log(`[AdminHUD] Archived ${res.data.archived} logs to ${res.data.file}`);
      }
    } catch (err) {
      console.error('[AdminHUD] Failed to archive logs:', err);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!hudRef.current) return;

    const rect = hudRef.current.getBoundingClientRect();
    setOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - offset.x;
    const newY = e.clientY - offset.y;

    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setTimeout(() => {
      setIsDragging(false);
    }, 50);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, offset]);

  const handleSyncTasks = async () => {
    try {
      await axios.post('/api/admin/sync-tasks');
      alert('Export to Sheets initiated');
    } catch (err) {
      console.error('Sync failed:', err);
      alert('Export failed - check console');
    }
  };

  const toggleMaintenanceMode = async (enable: boolean) => {
    setIsToggling(true);
    try {
      const res = await axios.post('/api/maintenance/toggle', { enabled: enable });
      setIsInMaintenance(res.data.enabled);
    } catch (err) {
      console.error('Failed to toggle maintenance mode:', err);
      alert('Failed to toggle maintenance mode');
    } finally {
      setIsToggling(false);
    }
  };

  if (!status) return null;

  // Show toggle button when hidden
  if (isHidden) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 80,
          right: 16,
          zIndex: 9999,
        }}
      >
        <Button
          onClick={() => setIsHidden(false)}
          variant="contained"
          size="small"
          sx={{
            minWidth: 'auto',
            px: 1.5,
            py: 0.5,
            fontSize: '10px',
            fontWeight: 700,
            backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#2563eb' : '#3b82f6',
            color: '#fff',
            textTransform: 'none',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            '&:hover': {
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1d4ed8' : '#2563eb',
            },
          }}
        >
          Show HUD
        </Button>
      </Box>
    );
  }

  const hudStyle = position.x !== 0 || position.y !== 0
    ? {
        left: position.x,
        top: position.y,
        right: 'auto',
        bottom: 'auto',
      }
    : {};

  const serviceCount = omaiHealth
    ? Object.values(omaiHealth.services).filter(s => s === 'active').length
    : 0;
  const serviceTotal = omaiHealth ? Object.keys(omaiHealth.services).length : 0;
  const errorCount = omaiHealth?.errors?.lastHour ?? 0;
  const queueCount = omaiTaskStats?.byStatus?.todo ?? 0;

  // Priority color helper
  const priorityColor = (p: string) => {
    switch (p) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#22c55e';
      default: return '#94a3b8';
    }
  };

  // Render OMAI expanded panel content
  const renderOmaiPanel = () => {
    return (
      <Box sx={{ mt: 1.5 }}>
        <Tabs
          value={omaiTab}
          onChange={(_, v) => setOmaiTab(v)}
          variant="fullWidth"
          sx={{
            minHeight: 28,
            '& .MuiTab-root': {
              minHeight: 28,
              fontSize: '9px',
              fontWeight: 600,
              textTransform: 'none',
              py: 0.5,
              px: 1,
              color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b',
            },
            '& .Mui-selected': {
              color: '#3b82f6 !important',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#3b82f6',
              height: 2,
            },
          }}
        >
          <Tab label="Health" />
          <Tab label="Tasks" />
          <Tab label="Logs" />
          <Tab label="Tools" />
        </Tabs>

        <Box sx={{ mt: 1.5, maxHeight: 350, overflowY: 'auto', pr: 0.5 }}>
          {/* Health Tab */}
          {omaiTab === 0 && (
            <Box>
              {/* Overall status */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b' }}>
                  System:
                </Typography>
                <Chip
                  label={(omaiHealth?.overall || 'unknown').toUpperCase()}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '9px',
                    fontWeight: 700,
                    backgroundColor: omaiHealth?.overall === 'healthy' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: omaiHealth?.overall === 'healthy' ? '#22c55e' : '#ef4444',
                  }}
                />
              </Box>

              {/* Services */}
              {omaiHealth?.services && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b', display: 'block', mb: 0.5 }}>
                    Services:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {Object.entries(omaiHealth.services).map(([name, s]) => (
                      <Typography key={name} variant="caption" sx={{ fontSize: '10px', color: s === 'active' ? '#22c55e' : '#ef4444' }}>
                        {name} {s === 'active' ? '\u2713' : '\u2717'}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Disk & Memory */}
              {omaiHealth?.disk && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b' }}>
                    Disk:
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#fff' : '#1e293b' }}>
                    {omaiHealth.disk.percent} ({omaiHealth.disk.avail} free)
                  </Typography>
                </Box>
              )}
              {omaiHealth?.memory && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b' }}>
                    Memory:
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#fff' : '#1e293b' }}>
                    {(Number(omaiHealth.memory.availableMB) / 1024).toFixed(1)}GB avail
                  </Typography>
                </Box>
              )}

              {/* Errors */}
              {omaiHealth?.errors && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b' }}>
                    Errors:
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '10px', color: omaiHealth.errors.lastHour > 0 ? '#ef4444' : '#22c55e' }}>
                    {omaiHealth.errors.lastHour} (1h) / {omaiHealth.errors.last24h} (24h)
                  </Typography>
                </Box>
              )}

              {/* Today's briefing */}
              {omaiBriefing?.summary && (
                <Box sx={{ mt: 1, pt: 1, borderTop: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
                  <Typography variant="caption" sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b', display: 'block', mb: 0.5 }}>
                    Today:
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#fff' : '#1e293b' }}>
                    {omaiBriefing.summary.commits} commits, {omaiBriefing.summary.tasksCreated} tasks, {omaiBriefing.summary.errorsToday} errors
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Tasks Tab */}
          {omaiTab === 1 && (
            <Box>
              {/* Stats row */}
              {omaiTaskStats && (
                <Box sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', gap: 2, mb: 0.5 }}>
                    {Object.entries(omaiTaskStats.byStatus).map(([s, count]) => (
                      <Typography key={s} variant="caption" sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#fff' : '#1e293b' }}>
                        <span style={{ color: '#94a3b8', textTransform: 'capitalize' }}>{s}:</span> {count}
                      </Typography>
                    ))}
                  </Box>
                  <Typography variant="caption" sx={{ fontSize: '10px', color: '#94a3b8' }}>
                    Completed (7d): {omaiTaskStats.completedLast7Days}
                  </Typography>
                </Box>
              )}

              {/* Queue */}
              <Typography variant="caption" sx={{ fontSize: '9px', fontWeight: 700, color: (theme) => theme.palette.mode === 'dark' ? '#60a5fa' : '#3b82f6', display: 'block', mb: 1 }}>
                QUEUE (TOP 10)
              </Typography>
              {omaiTasks.length === 0 && (
                <Typography variant="caption" sx={{ fontSize: '10px', color: '#94a3b8' }}>No tasks in queue</Typography>
              )}
              {omaiTasks.map((task) => (
                <Box
                  key={task.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    mb: 0.75,
                    py: 0.5,
                    px: 0.75,
                    borderRadius: 1,
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  }}
                >
                  <Chip
                    label={task.priority}
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: '8px',
                      fontWeight: 700,
                      backgroundColor: `${priorityColor(task.priority)}22`,
                      color: priorityColor(task.priority),
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '9px',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: (theme) => theme.palette.mode === 'dark' ? '#fff' : '#1e293b',
                    }}
                  >
                    {task.title}
                  </Typography>
                  {!task.assigned_to && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleClaimTask(task.id); }}
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '8px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        backgroundColor: 'transparent',
                        color: '#3b82f6',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        flexShrink: 0,
                      }}
                    >
                      Claim
                    </button>
                  )}
                </Box>
              ))}
            </Box>
          )}

          {/* Logs Tab */}
          {omaiTab === 2 && (
            <Box>
              {omaiLogsSummary && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="caption" sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b' }}>
                      Status:
                    </Typography>
                    <Chip
                      label={omaiLogsSummary.status.toUpperCase()}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '9px',
                        fontWeight: 700,
                        backgroundColor: omaiLogsSummary.status === 'healthy' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: omaiLogsSummary.status === 'healthy' ? '#22c55e' : '#ef4444',
                      }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#fff' : '#1e293b', display: 'block', mb: 1 }}>
                    24h: {omaiLogsSummary.last24h.total_24h} total / {omaiLogsSummary.last24h.errors_24h} errors / {omaiLogsSummary.last24h.warnings_24h} warnings
                  </Typography>
                </>
              )}

              {/* Patterns */}
              <Typography variant="caption" sx={{ fontSize: '9px', fontWeight: 700, color: (theme) => theme.palette.mode === 'dark' ? '#60a5fa' : '#3b82f6', display: 'block', mb: 1 }}>
                RECURRING PATTERNS
              </Typography>
              {omaiLogPatterns.length === 0 && (
                <Typography variant="caption" sx={{ fontSize: '10px', color: '#94a3b8' }}>No recurring patterns detected</Typography>
              )}
              {omaiLogPatterns.map((p, i) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontSize: '9px', color: (theme) => theme.palette.mode === 'dark' ? '#fff' : '#1e293b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.pattern}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '9px', color: '#94a3b8', flexShrink: 0, ml: 1 }}>
                    x{p.count}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Tools Tab */}
          {omaiTab === 3 && (
            <Box>
              <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                <TextField
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCommand(); }}
                  placeholder="sql SELECT ... | grep pattern"
                  size="small"
                  variant="outlined"
                  fullWidth
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontSize: '10px',
                      height: 28,
                      color: (theme) => theme.palette.mode === 'dark' ? '#fff' : '#1e293b',
                      '& fieldset': {
                        borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                      },
                    },
                    '& .MuiOutlinedInput-input': {
                      padding: '4px 8px',
                      cursor: 'text',
                    },
                  }}
                />
                <Button
                  onClick={(e) => { e.stopPropagation(); handleCommand(); }}
                  disabled={isCommandRunning || !commandInput.trim()}
                  size="small"
                  variant="contained"
                  sx={{
                    minWidth: 40,
                    height: 28,
                    fontSize: '9px',
                    fontWeight: 700,
                    backgroundColor: '#2563eb',
                    textTransform: 'none',
                    px: 1,
                  }}
                >
                  {isCommandRunning ? '...' : 'Run'}
                </Button>
              </Box>

              {/* Quick buttons */}
              <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                {[
                  { label: 'health', cmd: 'health' },
                  { label: 'preflight', cmd: 'preflight' },
                  { label: 'diff', cmd: 'diff' },
                  { label: 'tables', cmd: 'tables' },
                  { label: 'ocr', cmd: 'ocr' },
                  { label: 'weekly', cmd: 'weekly' },
                ].map((btn) => (
                  <button
                    key={btn.cmd}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCommandInput(btn.cmd);
                      // Auto-run
                      setCommandInput(btn.cmd);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setCommandInput(btn.cmd);
                      // We'll set it and let user press Run or Enter
                    }}
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                      color: '#60a5fa',
                      border: '1px solid rgba(96, 165, 250, 0.3)',
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
              </Box>

              {/* Result area */}
              {commandResult && (
                <Box
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  sx={{
                    maxHeight: 250,
                    overflowY: 'auto',
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
                    borderRadius: 1,
                    p: 1,
                    cursor: 'text',
                    userSelect: 'text',
                  }}
                >
                  <Typography
                    variant="caption"
                    component="pre"
                    sx={{
                      fontSize: '9px',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      color: (theme) => theme.palette.mode === 'dark' ? '#e2e8f0' : '#334155',
                      margin: 0,
                    }}
                  >
                    {commandResult}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <DraggableHUD
      ref={hudRef}
      onMouseDown={handleMouseDown}
      sx={{
        ...hudStyle,
        width: isExpanded ? 560 : 280,
        border: (theme) => status.version_mismatch
          ? '2px solid #ef4444'
          : `2px solid ${theme.palette.mode === 'dark' ? '#3b82f6' : '#60a5fa'}`,
        backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1a1a2e' : '#ffffff',
        color: (theme) => theme.palette.mode === 'dark' ? '#ffffff' : '#1e293b',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          pb: 1,
          mb: 2,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            fontSize: '10px',
            color: (theme) => theme.palette.mode === 'dark' ? '#60a5fa' : '#3b82f6',
            letterSpacing: '0.5px',
          }}
        >
          SUPER ADMIN HUD
        </Typography>

        <Tooltip title="Hide HUD" arrow>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsHidden(true);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 4px',
              fontSize: '12px',
              opacity: 0.6,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
          >
            ✕
          </button>
        </Tooltip>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {/* Session Health Indicator */}
          {sessionStats && (
            <Tooltip
              title={
                sessionStats.ratio > LEAK_THRESHOLD
                  ? `Session Leak (${sessionStats.totalSessions}/${sessionStats.uniqueUsers} = ${sessionStats.ratio.toFixed(2)})`
                  : `Healthy (${sessionStats.totalSessions}/${sessionStats.uniqueUsers})`
              }
              arrow
              PopperProps={{
                sx: { zIndex: 10000 }
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  bgcolor: sessionStats.ratio > LEAK_THRESHOLD
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(34, 197, 94, 0.2)',
                  cursor: 'help',
                }}
              >
                <Activity
                  size={12}
                  style={{
                    color: sessionStats.ratio > LEAK_THRESHOLD ? '#ef4444' : '#22c55e',
                  }}
                />
              </Box>
            </Tooltip>
          )}

          {/* LIVE/MAINT Status */}
          <Tooltip
            title={isInMaintenance ? 'Disable Maintenance' : 'Enable Maintenance'}
            arrow
            PopperProps={{
              sx: { zIndex: 10000 }
            }}
          >
            <button
              onClick={() => toggleMaintenanceMode(!isInMaintenance)}
              disabled={isToggling}
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '9px',
                fontWeight: '600',
                letterSpacing: '0.5px',
                cursor: isToggling ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: isInMaintenance ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
                color: isInMaintenance ? '#f97316' : '#22c55e',
                border: `1.5px solid ${isInMaintenance ? 'rgba(249, 115, 22, 0.5)' : 'rgba(34, 197, 94, 0.4)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: isToggling ? 0.6 : 1,
              }}
            >
              <Wrench size={10} style={{ animation: isToggling || isInMaintenance ? 'spin 1s linear infinite' : 'none' }} />
              {isInMaintenance ? 'MAINT' : 'LIVE'}
            </button>
          </Tooltip>

          {status.version_mismatch && (
            <Chip
              label="MISMATCH"
              size="small"
              sx={{
                height: 16,
                fontSize: '8px',
                fontWeight: 700,
                backgroundColor: '#dc2626',
                color: '#fff',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                },
              }}
            />
          )}
        </Box>
      </Box>

      {/* Status Info */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b', fontSize: '11px' }}>
            Ver:
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 500, color: (theme) => theme.palette.mode === 'dark' ? '#ffffff' : '#1e293b' }}>
            {status.version_string || 'N/A'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b', fontSize: '11px' }}>
            SHA:
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: '9px',
              fontFamily: 'monospace',
              color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#475569',
            }}
          >
            {status.last_git_sha?.substring(0, 8) || 'N/A'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b', fontSize: '11px' }}>
            Churches:
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#22c55e',
            }}
          >
            {status.church_count || 0}
          </Typography>
        </Box>

        {status.environment && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b', fontSize: '11px' }}>
              Env:
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 500, color: (theme) => theme.palette.mode === 'dark' ? '#ffffff' : '#1e293b' }}>
              {status.environment}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Backend Monitor */}
      <Box sx={{
        mb: 2,
        pt: 1.5,
        borderTop: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
      }}>
        <Typography
          variant="caption"
          sx={{
            color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b',
            fontSize: '10px',
            fontWeight: 600,
            mb: 1,
            display: 'block'
          }}
        >
          BACKEND MONITOR
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {/* orthodox-backend Status Pill */}
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.5,
              py: 0.5,
              borderRadius: '12px',
              background: logStats.isMonitoring
                ? 'linear-gradient(135deg, #1ED760 0%, #17b350 100%)'
                : 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 600,
              flex: 1,
            }}
          >
            <span>orthodox-backend</span>

            {/* Floating Counter Badge */}
            {logStats.total > 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  bgcolor: '#17b350',
                  border: '2px solid #fff',
                  borderRadius: '10px',
                  px: 0.75,
                  py: 0.25,
                  fontSize: '9px',
                  fontWeight: 700,
                  minWidth: '18px',
                  textAlign: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
              >
                {logStats.total}
              </Box>
            )}
          </Box>

          {/* Archive Button */}
          <Tooltip title="Archive logs to file" arrow>
            <button
              onClick={handleArchiveLogs}
              disabled={isArchiving || logStats.total === 0}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '9px',
                fontWeight: 600,
                letterSpacing: '0.5px',
                cursor: isArchiving || logStats.total === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: 'transparent',
                color: '#64748b',
                border: '1px solid rgba(100, 116, 139, 0.3)',
                opacity: isArchiving || logStats.total === 0 ? 0.5 : 1,
              }}
            >
              {isArchiving ? '...' : 'ARCHIVE'}
            </button>
          </Tooltip>
        </Box>

        {/* Error/Warning Stats */}
        {logStats.total > 0 && (
          <Box sx={{ display: 'flex', gap: 1, fontSize: '10px' }}>
            {logStats.errors > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AlertCircle size={12} style={{ color: '#ef4444' }} />
                <Typography variant="caption" sx={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>
                  {logStats.errors} error{logStats.errors !== 1 ? 's' : ''}
                </Typography>
              </Box>
            )}
            {logStats.warnings > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AlertCircle size={12} style={{ color: '#f59e0b' }} />
                <Typography variant="caption" sx={{ fontSize: '10px', color: '#f59e0b', fontWeight: 600 }}>
                  {logStats.warnings} warning{logStats.warnings !== 1 ? 's' : ''}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Actions */}
      <Box sx={{ pt: 1.5, borderTop: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` }}>
        <Button
          onClick={handleSyncTasks}
          fullWidth
          variant="contained"
          size="small"
          sx={{
            py: 0.5,
            fontSize: '10px',
            fontWeight: 700,
            backgroundColor: '#2563eb',
            color: '#fff',
            textTransform: 'none',
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: '#1d4ed8',
              boxShadow: 'none',
            },
          }}
        >
          EXPORT TO SHEETS
        </Button>
      </Box>

      {/* OMAI Section */}
      <Box
        sx={{
          mt: 1.5,
          pt: 1.5,
          borderTop: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        }}
      >
        {/* OMAI compact bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: '10px',
                color: (theme) => theme.palette.mode === 'dark' ? '#a78bfa' : '#7c3aed',
                letterSpacing: '0.5px',
              }}
            >
              OMAI
            </Typography>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: omaiConnected ? '#22c55e' : '#ef4444',
                boxShadow: omaiConnected ? '0 0 6px rgba(34, 197, 94, 0.5)' : '0 0 6px rgba(239, 68, 68, 0.5)',
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {omaiConnected && omaiHealth && (
              <Typography variant="caption" sx={{ fontSize: '9px', color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b' }}>
                {serviceCount}/{serviceTotal} | Err: {errorCount} | Q: {queueCount}
              </Typography>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                borderRadius: '4px',
                cursor: 'pointer',
                padding: '2px 6px',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '9px',
                fontWeight: 600,
                color: '#7c3aed',
                transition: 'all 0.2s',
              }}
            >
              {isExpanded ? (
                <>
                  <ChevronDown size={10} />
                  <span>collapse</span>
                </>
              ) : (
                <>
                  <ChevronRight size={10} />
                  <span>expand</span>
                </>
              )}
            </button>
          </Box>
        </Box>

        {/* Expanded OMAI panel */}
        {isExpanded && omaiConnected && renderOmaiPanel()}
        {isExpanded && !omaiConnected && (
          <Box sx={{ mt: 1, py: 1, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '10px', color: '#ef4444' }}>
              OMAI service unreachable
            </Typography>
          </Box>
        )}
      </Box>
    </DraggableHUD>
  );
};

export default AdminFloatingHUD;
