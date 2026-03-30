/**
 * Command Center — Prompt Workflow Operations Dashboard
 *
 * Priority-sorted single-screen view of all workflow operations.
 * Sections: ACTION_REQUIRED > BLOCKED > MONITOR > SAFE_TO_IGNORE
 *
 * Provides:
 * - Blocked frontiers with gate explanations
 * - Deterministic classification of all items
 * - Quick actions (Release, Resume, Pause, Manual Only)
 * - Autonomy status panel with explanations
 * - Activity stream with importance filtering
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Collapse,
  LinearProgress,
  Snackbar,
  Alert,
  Divider,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  IconRefresh,
  IconAlertTriangle,
  IconAlertCircle,
  IconShieldCheck,
  IconPlayerPlay,
  IconPlayerPause,
  IconHandStop,
  IconRocket,
  IconEye,
  IconEyeOff,
  IconChevronDown,
  IconChevronRight,
  IconLock,
  IconLockOpen,
  IconActivity,
  IconCircleCheck,
  IconClock,
  IconBolt,
  IconArrowRight,
} from '@tabler/icons-react';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import { apiClient } from '@/api/utils/axiosInstance';

// ─── Types ─────────────────────────────────────────────────────────

type Classification = 'action_required' | 'monitor' | 'safe_to_ignore';
type Severity = 'critical' | 'warning' | 'info';

interface BlockedFrontier {
  workflow_id: number;
  workflow_name: string;
  component: string;
  step_number: number;
  step_title: string;
  prompt_id: number;
  gate_id: string | null;
  explanation: string;
  severity: Severity;
  recommended_action: string | null;
  quality_score: number | null;
}

interface WorkflowItem {
  id: number;
  name: string;
  component: string;
  status: string;
  step_count: number;
  verified: number;
  executing: number;
  blocked: number;
  progress_pct: number;
  has_exceptions: boolean;
  autonomy_paused: boolean;
  autonomy_pause_reason: string | null;
  manual_only: boolean;
  classification: Classification;
  current_step: any;
  steps: any[];
}

interface ExceptionItem {
  id: number;
  title: string;
  component: string;
  queue_status: string;
  escalation_required: boolean;
  degradation_flag: boolean;
  overdue: boolean;
  classification: Classification;
  exception_types: string[];
  blocked_reasons: string[];
}

interface ReadyItem {
  id: number;
  title: string;
  component: string;
  queue_status: string;
  release_mode: string;
  can_auto_release: boolean;
  needs_review: boolean;
  is_overdue: boolean;
  classification: Classification;
}

interface AutonomyStatus {
  current_mode: string;
  enabled: boolean;
  allowed_actions: string[];
  workflow_counts: {
    total_active: number;
    advancing_autonomously: number;
    paused: number;
    manual_only: number;
  };
  paused_workflows: any[];
  recent_advances: any[];
  recent_pauses: any[];
}

interface ActivityEvent {
  timestamp: string;
  level: string;
  source: string;
  message: string;
  importance: string;
}

interface DashboardData {
  generated_at: string;
  summary: any;
  active_workflows: WorkflowItem[];
  exceptions: ExceptionItem[];
  ready_to_release: ReadyItem[];
  blocked_frontiers: BlockedFrontier[];
  autonomy: AutonomyStatus;
  activity: ActivityEvent[];
}

// ─── Color / label helpers ─────────────────────────────────────────

const CLASSIFICATION_CONFIG: Record<Classification, { label: string; color: 'error' | 'warning' | 'success' | 'default'; icon: any }> = {
  action_required: { label: 'ACTION REQUIRED', color: 'error', icon: IconAlertCircle },
  monitor: { label: 'MONITOR', color: 'warning', icon: IconEye },
  safe_to_ignore: { label: 'SAFE TO IGNORE', color: 'success', icon: IconShieldCheck },
};

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: '#d32f2f',
  warning: '#ed6c02',
  info: '#757575',
};

function formatTime(ts: string) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString();
}

// ─── Sub-Components ────────────────────────────────────────────────

/** Classification badge chip */
function ClassBadge({ classification }: { classification: Classification }) {
  const cfg = CLASSIFICATION_CONFIG[classification];
  const Icon = cfg.icon;
  return (
    <Chip
      icon={<Icon size={14} />}
      label={cfg.label}
      color={cfg.color}
      size="small"
      variant="filled"
      sx={{ fontWeight: 700, fontSize: '0.7rem', letterSpacing: 0.5 }}
    />
  );
}

/** Severity indicator dot */
function SeverityDot({ severity }: { severity: Severity }) {
  return (
    <Box
      sx={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        backgroundColor: SEVERITY_COLOR[severity],
        flexShrink: 0,
        mt: 0.5,
      }}
    />
  );
}

// ─── Blocked Frontiers Panel ───────────────────────────────────────

function BlockedFrontiersPanel({
  frontiers,
  onResume,
  onRelease,
}: {
  frontiers: BlockedFrontier[];
  onResume: (wfId: number) => void;
  onRelease: (promptId: number) => void;
}) {
  const theme = useTheme();

  if (frontiers.length === 0) {
    return (
      <Paper sx={{ p: 2, mb: 2, border: `1px solid ${theme.palette.success.main}` }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconCircleCheck size={20} color={theme.palette.success.main} />
          <Typography variant="subtitle2" color="success.main">
            No blocked frontiers — all workflows advancing
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 0, mb: 2, overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.5, bgcolor: alpha(theme.palette.error.main, 0.08) }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconAlertTriangle size={18} color={theme.palette.error.main} />
          <Typography variant="subtitle1" fontWeight={700}>
            Blocked Steps / Frontiers ({frontiers.length})
          </Typography>
        </Stack>
      </Box>
      {frontiers.map((f, i) => (
        <Box
          key={`${f.workflow_id}-${f.step_number}`}
          sx={{
            px: 2,
            py: 1.5,
            borderTop: i > 0 ? `1px solid ${theme.palette.divider}` : undefined,
            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <SeverityDot severity={f.severity} />
            <Box flex={1} minWidth={0}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="body2" fontWeight={600} noWrap>
                  {f.workflow_name}
                </Typography>
                <IconArrowRight size={14} />
                <Typography variant="body2" color="text.secondary" noWrap>
                  Step {f.step_number}: {f.step_title}
                </Typography>
                {f.gate_id && (
                  <Chip label={f.gate_id} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {f.explanation}
              </Typography>
              {f.recommended_action && (
                <Typography variant="caption" color="primary" sx={{ mt: 0.25, display: 'block' }}>
                  Recommended: {f.recommended_action}
                </Typography>
              )}
            </Box>
            <Stack direction="row" spacing={0.5} flexShrink={0}>
              {f.gate_id === 'G10' && (
                <Tooltip title="Resume Workflow">
                  <IconButton size="small" color="success" onClick={() => onResume(f.workflow_id)}>
                    <IconPlayerPlay size={16} />
                  </IconButton>
                </Tooltip>
              )}
              {f.prompt_id && ['G7', 'G13'].includes(f.gate_id || '') && (
                <Tooltip title="Release Now">
                  <IconButton size="small" color="primary" onClick={() => onRelease(f.prompt_id)}>
                    <IconRocket size={16} />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Stack>
        </Box>
      ))}
    </Paper>
  );
}

// ─── Workflow Row ──────────────────────────────────────────────────

function WorkflowRow({
  wf,
  onResume,
  onPause,
  onManualOnly,
}: {
  wf: WorkflowItem;
  onResume: (id: number) => void;
  onPause: (id: number) => void;
  onManualOnly: (id: number, manual: boolean) => void;
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const borderColor = wf.classification === 'action_required'
    ? theme.palette.error.main
    : wf.classification === 'monitor'
      ? theme.palette.warning.main
      : theme.palette.success.main;

  return (
    <Paper
      sx={{
        mb: 1,
        borderLeft: `4px solid ${borderColor}`,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          cursor: 'pointer',
          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          {expanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
          <Box flex={1} minWidth={0}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" fontWeight={600} noWrap>
                {wf.name}
              </Typography>
              <ClassBadge classification={wf.classification} />
              {wf.autonomy_paused && (
                <Chip label="PAUSED" size="small" color="warning" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
              )}
              {wf.manual_only && (
                <Chip label="MANUAL" size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} icon={<IconLock size={12} />} />
              )}
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {wf.component}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {wf.verified}/{wf.step_count} verified
              </Typography>
              {wf.blocked > 0 && (
                <Typography variant="caption" color="error">
                  {wf.blocked} blocked
                </Typography>
              )}
              <Box flex={1} maxWidth={120}>
                <LinearProgress
                  variant="determinate"
                  value={wf.progress_pct}
                  color={wf.blocked > 0 ? 'error' : wf.progress_pct === 100 ? 'success' : 'primary'}
                  sx={{ height: 4, borderRadius: 2 }}
                />
              </Box>
              <Typography variant="caption" fontWeight={600}>
                {wf.progress_pct}%
              </Typography>
            </Stack>
          </Box>
          <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
            {wf.autonomy_paused ? (
              <Tooltip title="Resume Workflow">
                <IconButton size="small" color="success" onClick={() => onResume(wf.id)}>
                  <IconPlayerPlay size={16} />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Pause Autonomy">
                <IconButton size="small" color="warning" onClick={() => onPause(wf.id)}>
                  <IconPlayerPause size={16} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={wf.manual_only ? 'Clear Manual Only' : 'Set Manual Only'}>
              <IconButton size="small" onClick={() => onManualOnly(wf.id, !wf.manual_only)}>
                {wf.manual_only ? <IconLockOpen size={16} /> : <IconLock size={16} />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>
      <Collapse in={expanded}>
        <Divider />
        <Box sx={{ px: 2, py: 1, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
          {wf.autonomy_paused && wf.autonomy_pause_reason && (
            <Typography variant="caption" color="warning.main" display="block" sx={{ mb: 1 }}>
              Why paused: {wf.autonomy_pause_reason}
            </Typography>
          )}
          <Stack spacing={0.5}>
            {wf.steps.map((s: any) => (
              <Stack key={s.step_number} direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" sx={{ width: 24, textAlign: 'right', color: 'text.secondary' }}>
                  #{s.step_number}
                </Typography>
                <Chip
                  label={s.prompt_status || 'pending'}
                  size="small"
                  color={
                    s.prompt_status === 'verified' ? 'success'
                    : s.queue_status === 'blocked' ? 'error'
                    : s.prompt_status === 'executing' ? 'info'
                    : 'default'
                  }
                  variant="outlined"
                  sx={{ fontSize: '0.65rem', height: 18, minWidth: 70 }}
                />
                <Typography variant="caption" noWrap>
                  {s.title}
                </Typography>
                {s.quality_score && (
                  <Typography variant="caption" color="text.secondary">
                    Q:{s.quality_score}
                  </Typography>
                )}
              </Stack>
            ))}
          </Stack>
        </Box>
      </Collapse>
    </Paper>
  );
}

// ─── Ready to Release Row ──────────────────────────────────────────

function ReadyRow({ item, onRelease }: { item: ReadyItem; onRelease: (id: number) => void }) {
  const theme = useTheme();
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{
        px: 2,
        py: 1,
        borderBottom: `1px solid ${theme.palette.divider}`,
        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
      }}
    >
      <ClassBadge classification={item.classification} />
      <Typography variant="body2" fontWeight={500} flex={1} noWrap>
        {item.title}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {item.component}
      </Typography>
      {item.is_overdue && <Chip label="OVERDUE" size="small" color="error" sx={{ fontSize: '0.65rem', height: 20 }} />}
      {item.can_auto_release && <Chip label="Auto" size="small" color="success" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />}
      <Tooltip title="Release Now">
        <IconButton size="small" color="primary" onClick={() => onRelease(item.id)}>
          <IconRocket size={16} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

// ─── Autonomy Status Panel ─────────────────────────────────────────

function AutonomyPanel({ autonomy }: { autonomy: AutonomyStatus }) {
  const theme = useTheme();
  const modeColors: Record<string, string> = {
    OFF: theme.palette.text.disabled,
    RELEASE_ONLY: theme.palette.info.main,
    SAFE_ADVANCE: theme.palette.success.main,
    SUPERVISED_FLOW: theme.palette.primary.main,
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <IconBolt size={18} />
        <Typography variant="subtitle1" fontWeight={700}>
          Autonomy Status
        </Typography>
      </Stack>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <Typography variant="caption" color="text.secondary">Mode</Typography>
          <Typography variant="body2" fontWeight={700} sx={{ color: modeColors[autonomy.current_mode] || 'inherit' }}>
            {autonomy.current_mode}
          </Typography>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Typography variant="caption" color="text.secondary">Allowed Actions</Typography>
          <Typography variant="body2">
            {autonomy.allowed_actions.length > 0 ? autonomy.allowed_actions.join(', ') : 'None'}
          </Typography>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Typography variant="caption" color="text.secondary">Advancing</Typography>
          <Typography variant="body2" fontWeight={600} color="success.main">
            {autonomy.workflow_counts.advancing_autonomously}
          </Typography>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Typography variant="caption" color="text.secondary">Paused</Typography>
          <Typography variant="body2" fontWeight={600} color={autonomy.workflow_counts.paused > 0 ? 'warning.main' : 'text.secondary'}>
            {autonomy.workflow_counts.paused}
          </Typography>
        </Grid>
      </Grid>

      {autonomy.paused_workflows.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" fontWeight={600} color="warning.main">
            Paused Workflows:
          </Typography>
          {autonomy.paused_workflows.map((pw: any) => (
            <Stack key={pw.id} direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <SeverityDot severity="warning" />
              <Typography variant="caption" fontWeight={500}>{pw.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                — {pw.why_paused}
              </Typography>
            </Stack>
          ))}
        </Box>
      )}

      {autonomy.recent_advances.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" fontWeight={600} color="success.main">
            Recent Advances:
          </Typography>
          {autonomy.recent_advances.slice(0, 3).map((a: any, i: number) => (
            <Stack key={i} direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <IconCircleCheck size={12} color={theme.palette.success.main} />
              <Typography variant="caption">{a.target} — {a.why_advanced}</Typography>
              <Typography variant="caption" color="text.secondary">{formatTime(a.timestamp)}</Typography>
            </Stack>
          ))}
        </Box>
      )}

      {autonomy.recent_pauses.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" fontWeight={600} color="warning.main">
            Recent Pauses:
          </Typography>
          {autonomy.recent_pauses.slice(0, 3).map((p: any, i: number) => (
            <Stack key={i} direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 0.5 }}>
              <IconPlayerPause size={12} color={theme.palette.warning.main} style={{ marginTop: 2 }} />
              <Box>
                <Typography variant="caption">{p.workflow} — {p.why_paused}</Typography>
                {p.what_must_change && (
                  <Typography variant="caption" color="primary" display="block">
                    To resume: {p.what_must_change}
                  </Typography>
                )}
              </Box>
            </Stack>
          ))}
        </Box>
      )}
    </Paper>
  );
}

// ─── Activity Stream ───────────────────────────────────────────────

function ActivityStream({ events }: { events: ActivityEvent[] }) {
  const theme = useTheme();
  const [showAll, setShowAll] = useState(false);

  const highEvents = events.filter(e => e.importance === 'high');
  const displayed = showAll ? events : (highEvents.length > 0 ? highEvents : events.slice(0, 5));

  const levelColor = (level: string) => {
    if (level === 'ERROR') return theme.palette.error.main;
    if (level === 'WARN') return theme.palette.warning.main;
    return theme.palette.text.secondary;
  };

  return (
    <Paper sx={{ p: 0, overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconActivity size={16} />
            <Typography variant="subtitle2" fontWeight={700}>Activity Stream</Typography>
            {!showAll && highEvents.length > 0 && (
              <Chip label={`${highEvents.length} important`} size="small" color="warning" variant="outlined" sx={{ fontSize: '0.6rem', height: 18 }} />
            )}
          </Stack>
          <Button size="small" onClick={() => setShowAll(!showAll)} sx={{ fontSize: '0.7rem' }}>
            {showAll ? 'Show Important' : 'Show All'}
          </Button>
        </Stack>
      </Box>
      <Divider />
      {displayed.slice(0, 15).map((e, i) => (
        <Box
          key={i}
          sx={{
            px: 2,
            py: 0.75,
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: e.importance === 'high' ? alpha(theme.palette.warning.main, 0.04) : 'transparent',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" sx={{ color: levelColor(e.level), fontWeight: 600, minWidth: 35 }}>
              {e.level}
            </Typography>
            <Typography variant="caption" flex={1} noWrap>
              {e.message}
            </Typography>
            <Typography variant="caption" color="text.secondary" flexShrink={0}>
              {formatTime(e.timestamp)}
            </Typography>
          </Stack>
        </Box>
      ))}
      {events.length === 0 && (
        <Box sx={{ px: 2, py: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">No recent activity</Typography>
        </Box>
      )}
    </Paper>
  );
}

// ─── Progression Pipeline Panel ──────────────────────────────────────

function ProgressionPanel() {
  const theme = useTheme();
  const [pipeline, setPipeline] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const fetchPipeline = useCallback(async () => {
    try {
      const res = await apiClient.get('/workflows/progression/pipeline');
      setPipeline(res.data);
    } catch {
      // Silently handle — panel is supplementary
    }
  }, []);

  useEffect(() => {
    fetchPipeline();
    const interval = setInterval(fetchPipeline, 30000);
    return () => clearInterval(interval);
  }, [fetchPipeline]);

  const handleRunProgression = async () => {
    setRunning(true);
    try {
      const res = await apiClient.post('/workflows/progression/run');
      const d = res.data;
      setLastResult(`${d.advanced} advanced, ${d.skipped} skipped`);
      fetchPipeline();
    } catch (err: any) {
      setLastResult(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const blocked = pipeline?.blocked;
  const hasBlocked = blocked && (blocked.by_audit > 0 || blocked.by_manual_approval > 0 || blocked.pending_release > 0);

  return (
    <Paper sx={{ mb: 2, overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.5, bgcolor: alpha(theme.palette.info.main, 0.06) }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconArrowRight size={16} color={theme.palette.info.main} />
            <Typography variant="subtitle2" fontWeight={700}>Progression Pipeline</Typography>
          </Stack>
          <Tooltip title="Run progression cycle">
            <span>
              <IconButton size="small" onClick={handleRunProgression} disabled={running}>
                {running ? <CircularProgress size={14} /> : <IconBolt size={14} />}
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Box>
      <Divider />
      <Box sx={{ px: 2, py: 1.5 }}>
        {blocked && (
          <Stack spacing={0.75}>
            {blocked.by_audit > 0 && (
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">Blocked by audit</Typography>
                <Chip label={blocked.by_audit} size="small" color="warning" sx={{ height: 18, fontSize: '0.65rem' }} />
              </Stack>
            )}
            {blocked.by_manual_approval > 0 && (
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">Awaiting manual approval</Typography>
                <Chip label={blocked.by_manual_approval} size="small" color="default" sx={{ height: 18, fontSize: '0.65rem' }} />
              </Stack>
            )}
            {blocked.pending_release > 0 && (
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">Pending release</Typography>
                <Chip label={blocked.pending_release} size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
              </Stack>
            )}
            {!hasBlocked && (
              <Typography variant="caption" color="success.main">All clear — no blocked prompts</Typography>
            )}
          </Stack>
        )}
        {lastResult && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Last run: {lastResult}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

// ─── Executive Summary Bar ─────────────────────────────────────────

function SummaryBar({ summary }: { summary: any }) {
  const theme = useTheme();
  if (!summary) return null;

  const items = [
    { label: 'Active Workflows', value: summary.workflows?.active || 0, color: theme.palette.primary.main },
    { label: 'Exceptions', value: summary.exceptions?.total || 0, color: summary.exceptions?.total > 0 ? theme.palette.error.main : theme.palette.success.main },
    { label: 'Blocked', value: summary.exceptions?.blocked || 0, color: summary.exceptions?.blocked > 0 ? theme.palette.error.main : theme.palette.text.secondary },
    { label: 'Overdue', value: summary.exceptions?.overdue || 0, color: summary.exceptions?.overdue > 0 ? theme.palette.warning.main : theme.palette.text.secondary },
    { label: 'Ready to Release', value: summary.queue?.ready_for_release || 0, color: theme.palette.info.main },
  ];

  return (
    <Paper sx={{ px: 2, py: 1.5, mb: 2 }}>
      <Stack direction="row" spacing={3} justifyContent="space-around" flexWrap="wrap">
        {items.map(it => (
          <Stack key={it.label} alignItems="center" spacing={0.25}>
            <Typography variant="h5" fontWeight={700} sx={{ color: it.color }}>
              {it.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {it.label}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}

// ─── Main Component ────────────────────────────────────────────────

const CommandCenterPage: React.FC = () => {
  const theme = useTheme();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [safeCollapsed, setSafeCollapsed] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/workflows/dashboard');
      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  // ─── Quick Actions ─────────────────────────────────────────────

  const handleRelease = async (promptId: number) => {
    try {
      await apiClient.post('/workflows/auto-execution/run');
      setSnackbar({ message: `Release triggered for prompt ${promptId}`, severity: 'success' });
      fetchDashboard();
    } catch (err: any) {
      setSnackbar({ message: err.message || 'Release failed', severity: 'error' });
    }
  };

  const handleResume = async (workflowId: number) => {
    try {
      await apiClient.post(`/workflows/${workflowId}/autonomy/resume`);
      setSnackbar({ message: `Workflow ${workflowId} resumed`, severity: 'success' });
      fetchDashboard();
    } catch (err: any) {
      setSnackbar({ message: err.message || 'Resume failed', severity: 'error' });
    }
  };

  const handlePause = async (workflowId: number) => {
    try {
      await apiClient.post(`/workflows/${workflowId}/autonomy/pause`, { reason: 'Paused by operator from Command Center' });
      setSnackbar({ message: `Workflow ${workflowId} paused`, severity: 'success' });
      fetchDashboard();
    } catch (err: any) {
      setSnackbar({ message: err.message || 'Pause failed', severity: 'error' });
    }
  };

  const handleManualOnly = async (workflowId: number, manual: boolean) => {
    try {
      await apiClient.post(`/workflows/${workflowId}/manual-only`, { manual_only: manual, target_type: 'workflow' });
      setSnackbar({ message: `Workflow ${workflowId} ${manual ? 'set to manual' : 'autonomy enabled'}`, severity: 'success' });
      fetchDashboard();
    } catch (err: any) {
      setSnackbar({ message: err.message || 'Update failed', severity: 'error' });
    }
  };

  // ─── Grouping ──────────────────────────────────────────────────

  const actionRequired = data?.active_workflows.filter(w => w.classification === 'action_required') || [];
  const monitored = data?.active_workflows.filter(w => w.classification === 'monitor') || [];
  const safeToIgnore = data?.active_workflows.filter(w => w.classification === 'safe_to_ignore') || [];

  // ─── Render ────────────────────────────────────────────────────

  if (loading && !data) {
    return (
      <PageContainer title="Command Center" description="Workflow Operations Dashboard">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Command Center" description="Workflow Operations Dashboard">
      <Breadcrumb title="Command Center" items={[{ title: 'Devel Tools' }, { title: 'Command Center' }]} />

      {/* Refresh bar */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {data ? `Updated ${formatTime(data.generated_at)}` : ''}
        </Typography>
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={fetchDashboard} disabled={loading}>
            <IconRefresh size={16} />
          </IconButton>
        </Tooltip>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {data && (
        <>
          {/* Executive Summary */}
          <SummaryBar summary={data.summary} />

          <Grid container spacing={2}>
            <Grid item xs={12} lg={8}>
              {/* Blocked Frontiers — top priority */}
              <BlockedFrontiersPanel
                frontiers={data.blocked_frontiers}
                onResume={handleResume}
                onRelease={handleRelease}
              />

              {/* ACTION REQUIRED workflows */}
              {actionRequired.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <IconAlertCircle size={16} color={theme.palette.error.main} />
                    <Typography variant="subtitle2" color="error" fontWeight={700}>
                      ACTION REQUIRED ({actionRequired.length})
                    </Typography>
                  </Stack>
                  {actionRequired.map(wf => (
                    <WorkflowRow key={wf.id} wf={wf} onResume={handleResume} onPause={handlePause} onManualOnly={handleManualOnly} />
                  ))}
                </Box>
              )}

              {/* MONITOR workflows */}
              {monitored.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <IconEye size={16} color={theme.palette.warning.main} />
                    <Typography variant="subtitle2" color="warning.main" fontWeight={700}>
                      MONITOR ({monitored.length})
                    </Typography>
                  </Stack>
                  {monitored.map(wf => (
                    <WorkflowRow key={wf.id} wf={wf} onResume={handleResume} onPause={handlePause} onManualOnly={handleManualOnly} />
                  ))}
                </Box>
              )}

              {/* SAFE TO IGNORE — collapsed by default */}
              {safeToIgnore.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ mb: 1, cursor: 'pointer' }}
                    onClick={() => setSafeCollapsed(!safeCollapsed)}
                  >
                    {safeCollapsed ? <IconChevronRight size={16} /> : <IconChevronDown size={16} />}
                    <IconShieldCheck size={16} color={theme.palette.success.main} />
                    <Typography variant="subtitle2" color="success.main" fontWeight={700}>
                      SAFE TO IGNORE ({safeToIgnore.length})
                    </Typography>
                  </Stack>
                  <Collapse in={!safeCollapsed}>
                    {safeToIgnore.map(wf => (
                      <WorkflowRow key={wf.id} wf={wf} onResume={handleResume} onPause={handlePause} onManualOnly={handleManualOnly} />
                    ))}
                  </Collapse>
                </Box>
              )}

              {/* Ready to Release */}
              {data.ready_to_release.length > 0 && (
                <Paper sx={{ mb: 2, overflow: 'hidden' }}>
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <IconRocket size={16} />
                      <Typography variant="subtitle2" fontWeight={700}>
                        Ready to Release ({data.ready_to_release.length})
                      </Typography>
                    </Stack>
                  </Box>
                  <Divider />
                  {data.ready_to_release.map(item => (
                    <ReadyRow key={item.id} item={item} onRelease={handleRelease} />
                  ))}
                </Paper>
              )}

              {/* Exceptions */}
              {data.exceptions.length > 0 && (
                <Paper sx={{ mb: 2, overflow: 'hidden' }}>
                  <Box sx={{ px: 2, py: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.06) }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <IconAlertTriangle size={16} color={theme.palette.warning.main} />
                      <Typography variant="subtitle2" fontWeight={700}>
                        Exceptions ({data.exceptions.length})
                      </Typography>
                    </Stack>
                  </Box>
                  <Divider />
                  {data.exceptions.map(exc => (
                    <Box key={exc.id} sx={{ px: 2, py: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <ClassBadge classification={exc.classification} />
                        <Typography variant="body2" fontWeight={500} flex={1} noWrap>
                          {exc.title}
                        </Typography>
                        <Stack direction="row" spacing={0.5}>
                          {exc.exception_types.map(t => (
                            <Chip
                              key={t}
                              label={t}
                              size="small"
                              color={t === 'escalated' ? 'error' : t === 'blocked' ? 'error' : 'warning'}
                              variant="outlined"
                              sx={{ fontSize: '0.6rem', height: 18 }}
                            />
                          ))}
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Paper>
              )}
            </Grid>

            <Grid item xs={12} lg={4}>
              {/* Autonomy Status Panel */}
              {data.autonomy && <AutonomyPanel autonomy={data.autonomy} />}

              {/* Progression Pipeline Panel */}
              <ProgressionPanel />

              {/* Activity Stream */}
              <ActivityStream events={data.activity} />
            </Grid>
          </Grid>
        </>
      )}

      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {snackbar ? (
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)}>
            {snackbar.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </PageContainer>
  );
};

export default CommandCenterPage;
