/**
 * OverviewTab.tsx
 * Extracted from OMDailyPage.tsx — renders the dashboard overview tab
 * with KPI cards, charts, phase tracking, and GitHub sync.
 */

import React from 'react';
import {
  ArrowForward as ArrowForwardIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  Flag as FlagIcon,
  OpenInNew as OpenInNewIcon,
  Inventory2 as PackageIcon,
  PlayArrow as PlayArrowIcon,
  Schedule as ScheduleIcon,
  Sync as SyncIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  LinearProgress,
  Paper,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

import type { DashboardData, ExtendedDashboard, GitHubSyncStatus } from './types';
import {
  AGENT_TOOL_COLORS,
  AGENT_TOOL_LABELS,
  HORIZON_LABELS,
  HORIZONS,
  PRIORITY_COLORS,
  STATUS_COLORS,
  STATUS_LABELS,
  formatDate,
  formatShortDate,
  timeAgo,
} from './constants';

// ─── Bar Chart Component ─────────────────────────────────────────

const HBar: React.FC<{ label: string; value: number; max: number; color: string; isDark: boolean; suffix?: string }> = ({ label, value, max, color, isDark, suffix }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.8 }}>
    <Typography variant="caption" sx={{ width: 80, textAlign: 'right', color: 'text.secondary', fontSize: '0.72rem', flexShrink: 0 }}>{label}</Typography>
    <Box sx={{ flex: 1, height: 18, bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderRadius: 1, overflow: 'hidden', position: 'relative' }}>
      <Box sx={{ width: max > 0 ? `${Math.max((value / max) * 100, 2)}%` : '0%', height: '100%', bgcolor: alpha(color, 0.7), borderRadius: 1, transition: 'width 0.4s ease' }} />
    </Box>
    <Typography variant="caption" sx={{ width: 32, fontWeight: 700, color, fontSize: '0.75rem', flexShrink: 0 }}>{value}{suffix}</Typography>
  </Box>
);

// ─── Spark Line (mini chart) ─────────────────────────────────────

const SparkLine: React.FC<{ data: { date: string; count: number }[]; color: string; height?: number }> = ({ data, color, height = 40 }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = height - (d.count / max) * (height - 4);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = height - (d.count / max) * (height - 4);
        return <circle key={i} cx={x} cy={y} r="2" fill={color} vectorEffect="non-scaling-stroke" />;
      })}
    </svg>
  );
};

// ─── Types ───────────────────────────────────────────────────────

interface GhSyncProgress {
  phase: string;
  current: number;
  total: number;
  summary: any;
  error: string | null;
}

interface ChangeSetListItem {
  change_set_id: number;
  code: string;
  title: string;
  status: string;
}

export interface OverviewTabProps {
  dashboard: DashboardData | null;
  extended: ExtendedDashboard | null;
  expandedPhase: string | null;
  setExpandedPhase: (key: string | null) => void;
  ghStatus: GitHubSyncStatus | null;
  ghSyncing: boolean;
  ghSyncProgress: GhSyncProgress | null;
  triggerGhSync: () => void;
  csList: ChangeSetListItem[];
  setFilterStatus: (val: string) => void;
  setFilterDue: (val: string) => void;
  setSelectedHorizon: (val: string) => void;
  setActiveTab: (val: number) => void;
}

// ─── Render Helpers ──────────────────────────────────────────────

const renderStatusChip = (status: string) => (
  <Chip size="small" label={STATUS_LABELS[status] || status}
    sx={{ bgcolor: alpha(STATUS_COLORS[status] || '#999', 0.15), color: STATUS_COLORS[status] || '#999', fontWeight: 600, fontSize: '0.68rem', height: 22 }} />
);

const renderPriorityChip = (priority: string) => (
  <Chip size="small" label={priority}
    sx={{ bgcolor: alpha(PRIORITY_COLORS[priority] || '#999', 0.15), color: PRIORITY_COLORS[priority] || '#999', fontWeight: 600, fontSize: '0.68rem', height: 20, textTransform: 'capitalize' }} />
);

// ─── Component ───────────────────────────────────────────────────

const OverviewTab: React.FC<OverviewTabProps> = ({
  dashboard,
  extended,
  expandedPhase,
  setExpandedPhase,
  ghStatus,
  ghSyncing,
  ghSyncProgress,
  triggerGhSync,
  csList,
  setFilterStatus,
  setFilterDue,
  setSelectedHorizon,
  setActiveTab,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();

  if (!dashboard) return <CircularProgress />;

  const totalAll = Object.values(dashboard.horizons).reduce((sum, h) => sum + h.total, 0);
  const totalDone = Object.values(dashboard.horizons).reduce((sum, h) => sum + (h.statuses?.done || 0), 0);
  const overallPct = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;

  return (
    <Box>
      {/* -- Top KPI Row -- */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 2, mb: 3 }}>
        {[
          { value: dashboard.totalActive, label: 'Active Items', color: '#1976d2', icon: <AssignmentIcon sx={{ fontSize: 20 }} />, action: () => { setFilterStatus(''); setFilterDue(''); setSelectedHorizon(''); setActiveTab(1); } },
          { value: dashboard.overdue, label: 'Overdue', color: '#f44336', icon: <WarningIcon sx={{ fontSize: 20 }} />, action: dashboard.overdue > 0 ? () => { setFilterStatus(''); setFilterDue('overdue'); setSelectedHorizon(''); setActiveTab(1); } : undefined },
          { value: dashboard.dueToday, label: 'Due Today', color: '#ff9800', icon: <ScheduleIcon sx={{ fontSize: 20 }} />, action: dashboard.dueToday > 0 ? () => { setFilterStatus(''); setFilterDue('today'); setSelectedHorizon(''); setActiveTab(1); } : undefined },
          { value: dashboard.recentlyCompleted, label: 'Done (7d)', color: '#4caf50', icon: <CheckCircleIcon sx={{ fontSize: 20 }} />, action: () => { setFilterDue(''); setFilterStatus('done'); setSelectedHorizon(''); setActiveTab(1); } },
          { value: `${overallPct}%`, label: 'Overall Progress', color: '#8c249d', icon: <TrendingUpIcon sx={{ fontSize: 20 }} /> },
        ].map((kpi, i) => (
          <Paper key={i} onClick={kpi.action} sx={{ p: 2, textAlign: 'center', border: `1px solid ${isDark ? '#333' : '#e8e8e8'}`, cursor: kpi.action ? 'pointer' : 'default', transition: 'all 0.15s', '&:hover': kpi.action ? { borderColor: kpi.color, transform: 'translateY(-1px)' } : {} }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5, color: kpi.color }}>
              {kpi.icon}
            </Box>
            <Typography variant="h3" sx={{ color: kpi.color, fontWeight: 700 }}>{kpi.value}</Typography>
            <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* -- Two-column layout: Focus + Charts -- */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, mb: 3 }}>

        {/* LEFT: Currently In Progress */}
        <Paper sx={{ p: 2.5, border: `1px solid ${isDark ? '#333' : '#e8e8e8'}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <PlayArrowIcon sx={{ color: '#ff9800', fontSize: 20 }} />
            <Typography variant="subtitle1" fontWeight={700}>In Progress</Typography>
            <Chip size="small" label={extended?.inProgressItems?.length || 0} sx={{ height: 20, fontSize: '0.7rem', bgcolor: alpha('#ff9800', 0.12), color: '#ff9800', fontWeight: 700 }} />
          </Box>
          {extended?.inProgressItems && extended.inProgressItems.length > 0 ? (
            <Box>
              {extended.inProgressItems.slice(0, 8).map((item) => (
                <Box key={item.id} onClick={() => { setFilterStatus('in_progress'); setFilterDue(''); setSelectedHorizon(''); setActiveTab(1); }} sx={{
                  display: 'flex', alignItems: 'center', gap: 1, py: 1, cursor: 'pointer',
                  borderBottom: `1px solid ${isDark ? '#222' : '#f0f0f0'}`,
                  '&:last-child': { borderBottom: 'none' },
                  '&:hover': { bgcolor: alpha('#ff9800', 0.06) },
                }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: PRIORITY_COLORS[item.priority] || '#999', flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.84rem' }}>{item.title}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.3 }}>
                      {item.category && <Chip size="small" label={item.category} sx={{ height: 16, fontSize: '0.6rem' }} />}
                      <Chip size="small" label={HORIZON_LABELS[item.horizon]} sx={{ height: 16, fontSize: '0.6rem', bgcolor: alpha('#00897b', 0.1), color: '#00897b' }} />
                      {item.agent_tool && (
                        <Chip size="small" label={AGENT_TOOL_LABELS[item.agent_tool] || item.agent_tool}
                          sx={{ height: 16, fontSize: '0.6rem', bgcolor: alpha(AGENT_TOOL_COLORS[item.agent_tool] || '#666', 0.12), color: AGENT_TOOL_COLORS[item.agent_tool] || '#666' }} />
                      )}
                    </Box>
                  </Box>
                  {item.due_date && (
                    <Typography variant="caption" color={new Date(item.due_date) < new Date() ? 'error.main' : 'text.secondary'} sx={{ fontSize: '0.68rem', flexShrink: 0 }}>
                      {formatShortDate(item.due_date)}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">No items currently in progress</Typography>
          )}
        </Paper>

        {/* RIGHT: Status & Priority Charts */}
        <Paper sx={{ p: 2.5, border: `1px solid ${isDark ? '#333' : '#e8e8e8'}` }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Status Distribution</Typography>
          {extended?.statusDistribution ? (
            <Box sx={{ mb: 2.5 }}>
              {(() => {
                const maxVal = Math.max(...extended.statusDistribution.map(s => s.count), 1);
                return extended.statusDistribution.map((s) => (
                  <HBar key={s.status} label={STATUS_LABELS[s.status] || s.status} value={s.count} max={maxVal} color={STATUS_COLORS[s.status] || '#999'} isDark={isDark} />
                ));
              })()}
            </Box>
          ) : <CircularProgress size={20} />}

          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Priority (Active)</Typography>
          {extended?.priorityDistribution ? (
            <Box>
              {(() => {
                const maxVal = Math.max(...extended.priorityDistribution.map(p => p.count), 1);
                return extended.priorityDistribution.map((p) => (
                  <HBar key={p.priority} label={p.priority} value={p.count} max={maxVal} color={PRIORITY_COLORS[p.priority] || '#999'} isDark={isDark} />
                ));
              })()}
            </Box>
          ) : <CircularProgress size={20} />}
        </Paper>
      </Box>

      {/* -- Velocity + Due Soon Row -- */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, mb: 3 }}>

        {/* Velocity chart */}
        <Paper sx={{ p: 2.5, border: `1px solid ${isDark ? '#333' : '#e8e8e8'}` }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Completion Velocity (14d)</Typography>
          {extended?.velocity && extended.velocity.length > 1 ? (
            <Box>
              <SparkLine data={extended.velocity} color="#4caf50" height={50} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">{formatShortDate(extended.velocity[0]?.date)}</Typography>
                <Typography variant="caption" color="text.secondary">{formatShortDate(extended.velocity[extended.velocity.length - 1]?.date)}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Avg: {(extended.velocity.reduce((s, v) => s + v.count, 0) / extended.velocity.length).toFixed(1)} items/day
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">Not enough data yet</Typography>
          )}
        </Paper>

        {/* Due Soon */}
        <Paper sx={{ p: 2.5, border: `1px solid ${isDark ? '#333' : '#e8e8e8'}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <ScheduleIcon sx={{ color: '#ff9800', fontSize: 20 }} />
            <Typography variant="subtitle1" fontWeight={700}>Due This Week</Typography>
          </Box>
          {extended?.dueSoon && extended.dueSoon.length > 0 ? (
            <Box>
              {extended.dueSoon.slice(0, 6).map((item) => (
                <Box key={item.id} onClick={() => { setFilterDue('soon'); setFilterStatus(''); setSelectedHorizon(''); setActiveTab(1); }} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.8, cursor: 'pointer', borderBottom: `1px solid ${isDark ? '#222' : '#f0f0f0'}`, '&:last-child': { borderBottom: 'none' }, '&:hover': { bgcolor: alpha('#ff9800', 0.06) } }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: PRIORITY_COLORS[item.priority] || '#999', flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ flex: 1, fontSize: '0.82rem' }} noWrap>{item.title}</Typography>
                  {renderStatusChip(item.status)}
                  <Typography variant="caption" sx={{ color: new Date(item.due_date) <= new Date() ? '#f44336' : '#ff9800', fontWeight: 600, fontSize: '0.7rem', flexShrink: 0 }}>
                    {formatShortDate(item.due_date)}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">No items due this week</Typography>
          )}
        </Paper>
      </Box>

      {/* -- Change Set Pipeline -- */}
      {csList.length > 0 && (
        <Paper sx={{ p: 2.5, mb: 3, border: `1px solid ${isDark ? '#333' : '#e8e8e8'}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PackageIcon sx={{ color: '#9c27b0', fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={700}>Change Set Pipeline</Typography>
            </Box>
            <Button size="small" onClick={() => navigate('/admin/control-panel/om-daily/change-sets')}>View All</Button>
          </Box>
          {csList.filter(cs => ['staged', 'in_review', 'approved', 'ready_for_staging', 'active'].includes(cs.status)).length === 0 ? (
            <Typography variant="body2" color="text.secondary">No change sets need attention</Typography>
          ) : (
            <Box>
              {csList.filter(cs => ['staged', 'in_review', 'approved', 'ready_for_staging', 'active'].includes(cs.status)).map(cs => (
                <Box key={cs.change_set_id} onClick={() => navigate(`/admin/control-panel/om-daily/change-sets/${cs.change_set_id}`)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, cursor: 'pointer', borderBottom: `1px solid ${isDark ? '#222' : '#f0f0f0'}`, '&:last-child': { borderBottom: 'none' }, '&:hover': { bgcolor: alpha('#9c27b0', 0.04) } }}>
                  <Chip size="small" label={cs.status.replace(/_/g, ' ')} sx={{
                    fontSize: '0.65rem', height: 20, fontWeight: 600,
                    bgcolor: cs.status === 'in_review' ? alpha('#0288d1', 0.12) : cs.status === 'approved' ? alpha('#2e7d32', 0.12) : cs.status === 'staged' ? alpha('#9c27b0', 0.12) : cs.status === 'ready_for_staging' ? alpha('#ed6c02', 0.12) : alpha('#1976d2', 0.12),
                    color: cs.status === 'in_review' ? '#0288d1' : cs.status === 'approved' ? '#2e7d32' : cs.status === 'staged' ? '#9c27b0' : cs.status === 'ready_for_staging' ? '#ed6c02' : '#1976d2',
                  }} />
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#9c27b0', fontWeight: 600 }}>{cs.code}</Typography>
                  <Typography variant="body2" sx={{ flex: 1 }} noWrap>{cs.title}</Typography>
                  <ArrowForwardIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      )}

      {/* -- Phase Tracking -- */}
      {extended?.phaseGroups && extended.phaseGroups.length > 0 && (
        <Paper sx={{ p: 2.5, mb: 3, border: `1px solid ${isDark ? '#333' : '#e8e8e8'}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FlagIcon sx={{ color: '#8c249d', fontSize: 20 }} />
            <Typography variant="subtitle1" fontWeight={700}>Phase Tracking</Typography>
            <Typography variant="caption" color="text.secondary">Multi-step projects</Typography>
          </Box>
          {extended.phaseGroups.map((group) => {
            const pct = group.total > 0 ? Math.round((group.done_count / group.total) * 100) : 0;
            const key = `${group.source}-${group.category}`;
            const isExpanded = expandedPhase === key;
            const phaseItems = group.items_summary ? group.items_summary.split('||').map(s => {
              const [id, title, status, priority] = s.split(':');
              return { id: Number(id), title, status, priority };
            }) : [];

            return (
              <Box key={key} sx={{ mb: 1.5, '&:last-child': { mb: 0 } }}>
                <Box
                  onClick={() => setExpandedPhase(isExpanded ? null : key)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', py: 1, px: 1, borderRadius: 1, '&:hover': { bgcolor: alpha('#8c249d', 0.04) } }}
                >
                  <ExpandMoreIcon sx={{ fontSize: 18, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: '0.2s', color: 'text.secondary' }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.88rem' }}>
                      {group.category || group.source}
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        via {group.source}
                      </Typography>
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <LinearProgress variant="determinate" value={pct} sx={{ flex: 1, height: 6, borderRadius: 3, maxWidth: 200 }} />
                      <Typography variant="caption" fontWeight={600} sx={{ color: pct === 100 ? '#4caf50' : '#ff9800' }}>{pct}%</Typography>
                    </Box>
                  </Box>
                  <Chip size="small" label={`${group.done_count}/${group.total} done`} sx={{ height: 22, fontSize: '0.7rem', bgcolor: alpha(pct === 100 ? '#4caf50' : '#ff9800', 0.12), color: pct === 100 ? '#4caf50' : '#ff9800', fontWeight: 600 }} />
                  {group.active_count > 0 && (
                    <Chip size="small" label={`${group.active_count} active`} sx={{ height: 22, fontSize: '0.7rem', bgcolor: alpha('#2196f3', 0.12), color: '#2196f3', fontWeight: 600 }} />
                  )}
                </Box>
                <Collapse in={isExpanded}>
                  <Box sx={{ pl: 5, pr: 1, py: 1 }}>
                    {phaseItems.map((pi, idx) => (
                      <Box key={pi.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.6, borderBottom: idx < phaseItems.length - 1 ? `1px solid ${isDark ? '#222' : '#f0f0f0'}` : 'none' }}>
                        {pi.status === 'done' ? (
                          <CheckCircleIcon sx={{ fontSize: 16, color: '#4caf50' }} />
                        ) : pi.status === 'in_progress' ? (
                          <PlayArrowIcon sx={{ fontSize: 16, color: '#ff9800' }} />
                        ) : (
                          <Box sx={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${isDark ? '#555' : '#ccc'}` }} />
                        )}
                        <Typography variant="body2" sx={{
                          flex: 1, fontSize: '0.82rem',
                          textDecoration: pi.status === 'done' ? 'line-through' : 'none',
                          opacity: pi.status === 'done' ? 0.6 : 1,
                        }}>
                          {pi.title}
                        </Typography>
                        {renderStatusChip(pi.status)}
                        {renderPriorityChip(pi.priority)}
                      </Box>
                    ))}
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Paper>
      )}

      {/* -- Category Breakdown + Recent Activity Row -- */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, mb: 3 }}>

        {/* Category Breakdown */}
        <Paper sx={{ p: 2.5, border: `1px solid ${isDark ? '#333' : '#e8e8e8'}` }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Categories</Typography>
          {extended?.categoryBreakdown && extended.categoryBreakdown.length > 0 ? (
            <Box>
              {(() => {
                const maxVal = Math.max(...extended.categoryBreakdown.map(c => c.count), 1);
                return extended.categoryBreakdown.slice(0, 10).map((c) => (
                  <Box key={c.category} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.8 }}>
                    <Typography variant="caption" sx={{ width: 100, textAlign: 'right', color: 'text.secondary', fontSize: '0.72rem', flexShrink: 0 }} noWrap>{c.category}</Typography>
                    <Box sx={{ flex: 1, height: 18, bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderRadius: 1, overflow: 'hidden', position: 'relative' }}>
                      <Box sx={{ position: 'absolute', width: maxVal > 0 ? `${(c.count / maxVal) * 100}%` : '0%', height: '100%', bgcolor: alpha('#8c249d', 0.15), borderRadius: 1 }} />
                      <Box sx={{ position: 'absolute', width: maxVal > 0 ? `${(c.done_count / maxVal) * 100}%` : '0%', height: '100%', bgcolor: alpha('#4caf50', 0.5), borderRadius: 1 }} />
                    </Box>
                    <Typography variant="caption" sx={{ width: 50, fontWeight: 600, fontSize: '0.7rem', color: 'text.secondary', flexShrink: 0 }}>
                      {c.done_count}/{c.count}
                    </Typography>
                  </Box>
                ));
              })()}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">No categories yet</Typography>
          )}
        </Paper>

        {/* Recent Completions */}
        <Paper sx={{ p: 2.5, border: `1px solid ${isDark ? '#333' : '#e8e8e8'}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
            <Typography variant="subtitle1" fontWeight={700}>Recently Completed</Typography>
          </Box>
          {extended?.recentCompleted && extended.recentCompleted.length > 0 ? (
            <Box>
              {extended.recentCompleted.slice(0, 8).map((item) => (
                <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.7, borderBottom: `1px solid ${isDark ? '#222' : '#f0f0f0'}`, '&:last-child': { borderBottom: 'none' } }}>
                  <CheckCircleIcon sx={{ fontSize: 14, color: '#4caf50', flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ flex: 1, fontSize: '0.82rem', opacity: 0.85 }} noWrap>{item.title}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', flexShrink: 0 }}>
                    {item.completed_at ? timeAgo(item.completed_at) : ''}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">No recent completions</Typography>
          )}
        </Paper>
      </Box>

      {/* -- Horizon Cards + GitHub Row -- */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
        {HORIZONS.map((h) => {
          const data = dashboard.horizons[h];
          const total = data?.total || 0;
          const done = data?.statuses?.done || 0;
          const inProgress = data?.statuses?.in_progress || 0;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <Paper
              key={h}
              sx={{ p: 2, cursor: 'pointer', border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`, '&:hover': { borderColor: '#00897b', bgcolor: alpha('#00897b', 0.03) } }}
              onClick={() => { setSelectedHorizon(h); setActiveTab(1); }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#00897b' }}>{HORIZON_LABELS[h]}</Typography>
                <ArrowForwardIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{total} items</Typography>
              <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3, mb: 0.5 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">{done} done</Typography>
                <Typography variant="caption" color="text.secondary">{inProgress} active</Typography>
              </Box>
            </Paper>
          );
        })}

        {/* GitHub Sync Card */}
        <Paper sx={{ p: 2, border: `1px solid ${isDark ? '#333' : '#e0e0e0'}` }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#8c249d', mb: 1 }}>GitHub Sync</Typography>
          <Typography variant="h4" sx={{ color: '#8c249d' }}>{ghStatus?.unsyncedCount ?? '\u2014'}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Unsynced Issues</Typography>
          <Button
            size="small" variant="outlined" startIcon={ghSyncing ? <CircularProgress size={14} /> : <SyncIcon />}
            onClick={triggerGhSync} disabled={ghSyncing}
            sx={{ fontSize: '0.7rem', py: 0.25 }}
          >
            {ghSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
          {ghSyncing && ghSyncProgress && (
            <Box sx={{ mt: 1, width: '100%' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.3 }}>
                {ghSyncProgress.phase === 'creating' ? 'Creating issues' : ghSyncProgress.phase === 'updating' ? 'Updating issues' : ghSyncProgress.phase === 'pulling' ? 'Pulling from GitHub' : 'Working'}
                {ghSyncProgress.total > 0 ? ` (${ghSyncProgress.current}/${ghSyncProgress.total})` : '...'}
              </Typography>
              <LinearProgress
                variant={ghSyncProgress.total > 0 ? 'determinate' : 'indeterminate'}
                value={ghSyncProgress.total > 0 ? Math.round((ghSyncProgress.current / ghSyncProgress.total) * 100) : 0}
                sx={{ height: 4, borderRadius: 2 }}
              />
            </Box>
          )}
          {!ghSyncing && ghStatus?.lastSync && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>Last: {formatDate(ghStatus.lastSync)}</Typography>
          )}
          {ghStatus?.issuesUrl && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.3 }}>
              <a href={ghStatus.issuesUrl} target="_blank" rel="noreferrer" style={{ color: '#8c249d', textDecoration: 'none' }}>
                GitHub Issues <OpenInNewIcon sx={{ fontSize: 10, verticalAlign: 'middle' }} />
              </a>
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default OverviewTab;
