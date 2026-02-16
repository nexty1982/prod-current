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
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Call as CallIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  Event as EventIcon,
  FilterList as FilterIcon,
  Language as WebIcon,
  MeetingRoom as MeetingIcon,
  Note as NoteIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Place as PlaceIcon,
  Refresh as RefreshIcon,
  Rocket as ProvisionIcon,
  Search as SearchIcon,
  Star as StarIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import {
  Alert,
  alpha,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  Link,
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

// ─── Types ──────────────────────────────────────────────────────────

interface PipelineStage {
  id: number;
  stage_key: string;
  label: string;
  color: string;
  sort_order: number;
  is_terminal: number;
}

interface CRMChurch {
  id: number;
  ext_id: string;
  name: string;
  street: string | null;
  city: string | null;
  state_code: string;
  zip: string | null;
  phone: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  jurisdiction: string;
  pipeline_stage: string;
  stage_label: string;
  stage_color: string;
  assigned_to: number | null;
  is_client: number;
  provisioned_church_id: number | null;
  last_contacted_at: string | null;
  next_follow_up: string | null;
  priority: string;
  tags: any;
  crm_notes: string | null;
  contact_count: number;
  activity_count: number;
  pending_followups: number;
  created_at: string;
}

interface CRMContact {
  id: number;
  church_id: number;
  first_name: string;
  last_name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  is_primary: number;
  notes: string | null;
}

interface CRMActivity {
  id: number;
  church_id: number;
  contact_id: number | null;
  activity_type: string;
  subject: string;
  body: string | null;
  metadata: any;
  created_by: number | null;
  created_at: string;
  church_name?: string;
  state_code?: string;
}

interface CRMFollowUp {
  id: number;
  church_id: number;
  assigned_to: number | null;
  due_date: string;
  subject: string;
  description: string | null;
  status: string;
  completed_at: string | null;
  church_name?: string;
  state_code?: string;
  city?: string;
  pipeline_stage?: string;
  is_overdue?: boolean;
}

interface DashboardData {
  pipeline: { pipeline_stage: string; label: string; color: string; sort_order: number; count: number }[];
  overdue: number;
  todayFollowups: number;
  upcomingFollowups: CRMFollowUp[];
  recentActivity: CRMActivity[];
  totalChurches: number;
  totalClients: number;
  activeStates: { state_code: string; count: number }[];
}

// ─── Helper ─────────────────────────────────────────────────────────

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  note: <NoteIcon fontSize="small" />,
  call: <CallIcon fontSize="small" />,
  email: <EmailIcon fontSize="small" />,
  meeting: <MeetingIcon fontSize="small" />,
  task: <EventIcon fontSize="small" />,
  stage_change: <TimelineIcon fontSize="small" />,
  provision: <ProvisionIcon fontSize="small" />,
};

const ACTIVITY_COLORS: Record<string, string> = {
  note: '#9e9e9e',
  call: '#4caf50',
  email: '#2196f3',
  meeting: '#ff9800',
  task: '#9c27b0',
  stage_change: '#e91e63',
  provision: '#00bcd4',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#9e9e9e',
  medium: '#2196f3',
  high: '#ff9800',
  urgent: '#f44336',
};

function formatDate(d: string | null) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(d: string | null) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function relativeTime(d: string) {
  const now = Date.now();
  const then = new Date(d).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

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

  const renderDrawer = () => {
    if (!selectedChurch) return null;
    const c = selectedChurch;
    return (
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: { xs: '100%', sm: 520 } } }}>
        {detailLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <Box sx={{ p: 2, borderBottom: `1px solid ${isDark ? '#333' : '#eee'}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <IconButton size="small" onClick={() => setDrawerOpen(false)}><ArrowBackIcon fontSize="small" /></IconButton>
                <Typography variant="h6" sx={{ flex: 1, fontSize: '1.05rem' }}>{c.name}</Typography>
                <IconButton size="small" onClick={() => { fetchChurchDetail(c.id); }}><RefreshIcon fontSize="small" /></IconButton>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                {renderStageChip(c.pipeline_stage, c.stage_color, c.stage_label)}
                {renderPriorityChip(c.priority || 'medium')}
                <Chip size="small" label={c.jurisdiction} variant="outlined" sx={{ fontSize: '0.68rem', height: 22 }} />
                {c.provisioned_church_id && <Chip size="small" label={`Client #${c.provisioned_church_id}`} color="success" sx={{ fontSize: '0.68rem', height: 22 }} />}
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                <Button size="small" variant="outlined" startIcon={<TimelineIcon />} onClick={() => { setNewStage(c.pipeline_stage); setStageDialogOpen(true); }}>Change Stage</Button>
                <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => { setActivityForm({ activity_type: 'note', subject: '', body: '' }); setActivityDialogOpen(true); }}>Log Activity</Button>
                <Button size="small" variant="outlined" startIcon={<EventIcon />} onClick={() => { setFollowUpForm({ due_date: '', subject: '', description: '' }); setFollowUpDialogOpen(true); }}>Follow-up</Button>
                {!c.provisioned_church_id && (
                  <Button size="small" variant="contained" color="success" startIcon={<ProvisionIcon />} onClick={() => setProvisionDialogOpen(true)}>Provision</Button>
                )}
              </Box>
            </Box>

            {/* Tabs */}
            <Tabs value={drawerTab} onChange={(_, v) => setDrawerTab(v)} sx={{ borderBottom: `1px solid ${isDark ? '#333' : '#eee'}` }}>
              <Tab label="Overview" sx={{ fontSize: '0.78rem', minHeight: 40 }} />
              <Tab label={`Contacts (${churchContacts.length})`} sx={{ fontSize: '0.78rem', minHeight: 40 }} />
              <Tab label={`Activity (${churchActivities.length})`} sx={{ fontSize: '0.78rem', minHeight: 40 }} />
            </Tabs>

            {/* Tab Content */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {/* OVERVIEW */}
              {drawerTab === 0 && (
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Location</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PlaceIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2">{[c.street, c.city, c.state_code, c.zip].filter(Boolean).join(', ')}</Typography>
                    </Box>
                  </Box>
                  {c.phone && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2">{c.phone}</Typography>
                    </Box>
                  )}
                  {c.website && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <WebIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Link href={c.website} target="_blank" rel="noopener" variant="body2">{c.website}</Link>
                    </Box>
                  )}
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Priority</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {['low', 'medium', 'high', 'urgent'].map(p => (
                        <Chip key={p} size="small" label={p} sx={{ textTransform: 'capitalize', cursor: 'pointer', bgcolor: c.priority === p ? alpha(PRIORITY_COLORS[p], 0.2) : undefined, color: c.priority === p ? PRIORITY_COLORS[p] : undefined }}
                          onClick={() => handlePriorityChange(p)} />
                      ))}
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Notes</Typography>
                    <TextField
                      multiline rows={3} fullWidth size="small"
                      defaultValue={c.crm_notes || ''}
                      onBlur={(e) => handleNotesChange(e.target.value)}
                      placeholder="Add CRM notes..."
                    />
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Follow-ups</Typography>
                    {churchFollowUps.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">No follow-ups</Typography>
                    ) : churchFollowUps.map(f => (
                      <Box key={f.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                        {f.status === 'pending' ? (
                          <IconButton size="small" color="success" onClick={() => handleCompleteFollowUp(f.id)}><CheckIcon sx={{ fontSize: 16 }} /></IconButton>
                        ) : <CheckIcon sx={{ fontSize: 16, color: 'success.main', ml: 1 }} />}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ textDecoration: f.status === 'completed' ? 'line-through' : 'none', fontSize: '0.82rem' }}>{f.subject}</Typography>
                        </Box>
                        <Typography variant="caption" color={f.status === 'pending' && new Date(f.due_date) < new Date(new Date().toDateString()) ? 'error' : 'text.secondary'}>
                          {formatDate(f.due_date)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  {c.last_contacted_at && (
                    <Typography variant="caption" color="text.secondary">Last contacted: {formatDateTime(c.last_contacted_at)}</Typography>
                  )}
                </Stack>
              )}

              {/* CONTACTS */}
              {drawerTab === 1 && (
                <Stack spacing={1}>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => { setEditingContact(null); setContactForm({ first_name: '', last_name: '', role: '', email: '', phone: '', is_primary: false, notes: '' }); setContactDialogOpen(true); }}>
                    Add Contact
                  </Button>
                  {churchContacts.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No contacts yet</Typography>
                  ) : churchContacts.map(contact => (
                    <Paper key={contact.id} variant="outlined" sx={{ p: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: contact.is_primary ? 'primary.main' : 'grey.500', fontSize: '0.8rem' }}>
                          {contact.first_name[0]}{contact.last_name?.[0] || ''}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {contact.first_name} {contact.last_name || ''}
                            {contact.is_primary ? <StarIcon sx={{ fontSize: 14, color: 'warning.main', ml: 0.5, verticalAlign: 'text-top' }} /> : null}
                          </Typography>
                          {contact.role && <Typography variant="caption" color="text.secondary">{contact.role}</Typography>}
                        </Box>
                        <IconButton size="small" onClick={() => {
                          setEditingContact(contact);
                          setContactForm({ first_name: contact.first_name, last_name: contact.last_name || '', role: contact.role || '', email: contact.email || '', phone: contact.phone || '', is_primary: !!contact.is_primary, notes: contact.notes || '' });
                          setContactDialogOpen(true);
                        }}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteContact(contact.id)}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                      </Box>
                      <Box sx={{ ml: 5.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 0.3 }}>
                        {contact.email && <Typography variant="caption" color="text.secondary">{contact.email}</Typography>}
                        {contact.phone && <Typography variant="caption" color="text.secondary">{contact.phone}</Typography>}
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              )}

              {/* ACTIVITY LOG */}
              {drawerTab === 2 && (
                <Stack spacing={0}>
                  {churchActivities.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No activities logged</Typography>
                  ) : churchActivities.map(a => (
                    <Box key={a.id} sx={{ display: 'flex', gap: 1, py: 1, borderBottom: `1px solid ${isDark ? '#333' : '#f0f0f0'}` }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: alpha(ACTIVITY_COLORS[a.activity_type] || '#999', 0.2), color: ACTIVITY_COLORS[a.activity_type] || '#999' }}>
                        {ACTIVITY_ICONS[a.activity_type] || <NoteIcon fontSize="small" />}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem' }}>{a.subject}</Typography>
                        {a.body && <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem', mt: 0.3 }}>{a.body}</Typography>}
                        <Typography variant="caption" color="text.secondary">{relativeTime(a.created_at)}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Box>
        )}
      </Drawer>
    );
  };

  // ─── DIALOGS ─────────────────────────────────────────────────────

  const renderDialogs = () => (
    <>
      {/* Activity Dialog */}
      <Dialog open={activityDialogOpen} onClose={() => setActivityDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Log Activity</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select value={activityForm.activity_type} label="Type" onChange={(e) => setActivityForm(prev => ({ ...prev, activity_type: e.target.value }))}>
                <MenuItem value="note">Note</MenuItem>
                <MenuItem value="call">Call</MenuItem>
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="meeting">Meeting</MenuItem>
                <MenuItem value="task">Task</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Subject" size="small" fullWidth value={activityForm.subject} onChange={(e) => setActivityForm(prev => ({ ...prev, subject: e.target.value }))} required />
            <TextField label="Details" size="small" fullWidth multiline rows={3} value={activityForm.body} onChange={(e) => setActivityForm(prev => ({ ...prev, body: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActivityDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddActivity} disabled={!activityForm.subject}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Contact Dialog */}
      <Dialog open={contactDialogOpen} onClose={() => setContactDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingContact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={1}>
              <TextField label="First Name" size="small" fullWidth value={contactForm.first_name} onChange={(e) => setContactForm(prev => ({ ...prev, first_name: e.target.value }))} required />
              <TextField label="Last Name" size="small" fullWidth value={contactForm.last_name} onChange={(e) => setContactForm(prev => ({ ...prev, last_name: e.target.value }))} />
            </Stack>
            <TextField label="Role" size="small" fullWidth value={contactForm.role} onChange={(e) => setContactForm(prev => ({ ...prev, role: e.target.value }))} placeholder="e.g. Pastor, Secretary" />
            <TextField label="Email" size="small" fullWidth value={contactForm.email} onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))} />
            <TextField label="Phone" size="small" fullWidth value={contactForm.phone} onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))} />
            <TextField label="Notes" size="small" fullWidth multiline rows={2} value={contactForm.notes} onChange={(e) => setContactForm(prev => ({ ...prev, notes: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContactDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveContact} disabled={!contactForm.first_name}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Follow-up Dialog */}
      <Dialog open={followUpDialogOpen} onClose={() => setFollowUpDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Follow-up</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Due Date" type="date" size="small" fullWidth value={followUpForm.due_date} onChange={(e) => setFollowUpForm(prev => ({ ...prev, due_date: e.target.value }))} InputLabelProps={{ shrink: true }} required />
            <TextField label="Subject" size="small" fullWidth value={followUpForm.subject} onChange={(e) => setFollowUpForm(prev => ({ ...prev, subject: e.target.value }))} required />
            <TextField label="Description" size="small" fullWidth multiline rows={2} value={followUpForm.description} onChange={(e) => setFollowUpForm(prev => ({ ...prev, description: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFollowUpDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddFollowUp} disabled={!followUpForm.due_date || !followUpForm.subject}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Stage Change Dialog */}
      <Dialog open={stageDialogOpen} onClose={() => setStageDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Change Pipeline Stage</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Stage</InputLabel>
            <Select value={newStage} label="Stage" onChange={(e) => setNewStage(e.target.value)}>
              {stages.map(s => (
                <MenuItem key={s.stage_key} value={s.stage_key}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color }} />
                    {s.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStageDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleStageChange}>Update</Button>
        </DialogActions>
      </Dialog>

      {/* Provision Confirmation Dialog */}
      <Dialog open={provisionDialogOpen} onClose={() => setProvisionDialogOpen(false)}>
        <DialogTitle>Provision Church</DialogTitle>
        <DialogContent>
          <Typography>
            This will create <strong>{selectedChurch?.name}</strong> as an OrthodoxMetrics client church,
            adding it to the churches table and marking it as a client in the CRM.
          </Typography>
          {churchContacts.filter(c => c.is_primary).length === 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>No primary contact set. Consider adding one first.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProvisionDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleProvision} startIcon={<ProvisionIcon />}>Provision</Button>
        </DialogActions>
      </Dialog>
    </>
  );

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

      {renderDrawer()}
      {renderDialogs()}

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(prev => ({ ...prev, open: false }))}>
        <Alert severity={toast.severity} onClose={() => setToast(prev => ({ ...prev, open: false }))}>{toast.message}</Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default CRMPage;
