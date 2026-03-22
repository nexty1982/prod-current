/**
 * PlatformStatusPage — Read-only DB VM health dashboard
 * Displays live MariaDB metrics from the dedicated database server
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Grid,
  CircularProgress,
  IconButton,
  Tooltip,
  Alert,
  Chip,
  LinearProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  IconRefresh,
  IconDatabase,
  IconServer,
  IconClock,
  IconUsers,
  IconActivity,
  IconDeviceFloppy,
  IconChartBar,
} from '@tabler/icons-react';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import { apiClient } from '@/api/utils/axiosInstance';

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

interface PlatformStatus {
  status: string;
  timestamp: string;
  response_time_ms: number;
  database: DbHealth | null;
  error?: string;
}

const BCrumb = [
  { to: '/', title: 'Home' },
  { to: '/admin/control-panel', title: 'Control Panel' },
  { to: '/admin/control-panel/system-server', title: 'System & Server' },
  { to: '/admin/control-panel/system-server/server-devops', title: 'Server & DevOps' },
  { title: 'Database Status' },
];

const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  severity?: 'ok' | 'warn' | 'error';
}> = ({ icon, label, value, sub, color, severity }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const sevColor =
    severity === 'error' ? theme.palette.error.main :
    severity === 'warn' ? theme.palette.warning.main :
    color || theme.palette.success.main;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`,
        borderRadius: 2,
        borderLeft: `4px solid ${sevColor}`,
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1.5}>
        <Box sx={{ color: sevColor, mt: 0.3 }}>{icon}</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {label}
          </Typography>
          <Typography variant="h5" fontWeight={700} fontFamily="monospace" sx={{ lineHeight: 1.2, mt: 0.3 }}>
            {value}
          </Typography>
          {sub && (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem', mt: 0.3 }}>
              {sub}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
};

const UsageBar: React.FC<{ label: string; value: number; detail: string; thresholds?: [number, number] }> = ({
  label, value, detail, thresholds = [70, 90]
}) => {
  const theme = useTheme();
  const barColor =
    value >= thresholds[1] ? theme.palette.error.main :
    value >= thresholds[0] ? theme.palette.warning.main :
    theme.palette.success.main;

  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
        <Typography variant="body2" fontWeight={600}>{label}</Typography>
        <Typography variant="body2" color="text.secondary" fontFamily="monospace">{detail}</Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.min(value, 100)}
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: alpha(barColor, 0.12),
          '& .MuiLinearProgress-bar': { bgcolor: barColor, borderRadius: 4 },
        }}
      />
    </Box>
  );
};

const PlatformStatusPage: React.FC = () => {
  const theme = useTheme();
  const [data, setData] = useState<PlatformStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/platform/status');
      setData(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to fetch platform status';
      setError(msg);
      if (err?.response?.data) setData(err.response.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const db = data?.database;
  const isOk = data?.status === 'ok' && db?.status === 'ok';
  const isWarn = db && (db.disk_usage_pct > 80 || db.buffer_pool_used_pct > 90 || db.last_backup_age_hours > 12);

  const overallSeverity: 'ok' | 'warn' | 'error' = !isOk ? 'error' : isWarn ? 'warn' : 'ok';
  const statusColor =
    overallSeverity === 'error' ? theme.palette.error.main :
    overallSeverity === 'warn' ? theme.palette.warning.main :
    theme.palette.success.main;

  const connPct = db ? Math.round((db.connections / db.max_connections) * 100) : 0;

  const backupSeverity = (): 'ok' | 'warn' | 'error' => {
    if (!db || db.last_backup_age_hours < 0) return 'error';
    if (db.last_backup_age_hours > 12) return 'warn';
    return 'ok';
  };

  return (
    <PageContainer title="Database Status" description="Live MariaDB health from the dedicated DB VM">
      <Breadcrumb title="Database Status" items={BCrumb} />
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2, bgcolor: alpha(statusColor, 0.1), color: statusColor }}>
              <IconDatabase size={28} />
            </Box>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h5" fontWeight={700}>Database Status</Typography>
                {db && (
                  <Chip
                    size="small"
                    label={overallSeverity === 'ok' ? 'Healthy' : overallSeverity === 'warn' ? 'Warning' : 'Error'}
                    sx={{
                      bgcolor: alpha(statusColor, 0.12),
                      color: statusColor,
                      fontWeight: 600,
                      fontSize: '0.72rem',
                    }}
                  />
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Live metrics from 192.168.1.241 (om-db.internal)
              </Typography>
            </Box>
          </Stack>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchStatus} disabled={loading} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
              {loading ? <CircularProgress size={20} /> : <IconRefresh size={20} />}
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Error state */}
        {error && !db && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading state */}
        {loading && !db && (
          <Paper elevation={0} sx={{ p: 6, textAlign: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography color="text.secondary">Fetching database health...</Typography>
          </Paper>
        )}

        {/* Data display */}
        {db && (
          <>
            {/* Top metrics row */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  icon={<IconServer size={22} />}
                  label="MariaDB Version"
                  value={db.version.split('-')[0]}
                  sub={db.version.includes('-') ? db.version.split('-').slice(1).join('-') : undefined}
                  severity="ok"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  icon={<IconClock size={22} />}
                  label="Uptime"
                  value={db.uptime}
                  sub={`${db.uptime_seconds.toLocaleString()}s total`}
                  severity="ok"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  icon={<IconActivity size={22} />}
                  label="Query Latency"
                  value={`${db.latency_ms}ms`}
                  sub="SELECT 1 round-trip"
                  severity={db.latency_ms > 100 ? 'warn' : 'ok'}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  icon={<IconChartBar size={22} />}
                  label="Slow Queries"
                  value={db.slow_queries}
                  sub="Since last restart"
                  severity={db.slow_queries > 50 ? 'warn' : 'ok'}
                />
              </Grid>
            </Grid>

            {/* Usage bars + Backup/Connection cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Resource Utilization</Typography>
                  <UsageBar
                    label="Connections"
                    value={connPct}
                    detail={`${db.connections} / ${db.max_connections}`}
                    thresholds={[60, 85]}
                  />
                  <UsageBar
                    label="Buffer Pool"
                    value={db.buffer_pool_used_pct}
                    detail={`${db.buffer_pool_used_pct}% of ${db.buffer_pool_gb}G`}
                    thresholds={[85, 95]}
                  />
                  <UsageBar
                    label="Disk"
                    value={db.disk_usage_pct}
                    detail={`${db.disk_used} / ${db.disk_total}`}
                    thresholds={[70, 90]}
                  />
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack spacing={2} sx={{ height: '100%' }}>
                  <MetricCard
                    icon={<IconUsers size={22} />}
                    label="Active Connections"
                    value={db.connections}
                    sub={`${db.max_connections} max configured`}
                    severity={connPct > 85 ? 'error' : connPct > 60 ? 'warn' : 'ok'}
                  />
                  <MetricCard
                    icon={<IconDeviceFloppy size={22} />}
                    label="Latest Backup"
                    value={db.last_backup_age_hours >= 0 ? `${db.last_backup_age_hours}h ago` : 'None'}
                    sub={db.last_backup !== 'none' ? db.last_backup : 'No backups found'}
                    severity={backupSeverity()}
                  />
                </Stack>
              </Grid>
            </Grid>

            {/* Footer metadata */}
            <Paper elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
              <Stack direction="row" spacing={3} flexWrap="wrap" justifyContent="center">
                <Typography variant="caption" color="text.secondary">
                  Last fetched: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : '-'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Response: {data?.response_time_ms}ms
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Host: 192.168.1.241
                </Typography>
              </Stack>
            </Paper>
          </>
        )}
      </Box>
    </PageContainer>
  );
};

export default PlatformStatusPage;
