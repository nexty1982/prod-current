/**
 * OMDailyPage.tsx
 * Enhanced work pipeline management with rich overview, graphs,
 * phase tracking, and 7/14/30/60/90 day planning horizons.
 * Located at /admin/control-panel/om-daily
 */

import OMDailyKanban from '@/components/apps/kanban/OMDailyKanban';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import { apiClient } from '@/shared/lib/apiClient';
import { apiClient as axiosApiClient } from '@/api/utils/axiosInstance';
import PageContainer from '@/shared/ui/PageContainer';
import {
    Add as AddIcon,
    SmartToy as AgentIcon,
    ArrowForward as ArrowForwardIcon,
    Assignment as AssignmentIcon,
    CheckBoxOutlineBlank as CheckBoxBlankIcon,
    CheckBox as CheckBoxIcon,
    CheckCircle as CheckCircleIcon,
    Check as CheckIcon,
    CloudUpload as CloudUploadIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Email as EmailIcon,
    ExpandMore as ExpandMoreIcon,
    FastForward as FastForwardIcon,
    Flag as FlagIcon,
    History as HistoryIcon,
    OpenInNew as OpenInNewIcon,
    Inventory2 as PackageIcon,
    PlayArrow as PlayArrowIcon,
    Description as PromptPlanIcon,
    Refresh as RefreshIcon,
    RocketLaunch as RocketIcon,
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
import type { ChangeSetMembership, DailyItem, GitHubSyncStatus, BuildInfo, DashboardData, ExtendedDashboard, ChangelogCommit, ChangelogEntry } from './OMDailyPage/types';
import { HORIZONS, HORIZON_LABELS, AGENT_TOOLS, AGENT_TOOL_LABELS, AGENT_TOOL_COLORS, BRANCH_TYPES, BRANCH_TYPE_LABELS, BRANCH_TYPE_COLORS, STATUSES, STATUS_LABELS, STATUS_COLORS, PRIORITIES, PRIORITY_COLORS, formatDate, formatShortDate, timeAgo } from './OMDailyPage/constants';
import OverviewTab from './OMDailyPage/OverviewTab';
import ItemListTab from './OMDailyPage/ItemListTab';
import ChangelogTab from './OMDailyPage/ChangelogTab';

// ─── Component ──────────────────────────────────────────────────────

const OMDailyPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [searchParams] = useSearchParams();
  const initialHorizon = searchParams.get('horizon') || '';

  // ──────────────────────────────────────────────────────────────────
  // State buckets — grouped to keep this component under the
  // STATE_EXPLOSION threshold. Each bucket exposes named wrapper setters
  // (declared further down) so child components keep their existing prop
  // signatures.
  // ──────────────────────────────────────────────────────────────────

  // Free-standing UI / URL state
  const [activeTab, setActiveTab] = useState(0);
  const [selectedHorizon, setSelectedHorizon] = useState('');
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null);
  const [selectedChangelogDate, setSelectedChangelogDate] = useState(new Date().toISOString().split('T')[0]);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const showToast = (message: string, severity: 'success' | 'error' = 'success') => setToast({ open: true, message, severity });

  // ── Data bucket (replaces 15 useStates) ──
  const [data, setData] = useState({
    dashboard: null as DashboardData | null,
    extended: null as ExtendedDashboard | null,
    items: [] as DailyItem[],
    categories: [] as string[],
    loading: true,
    changelogEntries: [] as ChangelogEntry[],
    changelogDetail: null as ChangelogEntry | null,
    changelogLoading: false,
    ghStatus: null as GitHubSyncStatus | null,
    ghSyncing: false,
    ghSyncProgress: null as { phase: string; current: number; total: number; summary: any; error: string | null } | null,
    buildInfo: null as BuildInfo | null,
    pushing: false,
    csList: [] as { change_set_id: number; code: string; title: string; status: string }[],
    csExistingList: [] as { id: number; code: string; title: string; status: string }[],
  });
  const setDataField = useCallback(
    <K extends keyof typeof data>(key: K, value: typeof data[K]) => {
      setData(prev => ({ ...prev, [key]: value }));
    },
    [],
  );
  const {
    dashboard, extended, items, categories, loading,
    changelogEntries, changelogDetail, changelogLoading,
    ghStatus, ghSyncing, ghSyncProgress, buildInfo, pushing,
    csList, csExistingList,
  } = data;

  // ── Filters bucket (replaces 5 useStates) ──
  const [filters, setFilters] = useState({
    filterStatus: '',
    filterPriority: '',
    filterCategory: '',
    filterDue: '',
    searchTerm: '',
  });
  const { filterStatus, filterPriority, filterCategory, filterDue, searchTerm } = filters;
  const setFilterStatus = useCallback((value: string) => setFilters(prev => ({ ...prev, filterStatus: value })), []);
  const setFilterPriority = useCallback((value: string) => setFilters(prev => ({ ...prev, filterPriority: value })), []);
  const setFilterCategory = useCallback((value: string) => setFilters(prev => ({ ...prev, filterCategory: value })), []);
  const setFilterDue = useCallback((value: string) => setFilters(prev => ({ ...prev, filterDue: value })), []);
  const setSearchTerm = useCallback((value: string) => setFilters(prev => ({ ...prev, searchTerm: value })), []);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Item dialog bucket (replaces 3 useStates) ──
  const emptyItemForm = { title: '', description: '', horizon: '7', status: 'backlog', priority: 'medium', category: '', due_date: '', agent_tool: '', branch_type: '' };
  const [itemDialog, setItemDialog] = useState({
    dialogOpen: false,
    editingItem: null as DailyItem | null,
    form: { ...emptyItemForm },
  });
  const { dialogOpen, editingItem, form } = itemDialog;
  const setDialogOpen = useCallback((value: boolean) => setItemDialog(prev => ({ ...prev, dialogOpen: value })), []);
  const setEditingItem = useCallback((value: DailyItem | null) => setItemDialog(prev => ({ ...prev, editingItem: value })), []);
  type ItemForm = typeof emptyItemForm;
  const setForm: React.Dispatch<React.SetStateAction<ItemForm>> = useCallback(
    (action) => setItemDialog(prev => ({
      ...prev,
      form: typeof action === 'function' ? (action as (p: ItemForm) => ItemForm)(prev.form) : action,
    })),
    [],
  );

  // ── Sync polling ref (not a useState) ──
  const syncPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Multi-select state
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // ── Change set dialog bucket (replaces 9 useStates) ──
  const [csDialog, setCsDialog] = useState({
    csDialogOpen: false,
    csDialogMode: 'create' as 'create' | 'add',
    csNewTitle: '',
    csNewBranch: '',
    csNewPriority: 'medium',
    csNewType: 'feature',
    csNewStrategy: 'stage_then_promote',
    csSelectedId: null as number | null,
    csCreating: false,
  });
  const {
    csDialogOpen, csDialogMode, csNewTitle, csNewBranch, csNewPriority,
    csNewType, csNewStrategy, csSelectedId, csCreating,
  } = csDialog;
  const setCsField = useCallback(
    <K extends keyof typeof csDialog>(key: K, value: typeof csDialog[K]) => {
      setCsDialog(prev => ({ ...prev, [key]: value }));
    },
    [],
  );
  const setCsDialogOpen = useCallback((value: boolean) => setCsField('csDialogOpen', value), [setCsField]);
  const setCsDialogMode = useCallback((value: 'create' | 'add') => setCsField('csDialogMode', value), [setCsField]);
  const setCsNewTitle = useCallback((value: string) => setCsField('csNewTitle', value), [setCsField]);
  const setCsNewBranch = useCallback((value: string) => setCsField('csNewBranch', value), [setCsField]);
  const setCsNewPriority = useCallback((value: string) => setCsField('csNewPriority', value), [setCsField]);
  const setCsNewType = useCallback((value: string) => setCsField('csNewType', value), [setCsField]);
  const setCsNewStrategy = useCallback((value: string) => setCsField('csNewStrategy', value), [setCsField]);
  const setCsSelectedId = useCallback((value: number | null) => setCsField('csSelectedId', value), [setCsField]);
  const setCsCreating = useCallback((value: boolean) => setCsField('csCreating', value), [setCsField]);

  // ── Prompt plan dialog bucket (replaces 5 useStates) ──
  const [ppDialog, setPpDialog] = useState({
    ppDialogOpen: false,
    ppTitle: '',
    ppDesc: '',
    ppAgent: '',
    ppCreating: false,
  });
  const { ppDialogOpen, ppTitle, ppDesc, ppAgent, ppCreating } = ppDialog;
  const setPpField = useCallback(
    <K extends keyof typeof ppDialog>(key: K, value: typeof ppDialog[K]) => {
      setPpDialog(prev => ({ ...prev, [key]: value }));
    },
    [],
  );
  const setPpDialogOpen = useCallback((value: boolean) => setPpField('ppDialogOpen', value), [setPpField]);
  const setPpTitle = useCallback((value: string) => setPpField('ppTitle', value), [setPpField]);
  const setPpDesc = useCallback((value: string) => setPpField('ppDesc', value), [setPpField]);
  const setPpAgent = useCallback((value: string) => setPpField('ppAgent', value), [setPpField]);
  const setPpCreating = useCallback((value: boolean) => setPpField('ppCreating', value), [setPpField]);

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

  const handleCreatePromptPlan = async () => {
    if (!ppTitle.trim()) return;
    setPpCreating(true);
    try {
      const res = await apiClient.post('/prompt-plans', {
        title: ppTitle.trim(),
        description: ppDesc.trim() || null,
        assigned_agent: ppAgent || null,
      });
      setPpDialogOpen(false);
      setPpTitle('');
      setPpDesc('');
      setPpAgent('');
      navigate(`/devel-tools/prompt-plans/${res.data.plan.id}`);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to create prompt plan', 'error');
    } finally {
      setPpCreating(false);
    }
  };

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
      setDataField('csExistingList', res.data.items || []);
    } catch { setDataField('csExistingList', []); }
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
      const data = await axiosApiClient.get<any>('/omai-daily/dashboard');
      setDataField('dashboard', data);
    } catch {}
  }, [setDataField]);

  const fetchExtended = useCallback(async () => {
    try {
      const data = await axiosApiClient.get<any>('/omai-daily/dashboard/extended');
      setDataField('extended', data);
    } catch {}
  }, [setDataField]);

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

      const data = await axiosApiClient.get<any>(`/omai-daily/items?${params}`);
      setDataField('items', data.items);
    } catch {}
  }, [filterStatus, filterPriority, filterCategory, filterDue, searchTerm, setDataField]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await axiosApiClient.get<any>('/omai-daily/categories');
      setDataField('categories', data.categories);
    } catch {}
  }, [setDataField]);

  // Changelog API calls
  const fetchChangelog = useCallback(async () => {
    try {
      const data = await axiosApiClient.get<any>('/omai-daily/changelog?limit=30');
      setDataField('changelogEntries', data.entries || []);
    } catch {}
  }, [setDataField]);

  const fetchChangelogDetail = useCallback(async (date: string) => {
    try {
      setDataField('changelogLoading', true);
      const data = await axiosApiClient.get<any>(`/omai-daily/changelog/${date}`);
      setDataField('changelogDetail', data.entry || null);
    } catch { setDataField('changelogDetail', null); }
    finally { setDataField('changelogLoading', false); }
  }, [setDataField]);

  const triggerGenerate = useCallback(async (date: string) => {
    try {
      setDataField('changelogLoading', true);
      await axiosApiClient.post<any>('/omai-daily/changelog/generate', { date });
      showToast('Changelog generated');
      fetchChangelog();
      fetchChangelogDetail(date);
    } catch { showToast('Failed to generate', 'error'); }
    finally { setDataField('changelogLoading', false); }
  }, [setDataField, fetchChangelog, fetchChangelogDetail]);

  const triggerEmail = useCallback(async (date: string) => {
    try {
      await axiosApiClient.post<any>(`/omai-daily/changelog/email/${date}`);
      showToast('Email sent');
      fetchChangelog();
      fetchChangelogDetail(date);
    } catch { showToast('Failed to send email', 'error'); }
  }, []);

  // GitHub sync API calls
  const fetchGhStatus = useCallback(async () => {
    try {
      const data = await axiosApiClient.get<any>('/omai-daily/github/status');
      setDataField('ghStatus', data);
    } catch {}
  }, [setDataField]);

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
        const data = await axiosApiClient.get<any>('/omai-daily/github/sync/progress');
        setDataField('ghSyncProgress', { phase: data.phase, current: data.current, total: data.total, summary: data.summary, error: data.error });
        if (!data.running) {
          stopSyncPolling();
          setDataField('ghSyncing', false);
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
  }, [stopSyncPolling, setDataField, fetchGhStatus, fetchItems, selectedHorizon, fetchDashboard]);

  const triggerGhSync = useCallback(async () => {
    setDataField('ghSyncing', true);
    setDataField('ghSyncProgress', null);
    try {
      const data = await axiosApiClient.post<any>('/omai-daily/github/sync');
      if (data.already_running) {
        showToast('Sync already in progress');
      } else {
        showToast('GitHub sync started...');
      }
      pollSyncProgress();
    } catch { showToast('Failed to start sync', 'error'); setDataField('ghSyncing', false); }
  }, [pollSyncProgress, setDataField]);

  // Build info API calls
  const fetchBuildInfo = useCallback(async () => {
    try {
      const data = await axiosApiClient.get<any>('/omai-daily/build-info');
      setDataField('buildInfo', data);
    } catch {}
  }, [setDataField]);

  const pushToOrigin = useCallback(async () => {
    setDataField('pushing', true);
    try {
      const data = await axiosApiClient.post<any>('/omai-daily/push-to-origin');
      if (data.success) {
        showToast(`Pushed to origin/${data.branch}`);
        fetchBuildInfo();
      } else {
        showToast(data.error || 'Push failed', 'error');
      }
    } catch { showToast('Push failed', 'error'); }
    finally { setDataField('pushing', false); }
  }, [fetchBuildInfo, setDataField]);

  // Cleanup polling on unmount
  useEffect(() => () => stopSyncPolling(), [stopSyncPolling]);

  // Fetch active change sets for pipeline overview
  const fetchCsList = useCallback(async () => {
    try {
      const res = await apiClient.get('/admin/change-sets');
      const items = (res.data.items || []).filter((cs: any) => !['promoted', 'rolled_back', 'rejected'].includes(cs.status));
      setDataField('csList', items.map((cs: any) => ({ change_set_id: cs.id, code: cs.code, title: cs.title, status: cs.status })));
    } catch { setDataField('csList', []); }
  }, [setDataField]);

  // Initial load
  useEffect(() => {
    setDataField('loading', true);
    Promise.all([fetchDashboard(), fetchExtended(), fetchCategories(), fetchGhStatus(), fetchBuildInfo(), fetchCsList()]).finally(() => setDataField('loading', false));
  }, []);

  // Auto-sync today's commits when items tab is first opened
  const commitsSyncedRef = useRef(false);
  useEffect(() => {
    if (activeTab === 1 && !commitsSyncedRef.current) {
      commitsSyncedRef.current = true;
      axiosApiClient.post<any>('/omai-daily/sync-commits', { date: new Date().toISOString().split('T')[0] })
        .then((data: any) => {
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
    if (activeTab === 2) {
      // Board tab: fetch all items (no horizon filter) for full kanban view
      fetchItems();
    } else if (activeTab >= 1 && activeTab !== CHANGELOG_TAB) {
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
      if (editingItem) {
        await axiosApiClient.put<any>(`/omai-daily/items/${editingItem.id}`, form);
      } else {
        await axiosApiClient.post<any>('/omai-daily/items', form);
      }
      {
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
      await axiosApiClient.delete<any>(`/omai-daily/items/${id}`);
      showToast('Item deleted');
      fetchItems(selectedHorizon || undefined);
      fetchDashboard();
      fetchExtended();
    } catch { showToast('Failed to delete', 'error'); }
  };

  const handleStatusChange = async (item: DailyItem, newStatus: string) => {
    try {
      await axiosApiClient.put<any>(`/omai-daily/items/${item.id}`, { status: newStatus });
      fetchItems(selectedHorizon || undefined);
      fetchDashboard();
      fetchExtended();
    } catch {}
  };

  const handleKanbanStatusChange = async (itemId: number, newStatus: string) => {
    try {
      await axiosApiClient.put<any>(`/omai-daily/items/${itemId}`, { status: newStatus, ...(newStatus === 'done' ? { progress: 100 } : {}) });
      fetchItems(selectedHorizon || undefined);
      fetchDashboard();
      fetchExtended();
    } catch { showToast('Failed to update status', 'error'); }
  };

  const handleQuickDone = async (itemId: number) => {
    try {
      await axiosApiClient.put<any>(`/omai-daily/items/${itemId}`, { status: 'done', progress: 100 });
      showToast('Item marked done');
      fetchItems(selectedHorizon || undefined);
      fetchDashboard();
      fetchExtended();
    } catch { showToast('Failed to update', 'error'); }
  };

  const openNewDialog = () => {
    const defaultHorizon = selectedHorizon || '7';
    setEditingItem(null);
    setForm({ title: '', description: '', horizon: defaultHorizon, status: 'backlog', priority: 'medium', category: '', due_date: '', agent_tool: '', branch_type: '' });
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
        {/* ── SDLC Pipeline Actions ── */}
        <Paper sx={{ p: 2, mb: 2, border: `1px solid ${isDark ? '#333' : '#e0e0e0'}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <RocketIcon sx={{ color: theme.palette.primary.main, fontSize: 22 }} />
            <Typography variant="subtitle2" fontWeight={700} sx={{ mr: 1 }}>Work Pipelines</Typography>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openNewDialog}
              sx={{ textTransform: 'none' }}
            >
              New Item
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<PromptPlanIcon />}
              onClick={() => { setPpTitle(''); setPpDesc(''); setPpAgent(''); setPpDialogOpen(true); }}
              sx={{ textTransform: 'none' }}
            >
              New Prompt Plan
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<PackageIcon />}
              onClick={() => navigate('/admin/control-panel/om-daily/sdlc-wizard?mode=new-work')}
              sx={{ textTransform: 'none' }}
            >
              New Change Set
            </Button>
            <Box sx={{ borderLeft: `1px solid ${isDark ? '#444' : '#ddd'}`, height: 24, mx: 0.5 }} />
            <Button
              size="small"
              variant="text"
              startIcon={<TrendingUpIcon />}
              onClick={() => navigate('/admin/control-panel/om-daily/sdlc-wizard?mode=advance')}
              sx={{ textTransform: 'none', color: theme.palette.info.main }}
            >
              Advance Change Set
            </Button>
            <Button
              size="small"
              variant="text"
              startIcon={<FastForwardIcon />}
              onClick={() => navigate('/admin/control-panel/om-daily/sdlc-wizard?mode=fast-forward')}
              sx={{ textTransform: 'none', color: theme.palette.warning.main }}
            >
              Fast Forward
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button
              size="small"
              variant="text"
              onClick={() => navigate('/admin/control-panel/om-daily/change-sets')}
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            >
              Change Sets Dashboard
            </Button>
            <Button
              size="small"
              variant="text"
              onClick={() => navigate('/devel-tools/prompt-plans')}
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            >
              All Prompt Plans
            </Button>
          </Box>
        </Paper>

        <Paper sx={{ mb: 2 }}>
          <Tabs value={activeTab <= 2 ? activeTab : activeTab === CHANGELOG_TAB ? 3 : 1} onChange={(_, v) => {
            if (v === 0) setActiveTab(0);
            else if (v === 1) setActiveTab(1);
            else if (v === 2) setActiveTab(2);
            else if (v === 3) setActiveTab(CHANGELOG_TAB);
          }} variant="scrollable" scrollButtons="auto">
            <Tab label="Overview" />
            <Tab label="Items" />
            <Tab label="Board" />
            <Tab label="Changelog" />
          </Tabs>
        </Paper>

        {activeTab === 0 && (
          <OverviewTab
            dashboard={dashboard}
            extended={extended}
            expandedPhase={expandedPhase}
            setExpandedPhase={setExpandedPhase}
            ghStatus={ghStatus}
            ghSyncing={ghSyncing}
            ghSyncProgress={ghSyncProgress}
            triggerGhSync={triggerGhSync}
            csList={csList}
            setFilterStatus={setFilterStatus}
            setFilterDue={setFilterDue}
            setSelectedHorizon={setSelectedHorizon}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === 1 && (
          <ItemListTab
            items={items}
            categories={categories}
            searchTerm={searchTerm}
            selectedHorizon={selectedHorizon}
            filterStatus={filterStatus}
            filterPriority={filterPriority}
            filterCategory={filterCategory}
            filterDue={filterDue}
            activeTab={activeTab}
            handleSearchChange={handleSearchChange}
            setSelectedHorizon={setSelectedHorizon}
            setFilterStatus={setFilterStatus}
            setFilterPriority={setFilterPriority}
            setFilterCategory={setFilterCategory}
            setFilterDue={setFilterDue}
            expandedItem={expandedItem}
            setExpandedItem={setExpandedItem}
            selectedIds={selectedIds}
            toggleSelect={toggleSelect}
            selectAll={selectAll}
            clearSelection={clearSelection}
            handleStatusChange={handleStatusChange}
            handleDelete={handleDelete}
            openNewDialog={openNewDialog}
            openEditDialog={openEditDialog}
            openCreateCsDialog={openCreateCsDialog}
            openAddToCsDialog={openAddToCsDialog}
            navigate={navigate}
          />
        )}
        {activeTab === 2 && (
          <OMDailyKanban
            items={items}
            onStatusChange={handleKanbanStatusChange}
            onEditItem={openEditDialog}
            onDeleteItem={handleDelete}
            onQuickDone={handleQuickDone}
          />
        )}
        {activeTab === CHANGELOG_TAB && (
          <ChangelogTab
            changelogDetail={changelogDetail}
            changelogLoading={changelogLoading}
            selectedChangelogDate={selectedChangelogDate}
            setSelectedChangelogDate={setSelectedChangelogDate}
            fetchChangelogDetail={fetchChangelogDetail}
            triggerGenerate={triggerGenerate}
            triggerEmail={triggerEmail}
            buildInfo={buildInfo}
            pushing={pushing}
            pushToOrigin={pushToOrigin}
            expandedCommit={expandedCommit}
            setExpandedCommit={setExpandedCommit}
            isDark={isDark}
            changelogEntries={changelogEntries}
          />
        )}
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

      {/* ── Prompt Plan Dialog ─────────────────────────────────────────── */}
      <Dialog open={ppDialogOpen} onClose={() => setPpDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Prompt Plan</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" size="small" fullWidth value={ppTitle} onChange={(e) => setPpTitle(e.target.value)} required autoFocus placeholder="e.g. Implement church onboarding flow" />
            <TextField label="Description" size="small" fullWidth multiline rows={3} value={ppDesc} onChange={(e) => setPpDesc(e.target.value)} placeholder="What should this plan accomplish?" />
            <FormControl size="small" fullWidth>
              <InputLabel>Assigned Agent</InputLabel>
              <Select value={ppAgent} label="Assigned Agent" onChange={(e) => setPpAgent(e.target.value)}>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPpDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreatePromptPlan} disabled={!ppTitle.trim() || ppCreating}>
            {ppCreating ? 'Creating...' : 'Create Plan'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default OMDailyPage;
