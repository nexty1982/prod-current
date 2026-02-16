/**
 * OMDailyPage.tsx
 * Work pipeline management with 7/14/30/60/90 day planning horizons.
 * Located at /admin/control-panel/om-daily
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
  Add as AddIcon,
  CalendarMonth as DailyIcon,
  Check as CheckIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  Alert,
  alpha,
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
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
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
import { useSearchParams } from 'react-router-dom';

// ─── Types ──────────────────────────────────────────────────────────

interface DailyItem {
  id: number;
  title: string;
  description: string | null;
  horizon: string;
  status: string;
  priority: string;
  category: string | null;
  due_date: string | null;
  assigned_to: number | null;
  tags: any;
  progress: number;
  created_by: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DashboardData {
  horizons: Record<string, { total: number; statuses: Record<string, number> }>;
  overdue: number;
  dueToday: number;
  recentlyCompleted: number;
  totalActive: number;
}

interface ChangelogCommit {
  hash: string;
  fullHash: string;
  author: string;
  message: string;
  timestamp: string;
  files: { status: string; path: string }[];
  matchedItem?: { id: number; title: string; status: string } | null;
}

interface ChangelogEntry {
  id: number;
  date: string;
  commits: ChangelogCommit[] | string;
  files_changed: { added: number; modified: number; deleted: number; list: any[] } | string;
  summary: string;
  status_breakdown: Record<string, number> | string;
  matched_items: any[] | string;
  email_sent_at: string | null;
  created_at: string;
}

// ─── Constants ──────────────────────────────────────────────────────

const HORIZONS = ['7', '14', '30', '60', '90'];
const HORIZON_LABELS: Record<string, string> = { '7': '7 Day', '14': '14 Day', '30': '30 Day', '60': '60 Day', '90': '90 Day' };
const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancelled'];
const STATUS_LABELS: Record<string, string> = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done', cancelled: 'Cancelled' };
const STATUS_COLORS: Record<string, string> = { backlog: '#9e9e9e', todo: '#2196f3', in_progress: '#ff9800', review: '#9c27b0', done: '#4caf50', cancelled: '#f44336' };
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const PRIORITY_COLORS: Record<string, string> = { low: '#9e9e9e', medium: '#2196f3', high: '#ff9800', critical: '#f44336' };

function formatDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Component ──────────────────────────────────────────────────────

const OMDailyPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [searchParams] = useSearchParams();
  const initialHorizon = searchParams.get('horizon') || '';

  // State
  const [activeTab, setActiveTab] = useState(0); // 0=overview, 1-5=horizons
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [items, setItems] = useState<DailyItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DailyItem | null>(null);
  const [form, setForm] = useState({ title: '', description: '', horizon: '7', status: 'todo', priority: 'medium', category: '', due_date: '' });

  // Toast
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const showToast = (message: string, severity: 'success' | 'error' = 'success') => setToast({ open: true, message, severity });

  // Changelog state
  const [changelogEntries, setChangelogEntries] = useState<ChangelogEntry[]>([]);
  const [changelogDetail, setChangelogDetail] = useState<ChangelogEntry | null>(null);
  const [changelogLoading, setChangelogLoading] = useState(false);
  const [selectedChangelogDate, setSelectedChangelogDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null);

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { title: 'OM Daily' },
  ];

  // ─── Set initial tab based on URL param ──────────────────────────
  useEffect(() => {
    if (initialHorizon && HORIZONS.includes(initialHorizon)) {
      setActiveTab(HORIZONS.indexOf(initialHorizon) + 1);
    }
  }, [initialHorizon]);

  // ─── API Calls ──────────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    try {
      const resp = await fetch('/api/om-daily/dashboard', { credentials: 'include' });
      if (resp.ok) { setDashboard(await resp.json()); }
    } catch {}
  }, []);

  const fetchItems = useCallback(async (horizon?: string) => {
    try {
      const params = new URLSearchParams();
      if (horizon) params.set('horizon', horizon);
      if (filterStatus) params.set('status', filterStatus);
      if (filterPriority) params.set('priority', filterPriority);
      if (filterCategory) params.set('category', filterCategory);
      if (searchTerm) params.set('search', searchTerm);
      params.set('sort', 'priority');

      const resp = await fetch(`/api/om-daily/items?${params}`, { credentials: 'include' });
      if (resp.ok) { const data = await resp.json(); setItems(data.items); }
    } catch {}
  }, [filterStatus, filterPriority, filterCategory, searchTerm]);

  const fetchCategories = useCallback(async () => {
    try {
      const resp = await fetch('/api/om-daily/categories', { credentials: 'include' });
      if (resp.ok) { const data = await resp.json(); setCategories(data.categories); }
    } catch {}
  }, []);

  // Changelog API calls
  const fetchChangelog = useCallback(async () => {
    try {
      const resp = await fetch('/api/om-daily/changelog?limit=30', { credentials: 'include' });
      if (resp.ok) { const data = await resp.json(); setChangelogEntries(data.entries || []); }
    } catch {}
  }, []);

  const fetchChangelogDetail = useCallback(async (date: string) => {
    try {
      setChangelogLoading(true);
      const resp = await fetch(`/api/om-daily/changelog/${date}`, { credentials: 'include' });
      if (resp.ok) { const data = await resp.json(); setChangelogDetail(data.entry || null); }
      else { setChangelogDetail(null); }
    } catch { setChangelogDetail(null); }
    finally { setChangelogLoading(false); }
  }, []);

  const triggerGenerate = useCallback(async (date: string) => {
    try {
      setChangelogLoading(true);
      const resp = await fetch('/api/om-daily/changelog/generate', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      if (resp.ok) {
        showToast('Changelog generated');
        fetchChangelog();
        fetchChangelogDetail(date);
      } else { showToast('Failed to generate', 'error'); }
    } catch { showToast('Failed to generate', 'error'); }
    finally { setChangelogLoading(false); }
  }, []);

  const triggerEmail = useCallback(async (date: string) => {
    try {
      const resp = await fetch(`/api/om-daily/changelog/email/${date}`, {
        method: 'POST', credentials: 'include',
      });
      if (resp.ok) {
        showToast('Email sent');
        fetchChangelog();
        fetchChangelogDetail(date);
      } else {
        const data = await resp.json().catch(() => ({}));
        showToast(data.error || 'Failed to send email', 'error');
      }
    } catch { showToast('Failed to send email', 'error'); }
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDashboard(), fetchCategories()]).finally(() => setLoading(false));
  }, []);

  // Fetch items when tab or filters change
  useEffect(() => {
    if (activeTab >= 1 && activeTab <= HORIZONS.length) {
      fetchItems(HORIZONS[activeTab - 1]);
    } else if (activeTab === 0) {
      fetchItems();
    }
  }, [activeTab, fetchItems]);

  // Load changelog when changelog tab is active
  const CHANGELOG_TAB = HORIZONS.length + 1;
  useEffect(() => {
    if (activeTab === CHANGELOG_TAB) {
      fetchChangelog();
      fetchChangelogDetail(selectedChangelogDate);
    }
  }, [activeTab]);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {}, 300);
  };

  // ─── CRUD ────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.title) return;
    try {
      const url = editingItem ? `/api/om-daily/items/${editingItem.id}` : '/api/om-daily/items';
      const method = editingItem ? 'PUT' : 'POST';
      const resp = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (resp.ok) {
        showToast(editingItem ? 'Item updated' : 'Item created');
        fetchItems(activeTab === 0 ? undefined : HORIZONS[activeTab - 1]);
        fetchDashboard();
        fetchCategories();
        setDialogOpen(false);
        setEditingItem(null);
      }
    } catch { showToast('Failed to save', 'error'); }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/om-daily/items/${id}`, { method: 'DELETE', credentials: 'include' });
      showToast('Item deleted');
      fetchItems(activeTab === 0 ? undefined : HORIZONS[activeTab - 1]);
      fetchDashboard();
    } catch { showToast('Failed to delete', 'error'); }
  };

  const handleStatusChange = async (item: DailyItem, newStatus: string) => {
    try {
      await fetch(`/api/om-daily/items/${item.id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchItems(activeTab === 0 ? undefined : HORIZONS[activeTab - 1]);
      fetchDashboard();
    } catch {}
  };

  const openNewDialog = () => {
    const defaultHorizon = activeTab === 0 ? '7' : HORIZONS[activeTab - 1];
    setEditingItem(null);
    setForm({ title: '', description: '', horizon: defaultHorizon, status: 'todo', priority: 'medium', category: '', due_date: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (item: DailyItem) => {
    setEditingItem(item);
    setForm({
      title: item.title,
      description: item.description || '',
      horizon: item.horizon,
      status: item.status,
      priority: item.priority,
      category: item.category || '',
      due_date: item.due_date ? item.due_date.split('T')[0] : '',
    });
    setDialogOpen(true);
  };

  // ─── Render helpers ──────────────────────────────────────────────

  const renderStatusChip = (status: string) => (
    <Chip size="small" label={STATUS_LABELS[status] || status}
      sx={{ bgcolor: alpha(STATUS_COLORS[status] || '#999', 0.15), color: STATUS_COLORS[status] || '#999', fontWeight: 600, fontSize: '0.68rem', height: 22 }} />
  );

  const renderPriorityChip = (priority: string) => (
    <Chip size="small" label={priority}
      sx={{ bgcolor: alpha(PRIORITY_COLORS[priority] || '#999', 0.15), color: PRIORITY_COLORS[priority] || '#999', fontWeight: 600, fontSize: '0.68rem', height: 20, textTransform: 'capitalize' }} />
  );

  // ─── Overview Tab ────────────────────────────────────────────────

  const renderOverview = () => {
    if (!dashboard) return <CircularProgress />;
    return (
      <Box>
        {/* KPI Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 2, mb: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="primary">{dashboard.totalActive}</Typography>
            <Typography variant="body2" color="text.secondary">Active Items</Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="error.main">{dashboard.overdue}</Typography>
            <Typography variant="body2" color="text.secondary">Overdue</Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="warning.main">{dashboard.dueToday}</Typography>
            <Typography variant="body2" color="text.secondary">Due Today</Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="success.main">{dashboard.recentlyCompleted}</Typography>
            <Typography variant="body2" color="text.secondary">Completed (7d)</Typography>
          </Paper>
        </Box>

        {/* Horizon cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(5, 1fr)' }, gap: 2 }}>
          {HORIZONS.map((h, idx) => {
            const data = dashboard.horizons[h];
            const total = data?.total || 0;
            const done = data?.statuses?.done || 0;
            const inProgress = data?.statuses?.in_progress || 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <Paper
                key={h}
                sx={{ p: 2, cursor: 'pointer', border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`, '&:hover': { borderColor: '#00897b', bgcolor: alpha('#00897b', 0.03) } }}
                onClick={() => setActiveTab(idx + 1)}
              >
                <Typography variant="h6" fontWeight={700} sx={{ color: '#00897b' }}>{HORIZON_LABELS[h]}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{total} items</Typography>
                <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3, mb: 0.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">{done} done</Typography>
                  <Typography variant="caption" color="text.secondary">{inProgress} active</Typography>
                </Box>
              </Paper>
            );
          })}
        </Box>
      </Box>
    );
  };

  // ─── Item List ───────────────────────────────────────────────────

  const renderItemList = () => (
    <Box>
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField size="small" placeholder="Search..." value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {STATUSES.map(s => <MenuItem key={s} value={s}>{STATUS_LABELS[s]}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Priority</InputLabel>
            <Select value={filterPriority} label="Priority" onChange={(e) => setFilterPriority(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {PRIORITIES.map(p => <MenuItem key={p} value={p} sx={{ textTransform: 'capitalize' }}>{p}</MenuItem>)}
            </Select>
          </FormControl>
          {categories.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Category</InputLabel>
              <Select value={filterCategory} label="Category" onChange={(e) => setFilterCategory(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          )}
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openNewDialog}>
            New Item
          </Button>
        </Box>
      </Paper>

      {/* Items */}
      {items.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">No items yet. Click "New Item" to get started.</Typography>
        </Paper>
      ) : (
        <Paper>
          {items.map(item => {
            const isOverdue = item.due_date && item.status !== 'done' && item.status !== 'cancelled' && new Date(item.due_date) < new Date(new Date().toDateString());
            return (
              <Box
                key={item.id}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5,
                  borderBottom: `1px solid ${isDark ? '#222' : '#f0f0f0'}`,
                  bgcolor: isOverdue ? alpha('#f44336', 0.04) : item.status === 'done' ? alpha('#4caf50', 0.03) : 'transparent',
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                }}
              >
                {/* Quick status toggle */}
                {item.status !== 'done' && item.status !== 'cancelled' ? (
                  <IconButton size="small" color="success" onClick={() => handleStatusChange(item, 'done')}>
                    <CheckIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                ) : (
                  <CheckIcon sx={{ fontSize: 18, color: 'success.main', mx: 1 }} />
                )}

                {/* Content */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} sx={{
                    fontSize: '0.88rem',
                    textDecoration: item.status === 'done' ? 'line-through' : 'none',
                    opacity: item.status === 'done' ? 0.6 : 1,
                  }}>
                    {item.title}
                  </Typography>
                  {item.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                      {item.description.length > 120 ? item.description.slice(0, 120) + '...' : item.description}
                    </Typography>
                  )}
                </Box>

                {/* Meta chips */}
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                  {activeTab === 0 && (
                    <Chip size="small" label={HORIZON_LABELS[item.horizon]} sx={{ fontSize: '0.65rem', height: 20, bgcolor: alpha('#00897b', 0.1), color: '#00897b' }} />
                  )}
                  {renderStatusChip(item.status)}
                  {renderPriorityChip(item.priority)}
                  {item.category && <Chip size="small" label={item.category} variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />}
                  {item.due_date && (
                    <Chip size="small" label={formatDate(item.due_date)} color={isOverdue ? 'error' : 'default'} sx={{ fontSize: '0.65rem', height: 20 }} />
                  )}
                </Box>

                {/* Actions */}
                <IconButton size="small" onClick={() => openEditDialog(item)}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
              </Box>
            );
          })}
        </Paper>
      )}
    </Box>
  );

  // ─── Changelog Tab ───────────────────────────────────────────────

  const parseJson = (val: any) => {
    if (!val) return val;
    if (typeof val === 'string') { try { return JSON.parse(val); } catch { return val; } }
    return val;
  };

  const renderChangelog = () => {
    const detail = changelogDetail;
    const commits: ChangelogCommit[] = detail ? parseJson(detail.commits) || [] : [];
    const filesChanged = detail ? parseJson(detail.files_changed) || { added: 0, modified: 0, deleted: 0 } : { added: 0, modified: 0, deleted: 0 };
    const totalFiles = (filesChanged.added || 0) + (filesChanged.modified || 0) + (filesChanged.deleted || 0);
    const matchCount = commits.filter((c: any) => c.matchedItem).length;
    const matchRate = commits.length > 0 ? Math.round((matchCount / commits.length) * 100) : 0;

    const FILE_STATUS_COLORS: Record<string, string> = { added: '#4caf50', modified: '#ff9800', deleted: '#f44336' };

    return (
      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Main content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Top bar */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                type="date" size="small" value={selectedChangelogDate}
                onChange={(e) => { setSelectedChangelogDate(e.target.value); fetchChangelogDetail(e.target.value); }}
                InputLabelProps={{ shrink: true }} label="Date"
                sx={{ width: 180 }}
              />
              <Button variant="contained" size="small" startIcon={<RefreshIcon />}
                onClick={() => triggerGenerate(selectedChangelogDate)} disabled={changelogLoading}>
                Generate Now
              </Button>
              <Button variant="outlined" size="small" startIcon={<EmailIcon />}
                onClick={() => triggerEmail(selectedChangelogDate)}
                disabled={!detail || !!detail.email_sent_at}>
                {detail?.email_sent_at ? 'Email Sent' : 'Send Email'}
              </Button>
              {changelogLoading && <CircularProgress size={20} />}
            </Box>
          </Paper>

          {/* Summary cards */}
          {detail && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 2, mb: 2 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: '#8c249d' }}>{commits.length}</Typography>
                <Typography variant="body2" color="text.secondary">Commits</Typography>
              </Paper>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">{totalFiles}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  +{filesChanged.added || 0} ~{filesChanged.modified || 0} -{filesChanged.deleted || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">Files Changed</Typography>
              </Paper>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">{matchRate}%</Typography>
                <Typography variant="body2" color="text.secondary">Pipeline Match</Typography>
              </Paper>
            </Box>
          )}

          {/* Commit list */}
          {!detail && !changelogLoading && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No changelog for this date. Click "Generate Now" to create one.</Typography>
            </Paper>
          )}

          {detail && commits.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No commits on {selectedChangelogDate}.</Typography>
            </Paper>
          )}

          {detail && commits.length > 0 && (
            <Paper>
              {commits.map((commit: ChangelogCommit) => {
                const isExpanded = expandedCommit === commit.hash;
                const matchStatus = commit.matchedItem ? commit.matchedItem.status : 'unmatched';
                const chipColor = STATUS_COLORS[matchStatus] || '#9e9e9e';

                return (
                  <Box key={commit.hash}>
                    <Box
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5,
                        borderBottom: `1px solid ${isDark ? '#222' : '#f0f0f0'}`,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: alpha('#8c249d', 0.03) },
                      }}
                      onClick={() => setExpandedCommit(isExpanded ? null : commit.hash)}
                    >
                      <ExpandMoreIcon sx={{ fontSize: 18, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: '0.2s', color: 'text.secondary' }} />
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#8c249d', fontWeight: 600, fontSize: '0.82rem', flexShrink: 0 }}>
                        {commit.hash}
                      </Typography>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.88rem' }} noWrap>
                          {commit.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {commit.author} &middot; {new Date(commit.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>
                      <Chip size="small" label={`${(commit.files || []).length} files`} sx={{ fontSize: '0.65rem', height: 20 }} />
                      <Chip size="small" label={commit.matchedItem ? commit.matchedItem.status : 'unmatched'}
                        sx={{ bgcolor: alpha(chipColor, 0.15), color: chipColor, fontWeight: 600, fontSize: '0.65rem', height: 20 }} />
                    </Box>
                    <Collapse in={isExpanded}>
                      <Box sx={{ pl: 7, pr: 2, py: 1.5, bgcolor: isDark ? alpha('#000', 0.2) : alpha('#f5f5f5', 0.5) }}>
                        {commit.matchedItem && (
                          <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#8c249d' }}>
                            Matched: {commit.matchedItem.title}
                          </Typography>
                        )}
                        {(commit.files || []).map((f, i) => (
                          <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', py: 0.3 }}>
                            <Chip size="small" label={f.status[0].toUpperCase()}
                              sx={{ width: 22, height: 18, fontSize: '0.6rem', bgcolor: alpha(FILE_STATUS_COLORS[f.status] || '#999', 0.2), color: FILE_STATUS_COLORS[f.status] || '#999', fontWeight: 700, '& .MuiChip-label': { px: 0 } }} />
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{f.path}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}
            </Paper>
          )}
        </Box>

        {/* Date history sidebar */}
        <Paper sx={{ width: { xs: '100%', md: 240 }, flexShrink: 0, maxHeight: 600, overflow: 'auto' }}>
          <Box sx={{ p: 1.5, borderBottom: `1px solid ${isDark ? '#333' : '#eee'}` }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#8c249d' }}>
              <HistoryIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
              Recent Days
            </Typography>
          </Box>
          <List dense disablePadding>
            {changelogEntries.map((entry) => {
              const entryCommits = parseJson(entry.commits) || [];
              const entryDate = typeof entry.date === 'string' ? entry.date.split('T')[0] : entry.date;
              const isSelected = entryDate === selectedChangelogDate;
              return (
                <ListItemButton key={entry.id} selected={isSelected}
                  onClick={() => { setSelectedChangelogDate(entryDate); fetchChangelogDetail(entryDate); }}
                  sx={{ px: 1.5, py: 0.8 }}>
                  <ListItemText
                    primary={new Date(entryDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: isSelected ? 700 : 400 }}
                  />
                  <Badge badgeContent={entryCommits.length} color="primary" sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', minWidth: 18, height: 18 } }} />
                </ListItemButton>
              );
            })}
            {changelogEntries.length === 0 && (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">No entries yet</Typography>
              </Box>
            )}
          </List>
        </Paper>
      </Box>
    );
  };

  // ─── Main Render ─────────────────────────────────────────────────

  if (loading) {
    return (
      <PageContainer title="OM Daily" description="Work Pipeline Management">
        <Breadcrumb title="OM Daily" items={BCrumb} />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="OM Daily" description="Work Pipeline Management">
      <Breadcrumb title="OM Daily — Work Pipelines" items={BCrumb} />
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Paper sx={{ mb: 2 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto">
            <Tab label="Overview" />
            {HORIZONS.map(h => <Tab key={h} label={`${HORIZON_LABELS[h]} Plan`} />)}
            <Tab label="Changelog" />
          </Tabs>
        </Paper>

        {activeTab === 0 && renderOverview()}
        {activeTab >= 1 && activeTab <= HORIZONS.length && renderItemList()}
        {activeTab === CHANGELOG_TAB && renderChangelog()}
      </Box>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? 'Edit Item' : 'New Pipeline Item'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" size="small" fullWidth value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} required />
            <TextField label="Description" size="small" fullWidth multiline rows={3} value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} />
            <Stack direction="row" spacing={1}>
              <FormControl size="small" fullWidth>
                <InputLabel>Horizon</InputLabel>
                <Select value={form.horizon} label="Horizon" onChange={(e) => setForm(prev => ({ ...prev, horizon: e.target.value }))}>
                  {HORIZONS.map(h => <MenuItem key={h} value={h}>{HORIZON_LABELS[h]}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={form.status} label="Status" onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}>
                  {STATUSES.map(s => <MenuItem key={s} value={s}>{STATUS_LABELS[s]}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            <Stack direction="row" spacing={1}>
              <FormControl size="small" fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select value={form.priority} label="Priority" onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value }))}>
                  {PRIORITIES.map(p => <MenuItem key={p} value={p} sx={{ textTransform: 'capitalize' }}>{p}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Category" size="small" fullWidth value={form.category} onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))} placeholder="e.g. Frontend, Backend" />
            </Stack>
            <TextField label="Due Date" type="date" size="small" fullWidth value={form.due_date} onChange={(e) => setForm(prev => ({ ...prev, due_date: e.target.value }))} InputLabelProps={{ shrink: true }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.title}>Save</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(prev => ({ ...prev, open: false }))}>
        <Alert severity={toast.severity} onClose={() => setToast(prev => ({ ...prev, open: false }))}>{toast.message}</Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default OMDailyPage;
