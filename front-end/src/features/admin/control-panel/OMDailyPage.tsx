/**
 * OMDailyPage.tsx
 * Enhanced work pipeline management with rich overview, graphs,
 * phase tracking, and 7/14/30/60/90 day planning horizons.
 * Located at /admin/control-panel/om-daily
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
    Add as AddIcon,
    ArrowForward as ArrowForwardIcon,
    Assignment as AssignmentIcon,
    CheckCircle as CheckCircleIcon,
    CloudUpload as CloudUploadIcon,
    SmartToy as AgentIcon,
    Check as CheckIcon,
    CheckBoxOutlineBlank as CheckBoxBlankIcon,
    CheckBox as CheckBoxIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Email as EmailIcon,
    ExpandMore as ExpandMoreIcon,
    Flag as FlagIcon,
    History as HistoryIcon,
    Inventory2 as PackageIcon,
    OpenInNew as OpenInNewIcon,
    PlayArrow as PlayArrowIcon,
    Refresh as RefreshIcon,
    Schedule as ScheduleIcon,
    Search as SearchIcon,
    Sync as SyncIcon,
    TrendingUp as TrendingUpIcon,
    Warning as WarningIcon,
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
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '@/shared/lib/apiClient';

// ─── Types ──────────────────────────────────────────────────────────

interface ChangeSetMembership {
  change_set_id: number;
  code: string;
  title: string;
  status: string;
}

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
  source?: string;
  metadata?: any;
  github_issue_number?: number | null;
  github_synced_at?: string | null;
  agent_tool?: string | null;
  branch_type?: string | null;
  github_branch?: string | null;
  conversation_ref?: string | null;
  change_set?: ChangeSetMembership | null;
}

interface GitHubSyncStatus {
  unsyncedCount: number;
  lastSync: string | null;
  repoUrl: string;
  issuesUrl: string;
}

interface BuildInfo {
  version: string;
  buildNumber: number;
  buildDate: string | null;
  branch: string;
  commit: string;
  fullVersion: string;
}

interface DashboardData {
  horizons: Record<string, { total: number; statuses: Record<string, number> }>;
  overdue: number;
  dueToday: number;
  recentlyCompleted: number;
  totalActive: number;
}

interface ExtendedDashboard {
  statusDistribution: { status: string; count: number }[];
  priorityDistribution: { priority: string; count: number }[];
  categoryBreakdown: { category: string; count: number; done_count: number }[];
  recentCompleted: { id: number; title: string; category: string | null; horizon: string; completed_at: string; priority: string }[];
  inProgressItems: { id: number; title: string; description: string | null; category: string | null; horizon: string; priority: string; due_date: string | null; agent_tool: string | null; branch_type: string | null; updated_at: string }[];
  dueSoon: { id: number; title: string; status: string; priority: string; due_date: string; horizon: string; category: string | null }[];
  velocity: { date: string; count: number }[];
  created: { date: string; count: number }[];
  phaseGroups: { source: string; category: string | null; total: number; done_count: number; active_count: number; items_summary: string }[];
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

const HORIZONS = ['1', '2', '7', '14', '30', '60', '90'];
const HORIZON_LABELS: Record<string, string> = { '1': '24 Hour', '2': '48 Hour', '7': '7 Day', '14': '14 Day', '30': '30 Day', '60': '60 Day', '90': '90 Day' };
const AGENT_TOOLS = ['windsurf', 'claude_cli', 'cursor'] as const;
const AGENT_TOOL_LABELS: Record<string, string> = { windsurf: 'Windsurf', claude_cli: 'Claude CLI', cursor: 'Cursor' };
const AGENT_TOOL_COLORS: Record<string, string> = { windsurf: '#00b4d8', claude_cli: '#d4a574', cursor: '#7c3aed' };
const BRANCH_TYPES = ['bugfix', 'new_feature', 'existing_feature', 'patch'] as const;
const BRANCH_TYPE_LABELS: Record<string, string> = { bugfix: 'Bug Fix', new_feature: 'New Feature', existing_feature: 'Existing Feature', patch: 'Patch' };
const BRANCH_TYPE_COLORS: Record<string, string> = { bugfix: '#d73a4a', new_feature: '#0e8a16', existing_feature: '#1d76db', patch: '#fbca04' };
const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancelled'];
const STATUS_LABELS: Record<string, string> = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done', cancelled: 'Cancelled' };
const STATUS_COLORS: Record<string, string> = { backlog: '#9e9e9e', todo: '#2196f3', in_progress: '#ff9800', review: '#9c27b0', done: '#4caf50', cancelled: '#f44336' };
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const PRIORITY_COLORS: Record<string, string> = { low: '#9e9e9e', medium: '#2196f3', high: '#ff9800', critical: '#f44336' };

function formatDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatShortDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

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

// ─── Component ──────────────────────────────────────────────────────

const OMDailyPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [searchParams] = useSearchParams();
  const initialHorizon = searchParams.get('horizon') || '';

  // State
  const [activeTab, setActiveTab] = useState(0);
  const [selectedHorizon, setSelectedHorizon] = useState('');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [extended, setExtended] = useState<ExtendedDashboard | null>(null);
  const [items, setItems] = useState<DailyItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDue, setFilterDue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DailyItem | null>(null);
  const [form, setForm] = useState({ title: '', description: '', horizon: '7', status: 'todo', priority: 'medium', category: '', due_date: '', agent_tool: '', branch_type: '' });

  // Toast
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const showToast = (message: string, severity: 'success' | 'error' = 'success') => setToast({ open: true, message, severity });

  // Changelog state
  const [changelogEntries, setChangelogEntries] = useState<ChangelogEntry[]>([]);
  const [changelogDetail, setChangelogDetail] = useState<ChangelogEntry | null>(null);
  const [changelogLoading, setChangelogLoading] = useState(false);
  const [selectedChangelogDate, setSelectedChangelogDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null);

  // GitHub sync state
  const [ghStatus, setGhStatus] = useState<GitHubSyncStatus | null>(null);
  const [ghSyncing, setGhSyncing] = useState(false);
  const [ghSyncProgress, setGhSyncProgress] = useState<{ phase: string; current: number; total: number; summary: any; error: string | null } | null>(null);
  const syncPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build info state
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);
  const [pushing, setPushing] = useState(false);

  // Multi-select & change set state
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [csDialogOpen, setCsDialogOpen] = useState(false);
  const [csDialogMode, setCsDialogMode] = useState<'create' | 'add'>('create');
  const [csNewTitle, setCsNewTitle] = useState('');
  const [csNewBranch, setCsNewBranch] = useState('');
  const [csNewPriority, setCsNewPriority] = useState('medium');
  const [csNewType, setCsNewType] = useState('feature');
  const [csNewStrategy, setCsNewStrategy] = useState('stage_then_promote');
  const [csExistingList, setCsExistingList] = useState<{ id: number; code: string; title: string; status: string }[]>([]);
  const [csList, setCsList] = useState<{ change_set_id: number; code: string; title: string; status: string }[]>([]);
  const [csSelectedId, setCsSelectedId] = useState<number | null>(null);
  const [csCreating, setCsCreating] = useState(false);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => {
    const eligible = items.filter(i => !i.change_set);
    if (eligible.every(i => selectedIds.has(i.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(eligible.map(i => i.id)));
    }
  };
  const clearSelection = () => setSelectedIds(new Set());

  const openCreateCsDialog = () => {
    setCsDialogMode('create');
    setCsNewTitle('');
    setCsNewBranch('');
    setCsNewPriority('medium');
    setCsNewType('feature');
    setCsNewStrategy('stage_then_promote');
    setCsDialogOpen(true);
  };

  const openAddToCsDialog = async () => {
    setCsDialogMode('add');
    setCsSelectedId(null);
    try {
      const res = await apiClient.get('/admin/change-sets', { params: { status: 'draft,active' } });
      setCsExistingList(res.data.items || []);
    } catch { setCsExistingList([]); }
    setCsDialogOpen(true);
  };

  const handleCsAction = async () => {
    if (selectedIds.size === 0) return;
    setCsCreating(true);
    try {
      if (csDialogMode === 'create') {
        // Create change set then add items
        const res = await apiClient.post('/admin/change-sets', {
          title: csNewTitle.trim(),
          change_type: csNewType,
          priority: csNewPriority,
          git_branch: csNewBranch.trim() || undefined,
          deployment_strategy: csNewStrategy,
        });
        const csId = res.data.change_set.id;
        for (const itemId of selectedIds) {
          await apiClient.post(`/admin/change-sets/${csId}/items`, { om_daily_item_id: itemId });
        }
        showToast(`Created ${res.data.change_set.code} with ${selectedIds.size} items`);
        setCsDialogOpen(false);
        clearSelection();
        navigate(`/admin/control-panel/om-daily/change-sets/${csId}`);
      } else {
        if (!csSelectedId) return;
        for (const itemId of selectedIds) {
          await apiClient.post(`/admin/change-sets/${csSelectedId}/items`, { om_daily_item_id: itemId });
        }
        showToast(`Added ${selectedIds.size} items to change set`);
        setCsDialogOpen(false);
        clearSelection();
        fetchItems(selectedHorizon || undefined);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed', 'error');
    } finally {
      setCsCreating(false);
    }
  };

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { title: 'OM Daily' },
  ];

  // ─── Set initial tab based on URL param ──────────────────────────
  useEffect(() => {
    if (initialHorizon && HORIZONS.includes(initialHorizon)) {
      setSelectedHorizon(initialHorizon);
      setActiveTab(1);
    }
  }, [initialHorizon]);

  // ─── API Calls ──────────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    try {
      const resp = await fetch('/api/om-daily/dashboard', { credentials: 'include' });
      if (resp.ok) { setDashboard(await resp.json()); }
    } catch {}
  }, []);

  const fetchExtended = useCallback(async () => {
    try {
      const resp = await fetch('/api/om-daily/dashboard/extended', { credentials: 'include' });
      if (resp.ok) { setExtended(await resp.json()); }
    } catch {}
  }, []);

  const fetchItems = useCallback(async (horizon?: string) => {
    try {
      const params = new URLSearchParams();
      if (horizon) params.set('horizon', horizon);
      if (filterStatus) params.set('status', filterStatus);
      if (filterPriority) params.set('priority', filterPriority);
      if (filterCategory) params.set('category', filterCategory);
      if (filterDue) params.set('due', filterDue);
      if (searchTerm) params.set('search', searchTerm);
      params.set('sort', 'priority');

      const resp = await fetch(`/api/om-daily/items?${params}`, { credentials: 'include' });
      if (resp.ok) { const data = await resp.json(); setItems(data.items); }
    } catch {}
  }, [filterStatus, filterPriority, filterCategory, filterDue, searchTerm]);

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

  // GitHub sync API calls
  const fetchGhStatus = useCallback(async () => {
    try {
      const resp = await fetch('/api/om-daily/github/status', { credentials: 'include' });
      if (resp.ok) setGhStatus(await resp.json());
    } catch {}
  }, []);

  const stopSyncPolling = useCallback(() => {
    if (syncPollRef.current) {
      clearInterval(syncPollRef.current);
      syncPollRef.current = null;
    }
  }, []);

  const pollSyncProgress = useCallback(() => {
    stopSyncPolling();
    syncPollRef.current = setInterval(async () => {
      try {
        const resp = await fetch('/api/om-daily/github/sync/progress', { credentials: 'include' });
        if (!resp.ok) return;
        const data = await resp.json();
        setGhSyncProgress({ phase: data.phase, current: data.current, total: data.total, summary: data.summary, error: data.error });
        if (!data.running) {
          stopSyncPolling();
          setGhSyncing(false);
          if (data.error) {
            showToast(`Sync error: ${data.error}`, 'error');
          } else {
            showToast(`Sync complete: ${data.summary.created} created, ${data.summary.updated} updated, ${data.summary.pulled} pulled`);
          }
          fetchGhStatus();
          fetchItems(selectedHorizon || undefined);
          fetchDashboard();
        }
      } catch {}
    }, 2000);
  }, [activeTab, stopSyncPolling]);

  const triggerGhSync = useCallback(async () => {
    setGhSyncing(true);
    setGhSyncProgress(null);
    try {
      const resp = await fetch('/api/om-daily/github/sync', { method: 'POST', credentials: 'include' });
      if (resp.ok) {
        const data = await resp.json();
        if (data.already_running) {
          showToast('Sync already in progress');
        } else {
          showToast('GitHub sync started...');
        }
        pollSyncProgress();
      } else { showToast('Failed to start sync', 'error'); setGhSyncing(false); }
    } catch { showToast('Failed to start sync', 'error'); setGhSyncing(false); }
  }, [pollSyncProgress]);

  // Build info API calls
  const fetchBuildInfo = useCallback(async () => {
    try {
      const resp = await fetch('/api/om-daily/build-info', { credentials: 'include' });
      if (resp.ok) setBuildInfo(await resp.json());
    } catch {}
  }, []);

  const pushToOrigin = useCallback(async () => {
    setPushing(true);
    try {
      const resp = await fetch('/api/om-daily/push-to-origin', { method: 'POST', credentials: 'include' });
      const data = await resp.json();
      if (resp.ok && data.success) {
        showToast(`Pushed to origin/${data.branch}`);
        fetchBuildInfo();
      } else {
        showToast(data.error || 'Push failed', 'error');
      }
    } catch { showToast('Push failed', 'error'); }
    finally { setPushing(false); }
  }, [fetchBuildInfo]);

  // Cleanup polling on unmount
  useEffect(() => () => stopSyncPolling(), [stopSyncPolling]);

  // Fetch active change sets for pipeline overview
  const fetchCsList = useCallback(async () => {
    try {
      const res = await apiClient.get('/admin/change-sets');
      const items = (res.data.items || []).filter((cs: any) => !['promoted', 'rolled_back', 'rejected'].includes(cs.status));
      setCsList(items.map((cs: any) => ({ change_set_id: cs.id, code: cs.code, title: cs.title, status: cs.status })));
    } catch { setCsList([]); }
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDashboard(), fetchExtended(), fetchCategories(), fetchGhStatus(), fetchBuildInfo(), fetchCsList()]).finally(() => setLoading(false));
  }, []);

  // Auto-sync today's commits when items tab is first opened
  const commitsSyncedRef = useRef(false);
  useEffect(() => {
    if (activeTab === 1 && !commitsSyncedRef.current) {
      commitsSyncedRef.current = true;
      fetch('/api/om-daily/sync-commits', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: new Date().toISOString().split('T')[0] }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.synced > 0) {
            fetchItems(selectedHorizon || undefined);
            fetchDashboard();
          }
        })
        .catch(() => {});
    }
  }, [activeTab]);

  const CHANGELOG_TAB = HORIZONS.length + 1;

  // Fetch items when tab, horizon, or filters change
  useEffect(() => {
    if (activeTab >= 1 && activeTab !== CHANGELOG_TAB) {
      fetchItems(selectedHorizon || undefined);
    } else if (activeTab === 0) {
      fetchItems();
    }
  }, [activeTab, selectedHorizon, fetchItems]);
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
        fetchItems(selectedHorizon || undefined);
        fetchDashboard();
        fetchExtended();
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
      fetchItems(selectedHorizon || undefined);
      fetchDashboard();
      fetchExtended();
    } catch { showToast('Failed to delete', 'error'); }
  };

  const handleStatusChange = async (item: DailyItem, newStatus: string) => {
    try {
      await fetch(`/api/om-daily/items/${item.id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchItems(selectedHorizon || undefined);
      fetchDashboard();
      fetchExtended();
    } catch {}
  };

  const openNewDialog = () => {
    const defaultHorizon = selectedHorizon || '7';
    setEditingItem(null);
    setForm({ title: '', description: '', horizon: defaultHorizon, status: 'todo', priority: 'medium', category: '', due_date: '', agent_tool: '', branch_type: '' });
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
      agent_tool: item.agent_tool || '',
      branch_type: item.branch_type || '',
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

  const renderAgentChip = (agentTool: string) => {
    const color = AGENT_TOOL_COLORS[agentTool] || '#666';
    return (
      <Tooltip title={`Agent: ${AGENT_TOOL_LABELS[agentTool] || agentTool}`}>
        <Chip size="small" icon={<AgentIcon sx={{ fontSize: 13 }} />} label={AGENT_TOOL_LABELS[agentTool] || agentTool}
          sx={{ bgcolor: alpha(color, 0.12), color, fontWeight: 600, fontSize: '0.65rem', height: 20, '& .MuiChip-icon': { color } }} />
      </Tooltip>
    );
  };

  // ─── Enhanced Overview Tab ─────────────────────────────────────

  const renderOverview = () => {
    if (!dashboard) return <CircularProgress />;

    const totalAll = Object.values(dashboard.horizons).reduce((sum, h) => sum + h.total, 0);
    const totalDone = Object.values(dashboard.horizons).reduce((sum, h) => sum + (h.statuses?.done || 0), 0);
    const overallPct = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;

    return (
      <Box>
        {/* ── Top KPI Row ── */}
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

        {/* ── Two-column layout: Focus + Charts ── */}
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

        {/* ── Velocity + Due Soon Row ── */}
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

        {/* ── Change Set Pipeline ── */}
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

        {/* ── Phase Tracking ── */}
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

        {/* ── Category Breakdown + Recent Activity Row ── */}
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

        {/* ── Horizon Cards + GitHub Row ── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
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
            <Typography variant="h4" sx={{ color: '#8c249d' }}>{ghStatus?.unsyncedCount ?? '—'}</Typography>
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

  // ─── Item List (horizon tabs) ──────────────────────────────────

  const renderItemList = () => (
    <Box>
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{'Search by text, #ID, CS-XXXX\nFilters: status:done priority:high category:OCR horizon:7\nExclude: -keyword\nQuote phrases: "exact match"'}</span>} arrow placement="bottom-start">
            <TextField size="small" placeholder="Search: text, #ID, status:done, -exclude..." value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
              sx={{ minWidth: 280 }}
            />
          </Tooltip>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Horizon</InputLabel>
            <Select value={selectedHorizon} label="Horizon" onChange={(e) => setSelectedHorizon(e.target.value)}>
              <MenuItem value="">All Horizons</MenuItem>
              {HORIZONS.map(h => <MenuItem key={h} value={h}>{HORIZON_LABELS[h]} Plan</MenuItem>)}
            </Select>
          </FormControl>
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
          {filterDue && (
            <Chip
              label={filterDue === 'overdue' ? 'Overdue' : filterDue === 'today' ? 'Due Today' : 'Due Soon'}
              color={filterDue === 'overdue' ? 'error' : 'warning'}
              size="small"
              onDelete={() => setFilterDue('')}
              sx={{ fontWeight: 600 }}
            />
          )}
          <Box sx={{ flex: 1 }} />
          <Button variant="outlined" size="small" startIcon={<PackageIcon />} onClick={() => navigate('/admin/control-panel/om-daily/change-sets')}>
            Change Sets
          </Button>
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openNewDialog}>
            New Item
          </Button>
        </Box>
      </Paper>

      {/* Multi-select action bar */}
      {selectedIds.size > 0 && (
        <Paper sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.06), border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}` }}>
          <Typography variant="body2" fontWeight={600} sx={{ ml: 1 }}>
            {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button size="small" variant="contained" startIcon={<PackageIcon />} onClick={openCreateCsDialog}>
            Create Change Set
          </Button>
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={openAddToCsDialog}>
            Add to Existing
          </Button>
          <Button size="small" color="inherit" onClick={clearSelection}>
            Clear
          </Button>
        </Paper>
      )}

      {/* Items */}
      {items.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">No items yet. Click "New Item" to get started.</Typography>
        </Paper>
      ) : (
        <Paper>
          {/* Select all header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.75, borderBottom: `1px solid ${isDark ? '#222' : '#f0f0f0'}`, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
            <IconButton size="small" onClick={selectAll} sx={{ p: 0.5 }}>
              {items.filter(i => !i.change_set).length > 0 && items.filter(i => !i.change_set).every(i => selectedIds.has(i.id))
                ? <CheckBoxIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                : <CheckBoxBlankIcon sx={{ fontSize: 18, color: 'text.disabled' }} />}
            </IconButton>
            <Typography variant="caption" color="text.secondary">{items.length} items</Typography>
          </Box>
          {items.map(item => {
            const isOverdue = item.due_date && item.status !== 'done' && item.status !== 'cancelled' && new Date(item.due_date) < new Date(new Date().toDateString());
            const isItemExpanded = expandedItem === item.id;
            const isSelected = selectedIds.has(item.id);
            const hasCsAssignment = !!item.change_set;
            return (
              <Box key={item.id}>
                <Box
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5,
                    borderBottom: `1px solid ${isDark ? '#222' : '#f0f0f0'}`,
                    bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.08) : isOverdue ? alpha('#f44336', 0.04) : item.status === 'done' ? alpha('#4caf50', 0.03) : 'transparent',
                    '&:hover': { bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.primary.main, 0.04) },
                    cursor: item.description ? 'pointer' : 'default',
                  }}
                  onClick={() => item.description && setExpandedItem(isItemExpanded ? null : item.id)}
                >
                  {/* Multi-select checkbox */}
                  <IconButton size="small" sx={{ p: 0.5 }} onClick={(e) => { e.stopPropagation(); if (!hasCsAssignment) toggleSelect(item.id); }}>
                    {hasCsAssignment ? (
                      <Tooltip title={`In ${item.change_set!.code}: ${item.change_set!.title}`}>
                        <PackageIcon sx={{ fontSize: 18, color: '#9c27b0' }} />
                      </Tooltip>
                    ) : isSelected ? (
                      <CheckBoxIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                    ) : (
                      <CheckBoxBlankIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                    )}
                  </IconButton>

                  {/* Quick status toggle */}
                  {item.status !== 'done' && item.status !== 'cancelled' ? (
                    <IconButton size="small" color="success" onClick={(e) => { e.stopPropagation(); handleStatusChange(item, 'done'); }}>
                      <CheckIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  ) : (
                    <CheckIcon sx={{ fontSize: 18, color: 'success.main', mx: 1 }} />
                  )}

                  {/* Expand arrow for items with description */}
                  {item.description && (
                    <ExpandMoreIcon sx={{ fontSize: 16, transform: isItemExpanded ? 'rotate(180deg)' : 'none', transition: '0.2s', color: 'text.disabled' }} />
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
                    {!isItemExpanded && item.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                        {item.description.length > 100 ? item.description.slice(0, 100) + '...' : item.description}
                      </Typography>
                    )}
                  </Box>

                  {/* Meta chips */}
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                    {item.change_set && (
                      <Tooltip title={`${item.change_set.code}: ${item.change_set.title} (${item.change_set.status})`}>
                        <Chip size="small" icon={<PackageIcon sx={{ fontSize: '14px !important' }} />}
                          label={item.change_set.code}
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/control-panel/om-daily/change-sets/${item.change_set!.change_set_id}`); }}
                          clickable
                          sx={{ fontSize: '0.65rem', height: 20, bgcolor: alpha('#9c27b0', 0.1), color: '#9c27b0', fontWeight: 600, fontFamily: 'monospace' }}
                        />
                      </Tooltip>
                    )}
                    {item.agent_tool && renderAgentChip(item.agent_tool)}
                    {item.branch_type && (
                      <Tooltip title={`Branch Type: ${BRANCH_TYPE_LABELS[item.branch_type] || item.branch_type}`}>
                        <Chip size="small" label={BRANCH_TYPE_LABELS[item.branch_type] || item.branch_type}
                          sx={{ fontSize: '0.6rem', height: 18, bgcolor: alpha(BRANCH_TYPE_COLORS[item.branch_type] || '#666', 0.12), color: BRANCH_TYPE_COLORS[item.branch_type] || '#666', fontWeight: 600 }} />
                      </Tooltip>
                    )}
                    {item.github_branch && (
                      <Tooltip title={`Branch: ${item.github_branch}`}>
                        <Chip size="small" label={item.github_branch} variant="outlined"
                          sx={{ fontSize: '0.58rem', height: 18, fontFamily: 'monospace', maxWidth: 180, borderColor: alpha('#24292e', 0.3), color: '#24292e' }} />
                      </Tooltip>
                    )}
                    {item.conversation_ref && (
                      <Tooltip title={`Linked: ${item.conversation_ref}`}>
                        <Chip size="small" label="Conv" variant="outlined"
                          sx={{ fontSize: '0.6rem', height: 18, borderColor: alpha('#8c249d', 0.4), color: '#8c249d' }} />
                      </Tooltip>
                    )}
                    {!item.agent_tool && item.source === 'agent' && (() => {
                      const meta = typeof item.metadata === 'string' ? (() => { try { return JSON.parse(item.metadata); } catch { return {}; } })() : (item.metadata || {});
                      return (
                        <Tooltip title={`Agent: ${meta.agent || 'unknown'}`}>
                          <Chip size="small" icon={<AgentIcon sx={{ fontSize: 14 }} />} label={meta.agent || 'agent'}
                            sx={{ fontSize: '0.65rem', height: 20, bgcolor: alpha('#9c27b0', 0.1), color: '#9c27b0' }} />
                        </Tooltip>
                      );
                    })()}
                    {item.github_issue_number && (
                      <Tooltip title={`GitHub Issue #${item.github_issue_number}`}>
                        <Chip size="small" label={`#${item.github_issue_number}`} component="a"
                          href={`https://github.com/nexty1982/prod-current/issues/${item.github_issue_number}`}
                          target="_blank" rel="noreferrer" clickable
                          sx={{ fontSize: '0.65rem', height: 20, bgcolor: alpha('#24292e', 0.08), color: '#24292e', textDecoration: 'none' }} />
                      </Tooltip>
                    )}
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
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEditDialog(item); }}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                  <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                </Box>

                {/* Expanded description */}
                <Collapse in={isItemExpanded}>
                  <Box sx={{ px: 7, py: 2, bgcolor: isDark ? alpha('#000', 0.2) : alpha('#f5f5f5', 0.5), borderBottom: `1px solid ${isDark ? '#222' : '#f0f0f0'}` }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', lineHeight: 1.6 }}>
                      {item.description}
                    </Typography>
                    {item.created_at && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Created {formatDate(item.created_at)} {item.completed_at ? ` | Completed ${formatDate(item.completed_at)}` : ''}
                      </Typography>
                    )}
                  </Box>
                </Collapse>
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
              {buildInfo && (
                <Chip
                  label={`v${buildInfo.fullVersion}`}
                  size="small"
                  color="secondary"
                  sx={{ fontWeight: 600, fontFamily: 'monospace' }}
                />
              )}
              <Tooltip title={`Push current branch to origin${buildInfo?.branch ? ` (${buildInfo.branch})` : ''}`}>
                <span>
                  <Button
                    variant="outlined"
                    size="small"
                    color="success"
                    startIcon={pushing ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                    onClick={pushToOrigin}
                    disabled={pushing}
                  >
                    Push to Origin
                  </Button>
                </span>
              </Tooltip>
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
          <Tabs value={activeTab <= 1 ? activeTab : activeTab === CHANGELOG_TAB ? 2 : 1} onChange={(_, v) => {
            if (v === 0) setActiveTab(0);
            else if (v === 1) setActiveTab(1);
            else if (v === 2) setActiveTab(CHANGELOG_TAB);
          }} variant="scrollable" scrollButtons="auto">
            <Tab label="Overview" />
            <Tab label="Items" />
            <Tab label="Changelog" />
          </Tabs>
        </Paper>

        {activeTab === 0 && renderOverview()}
        {activeTab === 1 && renderItemList()}
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
            <Stack direction="row" spacing={1}>
              <TextField label="Due Date" type="date" size="small" fullWidth value={form.due_date} onChange={(e) => setForm(prev => ({ ...prev, due_date: e.target.value }))} InputLabelProps={{ shrink: true }} />
              <FormControl size="small" fullWidth>
                <InputLabel>Agent Tool</InputLabel>
                <Select value={form.agent_tool} label="Agent Tool" onChange={(e) => setForm(prev => ({ ...prev, agent_tool: e.target.value }))}>
                  <MenuItem value="">None</MenuItem>
                  {AGENT_TOOLS.map(a => (
                    <MenuItem key={a} value={a}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: AGENT_TOOL_COLORS[a] }} />
                        {AGENT_TOOL_LABELS[a]}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <FormControl size="small" fullWidth>
              <InputLabel>Branch Type</InputLabel>
              <Select value={form.branch_type} label="Branch Type" onChange={(e) => setForm(prev => ({ ...prev, branch_type: e.target.value }))}>
                <MenuItem value="">None</MenuItem>
                {BRANCH_TYPES.map(b => (
                  <MenuItem key={b} value={b}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: BRANCH_TYPE_COLORS[b] }} />
                      {BRANCH_TYPE_LABELS[b]}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {form.agent_tool && form.branch_type && (
              <Alert severity="info" sx={{ fontSize: '0.75rem', py: 0.5 }}>
                A GitHub issue and branch will be auto-created when saved. Branch: <strong>{
                  ({ bugfix: 'BF', new_feature: 'NF', existing_feature: 'EF', patch: 'PA' } as Record<string, string>)[form.branch_type]
                }_{(AGENT_TOOL_LABELS[form.agent_tool] || form.agent_tool).toLowerCase().replace(' ', '-')}_{new Date().toISOString().split('T')[0]}</strong>
              </Alert>
            )}
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

      {/* ── Change Set Dialog ─────────────────────────────────────────── */}
      <Dialog open={csDialogOpen} onClose={() => setCsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {csDialogMode === 'create' ? 'Create Change Set from Selection' : 'Add Selection to Change Set'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <Alert severity="info" sx={{ mb: 1 }}>
            {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected
          </Alert>

          {csDialogMode === 'create' ? (
            <>
              <TextField label="Title" value={csNewTitle} onChange={(e) => setCsNewTitle(e.target.value)} fullWidth required autoFocus placeholder="e.g. Portal Q1 Polish" />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type</InputLabel>
                  <Select value={csNewType} label="Type" onChange={(e) => setCsNewType(e.target.value)}>
                    <MenuItem value="feature">Feature</MenuItem>
                    <MenuItem value="bugfix">Bugfix</MenuItem>
                    <MenuItem value="hotfix">Hotfix</MenuItem>
                    <MenuItem value="refactor">Refactor</MenuItem>
                    <MenuItem value="infra">Infra</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>Priority</InputLabel>
                  <Select value={csNewPriority} label="Priority" onChange={(e) => setCsNewPriority(e.target.value)}>
                    <MenuItem value="critical">Critical</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <TextField label="Git Branch (optional)" value={csNewBranch} onChange={(e) => setCsNewBranch(e.target.value)} fullWidth size="small" placeholder="feature/username/2026-03-08/description" />
              <FormControl fullWidth size="small">
                <InputLabel>Deployment Strategy</InputLabel>
                <Select value={csNewStrategy} label="Deployment Strategy" onChange={(e) => setCsNewStrategy(e.target.value)}>
                  <MenuItem value="stage_then_promote">Stage then Promote</MenuItem>
                  <MenuItem value="hotfix_direct">Hotfix Direct</MenuItem>
                </Select>
              </FormControl>
            </>
          ) : (
            <FormControl fullWidth>
              <InputLabel>Change Set</InputLabel>
              <Select value={csSelectedId || ''} label="Change Set" onChange={(e) => setCsSelectedId(Number(e.target.value))}>
                {csExistingList.map(cs => (
                  <MenuItem key={cs.id} value={cs.id}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{cs.code}</Typography>
                      <Typography variant="body2">{cs.title}</Typography>
                      <Chip size="small" label={cs.status} sx={{ fontSize: '0.6rem', height: 16 }} />
                    </Box>
                  </MenuItem>
                ))}
                {csExistingList.length === 0 && <MenuItem disabled>No draft/active change sets</MenuItem>}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCsDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCsAction}
            disabled={csCreating || (csDialogMode === 'create' && !csNewTitle.trim()) || (csDialogMode === 'add' && !csSelectedId)}
          >
            {csCreating ? 'Processing...' : csDialogMode === 'create' ? 'Create & Add Items' : 'Add Items'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default OMDailyPage;
