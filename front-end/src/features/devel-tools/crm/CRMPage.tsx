/**
 * CRMPage.tsx
 * Full Customer Relationship Management for US Orthodox Churches.
 * Located at /devel-tools/crm
 *
 * Tabs: Dashboard | Pipeline Board | Churches | Follow-ups
 * Church detail opens as a drawer with Overview / Contacts / Activities sub-tabs.
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
  Check as CheckIcon,
  Event as EventIcon,
  Note as NoteIcon,
  People as PeopleIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  ACTIVITY_COLORS,
  ACTIVITY_ICONS,
  PRIORITY_COLORS,
  formatDate,
  relativeTime,
  type CRMActivity,
  type CRMChurch,
  type CRMContact,
  type CRMFollowUp,
  type DashboardData,
  type PipelineStage,
} from './types';
import ChurchDetailDrawer from './ChurchDetailDrawer';
import CRMDialogs from './CRMDialogs';
import {
  Alert,
  alpha,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// Berry CRM components removed — Leads, Contacts, Sales tabs retired

// ─── Component ──────────────────────────────────────────────────────

const CRMPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Top-level tab
  const [mainTab, setMainTab] = useState(0);

  // Data
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [churches, setChurches] = useState<CRMChurch[]>([]);
  const [churchesTotal, setChurchesTotal] = useState(0);
  const [followUps, setFollowUps] = useState<CRMFollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Church list filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterJurisdiction, setFilterJurisdiction] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [churchPage, setChurchPage] = useState(1);
  const [churchSort, setChurchSort] = useState('name');
  const [churchSortDir, setChurchSortDir] = useState('asc');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Church detail drawer
  const [selectedChurch, setSelectedChurch] = useState<CRMChurch | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState(0);
  const [churchContacts, setChurchContacts] = useState<CRMContact[]>([]);
  const [churchActivities, setChurchActivities] = useState<CRMActivity[]>([]);
  const [churchFollowUps, setChurchFollowUps] = useState<CRMFollowUp[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Dialogs
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [provisionDialogOpen, setProvisionDialogOpen] = useState(false);

  // Form state
  const [activityForm, setActivityForm] = useState({ activity_type: 'note', subject: '', body: '' });
  const [contactForm, setContactForm] = useState({ first_name: '', last_name: '', role: '', email: '', phone: '', is_primary: false, notes: '' });
  const [followUpForm, setFollowUpForm] = useState({ due_date: '', subject: '', description: '' });
  const [editingContact, setEditingContact] = useState<CRMContact | null>(null);
  const [newStage, setNewStage] = useState('');

  // Toast
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const showToast = (message: string, severity: 'success' | 'error' = 'success') => setToast({ open: true, message, severity });

  // Breadcrumbs
  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/devel-tools', title: 'Developer Tools' },
    { title: 'CRM' },
  ];

  // ─── API Calls ──────────────────────────────────────────────────

  const fetchStages = useCallback(async () => {
    try {
      const resp = await fetch('/api/crm/pipeline-stages', { credentials: 'include' });
      if (resp.ok) { const data = await resp.json(); setStages(data.stages); }
    } catch {}
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const resp = await fetch('/api/crm/dashboard', { credentials: 'include' });
      if (resp.ok) { const data = await resp.json(); setDashboard(data); }
    } catch (err: any) { setError(err.message); }
  }, []);

  const fetchChurches = useCallback(async (page = 1) => {
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '25', sort: churchSort, direction: churchSortDir });
      if (searchTerm) params.set('search', searchTerm);
      if (filterStage) params.set('pipeline_stage', filterStage);
      if (filterState) params.set('state', filterState);
      if (filterJurisdiction) params.set('jurisdiction', filterJurisdiction);
      if (filterPriority) params.set('priority', filterPriority);

      const resp = await fetch(`/api/crm/churches?${params}`, { credentials: 'include' });
      if (resp.ok) {
        const data = await resp.json();
        setChurches(data.churches);
        setChurchesTotal(data.total);
      }
    } catch {}
  }, [searchTerm, filterStage, filterState, filterJurisdiction, filterPriority, churchSort, churchSortDir]);

  const fetchFollowUps = useCallback(async () => {
    try {
      const resp = await fetch('/api/crm/follow-ups?status=pending&limit=100', { credentials: 'include' });
      if (resp.ok) { const data = await resp.json(); setFollowUps(data.followUps); }
    } catch {}
  }, []);

  const fetchChurchDetail = useCallback(async (id: number) => {
    setDetailLoading(true);
    try {
      const resp = await fetch(`/api/crm/churches/${id}`, { credentials: 'include' });
      if (resp.ok) {
        const data = await resp.json();
        setSelectedChurch(data.church);
        setChurchContacts(data.contacts);
        setChurchActivities(data.activities);
        setChurchFollowUps(data.followUps);
      }
    } catch {}
    setDetailLoading(false);
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStages(), fetchDashboard(), fetchChurches(), fetchFollowUps()])
      .finally(() => setLoading(false));
  }, []);

  // Refetch churches when filters change
  useEffect(() => {
    fetchChurches(churchPage);
  }, [churchPage, fetchChurches]);

  // Debounced search
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setChurchPage(1);
    }, 300);
  };

  // ─── Church Actions ──────────────────────────────────────────────

  const openChurchDrawer = (church: CRMChurch) => {
    setSelectedChurch(church);
    setDrawerOpen(true);
    setDrawerTab(0);
    fetchChurchDetail(church.id);
  };

  const handleStageChange = async () => {
    if (!selectedChurch || !newStage) return;
    try {
      const resp = await fetch(`/api/crm/churches/${selectedChurch.id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_stage: newStage }),
      });
      if (resp.ok) {
        showToast('Pipeline stage updated');
        fetchChurchDetail(selectedChurch.id);
        fetchDashboard();
        fetchChurches(churchPage);
      }
    } catch { showToast('Failed to update stage', 'error'); }
    setStageDialogOpen(false);
  };

  const handlePriorityChange = async (priority: string) => {
    if (!selectedChurch) return;
    try {
      await fetch(`/api/crm/churches/${selectedChurch.id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      });
      showToast('Priority updated');
      fetchChurchDetail(selectedChurch.id);
      fetchChurches(churchPage);
    } catch { showToast('Failed to update priority', 'error'); }
  };

  const handleNotesChange = async (notes: string) => {
    if (!selectedChurch) return;
    try {
      await fetch(`/api/crm/churches/${selectedChurch.id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crm_notes: notes }),
      });
    } catch {}
  };

  // ─── Activity Actions ────────────────────────────────────────────

  const handleAddActivity = async () => {
    if (!selectedChurch || !activityForm.subject) return;
    try {
      const resp = await fetch(`/api/crm/churches/${selectedChurch.id}/activities`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityForm),
      });
      if (resp.ok) {
        showToast('Activity logged');
        fetchChurchDetail(selectedChurch.id);
        fetchDashboard();
        setActivityForm({ activity_type: 'note', subject: '', body: '' });
      }
    } catch { showToast('Failed to log activity', 'error'); }
    setActivityDialogOpen(false);
  };

  // ─── Contact Actions ─────────────────────────────────────────────

  const handleSaveContact = async () => {
    if (!selectedChurch || !contactForm.first_name) return;
    try {
      const url = editingContact
        ? `/api/crm/contacts/${editingContact.id}`
        : `/api/crm/churches/${selectedChurch.id}/contacts`;
      const method = editingContact ? 'PUT' : 'POST';
      const resp = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      if (resp.ok) {
        showToast(editingContact ? 'Contact updated' : 'Contact added');
        fetchChurchDetail(selectedChurch.id);
        setContactForm({ first_name: '', last_name: '', role: '', email: '', phone: '', is_primary: false, notes: '' });
        setEditingContact(null);
      }
    } catch { showToast('Failed to save contact', 'error'); }
    setContactDialogOpen(false);
  };

  const handleDeleteContact = async (contactId: number) => {
    try {
      await fetch(`/api/crm/contacts/${contactId}`, { method: 'DELETE', credentials: 'include' });
      showToast('Contact deleted');
      if (selectedChurch) fetchChurchDetail(selectedChurch.id);
    } catch { showToast('Failed to delete contact', 'error'); }
  };

  // ─── Follow-up Actions ───────────────────────────────────────────

  const handleAddFollowUp = async () => {
    if (!selectedChurch || !followUpForm.due_date || !followUpForm.subject) return;
    try {
      const resp = await fetch(`/api/crm/churches/${selectedChurch.id}/follow-ups`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(followUpForm),
      });
      if (resp.ok) {
        showToast('Follow-up created');
        fetchChurchDetail(selectedChurch.id);
        fetchFollowUps();
        fetchDashboard();
        setFollowUpForm({ due_date: '', subject: '', description: '' });
      }
    } catch { showToast('Failed to create follow-up', 'error'); }
    setFollowUpDialogOpen(false);
  };

  const handleCompleteFollowUp = async (fId: number) => {
    try {
      await fetch(`/api/crm/follow-ups/${fId}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      showToast('Follow-up completed');
      if (selectedChurch) fetchChurchDetail(selectedChurch.id);
      fetchFollowUps();
      fetchDashboard();
    } catch { showToast('Failed', 'error'); }
  };

  // ─── Provision Action ────────────────────────────────────────────

  const handleProvision = async () => {
    if (!selectedChurch) return;
    try {
      const resp = await fetch(`/api/crm/churches/${selectedChurch.id}/provision`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await resp.json();
      if (resp.ok) {
        showToast(data.message || 'Church provisioned!');
        fetchChurchDetail(selectedChurch.id);
        fetchDashboard();
        fetchChurches(churchPage);
      } else {
        showToast(data.error || 'Provision failed', 'error');
      }
    } catch { showToast('Provision failed', 'error'); }
    setProvisionDialogOpen(false);
  };

  // ─── Render helpers ──────────────────────────────────────────────

  const renderStageChip = (stage: string, color: string, label: string) => (
    <Chip size="small" label={label || stage} sx={{ bgcolor: alpha(color || '#999', 0.15), color: color || '#999', fontWeight: 600, fontSize: '0.72rem', height: 22 }} />
  );

  const renderPriorityChip = (priority: string) => (
    <Chip size="small" label={priority} sx={{ bgcolor: alpha(PRIORITY_COLORS[priority] || '#999', 0.15), color: PRIORITY_COLORS[priority] || '#999', fontWeight: 600, fontSize: '0.68rem', height: 20, textTransform: 'capitalize' }} />
  );

  // ─── DASHBOARD TAB ───────────────────────────────────────────────

  const renderDashboard = () => {
    if (!dashboard) return <CircularProgress />;
    return (
      <Box>
        {/* KPI Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2, mb: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" color="primary">{dashboard.totalChurches.toLocaleString()}</Typography>
              <Typography variant="body2" color="text.secondary">Total Churches</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" color="success.main">{dashboard.totalClients}</Typography>
              <Typography variant="body2" color="text.secondary">Active Clients</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" color="error.main">{dashboard.overdue}</Typography>
              <Typography variant="body2" color="text.secondary">Overdue Follow-ups</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" color="warning.main">{dashboard.todayFollowups}</Typography>
              <Typography variant="body2" color="text.secondary">Due Today</Typography>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
          {/* Pipeline Funnel */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Pipeline</Typography>
            {dashboard.pipeline.map(p => (
              <Box key={p.pipeline_stage} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, cursor: 'pointer', '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) }, borderRadius: 1, px: 1 }}
                onClick={() => { setFilterStage(p.pipeline_stage); setMainTab(2); }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: p.color || '#999', flexShrink: 0 }} />
                <Typography variant="body2" sx={{ flex: 1 }}>{p.label || p.pipeline_stage}</Typography>
                <Typography variant="body2" fontWeight={700}>{p.count}</Typography>
              </Box>
            ))}
          </Paper>

          {/* Upcoming Follow-ups */}
          <Paper sx={{ p: 2, maxHeight: 350, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>Upcoming Follow-ups</Typography>
            {dashboard.upcomingFollowups.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No upcoming follow-ups</Typography>
            ) : dashboard.upcomingFollowups.map(f => (
              <Box key={f.id} sx={{ py: 0.75, borderBottom: `1px solid ${isDark ? '#333' : '#eee'}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ flex: 1, fontSize: '0.82rem' }}>{f.subject}</Typography>
                  <Chip size="small" label={formatDate(f.due_date)} sx={{ fontSize: '0.68rem', height: 20 }} />
                </Box>
                <Typography variant="caption" color="text.secondary">{f.church_name} — {f.city}, {f.state_code}</Typography>
              </Box>
            ))}
          </Paper>

          {/* Recent Activity */}
          <Paper sx={{ p: 2, maxHeight: 350, overflow: 'auto', gridColumn: { lg: '1 / -1' } }}>
            <Typography variant="h6" gutterBottom>Recent Activity</Typography>
            {dashboard.recentActivity.map(a => (
              <Box key={a.id} sx={{ display: 'flex', gap: 1, py: 0.5, alignItems: 'flex-start' }}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: alpha(ACTIVITY_COLORS[a.activity_type] || '#999', 0.2), color: ACTIVITY_COLORS[a.activity_type] || '#999' }}>
                  {ACTIVITY_ICONS[a.activity_type] || <NoteIcon fontSize="small" />}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem' }}>{a.subject}</Typography>
                  <Typography variant="caption" color="text.secondary">{a.church_name} ({a.state_code}) · {relativeTime(a.created_at)}</Typography>
                </Box>
              </Box>
            ))}
          </Paper>
        </Box>
      </Box>
    );
  };

  // ─── PIPELINE BOARD TAB ──────────────────────────────────────────

  const renderPipelineBoard = () => {
    if (!dashboard) return <CircularProgress />;
    return (
      <Box sx={{ display: 'flex', gap: 1.5, overflow: 'auto', pb: 2, minHeight: 500 }}>
        {stages.filter(s => !s.is_terminal).map(stage => {
          const stageChurches = churches.filter(c => c.pipeline_stage === stage.stage_key);
          const pipelineCount = dashboard.pipeline.find(p => p.pipeline_stage === stage.stage_key)?.count || 0;
          return (
            <Paper key={stage.stage_key} sx={{ minWidth: 260, maxWidth: 300, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 1.5, borderBottom: `3px solid ${stage.color}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle2" sx={{ flex: 1 }}>{stage.label}</Typography>
                <Chip size="small" label={pipelineCount} sx={{ bgcolor: alpha(stage.color, 0.15), color: stage.color, fontWeight: 700, height: 22 }} />
              </Box>
              <Box sx={{ p: 1, overflow: 'auto', flex: 1 }}>
                {pipelineCount === 0 ? (
                  <Typography variant="caption" color="text.secondary" sx={{ p: 1 }}>No churches</Typography>
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ p: 1, display: 'block' }}>
                    {pipelineCount} church{pipelineCount !== 1 ? 'es' : ''} — click &quot;Churches&quot; tab and filter by stage to manage
                  </Typography>
                )}
              </Box>
            </Paper>
          );
        })}
        {/* Terminal stages */}
        {stages.filter(s => s.is_terminal).map(stage => {
          const pipelineCount = dashboard.pipeline.find(p => p.pipeline_stage === stage.stage_key)?.count || 0;
          return (
            <Paper key={stage.stage_key} sx={{ minWidth: 200, maxWidth: 240, flexShrink: 0, opacity: 0.7 }}>
              <Box sx={{ p: 1.5, borderBottom: `3px solid ${stage.color}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle2" sx={{ flex: 1 }}>{stage.label}</Typography>
                <Chip size="small" label={pipelineCount} sx={{ bgcolor: alpha(stage.color, 0.15), color: stage.color, fontWeight: 700, height: 22 }} />
              </Box>
            </Paper>
          );
        })}
      </Box>
    );
  };

  // ─── CHURCHES LIST TAB ───────────────────────────────────────────

  const renderChurchesList = () => (
    <Box>
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small" placeholder="Search churches..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ minWidth: 220 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Stage</InputLabel>
            <Select value={filterStage} label="Stage" onChange={(e) => { setFilterStage(e.target.value); setChurchPage(1); }}>
              <MenuItem value="">All Stages</MenuItem>
              {stages.map(s => <MenuItem key={s.stage_key} value={s.stage_key}>{s.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Priority</InputLabel>
            <Select value={filterPriority} label="Priority" onChange={(e) => { setFilterPriority(e.target.value); setChurchPage(1); }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </Select>
          </FormControl>
          <TextField size="small" placeholder="State (e.g. NJ)" value={filterState}
            onChange={(e) => { setFilterState(e.target.value.toUpperCase()); setChurchPage(1); }}
            sx={{ width: 100 }}
          />
          <Box sx={{ flex: 1 }} />
          <Typography variant="body2" color="text.secondary">{churchesTotal.toLocaleString()} results</Typography>
        </Box>
      </Paper>

      {/* Table */}
      <Paper>
        {/* Header */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 60px', gap: 1, px: 2, py: 1, borderBottom: `1px solid ${isDark ? '#333' : '#eee'}`, bgcolor: isDark ? '#1a1a2e' : '#f5f5f5' }}>
          <Typography variant="caption" fontWeight={700}>Church</Typography>
          <Typography variant="caption" fontWeight={700}>Location</Typography>
          <Typography variant="caption" fontWeight={700}>Stage</Typography>
          <Typography variant="caption" fontWeight={700}>Jurisdiction</Typography>
          <Typography variant="caption" fontWeight={700}>Priority</Typography>
          <Typography variant="caption" fontWeight={700}>Info</Typography>
        </Box>
        {/* Rows */}
        {churches.map(church => (
          <Box
            key={church.id}
            onClick={() => openChurchDrawer(church)}
            sx={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 60px', gap: 1, px: 2, py: 1,
              borderBottom: `1px solid ${isDark ? '#222' : '#f0f0f0'}`,
              cursor: 'pointer',
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
              transition: 'background-color 0.15s',
            }}
          >
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem' }}>{church.name}</Typography>
              {church.provisioned_church_id && <Chip size="small" label="Client" color="success" sx={{ fontSize: '0.6rem', height: 16, mt: 0.2 }} />}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              {church.city ? `${church.city}, ` : ''}{church.state_code}
            </Typography>
            <Box>{renderStageChip(church.pipeline_stage, church.stage_color, church.stage_label)}</Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem' }}>{church.jurisdiction}</Typography>
            <Box>{renderPriorityChip(church.priority || 'medium')}</Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {church.contact_count > 0 && <Tooltip title={`${church.contact_count} contacts`}><PeopleIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></Tooltip>}
              {church.pending_followups > 0 && <Tooltip title={`${church.pending_followups} pending follow-ups`}><EventIcon sx={{ fontSize: 16, color: 'warning.main' }} /></Tooltip>}
            </Box>
          </Box>
        ))}
      </Paper>

      {/* Pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
        <Button size="small" disabled={churchPage <= 1} onClick={() => setChurchPage(p => p - 1)}>Previous</Button>
        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
          Page {churchPage} of {Math.ceil(churchesTotal / 25) || 1}
        </Typography>
        <Button size="small" disabled={churchPage >= Math.ceil(churchesTotal / 25)} onClick={() => setChurchPage(p => p + 1)}>Next</Button>
      </Box>
    </Box>
  );

  // ─── FOLLOW-UPS TAB ─────────────────────────────────────────────

  const renderFollowUps = () => (
    <Paper>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>Pending Follow-ups</Typography>
        <IconButton size="small" onClick={fetchFollowUps}><RefreshIcon fontSize="small" /></IconButton>
      </Box>
      <Divider />
      {followUps.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>No pending follow-ups</Typography>
      ) : followUps.map(f => {
        const isOverdue = f.status === 'pending' && new Date(f.due_date) < new Date(new Date().toDateString());
        return (
          <Box key={f.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, borderBottom: `1px solid ${isDark ? '#333' : '#eee'}`, bgcolor: isOverdue ? alpha('#f44336', 0.05) : 'transparent' }}>
            <IconButton size="small" color="success" onClick={() => handleCompleteFollowUp(f.id)}><CheckIcon fontSize="small" /></IconButton>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight={600}>{f.subject}</Typography>
              <Typography variant="caption" color="text.secondary">{f.church_name} — {f.city}, {f.state_code}</Typography>
            </Box>
            <Chip size="small" label={formatDate(f.due_date)} color={isOverdue ? 'error' : 'default'} sx={{ fontSize: '0.7rem', height: 22 }} />
          </Box>
        );
      })}
    </Paper>
  );

  // ─── CHURCH DETAIL DRAWER ────────────────────────────────────────
  // Extracted to ChurchDetailDrawer.tsx

  // ─── DIALOGS ─────────────────────────────────────────────────────
  // Extracted to CRMDialogs.tsx

  // ─── Main Render ─────────────────────────────────────────────────

  if (loading) {
    return (
      <PageContainer title="CRM" description="Customer Relationship Management">
        <Breadcrumb title="CRM" items={BCrumb} />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="CRM" description="Customer Relationship Management">
      <Breadcrumb title="Customer Relationship Management" items={BCrumb} />
      <Box p={3}>
        <Paper sx={{ mb: 2 }}>
          <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)} variant="scrollable" scrollButtons="auto">
            <Tab label="Dashboard" />
            <Tab label="Pipeline Board" />
            <Tab label="Churches" />
            <Tab label="Follow-ups" />
          </Tabs>
        </Paper>

        {mainTab === 0 && renderDashboard()}
        {mainTab === 1 && renderPipelineBoard()}
        {mainTab === 2 && renderChurchesList()}
        {mainTab === 3 && renderFollowUps()}
      </Box>

      <ChurchDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        church={selectedChurch}
        detailLoading={detailLoading}
        drawerTab={drawerTab}
        onDrawerTabChange={setDrawerTab}
        churchContacts={churchContacts}
        churchActivities={churchActivities}
        churchFollowUps={churchFollowUps}
        onRefresh={fetchChurchDetail}
        onStageChange={() => { if (selectedChurch) { setNewStage(selectedChurch.pipeline_stage); setStageDialogOpen(true); } }}
        onLogActivity={() => { setActivityForm({ activity_type: 'note', subject: '', body: '' }); setActivityDialogOpen(true); }}
        onAddFollowUp={() => { setFollowUpForm({ due_date: '', subject: '', description: '' }); setFollowUpDialogOpen(true); }}
        onProvision={() => setProvisionDialogOpen(true)}
        onPriorityChange={handlePriorityChange}
        onNotesChange={handleNotesChange}
        onCompleteFollowUp={handleCompleteFollowUp}
        onAddContact={() => { setEditingContact(null); setContactForm({ first_name: '', last_name: '', role: '', email: '', phone: '', is_primary: false, notes: '' }); setContactDialogOpen(true); }}
        onEditContact={(contact) => {
          setEditingContact(contact);
          setContactForm({ first_name: contact.first_name, last_name: contact.last_name || '', role: contact.role || '', email: contact.email || '', phone: contact.phone || '', is_primary: !!contact.is_primary, notes: contact.notes || '' });
          setContactDialogOpen(true);
        }}
        onDeleteContact={handleDeleteContact}
        renderStageChip={renderStageChip}
        renderPriorityChip={renderPriorityChip}
      />
      <CRMDialogs
        activityDialogOpen={activityDialogOpen}
        onActivityDialogClose={() => setActivityDialogOpen(false)}
        activityForm={activityForm}
        onActivityFormChange={setActivityForm}
        onAddActivity={handleAddActivity}
        contactDialogOpen={contactDialogOpen}
        onContactDialogClose={() => setContactDialogOpen(false)}
        contactForm={contactForm}
        onContactFormChange={setContactForm}
        editingContact={editingContact}
        onSaveContact={handleSaveContact}
        followUpDialogOpen={followUpDialogOpen}
        onFollowUpDialogClose={() => setFollowUpDialogOpen(false)}
        followUpForm={followUpForm}
        onFollowUpFormChange={setFollowUpForm}
        onAddFollowUp={handleAddFollowUp}
        stageDialogOpen={stageDialogOpen}
        onStageDialogClose={() => setStageDialogOpen(false)}
        newStage={newStage}
        onNewStageChange={setNewStage}
        stages={stages}
        onStageChange={handleStageChange}
        provisionDialogOpen={provisionDialogOpen}
        onProvisionDialogClose={() => setProvisionDialogOpen(false)}
        selectedChurch={selectedChurch}
        churchContacts={churchContacts}
        onProvision={handleProvision}
      />

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(prev => ({ ...prev, open: false }))}>
        <Alert severity={toast.severity} onClose={() => setToast(prev => ({ ...prev, open: false }))}>{toast.message}</Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default CRMPage;
