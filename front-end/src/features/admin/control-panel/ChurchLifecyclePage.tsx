/**
 * ChurchLifecyclePage.tsx — Unified Church Lifecycle Management
 *
 * Combines CRM pipeline tracking and church onboarding into a single view.
 * Uses the unified /api/admin/church-lifecycle API.
 *
 * Three views: Dashboard | Pipeline Board | Churches Table
 *
 * PP-0003 Step 3 | CS-0050
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
  ArrowBack as BackIcon,
  Dashboard as DashboardIcon,
  FilterList as FilterIcon,
  OpenInNew as OpenIcon,
  People as PeopleIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Timeline as PipelineIcon,
  ViewList as ListIcon,
} from '@mui/icons-material';
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// ─── Types ──────────────────────────────────────────────────────

interface LifecycleStage {
  stage_key: string;
  label: string;
  color: string;
  sort_order: number;
  is_terminal: number;
  count: number;
}

interface LifecycleChurch {
  id: number | string;
  name: string;
  city: string;
  state_code: string;
  phone: string;
  website: string;
  pipeline_stage: string;
  priority: string | null;
  is_client: number;
  provisioned_church_id: number | null;
  last_contacted_at: string | null;
  next_follow_up: string | null;
  crm_notes: string | null;
  jurisdiction: string | null;
  jurisdiction_id: number | null;
  jurisdiction_name: string | null;
  created_at: string;
  contact_count: number;
  pending_followups: number;
  source: 'crm' | 'onboarded' | 'both';
  unified_stage: string;
  unified_stage_label: string;
  unified_stage_color: string;
  unified_stage_order: number;
  onboarding?: {
    church_id: number;
    active_tokens: number;
    total_users: number;
    active_users: number;
    pending_users: number;
    setup_complete: number;
  };
}

interface DashboardData {
  pipeline: LifecycleStage[];
  overdue: number;
  todayFollowups: number;
  upcomingFollowups: any[];
  totalCrmLeads: number;
  totalOnboarded: number;
}

// ─── Helpers ────────────────────────────────────────────────────

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Component ──────────────────────────────────────────────────

const ChurchLifecyclePage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // View tabs: 0=Dashboard, 1=Pipeline, 2=Churches
  const [viewTab, setViewTab] = useState(parseInt(searchParams.get('tab') || '0'));

  // Data
  const [stages, setStages] = useState<LifecycleStage[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [churches, setChurches] = useState<LifecycleChurch[]>([]);
  const [churchesTotal, setChurchesTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters (churches tab)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState(searchParams.get('stage') || '');
  const [filterState, setFilterState] = useState('');
  const [churchPage, setChurchPage] = useState(1);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { title: 'Church Lifecycle' },
  ];

  // ── Fetch stages ──
  const fetchStages = useCallback(async () => {
    try {
      const resp = await fetch('/api/admin/church-lifecycle/stages', { credentials: 'include' });
      if (resp.ok) {
        const data = await resp.json();
        setStages(data.stages || []);
      }
    } catch (err) {
      console.error('Failed to fetch stages:', err);
    }
  }, []);

  // ── Fetch dashboard ──
  const fetchDashboard = useCallback(async () => {
    try {
      const resp = await fetch('/api/admin/church-lifecycle/dashboard', { credentials: 'include' });
      if (resp.ok) {
        const data = await resp.json();
        setDashboard(data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    }
  }, []);

  // ── Fetch churches ──
  const fetchChurches = useCallback(async (page = 1) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30' });
      if (searchTerm) params.set('search', searchTerm);
      if (filterStage) params.set('stage', filterStage);
      if (filterState) params.set('state', filterState);

      const resp = await fetch(`/api/admin/church-lifecycle/pipeline?${params}`, { credentials: 'include' });
      if (resp.ok) {
        const data = await resp.json();
        setChurches(data.churches || []);
        setChurchesTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch churches:', err);
    }
  }, [searchTerm, filterStage, filterState]);

  // ── Initial load ──
  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchStages(), fetchDashboard()]);
      setLoading(false);
    })();
  }, []);

  // ── Load churches when switching to table tab or filter changes ──
  useEffect(() => {
    if (viewTab === 2) {
      fetchChurches(churchPage);
    }
  }, [viewTab, churchPage, filterStage, filterState]);

  // ── Debounced search ──
  useEffect(() => {
    if (viewTab !== 2) return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setChurchPage(1);
      fetchChurches(1);
    }, 400);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchTerm]);

  // Pipeline stages (non-terminal) for Kanban
  const kanbanStages = useMemo(() =>
    (dashboard?.pipeline || []).filter(s => !s.is_terminal),
  [dashboard]);

  // Terminal stages
  const terminalStages = useMemo(() =>
    (dashboard?.pipeline || []).filter(s => s.is_terminal),
  [dashboard]);

  const handleStageClick = (stageKey: string) => {
    setFilterStage(stageKey);
    setViewTab(2);
    setChurchPage(1);
  };

  const handleChurchClick = (church: LifecycleChurch) => {
    navigate(`/admin/control-panel/church-lifecycle/${church.id}`);
  };

  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([fetchStages(), fetchDashboard()]);
    if (viewTab === 2) await fetchChurches(churchPage);
    setLoading(false);
  };

  if (loading && !dashboard) {
    return (
      <PageContainer title="Church Lifecycle" description="Unified church lifecycle management">
        <Breadcrumb title="Church Lifecycle" items={BCrumb} />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Church Lifecycle" description="Unified church lifecycle management">
      <Breadcrumb title="Church Lifecycle" items={BCrumb} />
      <Box sx={{ p: { xs: 2, md: 3 } }}>

        {/* ── Header ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton
            onClick={() => navigate('/admin/control-panel')}
            sx={{ bgcolor: alpha('#1565c0', 0.08), color: '#1565c0' }}
          >
            <BackIcon />
          </IconButton>
          <Box sx={{
            width: 56, height: 56,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 2,
            bgcolor: alpha('#1565c0', isDark ? 0.15 : 0.08),
            color: '#1565c0',
            flexShrink: 0,
          }}>
            <PipelineIcon sx={{ fontSize: 36 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={700}>Church Lifecycle</Typography>
            <Typography variant="body2" color="text.secondary">
              {dashboard?.totalCrmLeads || 0} CRM leads + {dashboard?.totalOnboarded || 0} onboarded churches
            </Typography>
          </Box>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* ── View tabs ── */}
        <Tabs
          value={viewTab}
          onChange={(_, v) => setViewTab(v)}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<DashboardIcon />} iconPosition="start" label="Dashboard" sx={{ textTransform: 'none' }} />
          <Tab icon={<PipelineIcon />} iconPosition="start" label="Pipeline Board" sx={{ textTransform: 'none' }} />
          <Tab icon={<ListIcon />} iconPosition="start" label={`Churches (${churchesTotal || dashboard?.totalCrmLeads || 0})`} sx={{ textTransform: 'none' }} />
        </Tabs>

        {/* ══════════════════════════════════════════════════════ */}
        {/* TAB 0: DASHBOARD                                      */}
        {/* ══════════════════════════════════════════════════════ */}
        {viewTab === 0 && dashboard && (
          <Box>
            {/* Summary cards */}
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
              gap: 2,
              mb: 3,
            }}>
              <Paper sx={{ p: 2, textAlign: 'center', border: `1px solid ${alpha('#1565c0', 0.2)}` }}>
                <Typography variant="h4" fontWeight={700} color="primary">{dashboard.totalCrmLeads}</Typography>
                <Typography variant="body2" color="text.secondary">CRM Leads</Typography>
              </Paper>
              <Paper sx={{ p: 2, textAlign: 'center', border: `1px solid ${alpha('#2e7d32', 0.2)}` }}>
                <Typography variant="h4" fontWeight={700} sx={{ color: '#2e7d32' }}>{dashboard.totalOnboarded}</Typography>
                <Typography variant="body2" color="text.secondary">Onboarded</Typography>
              </Paper>
              <Paper sx={{ p: 2, textAlign: 'center', border: `1px solid ${alpha('#c62828', 0.2)}` }}>
                <Typography variant="h4" fontWeight={700} sx={{ color: dashboard.overdue > 0 ? '#c62828' : 'text.secondary' }}>{dashboard.overdue}</Typography>
                <Typography variant="body2" color="text.secondary">Overdue Follow-ups</Typography>
              </Paper>
              <Paper sx={{ p: 2, textAlign: 'center', border: `1px solid ${alpha('#e65100', 0.2)}` }}>
                <Typography variant="h4" fontWeight={700} sx={{ color: dashboard.todayFollowups > 0 ? '#e65100' : 'text.secondary' }}>{dashboard.todayFollowups}</Typography>
                <Typography variant="body2" color="text.secondary">Today's Follow-ups</Typography>
              </Paper>
            </Box>

            {/* Pipeline breakdown */}
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Pipeline Breakdown</Typography>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' },
              gap: 1.5,
              mb: 3,
            }}>
              {kanbanStages.map(stage => (
                <Paper
                  key={stage.stage_key}
                  elevation={0}
                  sx={{
                    p: 2,
                    border: `2px solid ${alpha(stage.color, 0.3)}`,
                    borderRadius: 2,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s',
                    '&:hover': {
                      borderColor: stage.color,
                      bgcolor: alpha(stage.color, isDark ? 0.12 : 0.04),
                    },
                  }}
                  onClick={() => handleStageClick(stage.stage_key)}
                >
                  <Typography variant="h5" fontWeight={700} sx={{ color: stage.color }}>{stage.count}</Typography>
                  <Typography variant="caption" fontWeight={600} sx={{ color: stage.color }}>{stage.label}</Typography>
                </Paper>
              ))}
            </Box>

            {/* Terminal stages */}
            {terminalStages.some(s => s.count > 0) && (
              <>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Terminal Stages</Typography>
                <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
                  {terminalStages.map(stage => (
                    <Chip
                      key={stage.stage_key}
                      label={`${stage.label}: ${stage.count}`}
                      size="small"
                      sx={{ fontWeight: 600, bgcolor: alpha(stage.color, 0.12), color: stage.color, cursor: 'pointer' }}
                      onClick={() => handleStageClick(stage.stage_key)}
                    />
                  ))}
                </Box>
              </>
            )}

            {/* Upcoming follow-ups */}
            {dashboard.upcomingFollowups.length > 0 && (
              <>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>Upcoming Follow-ups</Typography>
                <Stack spacing={1}>
                  {dashboard.upcomingFollowups.slice(0, 8).map((fu: any) => (
                    <Paper key={fu.id} variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ minWidth: 80 }}>
                        {formatDate(fu.due_date)}
                      </Typography>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2">{fu.subject}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {fu.church_name}{fu.city ? `, ${fu.city}` : ''}{fu.state_code ? ` ${fu.state_code}` : ''}
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              </>
            )}
          </Box>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* TAB 1: PIPELINE BOARD (Kanban)                        */}
        {/* ══════════════════════════════════════════════════════ */}
        {viewTab === 1 && dashboard && (
          <Box sx={{ overflowX: 'auto' }}>
            <Box sx={{
              display: 'flex',
              gap: 2,
              minWidth: kanbanStages.length * 180,
              pb: 2,
            }}>
              {kanbanStages.map(stage => (
                <Paper
                  key={stage.stage_key}
                  elevation={0}
                  sx={{
                    flex: '1 0 160px',
                    maxWidth: 220,
                    border: `1px solid ${alpha(stage.color, 0.25)}`,
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  {/* Column header */}
                  <Box sx={{
                    px: 1.5, py: 1,
                    bgcolor: alpha(stage.color, isDark ? 0.15 : 0.08),
                    borderBottom: `2px solid ${stage.color}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <Typography variant="caption" fontWeight={700} sx={{ color: stage.color }}>
                      {stage.label}
                    </Typography>
                    <Chip
                      label={stage.count}
                      size="small"
                      sx={{
                        height: 20, minWidth: 24,
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        bgcolor: alpha(stage.color, 0.15),
                        color: stage.color,
                        cursor: 'pointer',
                      }}
                      onClick={() => handleStageClick(stage.stage_key)}
                    />
                  </Box>

                  {/* Column body */}
                  <Box sx={{ p: 1, maxHeight: 400, overflowY: 'auto' }}>
                    {stage.count === 0 ? (
                      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', py: 2 }}>
                        No churches
                      </Typography>
                    ) : (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', textAlign: 'center', py: 2, cursor: 'pointer' }}
                        onClick={() => handleStageClick(stage.stage_key)}
                      >
                        {stage.count} church{stage.count !== 1 ? 'es' : ''} — click to view
                      </Typography>
                    )}
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* TAB 2: CHURCHES TABLE                                 */}
        {/* ══════════════════════════════════════════════════════ */}
        {viewTab === 2 && (
          <Box>
            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Search churches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: 250 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment>,
                }}
              />
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Stage</InputLabel>
                <Select
                  value={filterStage}
                  label="Stage"
                  onChange={(e) => { setFilterStage(e.target.value); setChurchPage(1); }}
                >
                  <MenuItem value="">All stages</MenuItem>
                  {stages.map(s => (
                    <MenuItem key={s.stage_key} value={s.stage_key}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color }} />
                        {s.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>State</InputLabel>
                <Select
                  value={filterState}
                  label="State"
                  onChange={(e) => { setFilterState(e.target.value); setChurchPage(1); }}
                >
                  <MenuItem value="">All</MenuItem>
                  {['NY', 'PA', 'CA', 'IL', 'NJ', 'OH', 'FL', 'MA', 'CT', 'MI'].map(s => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {(filterStage || filterState || searchTerm) && (
                <Chip
                  label="Clear filters"
                  size="small"
                  variant="outlined"
                  onDelete={() => { setFilterStage(''); setFilterState(''); setSearchTerm(''); setChurchPage(1); }}
                  sx={{ cursor: 'pointer' }}
                />
              )}
              <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                {churchesTotal} result{churchesTotal !== 1 ? 's' : ''}
              </Typography>
            </Box>

            {/* Church cards */}
            <Stack spacing={1}>
              {churches.map(church => (
                <Paper
                  key={church.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    borderLeft: `3px solid ${church.unified_stage_color}`,
                    '&:hover': {
                      bgcolor: alpha(church.unified_stage_color, 0.03),
                      borderColor: church.unified_stage_color,
                    },
                  }}
                  onClick={() => handleChurchClick(church)}
                >
                  {/* Name & location */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {church.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {[church.city, church.state_code].filter(Boolean).join(', ')}
                      {church.jurisdiction_name ? ` · ${church.jurisdiction_name}` : ''}
                    </Typography>
                  </Box>

                  {/* Stage chip */}
                  <Chip
                    label={church.unified_stage_label}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      bgcolor: alpha(church.unified_stage_color, 0.12),
                      color: church.unified_stage_color,
                      minWidth: 90,
                    }}
                  />

                  {/* Source indicator */}
                  <Chip
                    label={church.source === 'both' ? 'CRM+Onboarded' : church.source === 'onboarded' ? 'Onboarded' : 'CRM'}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.65rem', height: 20 }}
                  />

                  {/* Metadata */}
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {church.contact_count > 0 && (
                      <Tooltip title={`${church.contact_count} contacts`}>
                        <Chip
                          icon={<PeopleIcon sx={{ fontSize: '14px !important' }} />}
                          label={church.contact_count}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                      </Tooltip>
                    )}
                    {church.pending_followups > 0 && (
                      <Tooltip title={`${church.pending_followups} pending follow-ups`}>
                        <Chip
                          label={`${church.pending_followups} FU`}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            bgcolor: alpha('#e65100', 0.12),
                            color: '#e65100',
                          }}
                        />
                      </Tooltip>
                    )}
                    {church.onboarding && (
                      <Tooltip title={`${church.onboarding.active_users} active, ${church.onboarding.pending_users} pending users`}>
                        <Chip
                          label={`${church.onboarding.active_users}/${church.onboarding.total_users} users`}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            bgcolor: alpha('#2e7d32', 0.12),
                            color: '#2e7d32',
                          }}
                        />
                      </Tooltip>
                    )}
                  </Box>

                  <OpenIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                </Paper>
              ))}
            </Stack>

            {/* Pagination */}
            {churchesTotal > 30 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
                <Button
                  size="small"
                  disabled={churchPage <= 1}
                  onClick={() => setChurchPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Typography variant="body2" sx={{ lineHeight: '32px' }}>
                  Page {churchPage} of {Math.ceil(churchesTotal / 30)}
                </Typography>
                <Button
                  size="small"
                  disabled={churchPage >= Math.ceil(churchesTotal / 30)}
                  onClick={() => setChurchPage(p => p + 1)}
                >
                  Next
                </Button>
              </Box>
            )}

            {churches.length === 0 && !loading && (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No churches found{filterStage || searchTerm ? ' matching filters' : ''}
                </Typography>
              </Paper>
            )}
          </Box>
        )}
      </Box>
    </PageContainer>
  );
};

export default ChurchLifecyclePage;
