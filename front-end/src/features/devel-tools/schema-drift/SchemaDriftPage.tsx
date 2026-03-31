import {
    Alert,
    Autocomplete,
    Badge,
    Box,
    Button,
    Chip,
    CircularProgress,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    Grid,
    IconButton,
    InputLabel,
    LinearProgress,
    MenuItem,
    Paper,
    Select,
    SelectChangeEvent,
    Stack,
    Switch,
    Tab,
    Table, TableBody, TableCell,
    TableContainer,
    TableHead, TableRow,
    Tabs,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
    IconAlertTriangle,
    IconBell,
    IconCalendar,
    IconCheck,
    IconChevronDown, IconChevronUp,
    IconCode, IconCopy,
    IconDatabase,
    IconDownload,
    IconEyeOff,
    IconFilter,
    IconHistory,
    IconRefresh,
    IconSettings,
    IconShield,
    IconShieldOff,
    IconTrendingDown,
    IconTrendingUp,
    IconX
} from '@tabler/icons-react';
import axios from 'axios';
import React, { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'informational';
type ScanScope = 'all' | 'platform_only' | 'tenants_only' | 'selected';

interface DriftFinding {
  scope:          string;
  table:          string;
  column:         string | null;
  indexName?:     string;
  driftType:      string;
  severity:       Severity;
  expected:       string | null;
  actual:         string | null;
  impact:         string[];
  fix:            string | null;
  remediable:     boolean;
  manualReview:   boolean;
  manualNote?:    string;
  suppressed?:    boolean;
  suppressedBy?:  { id: number; name: string } | null;
}

interface SuppressionRule {
  id:             number;
  is_active:      number;
  name:           string;
  description:    string | null;
  scope_type:     'platform' | 'tenant' | 'all';
  target_db:      string | null;
  drift_type:     string | null;
  table_name:     string | null;
  column_name:    string | null;
  severity:       Severity | null;
  match_expected: string | null;
  match_actual:   string | null;
  created_by:     string;
  created_at:     string;
  updated_at:     string;
}

interface TenantResult {
  churchId:   number;
  churchName: string;
  dbName:     string;
  accessible: boolean;
  error:      string | null;
  findings:   DriftFinding[];
}

interface ScanSummary {
  totalFindings:       number;
  bySeverity:          Record<Severity, number>;
  byType:              Record<string, number>;
  tenantsScanned:      number;
  tenantsWithDrift:    number;
  tenantsInaccessible: number;
  templateValid:       boolean;
  templateVersion:     string | null;
  durationMs:          number;
  suppressedFindings?: number;
  activeFindings?:     number;
  suppressionRules?:   number;
}

interface ScanResult {
  jobId:        string;
  scannedAt:    string;
  templateInfo: { valid: boolean; version: string | null; frozenAt: string | null; tableCount: number; tables: string[]; reason: string | null } | null;
  platform:     { findings: DriftFinding[]; accessible: boolean; error: string | null } | null;
  tenants:      TenantResult[];
  summary:      ScanSummary;
}

interface JobStatus {
  id:          string;
  status:      'pending' | 'running' | 'complete' | 'error';
  progress:    { current: number; total: number; stage: string };
  error:       string | null;
  hasResult:   boolean;
  createdAt:   string;
  completedAt: string | null;
}

interface Church {
  id:            number;
  name:          string;
  database_name: string;
}

interface ScanRun {
  id:                    number;
  triggered_by:          string;
  scope_type:            string;
  status:                'running' | 'complete' | 'error';
  started_at:            string;
  completed_at:          string | null;
  total_findings_raw:    number;
  total_findings_active: number;
  total_suppressed:      number;
  critical_count:        number;
  high_count:            number;
  medium_count:          number;
  low_count:             number;
  informational_count:   number;
  error_message:         string | null;
}

interface ScheduleConfig {
  id:           number;
  is_enabled:   number;
  frequency:    'daily' | 'weekly';
  scope_type:   string;
  run_hour_utc: number;
  updated_by:   string | null;
  updated_at:   string;
}

interface DriftNotification {
  id:         number;
  run_id:     number;
  severity:   Severity;
  event_type: string;
  title:      string;
  body:       string | null;
  is_read:    number;
  created_at: string;
}

interface DeltaSummary {
  priorRunId:           number;
  newCount:             number;
  resolvedCount:        number;
  newCriticalCount:     number;
  newHighCount:         number;
  newFindings:          DriftFinding[];
  resolvedFindings:     DriftFinding[];
  notificationsCreated: number;
}

interface NotifConfig {
  id:                  number;
  is_enabled:          number;
  email_enabled:       number;
  webhook_enabled:     number;
  recipient_emails:    string;
  webhook_url:         string | null;
  min_severity:        'critical' | 'high';
  notify_new_critical: number;
  notify_new_high:     number;
  notify_surge:        number;
  cooldown_minutes:    number;
  updated_by:          string | null;
  updated_at:          string;
}

interface NotifDelivery {
  id:              number;
  notification_id: number | null;
  run_id:          number;
  channel:         'email' | 'webhook';
  event_type:      string;
  status:          'sent' | 'failed' | 'skipped';
  detail:          string | null;
  attempted_at:    string;
}

interface ScanLock {
  lock_key:   string;
  locked_by:  string;
  run_id:     number | null;
  locked_at:  string;
  expires_at: string;
}

interface RetentionConfig {
  id:                          number;
  retention_scan_runs_days:    number;
  retention_snapshot_days:     number;
  retention_delivery_log_days: number;
  retention_notif_days:        number;
  min_runs_to_keep:            number;
  scan_lock_ttl_minutes:       number;
  auto_cleanup_enabled:        number;
  updated_by:                  string | null;
  updated_at:                  string;
}

interface CleanupResult {
  dryRun:              boolean;
  runsDeleted:         number;
  snapshotsNulled:     number;
  deliveryLogDeleted:  number;
  notifsDeleted:       number;
  errorMessage:        string | null;
  executedAt:          string;
  config: {
    scanRunsDays:   number;
    snapshotDays:   number;
    deliveryDays:   number;
    notifDays:      number;
    minKeep:        number;
  };
}

interface CleanupHistoryEntry {
  id:                   number;
  triggered_by:         string;
  dry_run:              number;
  runs_deleted:         number;
  snapshots_nulled:     number;
  delivery_log_deleted: number;
  notifs_deleted:       number;
  error_message:        string | null;
  executed_at:          string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'informational'];

const SEVERITY_COLOR: Record<Severity, string> = {
  critical:     '#d32f2f',
  high:         '#f57c00',
  medium:       '#f9a825',
  low:          '#388e3c',
  informational:'#0288d1',
};

const DRIFT_TYPE_LABELS: Record<string, string> = {
  MISSING_TABLE:          'Missing Table',
  UNEXPECTED_TABLE:       'Unexpected Table',
  MISSING_COLUMN:         'Missing Column',
  UNEXPECTED_COLUMN:      'Unexpected Column',
  TYPE_MISMATCH:          'Type Mismatch',
  NULLABILITY_MISMATCH:   'Nullability Mismatch',
  DEFAULT_MISMATCH:       'Default Mismatch',
  PK_MISMATCH:            'PK Mismatch',
  MISSING_INDEX:          'Missing Index',
  MISSING_UNIQUE_INDEX:   'Missing Unique Index',
  ENGINE_MISMATCH:        'Engine Mismatch',
  COLLATION_MISMATCH:     'Collation Mismatch',
  TABLE_MISSING_PLATFORM: 'Missing Platform Table',
  COLUMN_MISSING_PLATFORM:'Missing Platform Column',
};

const STAGE_LABELS: Record<string, string> = {
  queued:                  'Queued',
  initializing:            'Initializing',
  loading_template:        'Loading template schema…',
  scanning_platform:       'Scanning platform DB…',
  discovering_tenants:     'Discovering tenants…',
  fetching_tenant_metadata:'Fetching tenant metadata…',
  building_findings:       'Building findings…',
  scanning_tenants:        'Scanning tenants…',
  done:                    'Complete',
  error:                   'Error',
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

function SeverityChip({ severity }: { severity: Severity }) {
  return (
    <Chip
      label={severity.charAt(0).toUpperCase() + severity.slice(1)}
      size="small"
      sx={{
        bgcolor: alpha(SEVERITY_COLOR[severity], 0.12),
        color:   SEVERITY_COLOR[severity],
        fontWeight: 700,
        fontSize: '0.7rem',
        border: `1px solid ${alpha(SEVERITY_COLOR[severity], 0.3)}`,
        minWidth: 82,
      }}
    />
  );
}

function ImpactChips({ impact }: { impact: string[] }) {
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap">
      {impact.map(a => (
        <Chip key={a} label={a} size="small" variant="outlined"
          sx={{ fontSize: '0.65rem', height: 18, color: 'text.secondary' }} />
      ))}
    </Stack>
  );
}

function SummaryCard({
  label, value, sub, color,
}: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderLeft: `4px solid ${color}`, height: '100%' }}>
      <Typography variant="h4" fontWeight={700} color={color}>{value}</Typography>
      <Typography variant="body2" fontWeight={600} mt={0.25}>{label}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Paper>
  );
}

function FindingRow({ finding, onSuppress }: { finding: DriftFinding; onSuppress?: (f: DriftFinding) => void }) {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const isSuppressed = !!finding.suppressed;

  return (
    <>
      <TableRow
        hover
        sx={{
          cursor: 'pointer',
          opacity: isSuppressed ? 0.45 : 1,
          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
        }}
        onClick={() => setOpen(o => !o)}
      >
        <TableCell sx={{ width: 32, p: 1 }}>
          {open ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        </TableCell>
        <TableCell sx={{ maxWidth: 140 }}>
          <Typography variant="caption" fontFamily="monospace" noWrap title={finding.scope}>
            {finding.scope.replace('tenant:', '').replace('platform:', 'platform')}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="caption" fontFamily="monospace">{finding.table}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="caption" fontFamily="monospace" color="text.secondary">
            {finding.column || finding.indexName || '—'}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip label={DRIFT_TYPE_LABELS[finding.driftType] || finding.driftType}
            size="small" variant="outlined"
            sx={{ fontSize: '0.65rem', fontFamily: 'monospace' }} />
        </TableCell>
        <TableCell><SeverityChip severity={finding.severity} /></TableCell>
        <TableCell><ImpactChips impact={finding.impact} /></TableCell>
        <TableCell align="center">
          <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
            {finding.manualReview
              ? <Tooltip title="Manual review required"><IconAlertTriangle size={16} color="#f57c00" /></Tooltip>
              : finding.remediable
                ? <Tooltip title="Auto-remediable"><IconCheck size={16} color="#388e3c" /></Tooltip>
                : <Tooltip title="Informational / not auto-fixed"><IconSettings size={16} color="#9e9e9e" /></Tooltip>
            }
            {isSuppressed ? (
              <Tooltip title={`Suppressed by rule: ${finding.suppressedBy?.name}`}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconEyeOff size={14} color="#9e9e9e" />
                </Box>
              </Tooltip>
            ) : onSuppress && (
              <Tooltip title="Create suppression rule for this finding">
                <IconButton
                  size="small"
                  sx={{ p: 0.25, opacity: 0.5, '&:hover': { opacity: 1 } }}
                  onClick={e => { e.stopPropagation(); onSuppress(finding); }}
                >
                  <IconShield size={13} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={8} sx={{ p: 0, border: 0 }}>
          <Collapse in={open} unmountOnExit>
            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.grey[500], 0.04), borderBottom: '1px solid', borderColor: 'divider' }}>
              <Grid container spacing={2}>
                {finding.expected && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Expected</Typography>
                    <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all', mt: 0.25 }}>
                      {finding.expected}
                    </Typography>
                  </Grid>
                )}
                {finding.actual && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Actual</Typography>
                    <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all', mt: 0.25 }}>
                      {finding.actual}
                    </Typography>
                  </Grid>
                )}
                {finding.fix && (
                  <Grid size={12}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Suggested Fix</Typography>
                    <Typography variant="body2" fontFamily="monospace"
                      sx={{ mt: 0.25, p: 1, bgcolor: alpha(theme.palette.success.main, 0.07),
                        borderRadius: 1, border: '1px solid', borderColor: alpha(theme.palette.success.main, 0.2),
                        wordBreak: 'break-all' }}>
                      {finding.fix}
                    </Typography>
                  </Grid>
                )}
                {finding.manualNote && (
                  <Grid size={12}>
                    <Alert severity="warning" sx={{ py: 0.5 }}>
                      <Typography variant="caption">{finding.manualNote}</Typography>
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SchemaDriftPage() {
  const theme = useTheme();

  // Scan config
  const [scanScope, setScanScope]               = useState<ScanScope>('all');
  const [churches, setChurches]                 = useState<Church[]>([]);
  const [selectedChurches, setSelectedChurches] = useState<Church[]>([]);

  // Job state
  const [activeJob, setActiveJob]         = useState<JobStatus | null>(null);
  const [scanResult, setScanResult]       = useState<ScanResult | null>(null);
  const [annotatedResult, setAnnotatedResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning]           = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Suppression state
  const [showMode, setShowMode]                   = useState<'raw' | 'filtered'>('raw');
  const [filterSuppressed, setFilterSuppressed]   = useState<'all' | 'active' | 'suppressed'>('all');
  const [suppressionRules, setSuppressionRules]   = useState<SuppressionRule[]>([]);
  const [suppressDialogOpen, setSuppressDialogOpen] = useState(false);
  const [suppressDialogFinding, setSuppressDialogFinding] = useState<DriftFinding | null>(null);
  const [rulesOpen, setRulesOpen]                 = useState(false);

  // Filters
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [filterDriftType, setFilterDriftType] = useState<string>('');
  const [filterTable, setFilterTable]         = useState<string>('');
  const [filterTenant, setFilterTenant]       = useState<string>('');
  const [groupBy, setGroupBy]                 = useState<'none' | 'tenant' | 'table' | 'severity' | 'driftType'>('tenant');

  // Phase 4: History / Schedule / Notifications
  const [scanRuns, setScanRuns]               = useState<ScanRun[]>([]);
  const [scheduleConfig, setScheduleConfig]   = useState<ScheduleConfig | null>(null);
  const [scheduleOpen, setScheduleOpen]       = useState(false);
  const [notifications, setNotifications]     = useState<DriftNotification[]>([]);
  const [unreadCount, setUnreadCount]         = useState(0);
  const [notifOpen, setNotifOpen]             = useState(false);
  const [currentRunId, setCurrentRunId]       = useState<number | null>(null);
  const [currentDelta, setCurrentDelta]       = useState<DeltaSummary | null>(null);
  const [deltaLoading, setDeltaLoading]       = useState(false);
  const [activeTab, setActiveTab]             = useState(0);

  // Phase 5: Notification delivery config + delivery log
  const [notifConfig, setNotifConfig]         = useState<NotifConfig | null>(null);
  const [notifConfigOpen, setNotifConfigOpen] = useState(false);
  const [deliveries, setDeliveries]           = useState<NotifDelivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  // Phase 6: Maintenance panel
  const [maintenanceOpen, setMaintenanceOpen]         = useState(false);
  const [lockStatus, setLockStatus]                   = useState<{ lock: ScanLock | null; isLocked: boolean; isStale: boolean } | null>(null);
  const [retentionConfig, setRetentionConfig]         = useState<RetentionConfig | null>(null);
  const [retentionDraft, setRetentionDraft]           = useState<Partial<RetentionConfig>>({});
  const [cleanupResult, setCleanupResult]             = useState<CleanupResult | null>(null);
  const [cleanupHistory, setCleanupHistory]           = useState<CleanupHistoryEntry[]>([]);
  const [cleanupRunning, setCleanupRunning]           = useState(false);
  const [maintenanceTab, setMaintenanceTab]           = useState(0);

  // SQL dialog
  const [sqlOpen, setSqlOpen]       = useState(false);
  const [sqlContent, setSqlContent] = useState('');
  const [sqlTarget, setSqlTarget]   = useState('');
  const [sqlLoading, setSqlLoading] = useState(false);
  const [copied, setCopied]         = useState(false);

  const loadScanHistory = useCallback(() => {
    axios.get('/api/admin/schema-drift/scans')
      .then(r => setScanRuns(r.data.runs || []))
      .catch(() => {});
  }, []);

  const loadScheduleConfig = useCallback(() => {
    axios.get('/api/admin/schema-drift/schedule')
      .then(r => setScheduleConfig(r.data.schedule || null))
      .catch(() => {});
  }, []);

  const loadNotifications = useCallback(() => {
    axios.get('/api/admin/schema-drift/notifications?limit=30')
      .then(r => { setNotifications(r.data.notifications || []); setUnreadCount(r.data.unreadCount || 0); })
      .catch(() => {});
  }, []);

  const loadNotifConfig = useCallback(() => {
    axios.get('/api/admin/schema-drift/notif-config')
      .then(r => setNotifConfig(r.data.config || null))
      .catch(() => {});
  }, []);

  const loadDeliveries = useCallback(() => {
    setDeliveriesLoading(true);
    axios.get('/api/admin/schema-drift/notif-deliveries?limit=50')
      .then(r => setDeliveries(r.data.deliveries || []))
      .catch(() => {})
      .finally(() => setDeliveriesLoading(false));
  }, []);

  const loadMaintenance = useCallback(() => {
    axios.get('/api/admin/schema-drift/maintenance/lock-status')
      .then(r => setLockStatus(r.data))
      .catch(() => {});
    axios.get('/api/admin/schema-drift/maintenance/retention-config')
      .then(r => {
        const cfg = r.data.config || null;
        setRetentionConfig(cfg);
        if (cfg) setRetentionDraft({
          retention_scan_runs_days:    cfg.retention_scan_runs_days,
          retention_snapshot_days:     cfg.retention_snapshot_days,
          retention_delivery_log_days: cfg.retention_delivery_log_days,
          retention_notif_days:        cfg.retention_notif_days,
          min_runs_to_keep:            cfg.min_runs_to_keep,
          scan_lock_ttl_minutes:       cfg.scan_lock_ttl_minutes,
          auto_cleanup_enabled:        cfg.auto_cleanup_enabled,
        });
      })
      .catch(() => {});
    axios.get('/api/admin/schema-drift/maintenance/cleanup-history?limit=10')
      .then(r => setCleanupHistory(r.data.history || []))
      .catch(() => {});
  }, []);

  // Load church list, suppression rules, history, schedule, notifications on mount
  useEffect(() => {
    axios.get('/api/admin/schema-drift/churches')
      .then(r => setChurches(r.data.churches || []))
      .catch(() => {});
    axios.get('/api/admin/schema-drift/suppressions')
      .then(r => setSuppressionRules(r.data.rules || []))
      .catch(() => {});
    loadScanHistory();
    loadScheduleConfig();
    loadNotifications();
    loadNotifConfig();
    loadMaintenance();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reloadSuppressionRules = useCallback(() => {
    axios.get('/api/admin/schema-drift/suppressions')
      .then(r => setSuppressionRules(r.data.rules || []))
      .catch(() => {});
  }, []);

  // Cleanup polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const pollJob = useCallback((jobId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const { data: status } = await axios.get<JobStatus>(`/api/admin/schema-drift/jobs/${jobId}`);
        setActiveJob(status);

        if (status.status === 'complete') {
          stopPolling();
          setScanning(false);
          const [{ data: raw }, { data: annotated }] = await Promise.all([
            axios.get<ScanResult>(`/api/admin/schema-drift/jobs/${jobId}/result`),
            axios.get<ScanResult>(`/api/admin/schema-drift/jobs/${jobId}/result?applySuppressions=1`),
          ]);
          setScanResult(raw);
          setAnnotatedResult(annotated);
        } else if (status.status === 'error') {
          stopPolling();
          setScanning(false);
        }
      } catch (_) {
        stopPolling();
        setScanning(false);
      }
    }, 1500);
  }, [stopPolling]);

  const handleStartScan = useCallback(async () => {
    setScanning(true);
    setScanResult(null);
    setAnnotatedResult(null);
    setActiveJob(null);
    setCurrentRunId(null);
    setCurrentDelta(null);
    try {
      const body: Record<string, unknown> = { scope: scanScope, includePlatform: true };
      if (scanScope === 'selected') {
        body.churchIds = selectedChurches.map(c => c.id);
      }
      const { data } = await axios.post('/api/admin/schema-drift/scans/run', body);
      setCurrentRunId(data.runId);
      pollJob(data.jobId);
    } catch (err: any) {
      setScanning(false);
      alert(`Failed to start scan: ${err?.response?.data?.error || err.message}`);
    }
  }, [scanScope, selectedChurches, pollJob]);

  // After scan completes, fetch delta + refresh history + notifications
  useEffect(() => {
    if (!scanResult || !currentRunId) return;
    setDeltaLoading(true);
    axios.get<{ delta: DeltaSummary | null }>(`/api/admin/schema-drift/scans/${currentRunId}/delta`)
      .then(r => setCurrentDelta(r.data.delta || null))
      .catch(() => {})
      .finally(() => {
        setDeltaLoading(false);
        loadScanHistory();
        loadNotifications();
      });
  }, [scanResult, currentRunId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerateSql = useCallback(async (targetDb?: string) => {
    if (!scanResult) return;
    setSqlLoading(true);
    setSqlOpen(true);
    setSqlTarget(targetDb || 'all');
    try {
      const { data } = await axios.post('/api/admin/schema-drift/remediation-sql', {
        jobId:    scanResult.jobId,
        targetDb: targetDb || undefined,
      });
      setSqlContent(data.sql);
    } catch (err: any) {
      setSqlContent(`-- Error generating SQL: ${err?.response?.data?.error || err.message}`);
    } finally {
      setSqlLoading(false);
    }
  }, [scanResult]);

  const handleCopySql = useCallback(() => {
    navigator.clipboard.writeText(sqlContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [sqlContent]);

  const handleDownloadSql = useCallback(() => {
    const blob = new Blob([sqlContent], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `schema-drift-remediation-${sqlTarget}-${new Date().toISOString().slice(0,10)}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sqlContent, sqlTarget]);

  // ── Derived: flatten + filter findings ──────────────────────────────────────

  const activeResult = showMode === 'filtered' && annotatedResult ? annotatedResult : scanResult;

  const allFindings: DriftFinding[] = React.useMemo(() => {
    if (!activeResult) return [];
    return [
      ...(activeResult.platform?.findings || []),
      ...activeResult.tenants.flatMap(t => t.findings),
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeResult]);

  const filteredFindings: DriftFinding[] = React.useMemo(() => {
    return allFindings.filter(f => {
      if (filterSeverity && f.severity !== filterSeverity) return false;
      if (filterDriftType && f.driftType !== filterDriftType) return false;
      if (filterTable && !f.table.toLowerCase().includes(filterTable.toLowerCase())) return false;
      if (filterTenant && !f.scope.toLowerCase().includes(filterTenant.toLowerCase())) return false;
      if (filterSuppressed === 'active'     && f.suppressed)  return false;
      if (filterSuppressed === 'suppressed' && !f.suppressed) return false;
      return true;
    });
  }, [allFindings, filterSeverity, filterDriftType, filterTable, filterTenant, filterSuppressed]);

  const suppressedCount = React.useMemo(() =>
    annotatedResult
      ? [
          ...(annotatedResult.platform?.findings || []),
          ...annotatedResult.tenants.flatMap(t => t.findings),
        ].filter(f => f.suppressed).length
      : 0,
  [annotatedResult]);

  const handleOpenSuppressDialog = useCallback((finding: DriftFinding) => {
    setSuppressDialogFinding(finding);
    setSuppressDialogOpen(true);
  }, []);

  // ── Group findings ────────────────────────────────────────────────────────

  const groupedFindings: Array<{ label: string; findings: DriftFinding[] }> = React.useMemo(() => {
    if (groupBy === 'none') return [{ label: 'All Findings', findings: filteredFindings }];

    const groups = new Map<string, DriftFinding[]>();
    for (const f of filteredFindings) {
      let key: string;
      if (groupBy === 'tenant')     key = f.scope;
      else if (groupBy === 'table') key = f.table;
      else if (groupBy === 'severity') key = f.severity;
      else                          key = f.driftType;

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(f);
    }

    const entries = Array.from(groups.entries()).map(([label, findings]) => ({ label, findings }));

    if (groupBy === 'severity') {
      entries.sort((a, b) =>
        SEVERITY_ORDER.indexOf(a.label as Severity) - SEVERITY_ORDER.indexOf(b.label as Severity)
      );
    } else {
      entries.sort((a, b) => b.findings.length - a.findings.length);
    }

    return entries;
  }, [filteredFindings, groupBy]);

  const allDriftTypes = React.useMemo(() =>
    Array.from(new Set(allFindings.map(f => f.driftType))).sort(),
  [allFindings]);

  const allTenants = React.useMemo(() =>
    Array.from(new Set(allFindings.map(f => f.scope))).sort(),
  [allFindings]);

  const { summary } = activeResult || {};
  const progressPct = activeJob?.progress.total
    ? Math.round((activeJob.progress.current / activeJob.progress.total) * 100)
    : null;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2.5} flexWrap="wrap" gap={1}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.1), display: 'flex' }}>
            <IconDatabase size={22} color={theme.palette.primary.main} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Schema Drift Detector</Typography>
            <Typography variant="caption" color="text.secondary">
              Compares actual DB schemas against canonical expected definitions
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          {scanResult && (
            <Typography variant="caption" color="text.secondary">
              Last scan: {new Date(scanResult.scannedAt).toLocaleString()}
              {summary?.durationMs ? ` · ${(summary.durationMs / 1000).toFixed(1)}s` : ''}
            </Typography>
          )}
          <Button
            size="small"
            variant={rulesOpen ? 'contained' : 'outlined'}
            startIcon={<IconShield size={14} />}
            onClick={() => setRulesOpen(o => !o)}
            color="secondary"
          >
            Rules ({suppressionRules.length})
          </Button>
          <Tooltip title="Schedule settings">
            <IconButton size="small" onClick={() => setScheduleOpen(true)}
              sx={{ bgcolor: scheduleConfig?.is_enabled ? alpha(theme.palette.success.main, 0.1) : undefined }}>
              <IconCalendar size={17} color={scheduleConfig?.is_enabled ? theme.palette.success.main : undefined} />
            </IconButton>
          </Tooltip>
          <Tooltip title={unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'Notifications'}>
            <IconButton size="small" onClick={() => setNotifOpen(true)}>
              <Badge badgeContent={unreadCount || undefined} color="error" max={9}>
                <IconBell size={17} />
              </Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title="Notification delivery settings">
            <IconButton
              size="small"
              onClick={() => { setNotifConfigOpen(true); loadDeliveries(); }}
              sx={{ bgcolor: notifConfig?.is_enabled ? alpha(theme.palette.info.main, 0.1) : undefined }}
            >
              <IconMail size={17} color={notifConfig?.is_enabled ? theme.palette.info.main : undefined} />
            </IconButton>
          </Tooltip>
          <Tooltip title={lockStatus?.isLocked ? 'Maintenance (scan lock active)' : 'Operational settings & maintenance'}>
            <IconButton
              size="small"
              onClick={() => { setMaintenanceOpen(true); loadMaintenance(); }}
              sx={{ bgcolor: lockStatus?.isLocked ? alpha(theme.palette.warning.main, 0.15) : undefined }}
            >
              {lockStatus?.isLocked
                ? <IconLock size={17} color={theme.palette.warning.main} />
                : <IconTool size={17} />
              }
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }} textColor="primary" indicatorColor="primary">
        <Tab label="Scan" icon={<IconDatabase size={14} />} iconPosition="start"
          sx={{ minHeight: 40, textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' }} />
        <Tab
          label={`History${scanRuns.length > 0 ? ` (${scanRuns.length})` : ''}`}
          icon={<IconHistory size={14} />} iconPosition="start"
          sx={{ minHeight: 40, textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' }}
        />
      </Tabs>

      {activeTab === 1 && (
        <ScanHistoryPanel
          runs={scanRuns}
          onRefresh={loadScanHistory}
        />
      )}

      {activeTab === 0 && (
      <>

      {/* ── Raw / Filtered Toggle — only when a scan has results ————————— */}
      {annotatedResult && (
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconShield size={15} color={theme.palette.text.secondary} />
            <Typography variant="caption" fontWeight={600} color="text.secondary">SUPPRESSION VIEW</Typography>
          </Stack>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={showMode === 'filtered'}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowMode(e.target.checked ? 'filtered' : 'raw')}
                color="primary"
              />
            }
            label={
              <Typography variant="caption" fontWeight={600}>
                {showMode === 'filtered' ? 'Filtered (suppressions applied)' : 'Raw (all findings)'}
              </Typography>
            }
          />
          {suppressedCount > 0 && (
            <Chip
              size="small"
              icon={<IconEyeOff size={12} />}
              label={`${suppressedCount} suppressed`}
              sx={{ fontSize: '0.7rem', bgcolor: alpha('#9e9e9e', 0.1), color: 'text.secondary' }}
            />
          )}
          {suppressedCount > 0 && showMode === 'filtered' && (
            <Chip
              size="small"
              icon={<IconCheck size={12} />}
              label={`${allFindings.length - suppressedCount} active`}
              color="success"
              sx={{ fontSize: '0.7rem' }}
            />
          )}
          {suppressionRules.length === 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No suppression rules defined — click Rules to create one
            </Typography>
          )}
        </Paper>
      )}

      {/* ── Scan Controls ────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2.5 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid size={{ xs: 12, sm: 4, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Scan Scope</InputLabel>
              <Select
                label="Scan Scope"
                value={scanScope}
                onChange={(e: SelectChangeEvent) => setScanScope(e.target.value as ScanScope)}
                disabled={scanning}
              >
                <MenuItem value="all">All Tenants + Platform</MenuItem>
                <MenuItem value="platform_only">Platform DB Only</MenuItem>
                <MenuItem value="tenants_only">All Tenants Only</MenuItem>
                <MenuItem value="selected">Selected Tenants</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {scanScope === 'selected' && (
            <Grid size={{ xs: 12, sm: 8, md: 5 }}>
              <Autocomplete
                multiple
                size="small"
                options={churches}
                value={selectedChurches}
                onChange={(_, v) => setSelectedChurches(v)}
                getOptionLabel={c => `${c.name} (${c.database_name})`}
                disabled={scanning}
                renderInput={params => (
                  <TextField {...params} label="Select Tenants" placeholder="Search churches…" />
                )}
                limitTags={3}
              />
            </Grid>
          )}

          <Grid size="auto">
            <Button
              variant="contained"
              startIcon={scanning ? <CircularProgress size={14} color="inherit" /> : <IconRefresh size={16} />}
              onClick={handleStartScan}
              disabled={scanning || (scanScope === 'selected' && selectedChurches.length === 0)}
            >
              {scanning ? 'Scanning…' : 'Run Scan'}
            </Button>
          </Grid>

          {scanResult && !scanning && (
            <Grid size="auto">
              <Button
                variant="outlined"
                startIcon={<IconCode size={16} />}
                onClick={() => handleGenerateSql()}
                size="medium"
              >
                Generate Remediation SQL
              </Button>
            </Grid>
          )}
        </Grid>

        {/* Progress bar */}
        {scanning && activeJob && (
          <Box mt={2}>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="caption" color="text.secondary">
                {STAGE_LABELS[activeJob.progress.stage] || activeJob.progress.stage}
              </Typography>
              {progressPct !== null && (
                <Typography variant="caption" color="text.secondary">
                  {activeJob.progress.current} / {activeJob.progress.total}
                </Typography>
              )}
            </Stack>
            <LinearProgress
              variant={progressPct !== null ? 'determinate' : 'indeterminate'}
              value={progressPct ?? undefined}
              sx={{ borderRadius: 1 }}
            />
          </Box>
        )}

        {activeJob?.status === 'error' && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            Scan failed: {activeJob.error}
          </Alert>
        )}
      </Paper>

      {/* ── Template Info ─────────────────────────────────────────────────── */}
      {scanResult?.templateInfo && (
        <Alert
          severity={scanResult.templateInfo.valid ? 'success' : 'warning'}
          icon={<IconDatabase size={18} />}
          sx={{ mb: 2, py: 0.5 }}
        >
          <Typography variant="caption">
            Template DB (record_template1):&nbsp;
            {scanResult.templateInfo.valid
              ? <>v{scanResult.templateInfo.version || 'unknown'} · {scanResult.templateInfo.tableCount} tables
                  {scanResult.templateInfo.frozenAt ? ` · frozen ${new Date(scanResult.templateInfo.frozenAt).toLocaleDateString()}` : ' · not frozen (fallback mode)'}
                </>
              : `Unavailable — ${scanResult.templateInfo.reason}. Column-level diff disabled; table-existence checks still run.`
            }
          </Typography>
        </Alert>
      )}

      {/* ── Summary Cards ────────────────────────────────────────────────── */}
      {summary && (
        <Grid container spacing={2} mb={2.5}>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <SummaryCard
              label="Tenants Scanned"
              value={summary.tenantsScanned}
              sub={summary.tenantsInaccessible ? `${summary.tenantsInaccessible} inaccessible` : undefined}
              color={theme.palette.primary.main}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <SummaryCard
              label="Tenants With Drift"
              value={summary.tenantsWithDrift}
              color={summary.tenantsWithDrift > 0 ? SEVERITY_COLOR.high : theme.palette.success.main}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <SummaryCard
              label="Critical"
              value={summary.bySeverity.critical}
              color={summary.bySeverity.critical > 0 ? SEVERITY_COLOR.critical : theme.palette.success.main}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <SummaryCard
              label="High"
              value={summary.bySeverity.high}
              color={summary.bySeverity.high > 0 ? SEVERITY_COLOR.high : theme.palette.success.main}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <SummaryCard
              label="Missing Columns"
              value={(summary.byType['MISSING_COLUMN'] || 0) + (summary.byType['COLUMN_MISSING_PLATFORM'] || 0)}
              color={theme.palette.warning.main}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <SummaryCard
              label="Missing Indexes"
              value={(summary.byType['MISSING_INDEX'] || 0) + (summary.byType['MISSING_UNIQUE_INDEX'] || 0)}
              color={theme.palette.info.main}
            />
          </Grid>
        </Grid>
      )}

      {/* ── Delta Cards (after a persisted scan completes) ──────────────── */}
      {(currentDelta || deltaLoading) && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderColor: alpha(theme.palette.primary.main, 0.3) }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
            <IconTrendingUp size={16} color={theme.palette.primary.main} />
            <Typography variant="caption" fontWeight={700} color="primary">DELTA vs PRIOR RUN</Typography>
            {deltaLoading && <CircularProgress size={12} />}
            {currentDelta && (
              <Typography variant="caption" color="text.secondary">
                (compared to run #{currentDelta.priorRunId})
              </Typography>
            )}
          </Stack>
          {currentDelta && (
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper variant="outlined" sx={{ p: 1.5, borderLeft: `4px solid ${SEVERITY_COLOR.high}`, textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight={700} color={currentDelta.newCount > 0 ? SEVERITY_COLOR.high : 'text.secondary'}>
                    +{currentDelta.newCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">New Findings</Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper variant="outlined" sx={{ p: 1.5, borderLeft: `4px solid ${theme.palette.success.main}`, textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight={700} color={currentDelta.resolvedCount > 0 ? theme.palette.success.main : 'text.secondary'}>
                    -{currentDelta.resolvedCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Resolved</Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper variant="outlined" sx={{ p: 1.5, borderLeft: `4px solid ${SEVERITY_COLOR.critical}`, textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight={700} color={currentDelta.newCriticalCount > 0 ? SEVERITY_COLOR.critical : 'text.secondary'}>
                    {currentDelta.newCriticalCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">New Critical</Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper variant="outlined" sx={{ p: 1.5, borderLeft: `4px solid ${SEVERITY_COLOR.medium}`, textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight={700} color={currentDelta.newHighCount > 0 ? SEVERITY_COLOR.medium : 'text.secondary'}>
                    {currentDelta.newHighCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">New High</Typography>
                </Paper>
              </Grid>
            </Grid>
          )}
        </Paper>
      )}

      {/* ── Findings Table ───────────────────────────────────────────────── */}
      {(scanResult || annotatedResult) && (
        <>
          {/* Filters */}
          <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
            <Grid container spacing={1.5} alignItems="center">
              <Grid size="auto">
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <IconFilter size={14} color={theme.palette.text.secondary} />
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>FILTER</Typography>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, sm: 'auto' }}>
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Severity</InputLabel>
                  <Select label="Severity" value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
                    <MenuItem value="">All</MenuItem>
                    {SEVERITY_ORDER.map(s => (
                      <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 'auto' }}>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Drift Type</InputLabel>
                  <Select label="Drift Type" value={filterDriftType} onChange={e => setFilterDriftType(e.target.value)}>
                    <MenuItem value="">All</MenuItem>
                    {allDriftTypes.map(t => (
                      <MenuItem key={t} value={t}>{DRIFT_TYPE_LABELS[t] || t}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 'auto' }}>
                <TextField
                  size="small" label="Filter Table" value={filterTable}
                  onChange={e => setFilterTable(e.target.value)}
                  sx={{ minWidth: 130 }}
                  InputProps={{ endAdornment: filterTable ? (
                    <IconButton size="small" onClick={() => setFilterTable('')}><IconX size={12} /></IconButton>
                  ) : undefined }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 'auto' }}>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Tenant</InputLabel>
                  <Select label="Tenant" value={filterTenant} onChange={e => setFilterTenant(e.target.value)}>
                    <MenuItem value="">All</MenuItem>
                    {allTenants.map(t => (
                      <MenuItem key={t} value={t}>
                        {t.replace('tenant:', '').replace('platform:', 'platform')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 'auto' }} sx={{ ml: 'auto' }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Group By</InputLabel>
                  <Select label="Group By" value={groupBy} onChange={e => setGroupBy(e.target.value as typeof groupBy)}>
                    <MenuItem value="none">None</MenuItem>
                    <MenuItem value="tenant">Tenant</MenuItem>
                    <MenuItem value="table">Table</MenuItem>
                    <MenuItem value="severity">Severity</MenuItem>
                    <MenuItem value="driftType">Drift Type</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {showMode === 'filtered' && (
                <Grid size={{ xs: 12, sm: 'auto' }}>
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Suppression</InputLabel>
                    <Select label="Suppression" value={filterSuppressed} onChange={e => setFilterSuppressed(e.target.value as typeof filterSuppressed)}>
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="active">Active only</MenuItem>
                      <MenuItem value="suppressed">Suppressed only</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid size="auto">
                <Typography variant="caption" color="text.secondary">
                  {filteredFindings.length} / {allFindings.length} findings
                  {suppressedCount > 0 && showMode === 'filtered' && ` (⋅ ${suppressedCount} suppressed)`}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Inaccessible tenants banner */}
          {summary && summary.tenantsInaccessible > 0 && (
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              {summary.tenantsInaccessible} tenant DB{summary.tenantsInaccessible > 1 ? 's' : ''} could not be accessed.
              Their schemas were not scanned.
            </Alert>
          )}

          {filteredFindings.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <IconCheck size={32} color={theme.palette.success.main} />
              <Typography variant="body1" mt={1} fontWeight={600}>
                {allFindings.length === 0 ? 'No drift detected across all scanned schemas.' : 'No findings match current filters.'}
              </Typography>
            </Paper>
          ) : (
            <>
              {groupedFindings.map(group => (
                <Box key={group.label} mb={2}>
                  <GroupedFindingsTable
                    group={group}
                    groupBy={groupBy}
                    onGenerateSql={handleGenerateSql}
                    scanResult={activeResult!}
                    onSuppress={handleOpenSuppressDialog}
                  />
                </Box>
              ))}
            </>
          )}
        </>
      )}

      {/* ── Suppression Create Dialog ─────────────────────────── */}
      {suppressDialogFinding && (
        <SuppressionCreateDialog
          open={suppressDialogOpen}
          finding={suppressDialogFinding}
          jobId={scanResult?.jobId ?? null}
          onClose={() => { setSuppressDialogOpen(false); setSuppressDialogFinding(null); }}
          onCreated={() => {
            setSuppressDialogOpen(false);
            setSuppressDialogFinding(null);
            reloadSuppressionRules();
            // Re-fetch annotated result with updated rules
            if (scanResult?.jobId) {
              axios.get<ScanResult>(`/api/admin/schema-drift/jobs/${scanResult.jobId}/result?applySuppressions=1`)
                .then(r => setAnnotatedResult(r.data))
                .catch(() => {});
            }
          }}
        />
      )}

      {/* ── Suppression Rules Panel ─────────────────────────────── */}
      <SuppressionRulesPanel
        open={rulesOpen}
        rules={suppressionRules}
        onClose={() => setRulesOpen(false)}
        onChanged={reloadSuppressionRules}
      />

      {/* ── SQL Preview Dialog ──────────────────────────────────── */}
      <Dialog open={sqlOpen} onClose={() => setSqlOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconCode size={18} />
              <Typography fontWeight={700}>Remediation SQL</Typography>
              {sqlTarget !== 'all' && (
                <Chip label={sqlTarget} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} />
              )}
            </Stack>
            <Stack direction="row" spacing={1}>
              <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
                <IconButton size="small" onClick={handleCopySql} disabled={sqlLoading}>
                  {copied ? <IconCheck size={16} color="#388e3c" /> : <IconCopy size={16} />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Download as .sql file">
                <IconButton size="small" onClick={handleDownloadSql} disabled={sqlLoading || !sqlContent}>
                  <IconDownload size={16} />
                </IconButton>
              </Tooltip>
              <IconButton size="small" onClick={() => setSqlOpen(false)}>
                <IconX size={16} />
              </IconButton>
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {sqlLoading ? (
            <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>
          ) : (
            <>
              <Alert severity="warning" sx={{ borderRadius: 0, py: 0.5 }}>
                <Typography variant="caption">
                  <strong>Review before running.</strong> Test on a non-production database first.
                  This script will NOT drop tables, columns, or indexes. Type mismatches require manual assessment.
                </Typography>
              </Alert>
              <Box
                component="pre"
                sx={{
                  m: 0, p: 2,
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  whiteSpace: 'pre',
                  bgcolor: alpha(theme.palette.grey[900], 0.03),
                  maxHeight: 500,
                  overflowY: 'auto',
                  lineHeight: 1.6,
                }}
              >
                {sqlContent}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSqlOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Notification Config Panel ────────────────────────────── */}
      <NotifConfigPanel
        open={notifConfigOpen}
        config={notifConfig}
        deliveries={deliveries}
        deliveriesLoading={deliveriesLoading}
        onClose={() => setNotifConfigOpen(false)}
        onSaved={(cfg) => { setNotifConfig(cfg); }}
        onRefreshDeliveries={loadDeliveries}
      />

      {/* ── Phase 6: Maintenance Panel ──────────────────────────── */}
      <MaintenancePanel
        open={maintenanceOpen}
        lockStatus={lockStatus}
        retentionConfig={retentionConfig}
        retentionDraft={retentionDraft}
        cleanupResult={cleanupResult}
        cleanupHistory={cleanupHistory}
        cleanupRunning={cleanupRunning}
        maintenanceTab={maintenanceTab}
        onTabChange={setMaintenanceTab}
        onClose={() => setMaintenanceOpen(false)}
        onRetentionDraftChange={(patch) => setRetentionDraft(prev => ({ ...prev, ...patch }))}
        onSaveRetention={() => {
          axios.put('/api/admin/schema-drift/maintenance/retention-config', retentionDraft)
            .then(r => { setRetentionConfig(r.data.config); })
            .catch(() => {});
        }}
        onRefreshLock={loadMaintenance}
        onForceReleaseLock={() => {
          axios.delete('/api/admin/schema-drift/maintenance/lock')
            .then(() => loadMaintenance())
            .catch(() => {});
        }}
        onRunCleanup={(dryRun) => {
          setCleanupRunning(true);
          axios.post('/api/admin/schema-drift/maintenance/cleanup', { dryRun })
            .then(r => {
              setCleanupResult(r.data.result);
              loadMaintenance();
            })
            .catch(() => {})
            .finally(() => setCleanupRunning(false));
        }}
      />

      {/* ── Scheduler Panel ─────────────────────────────────────── */}
      <SchedulerPanel
        open={scheduleOpen}
        config={scheduleConfig}
        onClose={() => setScheduleOpen(false)}
        onSaved={(cfg) => { setScheduleConfig(cfg); setScheduleOpen(false); }}
      />

      {/* ── Notifications Dialog ─────────────────────────────────── */}
      <NotificationsDialog
        open={notifOpen}
        notifications={notifications}
        onClose={() => setNotifOpen(false)}
        onRead={(id) => {
          axios.patch(`/api/admin/schema-drift/notifications/${id}/read`).catch(() => {});
          setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
          setUnreadCount(prev => Math.max(0, prev - 1));
        }}
        onReadAll={() => {
          axios.patch('/api/admin/schema-drift/notifications/read-all').catch(() => {});
          setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
          setUnreadCount(0);
        }}
      />

      </> /* end activeTab === 0 fragment */
      )}

    </Box>
  );
}

// ─── Suppression Create Dialog ────────────────────────────────────────────────

function SuppressionCreateDialog({
  open, finding, jobId, onClose, onCreated,
}: {
  open:      boolean;
  finding:   DriftFinding;
  jobId:     string | null;
  onClose:   () => void;
  onCreated: () => void;
}) {
  const theme = useTheme();
  const [name, setName]           = useState('');
  const [description, setDesc]    = useState('');
  const [scopeType, setScopeType] = useState<'platform' | 'tenant' | 'all'>('all');
  const [targetDb, setTargetDb]   = useState('');
  const [driftType, setDriftType] = useState(finding.driftType);
  const [tableName, setTableName] = useState(finding.table);
  const [columnName, setColName]  = useState(finding.column ?? '');
  const [severity, setSeverity]   = useState('');
  const [preview, setPreview]     = useState<{ matchCount: number; hasCritical: boolean; hasHigh: boolean } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const isCriticalOrHigh = finding.severity === 'critical' || finding.severity === 'high';

  React.useEffect(() => {
    if (open) {
      setName('');
      setDesc('');
      setScopeType(finding.scope.startsWith('platform:') ? 'platform' : 'tenant');
      setTargetDb(finding.scope.replace(/^(?:platform|tenant):/, ''));
      setDriftType(finding.driftType);
      setTableName(finding.table);
      setColName(finding.column ?? '');
      setSeverity('');
      setPreview(null);
      setError('');
      setConfirmed(false);
    }
  }, [open, finding]);

  const handlePreview = async () => {
    if (!jobId) return;
    setPreviewLoading(true);
    try {
      const { data } = await axios.post('/api/admin/schema-drift/suppressions/preview', {
        jobId,
        rule: {
          scope_type:  scopeType,
          target_db:   targetDb || null,
          drift_type:  driftType || null,
          table_name:  tableName || null,
          column_name: columnName || null,
          severity:    severity || null,
        },
      });
      setPreview(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      await axios.post('/api/admin/schema-drift/suppressions', {
        name:             name.trim(),
        description:      description.trim() || null,
        scope_type:       scopeType,
        target_db:        targetDb || null,
        drift_type:       driftType || null,
        table_name:       tableName || null,
        column_name:      columnName || null,
        severity:         severity || null,
        confirm_critical: confirmed,
      });
      onCreated();
    } catch (err: any) {
      const d = err?.response?.data;
      if (d?.requiresConfirmation) {
        setError('This rule targets critical/high findings. Check the confirmation box to proceed.');
      } else {
        setError(d?.errors?.join(', ') || d?.error || err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconShield size={18} />
          <Typography fontWeight={700}>Create Suppression Rule</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {isCriticalOrHigh && (
            <Alert severity="warning" icon={<IconAlertTriangle size={16} />}>
              <strong>Warning:</strong> This finding is <strong>{finding.severity}</strong>.
              Suppressing high/critical findings should only be done when the drift is confirmed benign.
            </Alert>
          )}

          <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.grey[500], 0.06), borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>FINDING BEING SUPPRESSED</Typography>
            <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap">
              <Chip size="small" label={finding.driftType} variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }} />
              <Chip size="small" label={finding.table + (finding.column ? `.${finding.column}` : '')} sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }} />
              <Chip size="small" label={finding.scope.replace(/^(platform|tenant):/, '')} sx={{ fontSize: '0.65rem' }} />
              <SeverityChip severity={finding.severity} />
            </Stack>
          </Box>

          <TextField size="small" label="Rule Name *" value={name} onChange={e => setName(e.target.value)} fullWidth />
          <TextField size="small" label="Description (optional)" value={description} onChange={e => setDesc(e.target.value)} fullWidth multiline rows={2} />

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Scope Type</InputLabel>
                <Select label="Scope Type" value={scopeType} onChange={e => setScopeType(e.target.value as typeof scopeType)}>
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="platform">Platform only</MenuItem>
                  <MenuItem value="tenant">Tenant only</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField size="small" label="Target DB (blank = all)" value={targetDb} onChange={e => setTargetDb(e.target.value)} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField size="small" label="Drift Type (blank = any)" value={driftType} onChange={e => setDriftType(e.target.value)} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField size="small" label="Table (blank = any)" value={tableName} onChange={e => setTableName(e.target.value)} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField size="small" label="Column (blank = any)" value={columnName} onChange={e => setColName(e.target.value)} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Severity (blank = any)</InputLabel>
                <Select label="Severity (blank = any)" value={severity} onChange={e => setSeverity(e.target.value)}>
                  <MenuItem value="">Any</MenuItem>
                  {SEVERITY_ORDER.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {jobId && (
            <Button size="small" variant="outlined" onClick={handlePreview} disabled={previewLoading} startIcon={previewLoading ? <CircularProgress size={12} /> : <IconFilter size={14} />}>
              Preview Effect
            </Button>
          )}

          {preview && (
            <Alert severity={preview.hasCritical ? 'error' : preview.hasHigh ? 'warning' : 'info'}>
              This rule would suppress <strong>{preview.matchCount}</strong> of {preview.totalFindings} findings.
              {preview.hasCritical && ' ⚠ Includes CRITICAL findings.'}
              {preview.hasHigh && !preview.hasCritical && ' Includes HIGH findings.'}
            </Alert>
          )}

          {isCriticalOrHigh && (
            <FormControlLabel
              control={<Switch size="small" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} color="warning" />}
              label={<Typography variant="caption">I confirm this critical/high finding is intentionally suppressed</Typography>}
            />
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !name.trim() || (isCriticalOrHigh && !confirmed)}
          startIcon={saving ? <CircularProgress size={14} /> : <IconShield size={14} />}>
          Create Rule
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Suppression Rules Panel ──────────────────────────────────────────────────

function SuppressionRulesPanel({
  open, rules, onClose, onChanged,
}: {
  open:      boolean;
  rules:     SuppressionRule[];
  onClose:   () => void;
  onChanged: () => void;
}) {
  const theme = useTheme();
  const [toggling, setToggling] = useState<number | null>(null);

  const handleToggle = async (rule: SuppressionRule) => {
    setToggling(rule.id);
    try {
      await axios.patch(`/api/admin/schema-drift/suppressions/${rule.id}`, {
        is_active: rule.is_active ? 0 : 1,
      });
      onChanged();
    } catch (_) {
      /* ignore */
    } finally {
      setToggling(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconShield size={18} />
            <Typography fontWeight={700}>Suppression Rules</Typography>
            <Chip size="small" label={rules.length} variant="outlined" />
          </Stack>
          <IconButton size="small" onClick={onClose}><IconX size={16} /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {rules.length === 0 ? (
          <Box p={4} textAlign="center">
            <IconShieldOff size={32} color={theme.palette.text.disabled} />
            <Typography variant="body2" color="text.secondary" mt={1}>
              No suppression rules defined. Create one by clicking the shield icon on any finding.
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.grey[500], 0.05) }}>
                <TableCell sx={{ width: 60 }}>Active</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Scope</TableCell>
                <TableCell>Drift Type</TableCell>
                <TableCell>Table</TableCell>
                <TableCell>Column</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.map(rule => (
                <TableRow key={rule.id} sx={{ opacity: rule.is_active ? 1 : 0.45 }}>
                  <TableCell>
                    <Tooltip title={rule.is_active ? 'Click to disable' : 'Click to enable'}>
                      <Switch
                        size="small"
                        checked={!!rule.is_active}
                        onChange={() => handleToggle(rule)}
                        disabled={toggling === rule.id}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" fontWeight={600}>{rule.name}</Typography>
                    {rule.description && (
                      <Typography variant="caption" color="text.secondary" display="block">{rule.description}</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.25}>
                      <Chip size="small" label={rule.scope_type} variant="outlined" sx={{ fontSize: '0.65rem', width: 'fit-content' }} />
                      {rule.target_db && (
                        <Typography variant="caption" fontFamily="monospace" color="text.secondary">{rule.target_db}</Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" fontFamily="monospace" color={rule.drift_type ? 'text.primary' : 'text.disabled'}>
                      {rule.drift_type || 'any'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" fontFamily="monospace" color={rule.table_name ? 'text.primary' : 'text.disabled'}>
                      {rule.table_name || 'any'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" fontFamily="monospace" color={rule.column_name ? 'text.primary' : 'text.disabled'}>
                      {rule.column_name || 'any'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{rule.created_by}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(rule.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Grouped Findings Table ───────────────────────────────────────────────────

function GroupedFindingsTable({
  group, groupBy, onGenerateSql, scanResult, onSuppress,
}: {
  group: { label: string; findings: DriftFinding[] };
  groupBy: string;
  onGenerateSql: (targetDb?: string) => void;
  scanResult: ScanResult;
  onSuppress?: (f: DriftFinding) => void;
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(true);

  const isTenantGroup = groupBy === 'tenant' && group.label.startsWith('tenant:');
  const dbName = isTenantGroup ? group.label.replace('tenant:', '') : null;

  const severityCount = React.useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of group.findings) c[f.severity] = (c[f.severity] || 0) + 1;
    return c;
  }, [group.findings]);

  const worstSeverity = SEVERITY_ORDER.find(s => (severityCount[s] || 0) > 0);

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      {/* Group header */}
      <Box
        sx={{
          px: 2, py: 1,
          bgcolor: alpha(theme.palette.grey[500], 0.06),
          borderBottom: expanded ? '1px solid' : 0,
          borderColor: 'divider',
          cursor: 'pointer',
          '&:hover': { bgcolor: alpha(theme.palette.grey[500], 0.1) },
        }}
        onClick={() => setExpanded(e => !e)}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            {expanded ? <IconChevronDown size={16} /> : <IconChevronUp size={16} />}
            <Typography variant="body2" fontWeight={700} fontFamily={groupBy === 'table' ? 'monospace' : undefined}>
              {groupBy === 'tenant'
                ? group.label.replace('tenant:', '').replace('platform:', '⚙ platform')
                : groupBy === 'table'
                  ? group.label
                  : groupBy === 'severity'
                    ? group.label.charAt(0).toUpperCase() + group.label.slice(1)
                    : (DRIFT_TYPE_LABELS[group.label] || group.label)
              }
            </Typography>
            <Chip label={`${group.findings.length} finding${group.findings.length !== 1 ? 's' : ''}`}
              size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
            {worstSeverity && groupBy !== 'severity' && <SeverityChip severity={worstSeverity} />}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            {Object.entries(severityCount)
              .sort(([a], [b]) => SEVERITY_ORDER.indexOf(a as Severity) - SEVERITY_ORDER.indexOf(b as Severity))
              .map(([sev, cnt]) => (
                <Chip key={sev} label={cnt} size="small"
                  sx={{
                    bgcolor: alpha(SEVERITY_COLOR[sev as Severity], 0.12),
                    color:   SEVERITY_COLOR[sev as Severity],
                    fontWeight: 700, fontSize: '0.7rem',
                    border: `1px solid ${alpha(SEVERITY_COLOR[sev as Severity], 0.3)}`,
                    minWidth: 28,
                  }} />
              ))
            }
            {dbName && (
              <Tooltip title={`Generate SQL for ${dbName}`}>
                <Button
                  size="small" variant="outlined" startIcon={<IconCode size={12} />}
                  onClick={e => { e.stopPropagation(); onGenerateSql(dbName); }}
                  sx={{ fontSize: '0.7rem', py: 0.25 }}
                >
                  SQL
                </Button>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </Box>

      {/* Findings rows */}
      <Collapse in={expanded}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.grey[500], 0.04) }}>
                <TableCell sx={{ width: 32, p: 1 }} />
                <TableCell>Scope</TableCell>
                <TableCell>Table</TableCell>
                <TableCell>Column / Index</TableCell>
                <TableCell>Drift Type</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Impact</TableCell>
                <TableCell align="center">Fix</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {group.findings.map((f, i) => (
                <FindingRow
                  key={`${f.scope}-${f.table}-${f.column || f.indexName || ''}-${f.driftType}-${i}`}
                  finding={f}
                  onSuppress={onSuppress}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Collapse>
    </Paper>
  );
}

// ─── Notification Config Panel ────────────────────────────────────────────────

function NotifConfigPanel({
  open, config, deliveries, deliveriesLoading, onClose, onSaved, onRefreshDeliveries,
}: {
  open:                 boolean;
  config:               NotifConfig | null;
  deliveries:           NotifDelivery[];
  deliveriesLoading:    boolean;
  onClose:              () => void;
  onSaved:              (cfg: NotifConfig) => void;
  onRefreshDeliveries:  () => void;
}) {
  const theme = useTheme();

  const [isEnabled,      setIsEnabled]      = useState(false);
  const [emailEnabled,   setEmailEnabled]   = useState(false);
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [recipients,     setRecipients]     = useState('');
  const [webhookUrl,     setWebhookUrl]     = useState('');
  const [webhookSecret,  setWebhookSecret]  = useState('');
  const [minSeverity,    setMinSeverity]    = useState<'critical' | 'high'>('high');
  const [notifCritical,  setNotifCritical]  = useState(true);
  const [notifHigh,      setNotifHigh]      = useState(true);
  const [notifSurge,     setNotifSurge]     = useState(false);
  const [cooldown,       setCooldown]       = useState(60);
  const [saving,         setSaving]         = useState(false);
  const [testing,        setTesting]        = useState(false);
  const [saveError,      setSaveError]      = useState('');
  const [testResult,     setTestResult]     = useState<null | Record<string, any>>(null);
  const [deliveryTab,    setDeliveryTab]    = useState(0);

  React.useEffect(() => {
    if (open && config) {
      setIsEnabled(!!config.is_enabled);
      setEmailEnabled(!!config.email_enabled);
      setWebhookEnabled(!!config.webhook_enabled);
      setRecipients(config.recipient_emails || '');
      setWebhookUrl(config.webhook_url || '');
      setWebhookSecret('');
      setMinSeverity(config.min_severity);
      setNotifCritical(!!config.notify_new_critical);
      setNotifHigh(!!config.notify_new_high);
      setNotifSurge(!!config.notify_surge);
      setCooldown(config.cooldown_minutes ?? 60);
      setSaveError('');
      setTestResult(null);
    }
  }, [open, config]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const body: Record<string, any> = {
        is_enabled: isEnabled ? 1 : 0,
        email_enabled: emailEnabled ? 1 : 0,
        webhook_enabled: webhookEnabled ? 1 : 0,
        recipient_emails: recipients,
        webhook_url: webhookUrl || null,
        min_severity: minSeverity,
        notify_new_critical: notifCritical ? 1 : 0,
        notify_new_high: notifHigh ? 1 : 0,
        notify_surge: notifSurge ? 1 : 0,
        cooldown_minutes: cooldown,
      };
      if (webhookSecret) body.webhook_secret = webhookSecret;
      const { data } = await axios.put('/api/admin/schema-drift/notif-config', body);
      onSaved(data.config);
    } catch (err: any) {
      setSaveError(err?.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data } = await axios.post('/api/admin/schema-drift/notif-config/test');
      setTestResult(data.results);
    } catch (err: any) {
      setTestResult({ error: err?.response?.data?.error || err.message });
    } finally {
      setTesting(false);
    }
  };

  const statusColor = (s: string) =>
    s === 'sent' ? theme.palette.success.main : s === 'failed' ? theme.palette.error.main : theme.palette.text.disabled;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconMail size={18} />
            <Typography fontWeight={700}>Notification Delivery Settings</Typography>
            {config?.is_enabled ? (
              <Chip size="small" label="enabled" color="success" sx={{ fontSize: '0.65rem' }} />
            ) : (
              <Chip size="small" label="disabled" variant="outlined" sx={{ fontSize: '0.65rem' }} />
            )}
          </Stack>
          <IconButton size="small" onClick={onClose}><IconX size={16} /></IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Tabs value={deliveryTab} onChange={(_, v) => setDeliveryTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Settings" sx={{ minHeight: 36, textTransform: 'none', fontSize: '0.8rem' }} />
          <Tab label={`Delivery Log (${deliveries.length})`} sx={{ minHeight: 36, textTransform: 'none', fontSize: '0.8rem' }} />
        </Tabs>

        {deliveryTab === 0 && (
          <Stack spacing={3}>
            {/* Master toggle */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={isEnabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsEnabled(e.target.checked)}
                    color="success"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {isEnabled ? 'Delivery enabled' : 'Delivery disabled'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      When disabled, no emails or webhooks are sent regardless of findings
                    </Typography>
                  </Box>
                }
              />
            </Paper>

            {/* Email channel */}
            <Paper variant="outlined" sx={{ p: 2, opacity: isEnabled ? 1 : 0.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                <IconMail size={16} color={emailEnabled && isEnabled ? theme.palette.info.main : theme.palette.text.disabled} />
                <Typography variant="body2" fontWeight={700}>Email</Typography>
                <Switch
                  checked={emailEnabled}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmailEnabled(e.target.checked)}
                  size="small"
                  disabled={!isEnabled}
                />
              </Stack>
              <TextField
                fullWidth
                size="small"
                label="Recipient emails (comma-separated)"
                placeholder="ops@example.com, admin@example.com"
                value={recipients}
                onChange={e => setRecipients(e.target.value)}
                disabled={!isEnabled || !emailEnabled}
                multiline
                rows={2}
                helperText="Separate multiple addresses with commas. Uses the active SMTP config from Admin → Settings → Email."
              />
            </Paper>

            {/* Webhook channel */}
            <Paper variant="outlined" sx={{ p: 2, opacity: isEnabled ? 1 : 0.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                <IconSettings size={16} color={webhookEnabled && isEnabled ? theme.palette.warning.main : theme.palette.text.disabled} />
                <Typography variant="body2" fontWeight={700}>Webhook</Typography>
                <Switch
                  checked={webhookEnabled}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWebhookEnabled(e.target.checked)}
                  size="small"
                  disabled={!isEnabled}
                />
              </Stack>
              <Stack spacing={1.5}>
                <TextField
                  fullWidth size="small" label="Webhook URL"
                  placeholder="https://hooks.example.com/drift-alert"
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  disabled={!isEnabled || !webhookEnabled}
                />
                <TextField
                  fullWidth size="small" label="Webhook secret (HMAC-SHA256)"
                  placeholder="Leave blank to keep existing or skip signing"
                  type="password"
                  value={webhookSecret}
                  onChange={e => setWebhookSecret(e.target.value)}
                  disabled={!isEnabled || !webhookEnabled}
                  helperText="Sent as X-Schema-Drift-Signature: sha256=<hmac>"
                />
              </Stack>
            </Paper>

            {/* Event filters */}
            <Paper variant="outlined" sx={{ p: 2, opacity: isEnabled ? 1 : 0.5 }}>
              <Typography variant="body2" fontWeight={700} mb={1.5}>Trigger Conditions</Typography>
              <Stack spacing={1.5}>
                <FormControl size="small" sx={{ maxWidth: 260 }}>
                  <InputLabel>Minimum severity</InputLabel>
                  <Select
                    label="Minimum severity"
                    value={minSeverity}
                    onChange={e => setMinSeverity(e.target.value as 'critical' | 'high')}
                    disabled={!isEnabled}
                  >
                    <MenuItem value="critical">Critical only</MenuItem>
                    <MenuItem value="high">High + Critical</MenuItem>
                  </Select>
                </FormControl>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <FormControlLabel
                    control={<Switch size="small" checked={notifCritical} onChange={e => setNotifCritical(e.target.checked)} disabled={!isEnabled} />}
                    label={<Typography variant="caption">New Critical findings</Typography>}
                  />
                  <FormControlLabel
                    control={<Switch size="small" checked={notifHigh} onChange={e => setNotifHigh(e.target.checked)} disabled={!isEnabled || minSeverity === 'critical'} />}
                    label={<Typography variant="caption">New High findings</Typography>}
                  />
                  <FormControlLabel
                    control={<Switch size="small" checked={notifSurge} onChange={e => setNotifSurge(e.target.checked)} disabled={!isEnabled} />}
                    label={<Typography variant="caption">Findings surge (&gt;50% spike)</Typography>}
                  />
                </Stack>
                <TextField
                  size="small"
                  label="Cooldown window (minutes)"
                  type="number"
                  value={cooldown}
                  onChange={e => setCooldown(Math.max(0, Math.min(10080, parseInt(e.target.value) || 0)))}
                  disabled={!isEnabled}
                  inputProps={{ min: 0, max: 10080 }}
                  sx={{ maxWidth: 260 }}
                  helperText="Skip delivery if same event type was sent within this window. 0 = no cooldown."
                />
              </Stack>
            </Paper>

            {/* Test results */}
            {testResult && (
              <Alert
                severity={testResult.error ? 'error' : Object.values(testResult).some((r: any) => r?.status === 'failed') ? 'warning' : 'success'}
                onClose={() => setTestResult(null)}
              >
                {testResult.error ? (
                  testResult.error
                ) : (
                  <Box>
                    <Typography variant="caption" fontWeight={700} display="block">Test delivery results:</Typography>
                    {testResult.email && (
                      <Typography variant="caption" display="block">
                        Email: <strong style={{ color: statusColor(testResult.email.status) }}>{testResult.email.status}</strong>
                        {testResult.email.messageId ? ` — messageId=${testResult.email.messageId}` : ''}
                        {testResult.email.detail ? ` — ${testResult.email.detail}` : ''}
                      </Typography>
                    )}
                    {testResult.webhook && (
                      <Typography variant="caption" display="block">
                        Webhook: <strong style={{ color: statusColor(testResult.webhook.status) }}>{testResult.webhook.status}</strong>
                        {testResult.webhook.httpStatus ? ` — HTTP ${testResult.webhook.httpStatus}` : ''}
                        {testResult.webhook.detail ? ` — ${testResult.webhook.detail}` : ''}
                      </Typography>
                    )}
                  </Box>
                )}
              </Alert>
            )}

            {saveError && <Alert severity="error">{saveError}</Alert>}
          </Stack>
        )}

        {deliveryTab === 1 && (
          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
              <Typography variant="caption" color="text.secondary">
                Last {deliveries.length} delivery attempt{deliveries.length !== 1 ? 's' : ''} (most recent first)
              </Typography>
              <Button size="small" variant="text" startIcon={<IconRefresh size={13} />} onClick={onRefreshDeliveries}>
                Refresh
              </Button>
            </Stack>
            {deliveriesLoading ? (
              <Box display="flex" justifyContent="center" p={3}><CircularProgress size={20} /></Box>
            ) : deliveries.length === 0 ? (
              <Alert severity="info">No delivery attempts yet. Enable notifications and trigger a scan with new critical/high findings.</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(theme.palette.grey[500], 0.05) }}>
                      <TableCell>Run</TableCell>
                      <TableCell>Channel</TableCell>
                      <TableCell>Event</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Detail</TableCell>
                      <TableCell>Attempted</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {deliveries.map(d => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                            {d.run_id > 0 ? `#${d.run_id}` : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            {d.channel === 'email'
                              ? <IconMail size={13} color={theme.palette.info.main} />
                              : <IconSettings size={13} color={theme.palette.warning.main} />
                            }
                            <Typography variant="caption">{d.channel}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" fontFamily="monospace">{d.event_type}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={d.status}
                            color={d.status === 'sent' ? 'success' : d.status === 'failed' ? 'error' : 'default'}
                            sx={{ fontSize: '0.65rem' }}
                          />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 260 }}>
                          <Tooltip title={d.detail || ''}>
                            <Typography variant="caption" color="text.secondary"
                              sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {d.detail || '—'}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(d.attempted_at).toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {deliveryTab === 0 && (
          <>
            <Button
              size="small"
              variant="outlined"
              onClick={handleTest}
              disabled={testing || !isEnabled || (!emailEnabled && !webhookEnabled)}
              startIcon={testing ? <CircularProgress size={13} /> : <IconBell size={13} />}
            >
              Send Test
            </Button>
            <Box flex={1} />
            <Button onClick={onClose} disabled={saving}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={13} /> : <IconCheck size={13} />}
            >
              Save
            </Button>
          </>
        )}
        {deliveryTab === 1 && (
          <Button onClick={onClose}>Close</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ─── Scan History Panel ───────────────────────────────────────────────────────

function ScanHistoryPanel({ runs, onRefresh }: { runs: ScanRun[]; onRefresh: () => void }) {
  const theme = useTheme();
  const [deltaRun, setDeltaRun]     = useState<ScanRun | null>(null);
  const [delta, setDelta]           = useState<DeltaSummary | null>(null);
  const [deltaLoading, setDeltaLoading] = useState(false);

  const handleViewDelta = async (run: ScanRun) => {
    if (deltaRun?.id === run.id) { setDeltaRun(null); setDelta(null); return; }
    setDeltaRun(run);
    setDelta(null);
    setDeltaLoading(true);
    try {
      const { data } = await axios.get(`/api/admin/schema-drift/scans/${run.id}/delta`);
      setDelta(data.delta || null);
    } catch (_) { setDelta(null); }
    finally { setDeltaLoading(false); }
  };

  if (runs.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <IconHistory size={32} color={theme.palette.text.disabled} />
        <Typography variant="body2" color="text.secondary" mt={1}>
          No persisted scans yet. Run a scan to populate history.
        </Typography>
        <Button size="small" variant="outlined" startIcon={<IconRefresh size={14} />}
          onClick={onRefresh} sx={{ mt: 1.5 }}>
          Refresh
        </Button>
      </Paper>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Typography variant="body2" fontWeight={600} color="text.secondary">
          {runs.length} scan run{runs.length !== 1 ? 's' : ''} (most recent first)
        </Typography>
        <Button size="small" variant="text" startIcon={<IconRefresh size={13} />} onClick={onRefresh}>
          Refresh
        </Button>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(theme.palette.grey[500], 0.05) }}>
              <TableCell sx={{ width: 50 }}>#</TableCell>
              <TableCell>Triggered By</TableCell>
              <TableCell>Scope</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Started</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell align="right">Raw</TableCell>
              <TableCell align="right">Active</TableCell>
              <TableCell align="right">Suppressed</TableCell>
              <TableCell align="center">Crit / High</TableCell>
              <TableCell align="center">Delta</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {runs.map(run => {
              const durationMs = run.completed_at && run.started_at
                ? new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()
                : null;
              const isSelected = deltaRun?.id === run.id;
              return (
                <React.Fragment key={run.id}>
                  <TableRow
                    sx={{
                      opacity: run.status === 'error' ? 0.55 : 1,
                      bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.05) : undefined,
                    }}
                  >
                    <TableCell>
                      <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                        #{run.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={run.triggered_by === 'scheduler' ? '⏱ scheduler' : `👤 ${run.triggered_by}`}
                        variant="outlined"
                        sx={{ fontSize: '0.65rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" fontFamily="monospace">{run.scope_type}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={run.status}
                        color={run.status === 'complete' ? 'success' : run.status === 'error' ? 'error' : 'default'}
                        sx={{ fontSize: '0.65rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(run.started_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {durationMs !== null ? `${(durationMs / 1000).toFixed(1)}s` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" fontWeight={600}>{run.total_findings_raw}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" fontWeight={600} color={run.total_findings_active > 0 ? SEVERITY_COLOR.high : 'text.secondary'}>
                        {run.total_findings_active}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" color="text.secondary">{run.total_suppressed}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Typography variant="caption" fontWeight={700}
                          color={run.critical_count > 0 ? SEVERITY_COLOR.critical : 'text.disabled'}>
                          {run.critical_count}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">/</Typography>
                        <Typography variant="caption" fontWeight={700}
                          color={run.high_count > 0 ? SEVERITY_COLOR.high : 'text.disabled'}>
                          {run.high_count}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="center">
                      {run.status === 'complete' && (
                        <Tooltip title={isSelected ? 'Hide delta' : 'View delta vs prior run'}>
                          <IconButton size="small" onClick={() => handleViewDelta(run)}
                            color={isSelected ? 'primary' : 'default'}>
                            {isSelected ? <IconTrendingDown size={14} /> : <IconTrendingUp size={14} />}
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                  {isSelected && (
                    <TableRow>
                      <TableCell colSpan={11} sx={{ p: 0, border: 0 }}>
                        <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.03), borderBottom: '1px solid', borderColor: 'divider' }}>
                          {deltaLoading && <CircularProgress size={16} />}
                          {!deltaLoading && !delta && (
                            <Typography variant="caption" color="text.secondary">
                              No prior run with matching scope for comparison.
                            </Typography>
                          )}
                          {!deltaLoading && delta && (
                            <Grid container spacing={1.5}>
                              {[
                                { label: 'New Findings',  value: `+${delta.newCount}`,         color: delta.newCount > 0 ? SEVERITY_COLOR.high : 'text.secondary' },
                                { label: 'Resolved',      value: `-${delta.resolvedCount}`,     color: delta.resolvedCount > 0 ? theme.palette.success.main : 'text.secondary' },
                                { label: 'New Critical',  value: String(delta.newCriticalCount), color: delta.newCriticalCount > 0 ? SEVERITY_COLOR.critical : 'text.secondary' },
                                { label: 'New High',      value: String(delta.newHighCount),     color: delta.newHighCount > 0 ? SEVERITY_COLOR.high : 'text.secondary' },
                              ].map(card => (
                                <Grid key={card.label} size={{ xs: 6, sm: 3 }}>
                                  <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                                    <Typography variant="h6" fontWeight={700} color={card.color}>{card.value}</Typography>
                                    <Typography variant="caption" color="text.secondary">{card.label}</Typography>
                                  </Paper>
                                </Grid>
                              ))}
                              <Grid size={12}>
                                <Typography variant="caption" color="text.secondary">
                                  Compared to run #{delta.priorRunId} · {delta.notificationsCreated} notification{delta.notificationsCreated !== 1 ? 's' : ''} created
                                </Typography>
                              </Grid>
                            </Grid>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ─── Scheduler Panel ──────────────────────────────────────────────────────────

function SchedulerPanel({
  open, config, onClose, onSaved,
}: {
  open:    boolean;
  config:  ScheduleConfig | null;
  onClose: () => void;
  onSaved: (cfg: ScheduleConfig) => void;
}) {
  const [enabled,    setEnabled]    = useState(false);
  const [frequency,  setFrequency]  = useState<'daily' | 'weekly'>('daily');
  const [scopeType,  setScopeType]  = useState('all');
  const [runHour,    setRunHour]    = useState(2);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  React.useEffect(() => {
    if (open && config) {
      setEnabled(!!config.is_enabled);
      setFrequency(config.frequency);
      setScopeType(config.scope_type);
      setRunHour(config.run_hour_utc);
      setError('');
    }
  }, [open, config]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const { data } = await axios.put('/api/admin/schema-drift/schedule', {
        is_enabled:   enabled ? 1 : 0,
        frequency,
        scope_type:   scopeType,
        run_hour_utc: runHour,
      });
      onSaved(data.schedule);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconCalendar size={18} />
            <Typography fontWeight={700}>Scheduled Scans</Typography>
          </Stack>
          <IconButton size="small" onClick={onClose}><IconX size={16} /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <FormControlLabel
            control={
              <Switch
                checked={enabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEnabled(e.target.checked)}
                color="success"
              />
            }
            label={
              <Typography variant="body2" fontWeight={600}>
                {enabled ? 'Scheduled scans enabled' : 'Scheduled scans disabled'}
              </Typography>
            }
          />

          <FormControl fullWidth size="small" disabled={!enabled}>
            <InputLabel>Frequency</InputLabel>
            <Select label="Frequency" value={frequency}
              onChange={e => setFrequency(e.target.value as 'daily' | 'weekly')}>
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" disabled={!enabled}>
            <InputLabel>Scope</InputLabel>
            <Select label="Scope" value={scopeType} onChange={e => setScopeType(e.target.value)}>
              <MenuItem value="all">All (tenants + platform)</MenuItem>
              <MenuItem value="platform_only">Platform DB only</MenuItem>
              <MenuItem value="tenants_only">All tenants only</MenuItem>
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="Run at UTC hour (0–23)"
            type="number"
            value={runHour}
            onChange={e => setRunHour(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
            disabled={!enabled}
            inputProps={{ min: 0, max: 23 }}
            helperText={enabled ? `Runs at ${String(runHour).padStart(2,'0')}:00 UTC ${frequency}` : 'Enable to configure'}
          />

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          startIcon={saving ? <CircularProgress size={14} /> : <IconCalendar size={14} />}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Notifications Dialog ─────────────────────────────────────────────────────

function NotificationsDialog({
  open, notifications, onClose, onRead, onReadAll,
}: {
  open:          boolean;
  notifications: DriftNotification[];
  onClose:       () => void;
  onRead:        (id: number) => void;
  onReadAll:     () => void;
}) {
  const theme = useTheme();
  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconBell size={18} />
            <Typography fontWeight={700}>Drift Notifications</Typography>
            {unread > 0 && <Chip size="small" label={`${unread} unread`} color="error" sx={{ fontSize: '0.65rem' }} />}
          </Stack>
          <Stack direction="row" spacing={0.5}>
            {unread > 0 && (
              <Button size="small" variant="text" onClick={onReadAll} sx={{ fontSize: '0.7rem' }}>
                Mark all read
              </Button>
            )}
            <IconButton size="small" onClick={onClose}><IconX size={16} /></IconButton>
          </Stack>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {notifications.length === 0 ? (
          <Box p={4} textAlign="center">
            <IconBell size={32} color={theme.palette.text.disabled} />
            <Typography variant="body2" color="text.secondary" mt={1}>
              No notifications yet. Notifications appear after delta comparison detects new critical or high findings.
            </Typography>
          </Box>
        ) : (
          <Box>
            {notifications.map(n => (
              <Box
                key={n.id}
                sx={{
                  px: 2, py: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: n.is_read ? undefined : alpha(SEVERITY_COLOR[n.severity] || '#888', 0.04),
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                }}
              >
                <Box sx={{ mt: 0.25 }}>
                  {n.severity === 'critical'
                    ? <IconAlertTriangle size={16} color={SEVERITY_COLOR.critical} />
                    : n.severity === 'high'
                      ? <IconTrendingUp size={16} color={SEVERITY_COLOR.high} />
                      : <IconBell size={16} color={SEVERITY_COLOR[n.severity]} />
                  }
                </Box>
                <Box flex={1}>
                  <Typography variant="caption" fontWeight={n.is_read ? 400 : 700} display="block">
                    {n.title}
                  </Typography>
                  {n.body && (
                    <Typography variant="caption" color="text.secondary" component="pre"
                      sx={{ fontSize: '0.65rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', mt: 0.25 }}>
                      {n.body}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={1} mt={0.5} alignItems="center">
                    <Typography variant="caption" color="text.disabled">
                      Run #{n.run_id} · {new Date(n.created_at).toLocaleString()}
                    </Typography>
                    <SeverityChip severity={n.severity} />
                  </Stack>
                </Box>
                {!n.is_read && (
                  <Tooltip title="Mark as read">
                    <IconButton size="small" onClick={() => onRead(n.id)} sx={{ mt: -0.25 }}>
                      <IconCheck size={13} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Phase 6: Maintenance Panel ───────────────────────────────────────────────

function MaintenancePanel({
  open, lockStatus, retentionConfig, retentionDraft, cleanupResult,
  cleanupHistory, cleanupRunning, maintenanceTab,
  onTabChange, onClose, onRetentionDraftChange, onSaveRetention,
  onRefreshLock, onForceReleaseLock, onRunCleanup,
}: {
  open:                  boolean;
  lockStatus:            { lock: ScanLock | null; isLocked: boolean; isStale: boolean } | null;
  retentionConfig:       RetentionConfig | null;
  retentionDraft:        Partial<RetentionConfig>;
  cleanupResult:         CleanupResult | null;
  cleanupHistory:        CleanupHistoryEntry[];
  cleanupRunning:        boolean;
  maintenanceTab:        number;
  onTabChange:           (t: number) => void;
  onClose:               () => void;
  onRetentionDraftChange:(patch: Partial<RetentionConfig>) => void;
  onSaveRetention:       () => void;
  onRefreshLock:         () => void;
  onForceReleaseLock:    () => void;
  onRunCleanup:          (dryRun: boolean) => void;
}) {
  const theme = useTheme();
  const lock    = lockStatus?.lock   || null;
  const isLocked = lockStatus?.isLocked || false;
  const isStale  = lockStatus?.isStale  || false;

  const numField = (label: string, key: keyof RetentionConfig, helperText: string) => (
    <TextField
      label={label}
      type="number"
      size="small"
      value={retentionDraft[key] ?? ''}
      onChange={e => onRetentionDraftChange({ [key]: parseInt(e.target.value, 10) || 1 })}
      helperText={helperText}
      inputProps={{ min: 1 }}
      sx={{ width: 190 }}
    />
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <IconTool size={18} />
            <Typography fontWeight={700}>Operational Settings &amp; Maintenance</Typography>
          </Stack>
          <IconButton size="small" onClick={onClose}><IconX size={16} /></IconButton>
        </Stack>
        {isLocked && (
          <Alert severity={isStale ? 'warning' : 'info'}
            icon={isStale ? <IconAlertTriangle size={16} /> : <IconLock size={16} />}
            sx={{ mt: 1.5, mb: 0.5, py: 0.5 }}>
            {isStale
              ? `Stale lock detected — scan by "${lock?.locked_by}" appears expired (${new Date(lock!.expires_at).toLocaleString()}). Safe to force-release.`
              : `Scan in progress by "${lock?.locked_by}"${lock?.run_id ? ` (run #${lock.run_id})` : ''} · expires ${new Date(lock!.expires_at).toLocaleString()}`}
          </Alert>
        )}
        <Tabs value={maintenanceTab} onChange={(_, v) => onTabChange(v)} sx={{ mt: 1 }}>
          <Tab label="Lock Status"  icon={<IconLock size={14} />}          iconPosition="start" sx={{ minHeight: 36, textTransform: 'none', fontSize: '0.82rem' }} />
          <Tab label="Retention"    icon={<IconSettings size={14} />}       iconPosition="start" sx={{ minHeight: 36, textTransform: 'none', fontSize: '0.82rem' }} />
          <Tab label="Cleanup"      icon={<IconTrash size={14} />}          iconPosition="start" sx={{ minHeight: 36, textTransform: 'none', fontSize: '0.82rem' }} />
          <Tab label="History"      icon={<IconClipboardList size={14} />}  iconPosition="start" sx={{ minHeight: 36, textTransform: 'none', fontSize: '0.82rem' }} />
        </Tabs>
      </DialogTitle>

      <DialogContent dividers sx={{ minHeight: 320 }}>

        {/* Tab 0: Lock Status */}
        {maintenanceTab === 0 && (
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <Typography variant="subtitle2" fontWeight={700}>Distributed Scan Lock</Typography>
              <Tooltip title="Refresh"><IconButton size="small" onClick={onRefreshLock}><IconRefresh size={14} /></IconButton></Tooltip>
            </Stack>
            {!isLocked ? (
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconLockOpen size={18} color={theme.palette.success.main} />
                  <Typography variant="body2" color="success.main" fontWeight={600}>No active lock — scans can proceed</Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Lock is acquired atomically before each scan and released in a finally block on completion or failure.
                  Expired locks (beyond TTL) are cleared automatically on the next acquire attempt.
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: 2, borderColor: isStale ? 'warning.main' : 'primary.main' }}>
                  <Stack spacing={0.75}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconLock size={16} color={isStale ? theme.palette.warning.main : theme.palette.primary.main} />
                      <Typography variant="body2" fontWeight={700}>{isStale ? 'Stale Lock (expired)' : 'Active Lock'}</Typography>
                      {isStale && <Chip label="STALE" size="small" color="warning" />}
                    </Stack>
                    <Typography variant="caption"><b>Held by:</b> {lock?.locked_by}</Typography>
                    <Typography variant="caption"><b>Run ID:</b> {lock?.run_id ?? 'not yet assigned'}</Typography>
                    <Typography variant="caption"><b>Acquired:</b> {lock ? new Date(lock.locked_at).toLocaleString() : '—'}</Typography>
                    <Typography variant="caption"><b>Expires:</b>  {lock ? new Date(lock.expires_at).toLocaleString() : '—'}</Typography>
                    <Typography variant="caption"><b>Key:</b> <code>{lock?.lock_key}</code></Typography>
                  </Stack>
                </Paper>
                <Alert severity="warning" sx={{ py: 0.5 }}>
                  Only force-release if you are certain the scan that holds this lock has stopped running.
                </Alert>
                <Button variant="outlined" color="warning" size="small" startIcon={<IconLockOpen size={14} />}
                  onClick={onForceReleaseLock} sx={{ alignSelf: 'flex-start' }}>
                  Force-Release Lock
                </Button>
              </Stack>
            )}
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary">
              <b>Lock TTL:</b> {retentionConfig?.scan_lock_ttl_minutes ?? 30} minutes (configurable in Retention tab).
              A scan that crashes without releasing the lock will auto-expire after this window.
            </Typography>
          </Box>
        )}

        {/* Tab 1: Retention Settings */}
        {maintenanceTab === 1 && (
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={2}>Retention Policy</Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
              Snapshots are NULL-ed (not deleted) to preserve run metadata while reducing storage.
              The <b>min_runs_to_keep</b> guard ensures recent history is never deleted regardless of age.
            </Typography>
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                {numField('Scan runs (days)',    'retention_scan_runs_days',    'Delete run rows older than N days')}
                {numField('Snapshots (days)',     'retention_snapshot_days',     'NULL-out snapshot payloads older than N days')}
              </Stack>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                {numField('Delivery log (days)', 'retention_delivery_log_days', 'Delete delivery log rows older than N days')}
                {numField('Notifications (days)','retention_notif_days',        'Delete notification rows older than N days')}
              </Stack>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                {numField('Min runs to keep',    'min_runs_to_keep',            'Never delete the most recent N scan runs')}
                {numField('Lock TTL (min)',       'scan_lock_ttl_minutes',       'Minutes before a scan lock auto-expires')}
              </Stack>
              <FormControlLabel
                control={
                  <Switch size="small"
                    checked={!!(retentionDraft.auto_cleanup_enabled)}
                    onChange={e => onRetentionDraftChange({ auto_cleanup_enabled: e.target.checked ? 1 : 0 })} />
                }
                label={<Typography variant="body2">Run cleanup automatically after each scheduled scan</Typography>}
              />
            </Stack>
            {retentionConfig && (
              <Typography variant="caption" color="text.secondary" display="block" mt={2}>
                Last updated: {retentionConfig.updated_at ? new Date(retentionConfig.updated_at).toLocaleString() : 'never'}
                {retentionConfig.updated_by ? ` by ${retentionConfig.updated_by}` : ''}
              </Typography>
            )}
          </Box>
        )}

        {/* Tab 2: Cleanup */}
        {maintenanceTab === 2 && (
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>Manual Cleanup</Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
              Dry-run previews what would be deleted without making changes.
              The most recent <b>{retentionConfig?.min_runs_to_keep ?? 10} runs</b> are always preserved.
            </Typography>
            <Stack direction="row" spacing={1.5} mb={3}>
              <Button variant="outlined" size="small" startIcon={<IconRefresh size={14} />}
                onClick={() => onRunCleanup(true)} disabled={cleanupRunning}>
                {cleanupRunning ? 'Running…' : 'Dry-Run Preview'}
              </Button>
              <Button variant="contained" color="error" size="small" startIcon={<IconTrash size={14} />}
                onClick={() => onRunCleanup(false)} disabled={cleanupRunning}>
                {cleanupRunning ? 'Cleaning…' : 'Run Cleanup'}
              </Button>
            </Stack>
            {cleanupResult && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {cleanupResult.dryRun ? 'Dry-Run Preview' : 'Cleanup Result'}
                  </Typography>
                  {cleanupResult.dryRun && <Chip label="DRY RUN" size="small" color="info" />}
                  {cleanupResult.errorMessage && <Chip label="ERROR" size="small" color="error" />}
                </Stack>
                {cleanupResult.errorMessage && (
                  <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }}>{cleanupResult.errorMessage}</Alert>
                )}
                <Stack spacing={0.5}>
                  <Typography variant="caption"><b>Scan runs {cleanupResult.dryRun ? 'to delete' : 'deleted'}:</b> {cleanupResult.runsDeleted}</Typography>
                  <Typography variant="caption"><b>Snapshots {cleanupResult.dryRun ? 'to null' : 'nulled'}:</b> {cleanupResult.snapshotsNulled}</Typography>
                  <Typography variant="caption"><b>Delivery log rows {cleanupResult.dryRun ? 'to delete' : 'deleted'}:</b> {cleanupResult.deliveryLogDeleted}</Typography>
                  <Typography variant="caption"><b>Notifications {cleanupResult.dryRun ? 'to delete' : 'deleted'}:</b> {cleanupResult.notifsDeleted}</Typography>
                  <Typography variant="caption" color="text.secondary" mt={0.5}>Executed: {new Date(cleanupResult.executedAt).toLocaleString()}</Typography>
                </Stack>
              </Paper>
            )}
          </Box>
        )}

        {/* Tab 3: Cleanup History */}
        {maintenanceTab === 3 && (
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Cleanup History</Typography>
            {cleanupHistory.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No cleanup runs recorded yet.</Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>By</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Mode</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }} align="right">Runs</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }} align="right">Snapshots</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }} align="right">Deliveries</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }} align="right">Notifs</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cleanupHistory.map(row => (
                      <TableRow key={row.id} hover>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{new Date(row.executed_at).toLocaleString()}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{row.triggered_by}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{row.dry_run ? <Chip label="DRY RUN" size="small" color="info" /> : 'Real'}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }} align="right">{row.runs_deleted}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }} align="right">{row.snapshots_nulled}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }} align="right">{row.delivery_log_deleted}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }} align="right">{row.notifs_deleted}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>
                          {row.error_message ? <Chip label="Error" size="small" color="error" /> : <Chip label="OK" size="small" color="success" />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

      </DialogContent>
      <DialogActions>
        {maintenanceTab === 1 && (
          <Button variant="contained" size="small" onClick={onSaveRetention} sx={{ mr: 'auto' }}>
            Save Retention Settings
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
