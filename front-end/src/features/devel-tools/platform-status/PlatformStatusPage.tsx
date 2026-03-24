/**
 * PlatformStatusPage — High-signal operational dashboard
 * Displays live DB, service, and system metrics with state-driven UI
 * Auto-refreshes every 60 seconds with threshold-based alerting
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Grid,
  CircularProgress,
  IconButton,
  Tooltip,
  LinearProgress,
  Skeleton,
  useTheme,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  IconRefresh,
  IconDatabase,
  IconServer,
  IconClock,
  IconActivity,
  IconDeviceFloppy,
  IconPointFilled,
  IconAlertTriangle,
  IconTrendingUp,
  IconCpu,
  IconDeviceDesktop,
  IconCheck,
  IconX,
  IconPlayerPlay,
  IconShieldCheck,
  IconAlertCircle,
  IconUrgent,
  IconReload,
  IconFileText,
  IconPlugConnected,
  IconDatabaseExport,
} from '@tabler/icons-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import { apiClient } from '@/api/utils/axiosInstance';

// ─── Types ───────────────────────────────────────────────────────

interface DbHealth {
  status: string;
  version: string;
  uptime: string;
  uptime_seconds: number;
  connections: number;
  max_connections: number;
  latency_ms: number;
  buffer_pool_gb: number;
  buffer_pool_used_pct: number;
  slow_queries: number;
  disk_used: string;
  disk_total: string;
  disk_usage_pct: number;
  last_backup: string;
  last_backup_age_hours: number;
}

interface ServiceHealth {
  status: string;
  active_state: string;
  sub_state: string;
  uptime: string | null;
  since: string | null;
  service_name: string;
  label: string;
  health_source?: string;
}

interface SystemHealth {
  cpu_usage_pct: number;
  load_average: number[];
  cpu_count: number;
  memory_used_pct: number;
  memory_used_gb: number;
  memory_total_gb: number;
  disk_usage_pct: number;
  disk_used: string;
  disk_total: string;
}

interface BackendAlert {
  metric: string;
  severity: 'warn' | 'error';
  message: string;
  observed_value: number | string | null;
  threshold: number | string | null;
}

interface PlatformStatus {
  status: string;
  overall_status?: Severity;
  alerts?: BackendAlert[];
  timestamp: string;
  response_time_ms: number;
  database: DbHealth | null;
  services?: Record<string, ServiceHealth>;
  system?: SystemHealth | null;
  error?: string;
}

type Severity = 'ok' | 'warn' | 'error';

// ─── Threshold Logic ─────────────────────────────────────────────

function metricSeverity(metric: string, db: DbHealth): Severity {
  switch (metric) {
    case 'disk':
      return db.disk_usage_pct > 90 ? 'error' : db.disk_usage_pct > 80 ? 'warn' : 'ok';
    case 'backup':
      return (db.last_backup_age_hours < 0 || db.last_backup_age_hours > 24) ? 'error' : db.last_backup_age_hours > 12 ? 'warn' : 'ok';
    case 'connections':
      return db.connections > 180 ? 'error' : db.connections > 150 ? 'warn' : 'ok';
    case 'latency':
      return db.latency_ms > 100 ? 'error' : db.latency_ms > 50 ? 'warn' : 'ok';
    case 'buffer':
      return db.buffer_pool_used_pct > 85 ? 'warn' : 'ok';
    default:
      return 'ok';
  }
}

// ─── Time-Ago Helper ─────────────────────────────────────────────

function useTimeAgo(timestamp: string | null): string {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);
  if (!timestamp) return '';
  const diff = Math.max(0, Math.floor((now - new Date(timestamp).getTime()) / 1000));
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ${diff % 60}s ago`;
}

// ─── Constants ───────────────────────────────────────────────────

const POLL_INTERVAL_MS = 60_000;

const BCrumb = [
  { to: '/', title: 'Home' },
  { to: '/admin/control-panel', title: 'Control Panel' },
  { to: '/admin/control-panel/system-server', title: 'System & Server' },
  { to: '/admin/control-panel/system-server/server-devops', title: 'Server & DevOps' },
  { title: 'Platform Status' },
];

// ─── Severity Colors Helper ─────────────────────────────────────

function useSevColors() {
  const theme = useTheme();
  return {
    ok: theme.palette.success.main,
    warn: theme.palette.warning.main,
    error: theme.palette.error.main,
    get: (s: Severity) =>
      s === 'error' ? theme.palette.error.main :
      s === 'warn' ? theme.palette.warning.main :
      theme.palette.success.main,
  };
}

// ─── 1. Global Status Bar ────────────────────────────────────────

const STATUS_CONFIG = {
  ok:    { label: 'HEALTHY',  Icon: IconShieldCheck,  msg: 'All systems operating normally' },
  warn:  { label: 'WARNING',  Icon: IconAlertCircle,  msg: 'Some metrics need attention' },
  error: { label: 'CRITICAL', Icon: IconUrgent,       msg: 'Immediate attention required' },
} as const;

const GlobalStatusBar: React.FC<{
  severity: Severity;
  alerts: BackendAlert[];
  lastFetchedAt: string | null;
  pollActive: boolean;
  onTogglePoll: () => void;
  onRefresh: () => void;
  loading: boolean;
  responseTime?: number;
}> = ({ severity, alerts, lastFetchedAt, pollActive, onTogglePoll, onRefresh, loading, responseTime }) => {
  const theme = useTheme();
  const sev = useSevColors();
  const timeAgo = useTimeAgo(lastFetchedAt);
  const color = sev.get(severity);
  const cfg = STATUS_CONFIG[severity];

  const alertMsg = alerts.length > 0
    ? alerts[0].message + (alerts.length > 1 ? ` (+${alerts.length - 1} more)` : '')
    : cfg.msg;

  return (
    <Paper
      elevation={0}
      sx={{
        px: 2.5,
        py: 1.5,
        mb: 2,
        border: `1px solid ${alpha(color, 0.3)}`,
        borderRadius: 1.5,
        bgcolor: alpha(color, severity === 'ok' ? 0.04 : 0.08),
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box sx={{
          width: 36, height: 36, borderRadius: 1, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          bgcolor: alpha(color, 0.12), color,
        }}>
          <cfg.Icon size={20} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="subtitle2" fontWeight={800} letterSpacing={1} sx={{ color, fontSize: '0.78rem' }}>
              {cfg.label}
            </Typography>
            {alerts.length > 0 && (
              <Box sx={{
                px: 0.8, py: 0.1, borderRadius: 0.5,
                bgcolor: alpha(color, 0.15), fontSize: '0.68rem',
                fontWeight: 700, color, lineHeight: 1.4,
              }}>
                {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
              </Box>
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem', mt: 0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {alertMsg}
          </Typography>
        </Box>

        <Stack direction="row" alignItems="center" spacing={1}>
          {lastFetchedAt && (
            <Tooltip title={pollActive ? 'Auto-refresh every 60s — click to pause' : 'Paused — click to resume'}>
              <Box
                onClick={onTogglePoll}
                sx={{
                  cursor: 'pointer', px: 1, py: 0.3, borderRadius: 0.75,
                  bgcolor: alpha(theme.palette.text.primary, 0.04),
                  display: 'flex', alignItems: 'center', gap: 0.5,
                  '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.08) },
                }}
              >
                <IconPointFilled size={8} style={{ color: pollActive ? sev.ok : theme.palette.text.disabled }} />
                <Typography variant="caption" fontFamily="monospace" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                  {pollActive ? timeAgo || 'live' : 'paused'}
                </Typography>
              </Box>
            </Tooltip>
          )}
          {responseTime != null && (
            <Typography variant="caption" fontFamily="monospace" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
              {responseTime}ms
            </Typography>
          )}
          <Tooltip title="Refresh now">
            <IconButton size="small" onClick={onRefresh} disabled={loading} sx={{ p: 0.5 }}>
              {loading ? <CircularProgress size={16} /> : <IconRefresh size={16} />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
};

// ─── 2. Services Strip ──────────────────────────────────────────

const ServicesStrip: React.FC<{
  services: ServiceHealth[];
  onRestart?: (serviceName: string, label: string) => void;
  onViewLogs?: (serviceName: string, label: string) => void;
  actionInProgress?: string | null; // service_name currently being acted on
}> = ({ services, onRestart, onViewLogs, actionInProgress }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const sev = useSevColors();

  return (
    <Paper elevation={0} sx={{ p: 1.5, border: `1px solid ${isDark ? '#2a2a2a' : '#e4e4e4'}`, borderRadius: 1.5, mb: 2 }}>
      <Stack direction="row" spacing={0} sx={{ overflow: 'auto' }}>
        {services.map((s, i) => {
          const isOk = s.status === 'ok';
          const isStarting = s.status === 'starting';
          const color = isOk ? sev.ok : isStarting ? sev.warn : sev.error;

          return (
            <Box
              key={s.service_name}
              sx={{
                flex: 1, minWidth: 150, px: 1.5, py: 0.8,
                borderRight: i < services.length - 1 ? `1px solid ${isDark ? '#2a2a2a' : '#e8e8e8'}` : undefined,
                display: 'flex', alignItems: 'center', gap: 1,
              }}
            >
              <Box sx={{
                width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0,
                boxShadow: !isOk ? `0 0 6px ${alpha(color, 0.5)}` : undefined,
              }} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.78rem', lineHeight: 1.2 }}>
                  {s.label}
                </Typography>
                <Typography variant="caption" fontFamily="monospace" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                  {isOk && s.uptime ? `up ${s.uptime}` : isStarting ? 'starting...' : s.status === 'down' ? 'down' : s.status}
                </Typography>
              </Box>
              {/* Action buttons */}
              <Stack direction="row" spacing={0} sx={{ flexShrink: 0 }}>
                {actionInProgress === s.service_name && (
                  <CircularProgress size={12} sx={{ mr: 0.5 }} />
                )}
                <Tooltip title="View logs">
                  <IconButton size="small" onClick={() => onViewLogs?.(s.service_name, s.label)} sx={{ p: 0.3 }}>
                    <IconFileText size={13} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Restart service">
                  <IconButton size="small" onClick={() => onRestart?.(s.service_name, s.label)} disabled={actionInProgress === s.service_name} sx={{ p: 0.3 }}>
                    <IconReload size={13} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
};

// ─── 3. System Health Panel ─────────────────────────────────────

const SystemBar: React.FC<{
  label: string;
  value: number;
  detail: string;
  thresholds: [number, number];
  severity: Severity;
}> = ({ label, value, detail, thresholds, severity }) => {
  const theme = useTheme();
  const sev = useSevColors();
  const color = sev.get(severity);

  return (
    <Box sx={{ mb: 1.5, '&:last-child': { mb: 0 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.3 }}>
        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.78rem', color: severity !== 'ok' ? color : undefined }}>
          {label}
        </Typography>
        <Typography variant="caption" fontFamily="monospace" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
          {detail}
        </Typography>
      </Stack>
      <Box sx={{ position: 'relative' }}>
        <LinearProgress
          variant="determinate"
          value={Math.min(value, 100)}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: alpha(color, 0.1),
            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
          }}
        />
        {/* Threshold markers */}
        {thresholds.map((t, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute', top: -1, width: '1px', height: 8,
              bgcolor: alpha(i === 0 ? sev.warn : sev.error, 0.4),
              left: `${t}%`,
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

const SystemHealthPanel: React.FC<{ system: SystemHealth; overallSeverity: Severity }> = ({ system, overallSeverity }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const cpuSev: Severity = system.cpu_usage_pct > 95 ? 'error' : system.cpu_usage_pct > 85 ? 'warn' : 'ok';
  const memSev: Severity = system.memory_used_pct > 95 ? 'error' : system.memory_used_pct > 85 ? 'warn' : 'ok';
  const diskSev: Severity = system.disk_usage_pct > 90 ? 'error' : system.disk_usage_pct > 80 ? 'warn' : 'ok';

  return (
    <Paper elevation={0} sx={{ p: 2, border: `1px solid ${isDark ? '#2a2a2a' : '#e4e4e4'}`, borderRadius: 1.5, mb: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={0.8}>
          <IconDeviceDesktop size={16} color={theme.palette.text.secondary} />
          <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.8rem' }}>App VM</Typography>
        </Stack>
        <Typography variant="caption" fontFamily="monospace" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
          load {system.load_average.map(l => l.toFixed(2)).join(' / ')} &middot; {system.cpu_count} cores
        </Typography>
      </Stack>

      <SystemBar label="CPU" value={system.cpu_usage_pct} detail={`${system.cpu_usage_pct}%`} thresholds={[85, 95]} severity={cpuSev} />
      <SystemBar label="Memory" value={system.memory_used_pct} detail={`${system.memory_used_gb}G / ${system.memory_total_gb}G`} thresholds={[85, 95]} severity={memSev} />
      <SystemBar label="Disk" value={system.disk_usage_pct} detail={`${system.disk_used} / ${system.disk_total}`} thresholds={[80, 90]} severity={diskSev} />
    </Paper>
  );
};

// ─── 4. Database Section ────────────────────────────────────────

const DbMetricCell: React.FC<{
  label: string;
  value: string | number;
  sub?: string;
  severity?: Severity;
  mono?: boolean;
}> = ({ label, value, sub, severity = 'ok', mono }) => {
  const sev = useSevColors();
  const color = severity !== 'ok' ? sev.get(severity) : undefined;

  return (
    <Box sx={{ py: 0.8, px: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </Typography>
      <Typography
        variant="body1"
        fontWeight={700}
        fontFamily={mono ? 'monospace' : undefined}
        sx={{ lineHeight: 1.2, mt: 0.2, fontSize: '0.95rem', color }}
      >
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', mt: 0.1, display: 'block' }}>
          {sub}
        </Typography>
      )}
    </Box>
  );
};

const DatabaseSection: React.FC<{
  db: DbHealth;
  overallSeverity: Severity;
  onPing?: () => void;
  onBackup?: () => void;
  pingLoading?: boolean;
  backupLoading?: boolean;
}> = ({ db, overallSeverity, onPing, onBackup, pingLoading, backupLoading }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const sev = useSevColors();
  const connPct = Math.round((db.connections / db.max_connections) * 100);
  const borderColor = isDark ? '#2a2a2a' : '#e4e4e4';

  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={0.8} sx={{ mb: 1 }}>
        <IconDatabase size={16} color={theme.palette.text.secondary} />
        <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.8rem' }}>Database</Typography>
        <Typography variant="caption" fontFamily="monospace" color="text.disabled" sx={{ fontSize: '0.65rem' }}>192.168.1.241</Typography>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Test DB connection">
          <IconButton size="small" onClick={onPing} disabled={pingLoading} sx={{ p: 0.4 }}>
            {pingLoading ? <CircularProgress size={13} /> : <IconPlugConnected size={14} />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Run backup now">
          <IconButton size="small" onClick={onBackup} disabled={backupLoading} sx={{ p: 0.4 }}>
            {backupLoading ? <CircularProgress size={13} /> : <IconDatabaseExport size={14} />}
          </IconButton>
        </Tooltip>
      </Stack>

      {/* A. Operational Metrics — prominent */}
      <Paper elevation={0} sx={{
        border: `1px solid ${borderColor}`, borderRadius: 1.5, mb: 1.5, overflow: 'hidden',
        borderLeft: overallSeverity !== 'ok' && (metricSeverity('latency', db) !== 'ok' || metricSeverity('connections', db) !== 'ok' || metricSeverity('backup', db) !== 'ok')
          ? `3px solid ${sev.get(overallSeverity)}` : undefined,
      }}>
        <Box sx={{ px: 1.5, py: 0.8, bgcolor: alpha(theme.palette.text.primary, 0.02), borderBottom: `1px solid ${borderColor}` }}>
          <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.5, color: theme.palette.text.secondary }}>
            Operational
          </Typography>
        </Box>
        <Grid container>
          <Grid item xs={6} sm={3} sx={{ borderRight: { sm: `1px solid ${borderColor}` }, borderBottom: { xs: `1px solid ${borderColor}`, sm: 'none' } }}>
            <DbMetricCell label="Latency" value={`${db.latency_ms}ms`} sub="SELECT 1" severity={metricSeverity('latency', db)} mono />
          </Grid>
          <Grid item xs={6} sm={3} sx={{ borderRight: { sm: `1px solid ${borderColor}` }, borderBottom: { xs: `1px solid ${borderColor}`, sm: 'none' } }}>
            <DbMetricCell label="Connections" value={db.connections} sub={`/ ${db.max_connections} (${connPct}%)`} severity={metricSeverity('connections', db)} mono />
          </Grid>
          <Grid item xs={6} sm={3} sx={{ borderRight: { sm: `1px solid ${borderColor}` } }}>
            <DbMetricCell label="Slow Queries" value={db.slow_queries.toLocaleString()} sub="since restart" severity={db.slow_queries > 50 ? 'warn' : 'ok'} mono />
          </Grid>
          <Grid item xs={6} sm={3}>
            <DbMetricCell
              label="Backup Age"
              value={db.last_backup_age_hours >= 0 ? `${db.last_backup_age_hours}h` : 'None'}
              sub={db.last_backup !== 'none' ? db.last_backup : 'No backups'}
              severity={metricSeverity('backup', db)}
              mono
            />
          </Grid>
        </Grid>
      </Paper>

      {/* B. Informational Metrics + Resource Bars */}
      <Grid container spacing={1.5}>
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{ border: `1px solid ${borderColor}`, borderRadius: 1.5, overflow: 'hidden' }}>
            <Box sx={{ px: 1.5, py: 0.8, bgcolor: alpha(theme.palette.text.primary, 0.02), borderBottom: `1px solid ${borderColor}` }}>
              <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.5, color: theme.palette.text.secondary }}>
                Info
              </Typography>
            </Box>
            <Grid container>
              <Grid item xs={6} sx={{ borderRight: `1px solid ${borderColor}`, borderBottom: `1px solid ${borderColor}` }}>
                <DbMetricCell label="Version" value={db.version.split('-')[0]} sub={db.version.includes('-') ? db.version.split('-').slice(1).join('-') : undefined} />
              </Grid>
              <Grid item xs={6} sx={{ borderBottom: `1px solid ${borderColor}` }}>
                <DbMetricCell label="Uptime" value={db.uptime} />
              </Grid>
              <Grid item xs={6} sx={{ borderRight: `1px solid ${borderColor}` }}>
                <DbMetricCell label="Buffer Pool" value={`${db.buffer_pool_used_pct}%`} sub={`${db.buffer_pool_gb}G total`} severity={metricSeverity('buffer', db)} mono />
              </Grid>
              <Grid item xs={6}>
                <DbMetricCell label="Disk" value={`${db.disk_usage_pct}%`} sub={`${db.disk_used} / ${db.disk_total}`} severity={metricSeverity('disk', db)} mono />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper elevation={0} sx={{ p: 2, border: `1px solid ${borderColor}`, borderRadius: 1.5, height: '100%' }}>
            <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.5, color: theme.palette.text.secondary, mb: 1.5, display: 'block' }}>
              Resource Utilization
            </Typography>
            <SystemBar label="Connections" value={connPct} detail={`${db.connections} / ${db.max_connections}`} thresholds={[75, 90]} severity={metricSeverity('connections', db)} />
            <SystemBar label="Buffer Pool" value={db.buffer_pool_used_pct} detail={`${db.buffer_pool_used_pct}% of ${db.buffer_pool_gb}G`} thresholds={[85, 95]} severity={metricSeverity('buffer', db)} />
            <SystemBar label="Disk" value={db.disk_usage_pct} detail={`${db.disk_used} / ${db.disk_total}`} thresholds={[80, 90]} severity={metricSeverity('disk', db)} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

// ─── 5. Trend History ───────────────────────────────────────────

interface SnapshotMetrics {
  connections: number;
  latency_ms: number;
  disk_usage_pct: number;
  last_backup_age_hours: number;
  app_cpu_usage_pct?: number;
  app_memory_used_pct?: number;
}

interface Snapshot {
  id: number;
  overall_status: string;
  metrics: SnapshotMetrics;
  created_at: string;
}

interface TrendPoint {
  time: string;
  ts: number;
  latency_ms: number;
  connections: number;
  disk_usage_pct: number;
  backup_age_hours: number;
  app_cpu_pct: number;
  app_mem_pct: number;
}

function formatAxisTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

const TREND_CHARTS: { key: keyof Omit<TrendPoint, 'time' | 'ts'>; label: string; unit: string; color: string; warnLine: number; critLine: number }[] = [
  { key: 'latency_ms', label: 'Query Latency', unit: 'ms', color: '#5c6bc0', warnLine: 50, critLine: 100 },
  { key: 'connections', label: 'Connections', unit: '', color: '#26a69a', warnLine: 150, critLine: 180 },
  { key: 'disk_usage_pct', label: 'DB Disk', unit: '%', color: '#ef5350', warnLine: 80, critLine: 90 },
  { key: 'backup_age_hours', label: 'Backup Age', unit: 'h', color: '#ffa726', warnLine: 12, critLine: 24 },
  { key: 'app_cpu_pct', label: 'VM CPU', unit: '%', color: '#ab47bc', warnLine: 85, critLine: 95 },
  { key: 'app_mem_pct', label: 'VM Memory', unit: '%', color: '#42a5f5', warnLine: 85, critLine: 95 },
];

const TrendChart: React.FC<{
  chart: typeof TREND_CHARTS[0];
  points: TrendPoint[];
  gridColor: string;
  textColor: string;
  isDark: boolean;
}> = ({ chart, points, gridColor, textColor, isDark }) => {
  const theme = useTheme();
  const values = points.map(p => p[chart.key] as number);
  const current = values[values.length - 1] ?? 0;
  const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  const maxVal = Math.max(...values, chart.critLine * 1.1);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.3, px: 0.5 }}>
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.65rem' }}>
          {chart.label}
        </Typography>
        <Typography variant="caption" fontFamily="monospace" sx={{ fontSize: '0.65rem' }}>
          <Box component="span" fontWeight={700}>{current}{chart.unit}</Box>
          <Box component="span" color="text.disabled"> / avg {avg}{chart.unit}</Box>
        </Typography>
      </Stack>
      <Box sx={{ width: '100%', height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${chart.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chart.color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={chart.color} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            {/* Warning zone */}
            <ReferenceArea
              y1={chart.warnLine}
              y2={chart.critLine}
              fill={theme.palette.warning.main}
              fillOpacity={0.04}
              ifOverflow="visible"
            />
            {/* Critical zone */}
            <ReferenceArea
              y1={chart.critLine}
              y2={maxVal}
              fill={theme.palette.error.main}
              fillOpacity={0.04}
              ifOverflow="visible"
            />
            <XAxis
              dataKey="ts" type="number" domain={['dataMin', 'dataMax']}
              tickFormatter={formatAxisTime}
              tick={{ fontSize: 9, fill: textColor }} stroke={gridColor}
              tickLine={false} minTickGap={40}
            />
            <YAxis
              tick={{ fontSize: 9, fill: textColor }} stroke={gridColor}
              tickLine={false} axisLine={false} width={36}
              domain={[0, maxVal]}
            />
            <RechartsTooltip
              labelFormatter={(ts: number) => new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              formatter={(v: number) => [`${v}${chart.unit}`, chart.label]}
              contentStyle={{
                fontSize: 11, borderRadius: 6, padding: '4px 8px',
                border: `1px solid ${gridColor}`,
                backgroundColor: isDark ? '#1e1e1e' : '#fff',
              }}
            />
            <ReferenceLine y={chart.warnLine} stroke={theme.palette.warning.main} strokeDasharray="4 3" strokeWidth={1} />
            <ReferenceLine y={chart.critLine} stroke={theme.palette.error.main} strokeDasharray="4 3" strokeWidth={1} />
            <Area
              type="monotone" dataKey={chart.key}
              stroke={chart.color} strokeWidth={1.5}
              fill={`url(#grad-${chart.key})`}
              dot={false} activeDot={{ r: 2.5, strokeWidth: 1 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

const TrendHistory: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [points, setPoints] = useState<TrendPoint[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [histError, setHistError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<{ snapshots: Snapshot[]; hours: number; count: number }>('/platform/status/history?hours=24')
      .then((res) => {
        const snaps: Snapshot[] = res.snapshots || [];
        const sorted = [...snaps].reverse();
        setPoints(sorted.map(s => ({
          time: new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ts: new Date(s.created_at).getTime(),
          latency_ms: s.metrics?.latency_ms ?? 0,
          connections: s.metrics?.connections ?? 0,
          disk_usage_pct: s.metrics?.disk_usage_pct ?? 0,
          backup_age_hours: s.metrics?.last_backup_age_hours ?? 0,
          app_cpu_pct: s.metrics?.app_cpu_usage_pct ?? 0,
          app_mem_pct: s.metrics?.app_memory_used_pct ?? 0,
        })));
      })
      .catch((err: any) => setHistError(err?.message || 'Failed to load history'))
      .finally(() => setHistLoading(false));
  }, []);

  if (histLoading) {
    return (
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, mb: 2 }}>
        <Skeleton width={160} height={20} sx={{ mb: 1 }} />
        <Grid container spacing={1.5}>
          {[0, 1, 2, 3].map(i => (
            <Grid item xs={12} md={6} key={i}>
              <Skeleton variant="rounded" height={120} />
            </Grid>
          ))}
        </Grid>
      </Paper>
    );
  }

  if (histError) {
    return (
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">Could not load trends: {histError}</Typography>
      </Paper>
    );
  }

  if (points.length < 2) {
    return (
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={0.8}>
          <IconTrendingUp size={16} color={theme.palette.text.secondary} />
          <Typography variant="body2" color="text.secondary">
            Trends will appear after snapshots accumulate (~5 min intervals).
          </Typography>
        </Stack>
      </Paper>
    );
  }

  const activeCharts = TREND_CHARTS.filter(chart =>
    points.some(p => (p[chart.key] as number) > 0)
  );

  const gridColor = isDark ? '#2a2a2a' : '#e8e8e8';
  const textColor = theme.palette.text.secondary;

  return (
    <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, mb: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={0.8}>
          <IconTrendingUp size={16} color={theme.palette.primary.main} />
          <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.8rem' }}>24h Trends</Typography>
        </Stack>
        <Typography variant="caption" fontFamily="monospace" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
          {points.length} snapshots
        </Typography>
      </Stack>

      <Grid container spacing={1.5}>
        {activeCharts.map(chart => (
          <Grid item xs={12} md={6} key={chart.key}>
            <TrendChart chart={chart} points={points} gridColor={gridColor} textColor={textColor} isDark={isDark} />
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

// ─── 6. Action Helpers ──────────────────────────────────────────

interface ActionResult {
  status: 'success' | 'failed' | 'blocked' | 'started';
  message?: string;
  error?: string;
  reason?: string;
  remaining_seconds?: number;
}

interface ActionHistoryItem {
  id: number;
  action_type: string;
  target: string | null;
  result: string | null;
  duration_ms: number | null;
  user: string;
  timestamp: string;
}

function useActionToast() {
  const [toast, setToast] = useState<{ open: boolean; severity: 'success' | 'error' | 'warning' | 'info'; message: string }>({ open: false, severity: 'success', message: '' });
  const show = (severity: 'success' | 'error' | 'warning' | 'info', message: string) => setToast({ open: true, severity, message });
  const close = () => setToast(t => ({ ...t, open: false }));
  return { toast, show, close };
}

/** Maps action error responses to appropriate toast severity */
function handleActionError(err: any, showToast: (severity: 'success' | 'error' | 'warning', msg: string) => void, fallback: string) {
  const data = err?.response?.data;
  if (data?.status === 'blocked') {
    const msg = data.message || 'Action is temporarily blocked';
    showToast('warning', msg);
  } else {
    showToast('error', data?.message || err?.message || fallback);
  }
}

// ─── 7. Confirm Restart Dialog ──────────────────────────────────

const RestartConfirmDialog: React.FC<{
  open: boolean;
  serviceName: string;
  serviceLabel: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, serviceName, serviceLabel, loading, onConfirm, onCancel }) => {
  const isSelf = serviceName === 'orthodox-backend';
  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1, fontWeight: 700, fontSize: '1rem' }}>
        Restart {serviceLabel}?
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          This will restart the <strong>{serviceName}</strong> systemd service.
          {isSelf && ' Since this is the backend, your connection will drop momentarily.'}
        </Typography>
        <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: (t) => alpha(t.palette.warning.main, 0.08), border: (t) => `1px solid ${alpha(t.palette.warning.main, 0.2)}` }}>
          <Stack direction="row" alignItems="center" spacing={0.8}>
            <IconAlertTriangle size={14} style={{ flexShrink: 0 }} />
            <Typography variant="caption" color="warning.main" fontWeight={600} sx={{ fontSize: '0.72rem' }}>
              This may temporarily interrupt active requests.{isSelf ? ' The dashboard will lose connection until the backend is back.' : ''}
            </Typography>
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={loading} size="small">Cancel</Button>
        <Button onClick={onConfirm} disabled={loading} variant="contained" color="warning" size="small"
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <IconReload size={14} />}
        >
          {loading ? 'Restarting…' : 'Restart'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── 8. Service Logs Modal ──────────────────────────────────────

const ServiceLogsModal: React.FC<{
  open: boolean;
  serviceName: string;
  serviceLabel: string;
  onClose: () => void;
}> = ({ open, serviceName, serviceLabel, onClose }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ output: string }>(`/platform/actions/service/${serviceName}/logs?lines=200`);
      setLogs(res.output || '(empty)');
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  }, [serviceName]);

  useEffect(() => {
    if (open) fetchLogs();
  }, [open, fetchLogs]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconFileText size={18} />
          <Typography fontWeight={700} fontSize="0.95rem">{serviceLabel} Logs</Typography>
        </Stack>
        <Tooltip title="Refresh logs">
          <IconButton size="small" onClick={fetchLogs} disabled={loading}>
            {loading ? <CircularProgress size={14} /> : <IconRefresh size={14} />}
          </IconButton>
        </Tooltip>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {error && (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="error">{error}</Typography>
          </Box>
        )}
        {!error && (
          <Box
            sx={{
              fontFamily: 'monospace', fontSize: '0.72rem', lineHeight: 1.6,
              p: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              bgcolor: isDark ? '#0d0d0d' : '#f5f5f5',
              maxHeight: 500, overflow: 'auto',
              color: isDark ? '#c8c8c8' : '#333',
            }}
          >
            {loading ? 'Loading logs...' : logs}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} size="small">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── 9. Recent Activity Panel ────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  service_restart: 'Restart',
  service_logs: 'View Logs',
  database_backup: 'Backup',
  database_ping: 'DB Ping',
};

const RESULT_COLORS: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
  success: 'success',
  started: 'info',
  failed: 'error',
  blocked: 'warning',
};

function timeAgoShort(ts: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
  if (diff < 10) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const RecentActivityPanel: React.FC<{ refreshKey: number }> = ({ refreshKey }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [actions, setActions] = useState<ActionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await apiClient.get<{ actions: ActionHistoryItem[] }>('/platform/actions/history?limit=15');
      setActions(res.actions || []);
    } catch (_) {
      // silently fail — not critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch, refreshKey]);

  if (loading) {
    return (
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, mb: 2 }}>
        <Skeleton width={140} height={20} sx={{ mb: 1 }} />
        {[0, 1, 2].map(i => <Skeleton key={i} height={28} sx={{ mb: 0.5 }} />)}
      </Paper>
    );
  }

  if (actions.length === 0) return null;

  return (
    <Paper elevation={0} sx={{ p: 2, border: `1px solid ${isDark ? '#2a2a2a' : '#e4e4e4'}`, borderRadius: 1.5, mb: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={0.8}>
          <IconActivity size={16} color={theme.palette.text.secondary} />
          <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.8rem' }}>Recent Activity</Typography>
        </Stack>
        <Typography variant="caption" fontFamily="monospace" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
          {actions.length} actions
        </Typography>
      </Stack>

      <Stack spacing={0}>
        {actions.map((a) => {
          const resultColor = RESULT_COLORS[a.result || ''] || 'info';
          return (
            <Stack
              key={a.id}
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                py: 0.6, px: 0.8, borderRadius: 0.75,
                '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.03) },
              }}
            >
              <Box sx={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                bgcolor: theme.palette[resultColor].main,
              }} />
              <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.72rem', minWidth: 65 }}>
                {ACTION_LABELS[a.action_type] || a.action_type}
              </Typography>
              <Typography variant="caption" fontFamily="monospace" color="text.secondary" sx={{ fontSize: '0.68rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.target || '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', minWidth: 50, textAlign: 'right' }}>
                {a.result || '—'}
              </Typography>
              {a.duration_ms != null && (
                <Typography variant="caption" fontFamily="monospace" color="text.disabled" sx={{ fontSize: '0.62rem', minWidth: 40, textAlign: 'right' }}>
                  {a.duration_ms}ms
                </Typography>
              )}
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.62rem', minWidth: 55, textAlign: 'right' }}>
                {timeAgoShort(a.timestamp)}
              </Typography>
            </Stack>
          );
        })}
      </Stack>
    </Paper>
  );
};

// ─── Main Page ───────────────────────────────────────────────────

const PlatformStatusPage: React.FC = () => {
  const theme = useTheme();
  const [data, setData] = useState<PlatformStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [pollActive, setPollActive] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Action state
  const { toast, show: showToast, close: closeToast } = useActionToast();
  const [restartDialog, setRestartDialog] = useState<{ open: boolean; serviceName: string; label: string }>({ open: false, serviceName: '', label: '' });
  const [restartLoading, setRestartLoading] = useState(false);
  const [logsModal, setLogsModal] = useState<{ open: boolean; serviceName: string; label: string }>({ open: false, serviceName: '', label: '' });
  const [pingLoading, setPingLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  const bumpActivity = useCallback(() => setActivityRefreshKey(k => k + 1), []);

  const fetchStatus = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<PlatformStatus>('/platform/status');
      setData(res);
      setLastFetchedAt(new Date().toISOString());
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch platform status');
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  useEffect(() => {
    if (!pollActive) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    intervalRef.current = setInterval(() => fetchStatus(true), POLL_INTERVAL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [pollActive, fetchStatus]);

  // ─── Action handlers ────────────────────────────────────────────

  const handleRestart = useCallback(async () => {
    setRestartLoading(true);
    try {
      const res = await apiClient.post<ActionResult>(`/platform/actions/service/${restartDialog.serviceName}/restart`);
      const sev = res.status === 'started' ? 'info' : 'success';
      showToast(sev as any, res.message || `${restartDialog.label} restarted`);
      setRestartDialog(d => ({ ...d, open: false }));
      bumpActivity();
      // Auto-refresh status after service stabilizes
      if (restartDialog.serviceName !== 'orthodox-backend') {
        setTimeout(() => fetchStatus(true), 3000);
      }
    } catch (err: any) {
      handleActionError(err, showToast, 'Restart failed');
    } finally {
      setRestartLoading(false);
    }
  }, [restartDialog.serviceName, restartDialog.label, fetchStatus, showToast, bumpActivity]);

  const handlePing = useCallback(async () => {
    setPingLoading(true);
    try {
      const res = await apiClient.get<ActionResult & { latency_ms?: number }>('/platform/actions/database/ping');
      showToast('success', res.message || `Ping: ${res.latency_ms}ms`);
      bumpActivity();
    } catch (err: any) {
      handleActionError(err, showToast, 'Ping failed');
    } finally {
      setPingLoading(false);
    }
  }, [showToast, bumpActivity]);

  const handleBackup = useCallback(async () => {
    if (!window.confirm('Run a database backup now? This may take a minute or two.')) return;
    setBackupLoading(true);
    try {
      const res = await apiClient.post<ActionResult>('/platform/actions/database/backup');
      showToast('success', res.message || 'Backup completed');
      bumpActivity();
      setTimeout(() => fetchStatus(true), 2000);
    } catch (err: any) {
      handleActionError(err, showToast, 'Backup failed');
    } finally {
      setBackupLoading(false);
    }
  }, [showToast, fetchStatus, bumpActivity]);

  const db = data?.database;
  const services = data?.services;
  const system = data?.system;

  const alerts: BackendAlert[] = data?.alerts || [];
  const overallSeverity: Severity = data?.overall_status || (error ? 'error' : 'ok');
  const serviceList = services ? Object.values(services) : [];

  return (
    <PageContainer title="Platform Status" description="Live platform health — DB, services, and system">
      <Breadcrumb title="Platform Status" items={BCrumb} />
      <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>

        {/* 1. Global Status Bar */}
        <GlobalStatusBar
          severity={overallSeverity}
          alerts={alerts}
          lastFetchedAt={lastFetchedAt}
          pollActive={pollActive}
          onTogglePoll={() => setPollActive(p => !p)}
          onRefresh={() => fetchStatus(false)}
          loading={loading}
          responseTime={data?.response_time_ms}
        />

        {/* Connection error state */}
        {error && !db && !services && (
          <Paper elevation={0} sx={{ p: 2, mb: 2, border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`, borderRadius: 1.5, bgcolor: alpha(theme.palette.error.main, 0.04) }}>
            <Typography variant="body2" color="error" fontWeight={600}>{error}</Typography>
          </Paper>
        )}

        {/* Loading skeleton */}
        {loading && !db && !services && (
          <Stack spacing={1.5}>
            <Skeleton variant="rounded" height={50} />
            <Skeleton variant="rounded" height={80} />
            <Skeleton variant="rounded" height={120} />
          </Stack>
        )}

        {/* 2. Services Strip (with action buttons) */}
        {serviceList.length > 0 && (
          <ServicesStrip
            services={serviceList}
            onRestart={(name, label) => setRestartDialog({ open: true, serviceName: name, label })}
            onViewLogs={(name, label) => setLogsModal({ open: true, serviceName: name, label })}
            actionInProgress={restartLoading ? restartDialog.serviceName : null}
          />
        )}

        {/* 3. System Health Panel */}
        {system && <SystemHealthPanel system={system} overallSeverity={overallSeverity} />}

        {/* 4. Database Section (with action buttons) */}
        {db && (
          <DatabaseSection
            db={db}
            overallSeverity={overallSeverity}
            onPing={handlePing}
            onBackup={handleBackup}
            pingLoading={pingLoading}
            backupLoading={backupLoading}
          />
        )}

        {/* DB unreachable but services/system available */}
        {!db && data?.error && services && (
          <Paper elevation={0} sx={{ p: 2, mb: 2, border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`, borderRadius: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.04) }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconAlertTriangle size={16} color={theme.palette.warning.main} />
              <Typography variant="body2" fontWeight={600} color="warning.main">Database unreachable</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>{data.error}</Typography>
          </Paper>
        )}

        {/* 5. Trend History */}
        {(db || services) && <TrendHistory />}

        {/* 6. Recent Activity */}
        {(db || services) && <RecentActivityPanel refreshKey={activityRefreshKey} />}

        {/* Footer */}
        {(db || services) && (
          <Stack direction="row" spacing={2} justifyContent="center" sx={{ py: 0.5 }}>
            <Typography variant="caption" fontFamily="monospace" color="text.disabled" sx={{ fontSize: '0.62rem' }}>
              DB Host: 192.168.1.241
            </Typography>
            <Typography variant="caption" fontFamily="monospace" color="text.disabled" sx={{ fontSize: '0.62rem' }}>
              Polling: {pollActive ? '60s' : 'paused'}
            </Typography>
          </Stack>
        )}
      </Box>

      {/* Dialogs & Toasts */}
      <RestartConfirmDialog
        open={restartDialog.open}
        serviceName={restartDialog.serviceName}
        serviceLabel={restartDialog.label}
        loading={restartLoading}
        onConfirm={handleRestart}
        onCancel={() => !restartLoading && setRestartDialog(d => ({ ...d, open: false }))}
      />
      <ServiceLogsModal
        open={logsModal.open}
        serviceName={logsModal.serviceName}
        serviceLabel={logsModal.label}
        onClose={() => setLogsModal(d => ({ ...d, open: false }))}
      />
      <Snackbar open={toast.open} autoHideDuration={5000} onClose={closeToast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeToast} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default PlatformStatusPage;
