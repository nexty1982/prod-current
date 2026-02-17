import {
  Alert,
  alpha,
  Badge,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  IconArrowUp,
  IconCalendar,
  IconChartBar,
  IconChecklist,
  IconChevronDown,
  IconChevronRight,
  IconDownload,
  IconFiles,
  IconFileText,
  IconMessage,
  IconPlus,
  IconRefresh,
  IconRobot,
  IconSearch,
  IconSortAscending,
  IconSortDescending,
  IconTrash,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient as axiosInstance } from '../../../api/utils/axiosInstance';

interface ConversationSummary {
  filename: string;
  fileDate: string;
  sessionId: string;
  date: string;
  size: number;
  isAgent: boolean;
  preview: string;
  messageCount: number;
  userMessages: number;
  assistantMessages: number;
  source: string;
  format: string;
  title: string;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ConversationDetail {
  filename: string;
  sessionId: string;
  date: string;
  size: number;
  messages: ConversationMessage[];
  source: string;
  format: string;
  title: string;
}

interface SearchMatch {
  index: number;
  role: string;
  snippet: string;
}

interface SearchResult {
  filename: string;
  sessionId: string;
  date: string;
  matchCount: number;
  matches: SearchMatch[];
  source: string;
}

interface Stats {
  totalConversations: number;
  totalMessages: number;
  totalUserMessages: number;
  totalAssistantMessages: number;
  totalSizeMB: string;
  uniqueDates: number;
  dateRange: { first: string | null; last: string | null };
  agentConversations: number;
  directConversations: number;
}

interface Task {
  id: string;
  text: string;
  source: string;
  category: string;
  completed: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface ConversationInsights {
  decisions: string[];
  tasks: { text: string; source: string; messageIndex: number }[];
  filesChanged: string[];
  featuresBuilt: string[];
  bugsFixed: string[];
  architecturalNotes: string[];
  followUps: string[];
  keyExchanges: { userMessage: string; assistantMessage: string; messageIndex: number }[];
  summary: string;
}

interface ReviewResult {
  filename: string;
  title: string;
  date: string;
  source: string;
  format: string;
  size: number;
  messageCount: number;
  insights: ConversationInsights;
  selected?: boolean;
}

interface PipelineExportItem {
  title: string;
  description: string;
  horizon: string;
  priority: string;
  category: string;
  task_type: string;
  status: string;
  enabled: boolean;
}

const AGENT_TOOLS_CONV = ['windsurf', 'claude_cli', 'cursor'] as const;
const AGENT_TOOL_LABELS_CONV: Record<string, string> = { windsurf: 'Windsurf', claude_cli: 'Claude CLI', cursor: 'Cursor' };
const AGENT_TOOL_COLORS_CONV: Record<string, string> = { windsurf: '#00b4d8', claude_cli: '#d4a574', cursor: '#7c3aed' };
const HORIZON_OPTIONS = [
  { value: '1', label: '24 Hour' },
  { value: '2', label: '48 Hour' },
  { value: '7', label: '7 Day' },
  { value: '14', label: '14 Day' },
  { value: '30', label: '30 Day' },
  { value: '60', label: '60 Day' },
  { value: '90', label: '90 Day' },
];

const ConversationLogPage: React.FC = () => {
  const theme = useTheme();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [byDate, setByDate] = useState<Record<string, ConversationSummary[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedConversation, setExpandedConversation] = useState<string | null>(null);
  const [conversationDetail, setConversationDetail] = useState<ConversationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'agent' | 'direct' | 'cascade'>('all');
  const [activeTab, setActiveTab] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'date' | 'size' | 'messages'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedConvs, setSelectedConvs] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [taskCategoryFilter, setTaskCategoryFilter] = useState<string>('all');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Review & Pipeline tab state
  const [reviewResults, setReviewResults] = useState<ReviewResult[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewExpanded, setReviewExpanded] = useState<string | null>(null);
  const [pipelineItems, setPipelineItems] = useState<PipelineExportItem[]>([]);
  const [pipelineAgentTool, setPipelineAgentTool] = useState('');
  const [pipelineHorizon, setPipelineHorizon] = useState('7');
  const [pipelineExporting, setPipelineExporting] = useState(false);

  // Bulk export completed tasks state
  const [bulkExportPreview, setBulkExportPreview] = useState<any[] | null>(null);
  const [bulkExportLoading, setBulkExportLoading] = useState(false);
  const [bulkExportResult, setBulkExportResult] = useState<{ count: number; skipped: number } | null>(null);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data: any = await axiosInstance.get('/api/conversation-log/list');
      if (data.success) {
        setConversations(data.conversations || []);
        setByDate(data.byDate || {});
      } else {
        setError(data.error || 'Failed to load conversations');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data: any = await axiosInstance.get('/api/conversation-log/stats');
      if (data.success) {
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  const fetchDetail = useCallback(async (filename: string) => {
    if (expandedConversation === filename) {
      setExpandedConversation(null);
      setConversationDetail(null);
      return;
    }
    setExpandedConversation(filename);
    setLoadingDetail(true);
    try {
      const data: any = await axiosInstance.get(`/api/conversation-log/detail/${encodeURIComponent(filename)}`);
      if (data.success) {
        setConversationDetail(data);
      }
    } catch (err: any) {
      console.error('Failed to fetch detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  }, [expandedConversation]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const data: any = await axiosInstance.get(`/api/conversation-log/search?q=${encodeURIComponent(query.trim())}`);
      if (data.success) {
        setSearchResults(data.results || []);
      }
    } catch (err: any) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  const onSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (val.trim().length >= 3) {
      searchTimeoutRef.current = setTimeout(() => handleSearch(val), 500);
    } else {
      setSearchResults(null);
    }
  }, [handleSearch]);

  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const data: any = await axiosInstance.get('/api/conversation-log/tasks');
      if (data.success) setTasks(data.tasks || []);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  const toggleTask = useCallback(async (taskId: string, completed: boolean) => {
    try {
      await axiosInstance.put(`/api/conversation-log/tasks/${taskId}`, { completed });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed, updatedAt: new Date().toISOString() } : t));
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  }, []);

  const addTask = useCallback(async () => {
    if (!newTaskText.trim()) return;
    try {
      const data: any = await axiosInstance.post('/api/conversation-log/tasks', {
        text: newTaskText.trim(),
        category: newTaskCategory.trim() || 'general',
        source: 'manual',
      });
      if (data.success) {
        setTasks(prev => [...prev, data.task]);
        setNewTaskText('');
        setNewTaskCategory('');
      }
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  }, [newTaskText, newTaskCategory]);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      await axiosInstance.delete(`/api/conversation-log/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }, []);

  const toggleConvSelection = useCallback((filename: string) => {
    setSelectedConvs(prev => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  }, []);

  const selectAllForDate = useCallback((date: string) => {
    const convs = byDate[date] || [];
    setSelectedConvs(prev => {
      const next = new Set(prev);
      const allSelected = convs.every(c => next.has(c.filename));
      if (allSelected) {
        convs.forEach(c => next.delete(c.filename));
      } else {
        convs.forEach(c => next.add(c.filename));
      }
      return next;
    });
  }, [byDate]);

  const handleCombineExport = useCallback(async (date?: string) => {
    setExporting(true);
    try {
      const body: any = {};
      if (date) {
        body.date = date;
      } else if (selectedConvs.size > 0) {
        body.filenames = [...selectedConvs];
      } else {
        setSnackbar({ open: true, message: 'Select conversations or use a date group to export', severity: 'error' });
        setExporting(false);
        return;
      }

      const response = await fetch('/api/conversation-log/combine-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Export failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversations-${date || 'selected'}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSnackbar({ open: true, message: `Exported ${date ? 'all conversations for ' + date : selectedConvs.size + ' conversation(s)'}`, severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Export failed', severity: 'error' });
    } finally {
      setExporting(false);
    }
  }, [selectedConvs]);

  const handleExportSingle = useCallback(async (filename: string) => {
    try {
      const response = await fetch(`/api/conversation-log/export/${encodeURIComponent(filename)}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Export failed', severity: 'error' });
    }
  }, []);

  // ─── Review & Pipeline Handlers ─────────────────────────────────

  const handleReviewSelected = useCallback(async () => {
    if (selectedConvs.size === 0) {
      setSnackbar({ open: true, message: 'Select conversations to review', severity: 'error' });
      return;
    }
    setReviewLoading(true);
    setActiveTab(2);
    try {
      const response = await fetch('/api/conversation-log/review/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ filenames: [...selectedConvs] }),
      });
      if (!response.ok) throw new Error('Review failed');
      const data = await response.json();
      if (data.success) {
        setReviewResults(data.results || []);
        // Auto-generate pipeline items from insights
        const items: PipelineExportItem[] = [];
        for (const result of (data.results || [])) {
          const ins = result.insights as ConversationInsights;
          for (const task of ins.tasks) {
            items.push({
              title: task.text,
              description: `From conversation: ${result.title || result.filename}`,
              horizon: pipelineHorizon,
              priority: 'medium',
              category: 'follow-up',
              task_type: 'task',
              status: 'todo',
              enabled: true,
            });
          }
          for (const feat of ins.featuresBuilt) {
            items.push({
              title: `Document: ${feat}`,
              description: `Feature built in: ${result.title || result.filename}`,
              horizon: pipelineHorizon,
              priority: 'low',
              category: 'documentation',
              task_type: 'note',
              status: 'done',
              enabled: false,
            });
          }
          for (const bug of ins.bugsFixed) {
            items.push({
              title: `Verify fix: ${bug}`,
              description: `Bug fixed in: ${result.title || result.filename}`,
              horizon: '2',
              priority: 'high',
              category: 'qa',
              task_type: 'task',
              status: 'todo',
              enabled: true,
            });
          }
        }
        setPipelineItems(items);
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Review failed', severity: 'error' });
    } finally {
      setReviewLoading(false);
    }
  }, [selectedConvs, pipelineHorizon]);

  const handleReviewSingle = useCallback(async (filename: string) => {
    setReviewLoading(true);
    setActiveTab(2);
    try {
      const response = await fetch(`/api/conversation-log/review/${encodeURIComponent(filename)}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Review failed');
      const data = await response.json();
      if (data.success) {
        setReviewResults([data]);
        const ins = data.insights as ConversationInsights;
        const items: PipelineExportItem[] = [];
        for (const task of ins.tasks) {
          items.push({
            title: task.text,
            description: `From: ${data.title || filename}`,
            horizon: pipelineHorizon,
            priority: 'medium',
            category: 'follow-up',
            task_type: 'task',
            status: 'todo',
            enabled: true,
          });
        }
        for (const bug of ins.bugsFixed) {
          items.push({
            title: `Verify fix: ${bug}`,
            description: `Bug fixed in: ${data.title || filename}`,
            horizon: '2',
            priority: 'high',
            category: 'qa',
            task_type: 'task',
            status: 'todo',
            enabled: true,
          });
        }
        setPipelineItems(items);
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Review failed', severity: 'error' });
    } finally {
      setReviewLoading(false);
    }
  }, [pipelineHorizon]);

  const handleExportToPipeline = useCallback(async () => {
    const enabledItems = pipelineItems.filter(i => i.enabled);
    if (enabledItems.length === 0) {
      setSnackbar({ open: true, message: 'No items enabled for export', severity: 'error' });
      return;
    }
    setPipelineExporting(true);
    try {
      const convRef = reviewResults.length === 1
        ? reviewResults[0].filename
        : `batch-${reviewResults.length}-convs`;
      const response = await fetch('/api/conversation-log/export-to-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: enabledItems,
          conversation_ref: convRef,
          agent_tool: pipelineAgentTool || null,
        }),
      });
      if (!response.ok) throw new Error('Export failed');
      const data = await response.json();
      if (data.success) {
        setSnackbar({ open: true, message: `${data.count} item(s) exported to OM Daily pipeline`, severity: 'success' });
        setPipelineItems(prev => prev.map(i => i.enabled ? { ...i, enabled: false } : i));
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Export failed', severity: 'error' });
    } finally {
      setPipelineExporting(false);
    }
  }, [pipelineItems, pipelineAgentTool, reviewResults]);

  const handleBulkExportPreview = useCallback(async () => {
    setBulkExportLoading(true);
    setBulkExportPreview(null);
    setBulkExportResult(null);
    try {
      const response = await fetch('/api/conversation-log/tasks/export-completed-to-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ agent_tool: pipelineAgentTool || null, horizon: pipelineHorizon, auto_branch: true, dry_run: true }),
      });
      if (!response.ok) throw new Error('Preview failed');
      const data = await response.json();
      if (data.success) {
        setBulkExportPreview(data.items || []);
        if (data.skipped > 0) {
          setSnackbar({ open: true, message: `${data.would_create} items ready, ${data.skipped} already in pipeline (skipped)`, severity: 'success' });
        }
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Preview failed', severity: 'error' });
    } finally {
      setBulkExportLoading(false);
    }
  }, [pipelineAgentTool, pipelineHorizon]);

  const handleBulkExportConfirm = useCallback(async () => {
    setBulkExportLoading(true);
    try {
      const response = await fetch('/api/conversation-log/tasks/export-completed-to-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ agent_tool: pipelineAgentTool || null, horizon: pipelineHorizon, auto_branch: true, dry_run: false }),
      });
      if (!response.ok) throw new Error('Export failed');
      const data = await response.json();
      if (data.success) {
        setBulkExportResult({ count: data.count, skipped: data.skipped });
        setBulkExportPreview(null);
        setSnackbar({ open: true, message: `${data.count} completed tasks exported to OM Daily pipeline`, severity: 'success' });
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Export failed', severity: 'error' });
    } finally {
      setBulkExportLoading(false);
    }
  }, [pipelineAgentTool, pipelineHorizon]);

  const handleAddPipelineItem = useCallback(() => {
    setPipelineItems(prev => [...prev, {
      title: '',
      description: '',
      horizon: pipelineHorizon,
      priority: 'medium',
      category: '',
      task_type: 'task',
      status: 'todo',
      enabled: true,
    }]);
  }, [pipelineHorizon]);

  const handleRemovePipelineItem = useCallback((index: number) => {
    setPipelineItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdatePipelineItem = useCallback((index: number, field: string, value: any) => {
    setPipelineItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }, []);

  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    if (taskFilter === 'completed') filtered = filtered.filter(t => t.completed);
    else if (taskFilter === 'pending') filtered = filtered.filter(t => !t.completed);
    if (taskCategoryFilter !== 'all') filtered = filtered.filter(t => t.category === taskCategoryFilter);
    return filtered;
  }, [tasks, taskFilter, taskCategoryFilter]);

  const taskCategories = useMemo(() => {
    const cats = new Set(tasks.map(t => t.category));
    return [...cats].sort();
  }, [tasks]);

  const taskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    return { total, completed, pending: total - completed, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [tasks]);

  useEffect(() => {
    fetchConversations();
    fetchStats();
    fetchTasks();
  }, [fetchConversations, fetchStats, fetchTasks]);

  const sortedDates = useMemo(() => {
    return Object.keys(byDate).sort().reverse();
  }, [byDate]);

  const filteredByDate = useMemo(() => {
    const source = filterType === 'all' ? byDate : (() => {
      const filtered: Record<string, ConversationSummary[]> = {};
      for (const [date, convs] of Object.entries(byDate)) {
        const f = convs.filter(c => {
          if (filterType === 'cascade') return c.format === 'cascade';
          if (filterType === 'agent') return c.isAgent && c.format !== 'cascade';
          if (filterType === 'direct') return !c.isAgent && c.format !== 'cascade';
          return true;
        });
        if (f.length > 0) filtered[date] = f;
      }
      return filtered;
    })();

    // Sort conversations within each date group
    const sorted: Record<string, ConversationSummary[]> = {};
    for (const [date, convs] of Object.entries(source)) {
      const copy = [...convs];
      copy.sort((a, b) => {
        let cmp = 0;
        if (sortField === 'size') cmp = a.size - b.size;
        else if (sortField === 'messages') cmp = a.messageCount - b.messageCount;
        else cmp = a.filename.localeCompare(b.filename);
        return sortDir === 'desc' ? -cmp : cmp;
      });
      sorted[date] = copy;
    }
    return sorted;
  }, [byDate, filterType, sortField, sortDir]);

  const filteredDates = useMemo(() => {
    const dates = Object.keys(filteredByDate);
    if (sortField === 'date') {
      dates.sort((a, b) => sortDir === 'desc' ? b.localeCompare(a) : a.localeCompare(b));
    } else {
      // Sort date groups by aggregate of sort field
      dates.sort((a, b) => {
        const aConvs = filteredByDate[a] || [];
        const bConvs = filteredByDate[b] || [];
        let aVal = 0, bVal = 0;
        if (sortField === 'size') {
          aVal = aConvs.reduce((s, c) => s + c.size, 0);
          bVal = bConvs.reduce((s, c) => s + c.size, 0);
        } else if (sortField === 'messages') {
          aVal = aConvs.reduce((s, c) => s + c.messageCount, 0);
          bVal = bConvs.reduce((s, c) => s + c.messageCount, 0);
        }
        return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
      });
    }
    return dates;
  }, [filteredByDate, sortField, sortDir]);

  const toggleDate = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const highlightQuery = (text: string, query: string) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.substring(0, idx)}
        <Box component="span" sx={{ bgcolor: 'warning.light', color: 'warning.contrastText', px: 0.3, borderRadius: 0.5, fontWeight: 700 }}>
          {text.substring(idx, idx + query.length)}
        </Box>
        {text.substring(idx + query.length)}
      </>
    );
  };

  const renderMarkdown = (content: string) => {
    // Simple markdown rendering: code blocks, inline code, bold, headers
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLang = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <Box
              key={`code-${i}`}
              component="pre"
              sx={{
                bgcolor: alpha(theme.palette.text.primary, 0.05),
                border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                borderRadius: 1,
                p: 1.5,
                my: 1,
                overflow: 'auto',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {codeBlockContent.join('\n')}
            </Box>
          );
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          codeBlockLang = line.substring(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Headers
      if (line.startsWith('### ')) {
        elements.push(
          <Typography key={i} variant="subtitle2" sx={{ fontWeight: 700, mt: 1.5, mb: 0.5 }}>
            {line.substring(4)}
          </Typography>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <Typography key={i} variant="subtitle1" sx={{ fontWeight: 700, mt: 2, mb: 0.5 }}>
            {line.substring(3)}
          </Typography>
        );
        continue;
      }
      if (line.startsWith('# ')) {
        elements.push(
          <Typography key={i} variant="h6" sx={{ fontWeight: 700, mt: 2, mb: 0.5 }}>
            {line.substring(2)}
          </Typography>
        );
        continue;
      }

      // Bullet points
      if (line.match(/^\s*[-*]\s/)) {
        const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
        const text = line.replace(/^\s*[-*]\s/, '');
        elements.push(
          <Box key={i} sx={{ display: 'flex', ml: indent / 2 + 1, my: 0.2 }}>
            <Typography variant="body2" sx={{ mr: 1, color: 'text.secondary' }}>•</Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {renderInlineMarkdown(text)}
            </Typography>
          </Box>
        );
        continue;
      }

      // Numbered lists
      if (line.match(/^\s*\d+\.\s/)) {
        const match = line.match(/^(\s*)(\d+)\.\s(.*)$/);
        if (match) {
          const indent = match[1].length;
          elements.push(
            <Box key={i} sx={{ display: 'flex', ml: indent / 2 + 1, my: 0.2 }}>
              <Typography variant="body2" sx={{ mr: 1, color: 'text.secondary', minWidth: 20 }}>{match[2]}.</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {renderInlineMarkdown(match[3])}
              </Typography>
            </Box>
          );
          continue;
        }
      }

      // Empty line
      if (!line.trim()) {
        elements.push(<Box key={i} sx={{ height: 8 }} />);
        continue;
      }

      // Regular text
      elements.push(
        <Typography key={i} variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', my: 0.2 }}>
          {renderInlineMarkdown(line)}
        </Typography>
      );
    }

    return <>{elements}</>;
  };

  const renderInlineMarkdown = (text: string): React.ReactNode => {
    // Handle inline code, bold, italic
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Inline code
      const codeMatch = remaining.match(/`([^`]+)`/);
      // Bold
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);

      let firstMatch: { type: string; index: number; full: string; inner: string } | null = null;

      if (codeMatch && codeMatch.index !== undefined) {
        firstMatch = { type: 'code', index: codeMatch.index, full: codeMatch[0], inner: codeMatch[1] };
      }
      if (boldMatch && boldMatch.index !== undefined) {
        if (firstMatch === null || boldMatch.index < firstMatch.index) {
          firstMatch = { type: 'bold', index: boldMatch.index, full: boldMatch[0], inner: boldMatch[1] };
        }
      }

      if (!firstMatch) {
        parts.push(remaining);
        break;
      }

      if (firstMatch.index > 0) {
        parts.push(remaining.substring(0, firstMatch.index));
      }

      if (firstMatch.type === 'code') {
        parts.push(
          <Box
            key={`inline-${key++}`}
            component="code"
            sx={{
              bgcolor: alpha(theme.palette.text.primary, 0.08),
              px: 0.5,
              py: 0.1,
              borderRadius: 0.5,
              fontSize: '0.85em',
              fontFamily: 'monospace',
            }}
          >
            {firstMatch.inner}
          </Box>
        );
      } else if (firstMatch.type === 'bold') {
        parts.push(
          <Box key={`inline-${key++}`} component="strong" sx={{ fontWeight: 700 }}>
            {firstMatch.inner}
          </Box>
        );
      }

      remaining = remaining.substring(firstMatch.index + firstMatch.full.length);
    }

    return <>{parts}</>;
  };

  const renderMessage = (msg: ConversationMessage, idx: number) => {
    const isUser = msg.role === 'user';
    return (
      <Box
        key={idx}
        sx={{
          display: 'flex',
          gap: 1.5,
          py: 2,
          px: 2,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
          bgcolor: isUser ? 'transparent' : alpha(theme.palette.primary.main, 0.02),
          '&:last-child': { borderBottom: 'none' },
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: isUser ? alpha(theme.palette.info.main, 0.12) : alpha(theme.palette.success.main, 0.12),
            color: isUser ? 'info.main' : 'success.main',
            flexShrink: 0,
            mt: 0.3,
          }}
        >
          {isUser ? <IconUser size={18} /> : <IconRobot size={18} />}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: isUser ? 'info.main' : 'success.main', mb: 0.5, display: 'block' }}>
            {isUser ? 'You' : 'Claude'}
          </Typography>
          <Box sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
            {renderMarkdown(msg.content)}
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Box ref={topRef} sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Conversation Log
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Complete history of Claude conversations, organized by date
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Toggle Stats">
            <IconButton onClick={() => { setShowStats(!showStats); if (!stats) fetchStats(); }}>
              <IconChartBar size={20} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={() => { fetchConversations(); fetchStats(); fetchTasks(); }}>
              <IconRefresh size={20} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 2, borderBottom: `1px solid ${theme.palette.divider}` }}
      >
        <Tab label="Conversations" icon={<IconMessage size={16} />} iconPosition="start" sx={{ textTransform: 'none', fontWeight: 600 }} />
        <Tab
          label={
            <Stack direction="row" spacing={1} alignItems="center">
              <span>Tasks</span>
              {taskStats.pending > 0 && (
                <Chip label={taskStats.pending} size="small" color="warning" sx={{ height: 20, fontSize: '0.7rem' }} />
              )}
            </Stack>
          }
          icon={<IconChecklist size={16} />}
          iconPosition="start"
          sx={{ textTransform: 'none', fontWeight: 600 }}
        />
        <Tab
          label={
            <Stack direction="row" spacing={1} alignItems="center">
              <span>Review & Pipeline</span>
              {reviewResults.length > 0 && (
                <Chip label={reviewResults.length} size="small" color="secondary" sx={{ height: 20, fontSize: '0.7rem' }} />
              )}
            </Stack>
          }
          icon={<IconFileText size={16} />}
          iconPosition="start"
          sx={{ textTransform: 'none', fontWeight: 600 }}
        />
      </Tabs>

      {/* ===== TAB 0: Conversations ===== */}
      {activeTab === 0 && (<>

      {/* Stats Panel */}
      <Collapse in={showStats && !!stats}>
        {stats && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
            <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
              <Box>
                <Typography variant="caption" color="text.secondary">Total Conversations</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{stats.totalConversations}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Total Messages</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{stats.totalMessages.toLocaleString()}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Your Messages</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{stats.totalUserMessages.toLocaleString()}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Claude Messages</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{stats.totalAssistantMessages.toLocaleString()}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Total Size</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{stats.totalSizeMB} MB</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Active Days</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{stats.uniqueDates}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Date Range</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {stats.dateRange.first} — {stats.dateRange.last}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Agent / Direct</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {stats.agentConversations} / {stats.directConversations}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        )}
      </Collapse>

      {/* Search + Filters + Sort */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              fullWidth
              size="small"
              placeholder="Search conversations (min 3 characters)..."
              value={searchQuery}
              onChange={onSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {searching ? <CircularProgress size={18} /> : <IconSearch size={18} />}
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => { setSearchQuery(''); setSearchResults(null); }}>
                      <IconX size={16} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
            <Stack direction="row" spacing={0.5}>
              <Chip label="All" size="small" variant={filterType === 'all' ? 'filled' : 'outlined'} color={filterType === 'all' ? 'primary' : 'default'} onClick={() => setFilterType('all')} />
              <Chip label="Direct" size="small" variant={filterType === 'direct' ? 'filled' : 'outlined'} color={filterType === 'direct' ? 'info' : 'default'} onClick={() => setFilterType('direct')} />
              <Chip label="Agent" size="small" variant={filterType === 'agent' ? 'filled' : 'outlined'} color={filterType === 'agent' ? 'warning' : 'default'} onClick={() => setFilterType('agent')} />
              <Chip label="Cascade" size="small" variant={filterType === 'cascade' ? 'filled' : 'outlined'} color={filterType === 'cascade' ? 'secondary' : 'default'} onClick={() => setFilterType('cascade')} />
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Sort:</Typography>
              <Chip label="Date" size="small" variant={sortField === 'date' ? 'filled' : 'outlined'} color={sortField === 'date' ? 'primary' : 'default'} onClick={() => setSortField('date')} />
              <Chip label="Size" size="small" variant={sortField === 'size' ? 'filled' : 'outlined'} color={sortField === 'size' ? 'primary' : 'default'} onClick={() => setSortField('size')} />
              <Chip label="Messages" size="small" variant={sortField === 'messages' ? 'filled' : 'outlined'} color={sortField === 'messages' ? 'primary' : 'default'} onClick={() => setSortField('messages')} />
              <IconButton size="small" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
                {sortDir === 'desc' ? <IconSortDescending size={16} /> : <IconSortAscending size={16} />}
              </IconButton>
            </Stack>
          </Stack>
          {/* Selection actions bar */}
          {selectedConvs.size > 0 && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ pt: 0.5, borderTop: `1px solid ${alpha(theme.palette.divider, 0.3)}` }}>
              <Chip label={`${selectedConvs.size} selected`} size="small" color="primary" onDelete={() => setSelectedConvs(new Set())} />
              <Button
                size="small"
                variant="outlined"
                startIcon={exporting ? <CircularProgress size={14} /> : <IconFiles size={14} />}
                onClick={() => handleCombineExport()}
                disabled={exporting}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                Combine & Export .md
              </Button>
              <Button
                size="small"
                variant="contained"
                color="secondary"
                startIcon={reviewLoading ? <CircularProgress size={14} /> : <IconChartBar size={14} />}
                onClick={handleReviewSelected}
                disabled={reviewLoading}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                Review & Analyze
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Search Results */}
      {searchResults !== null && !loading && (
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Search Results: {searchResults.length} conversation{searchResults.length !== 1 ? 's' : ''} matching "{searchQuery}"
            </Typography>
          </Box>
          {searchResults.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">No results found</Typography>
            </Box>
          ) : (
            searchResults.map((result, ri) => (
              <Box key={ri} sx={{ borderBottom: `1px solid ${alpha(theme.palette.divider, 0.3)}`, '&:last-child': { borderBottom: 'none' } }}>
                <Box
                  sx={{
                    p: 1.5,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                  onClick={() => fetchDetail(result.filename)}
                >
                  {expandedConversation === result.filename ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                  <IconCalendar size={14} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{result.date}</Typography>
                  <Chip label={`${result.matchCount} match${result.matchCount !== 1 ? 'es' : ''}`} size="small" color="warning" variant="outlined" />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', fontFamily: 'monospace' }}>
                    {result.sessionId.substring(0, 12)}
                  </Typography>
                </Box>
                {/* Show snippets */}
                <Box sx={{ px: 3, pb: 1.5 }}>
                  {result.matches.slice(0, 3).map((match, mi) => (
                    <Box key={mi} sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'flex-start' }}>
                      <Chip
                        label={match.role === 'user' ? 'You' : 'Claude'}
                        size="small"
                        color={match.role === 'user' ? 'info' : 'success'}
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 20, mt: 0.2 }}
                      />
                      <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
                        {highlightQuery(match.snippet, searchQuery)}
                      </Typography>
                    </Box>
                  ))}
                  {result.matches.length > 3 && (
                    <Typography variant="caption" color="text.secondary">
                      ...and {result.matches.length - 3} more matches
                    </Typography>
                  )}
                </Box>
                {/* Expanded detail */}
                <Collapse in={expandedConversation === result.filename}>
                  {loadingDetail && expandedConversation === result.filename && <LinearProgress />}
                  {conversationDetail && expandedConversation === result.filename && (
                    <Box sx={{ borderTop: `1px solid ${theme.palette.divider}` }}>
                      {conversationDetail.messages.map((msg, mi) => renderMessage(msg, mi))}
                    </Box>
                  )}
                </Collapse>
              </Box>
            ))
          )}
        </Paper>
      )}

      {/* Date-grouped conversation list */}
      {searchResults === null && !loading && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {conversations.length} conversations across {sortedDates.length} days
          </Typography>

          {filteredDates.map(date => {
            const convs = filteredByDate[date] || [];
            const isExpanded = expandedDates.has(date);
            const allDateSelected = convs.length > 0 && convs.every(c => selectedConvs.has(c.filename));
            const someDateSelected = convs.some(c => selectedConvs.has(c.filename));

            return (
              <Paper key={date} sx={{ mb: 2, overflow: 'hidden' }}>
                {/* Date header */}
                <Box
                  sx={{
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                    borderBottom: isExpanded ? `1px solid ${theme.palette.divider}` : 'none',
                  }}
                >
                  <Checkbox
                    size="small"
                    checked={allDateSelected}
                    indeterminate={someDateSelected && !allDateSelected}
                    onChange={() => selectAllForDate(date)}
                    onClick={(e) => e.stopPropagation()}
                    sx={{ p: 0.3 }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, cursor: 'pointer' }} onClick={() => toggleDate(date)}>
                    {isExpanded ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
                    <IconCalendar size={16} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {formatDate(date)}
                    </Typography>
                    <Badge badgeContent={convs.length} color="primary" sx={{ ml: 1 }}>
                      <IconMessage size={16} />
                    </Badge>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', mr: 1 }}>
                      {formatSize(convs.reduce((sum, c) => sum + c.size, 0))}
                    </Typography>
                  </Box>
                  <Tooltip title="Combine & export all conversations for this date">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleCombineExport(date); }} disabled={exporting}>
                      <IconDownload size={16} />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Conversations for this date */}
                <Collapse in={isExpanded}>
                  {convs.map((conv, ci) => (
                    <Box key={conv.filename}>
                      <Box
                        sx={{
                          p: 1.5,
                          pl: 2,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 0.5,
                          '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.5) },
                          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                          bgcolor: selectedConvs.has(conv.filename)
                            ? alpha(theme.palette.primary.main, 0.08)
                            : expandedConversation === conv.filename
                              ? alpha(theme.palette.primary.main, 0.06)
                              : 'transparent',
                        }}
                      >
                        <Checkbox
                          size="small"
                          checked={selectedConvs.has(conv.filename)}
                          onChange={() => toggleConvSelection(conv.filename)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ p: 0.3, mt: 0.1 }}
                        />
                        <Box
                          sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flex: 1, cursor: 'pointer', minWidth: 0 }}
                          onClick={() => fetchDetail(conv.filename)}
                        >
                        <Box sx={{ mt: 0.3 }}>
                          {expandedConversation === conv.filename ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                        </Box>
                        <IconFileText size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {conv.date || conv.fileDate}
                            </Typography>
                            <Chip
                              label={conv.format === 'cascade' ? 'Cascade' : conv.isAgent ? 'Agent' : 'Direct'}
                              size="small"
                              color={conv.format === 'cascade' ? 'secondary' : conv.isAgent ? 'warning' : 'info'}
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                            {conv.source && conv.source !== 'c2' && (
                              <Chip
                                label={conv.source}
                                size="small"
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            )}
                            <Chip
                              label={`${conv.messageCount} msgs`}
                              size="small"
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                            {conv.title ? (
                              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                {conv.title}
                              </Typography>
                            ) : conv.sessionId ? (
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                {conv.sessionId.substring(0, 16)}
                              </Typography>
                            ) : null}
                          </Stack>
                          {conv.preview && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: 'block',
                                mt: 0.5,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '100%',
                              }}
                            >
                              {conv.preview}
                            </Typography>
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                          {formatSize(conv.size)}
                        </Typography>
                        </Box>
                        <Tooltip title="Export .md">
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleExportSingle(conv.filename); }} sx={{ opacity: 0.4, '&:hover': { opacity: 1 } }}>
                            <IconDownload size={14} />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      {/* Expanded conversation detail */}
                      <Collapse in={expandedConversation === conv.filename}>
                        {loadingDetail && expandedConversation === conv.filename && <LinearProgress />}
                        {conversationDetail && expandedConversation === conv.filename && (
                          <Box sx={{ borderTop: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
                            {conversationDetail.messages.length === 0 ? (
                              <Box sx={{ p: 3, textAlign: 'center' }}>
                                <Typography color="text.secondary">No messages in this conversation</Typography>
                              </Box>
                            ) : (
                              conversationDetail.messages.map((msg, mi) => renderMessage(msg, mi))
                            )}
                          </Box>
                        )}
                      </Collapse>
                    </Box>
                  ))}
                </Collapse>
              </Paper>
            );
          })}
        </>
      )}

      </>)}

      {/* ===== TAB 1: Tasks ===== */}
      {activeTab === 1 && (
        <>
          {/* Task Progress */}
          <Paper sx={{ p: 2, mb: 3, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
            <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap" useFlexGap>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Progress: {taskStats.completed}/{taskStats.total} tasks
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {taskStats.pct}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={taskStats.pct}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Stack direction="row" spacing={1}>
                <Chip label={`${taskStats.completed} Done`} size="small" color="success" variant="outlined" />
                <Chip label={`${taskStats.pending} Pending`} size="small" color="warning" variant="outlined" />
              </Stack>
            </Stack>
          </Paper>

          {/* Bulk Export to OM Daily Pipeline */}
          {taskStats.completed > 0 && (
            <Paper sx={{ p: 2, mb: 3, border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`, bgcolor: alpha(theme.palette.success.main, 0.02) }}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Export Completed Tasks to OM Daily Pipeline
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Bulk-import {taskStats.completed} completed task(s) as pipeline items with auto-categorization and branch type detection
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      select size="small" label="Agent" value={pipelineAgentTool}
                      onChange={(e) => setPipelineAgentTool(e.target.value)}
                      sx={{ minWidth: 120 }}
                    >
                      <MenuItem value="">None</MenuItem>
                      {AGENT_TOOLS_CONV.map(a => <MenuItem key={a} value={a}>{AGENT_TOOL_LABELS_CONV[a]}</MenuItem>)}
                    </TextField>
                    <TextField
                      select size="small" label="Horizon" value={pipelineHorizon}
                      onChange={(e) => setPipelineHorizon(e.target.value)}
                      sx={{ minWidth: 100 }}
                    >
                      {HORIZON_OPTIONS.map(h => <MenuItem key={h.value} value={h.value}>{h.label}</MenuItem>)}
                    </TextField>
                    <Button
                      variant="outlined" size="small" color="info"
                      onClick={handleBulkExportPreview}
                      disabled={bulkExportLoading}
                      startIcon={bulkExportLoading ? <CircularProgress size={14} /> : <IconChartBar size={16} />}
                      sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                    >
                      Preview
                    </Button>
                  </Stack>
                </Stack>

                {/* Preview results */}
                {bulkExportPreview && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {bulkExportPreview.length} item(s) ready to export
                      </Typography>
                      <Button
                        variant="contained" size="small" color="success"
                        onClick={handleBulkExportConfirm}
                        disabled={bulkExportLoading || bulkExportPreview.length === 0}
                        startIcon={bulkExportLoading ? <CircularProgress size={14} /> : <IconChecklist size={16} />}
                        sx={{ textTransform: 'none' }}
                      >
                        Confirm Export ({bulkExportPreview.length})
                      </Button>
                      <Button size="small" onClick={() => setBulkExportPreview(null)} sx={{ textTransform: 'none' }}>
                        Cancel
                      </Button>
                    </Stack>
                    <Box sx={{ maxHeight: 300, overflow: 'auto', border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
                      {bulkExportPreview.map((item, idx) => (
                        <Box key={idx} sx={{ px: 1.5, py: 0.75, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`, display: 'flex', alignItems: 'center', gap: 1, '&:last-child': { borderBottom: 'none' } }}>
                          <Typography variant="caption" sx={{ flex: 1, fontSize: '0.75rem' }}>{item.title}</Typography>
                          <Chip size="small" label={item.category} sx={{ fontSize: '0.6rem', height: 18 }} />
                          {item.branch_type && (
                            <Chip size="small" label={item.branch_type.replace('_', ' ')} sx={{ fontSize: '0.6rem', height: 18, bgcolor: alpha(
                              item.branch_type === 'bugfix' ? '#d73a4a' : item.branch_type === 'new_feature' ? '#0e8a16' : item.branch_type === 'existing_feature' ? '#1d76db' : '#fbca04', 0.12
                            ), color: item.branch_type === 'bugfix' ? '#d73a4a' : item.branch_type === 'new_feature' ? '#0e8a16' : item.branch_type === 'existing_feature' ? '#1d76db' : '#fbca04' }} />
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Export result */}
                {bulkExportResult && (
                  <Alert severity="success" sx={{ fontSize: '0.8rem' }} onClose={() => setBulkExportResult(null)}>
                    Successfully exported {bulkExportResult.count} task(s) to OM Daily pipeline.
                    {bulkExportResult.skipped > 0 && ` ${bulkExportResult.skipped} duplicate(s) skipped.`}
                    {' '}<a href="/admin/control-panel/om-daily" style={{ color: 'inherit', fontWeight: 600 }}>View Pipeline →</a>
                  </Alert>
                )}
              </Stack>
            </Paper>
          )}

          {/* Task Filters */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
              <Stack direction="row" spacing={0.5}>
                <Chip label="All" size="small" variant={taskFilter === 'all' ? 'filled' : 'outlined'} color={taskFilter === 'all' ? 'primary' : 'default'} onClick={() => setTaskFilter('all')} />
                <Chip label="Pending" size="small" variant={taskFilter === 'pending' ? 'filled' : 'outlined'} color={taskFilter === 'pending' ? 'warning' : 'default'} onClick={() => setTaskFilter('pending')} />
                <Chip label="Completed" size="small" variant={taskFilter === 'completed' ? 'filled' : 'outlined'} color={taskFilter === 'completed' ? 'success' : 'default'} onClick={() => setTaskFilter('completed')} />
              </Stack>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                <Chip label="All Categories" size="small" variant={taskCategoryFilter === 'all' ? 'filled' : 'outlined'} color={taskCategoryFilter === 'all' ? 'primary' : 'default'} onClick={() => setTaskCategoryFilter('all')} sx={{ fontSize: '0.7rem' }} />
                {taskCategories.map(cat => (
                  <Chip key={cat} label={cat} size="small" variant={taskCategoryFilter === cat ? 'filled' : 'outlined'} color={taskCategoryFilter === cat ? 'primary' : 'default'} onClick={() => setTaskCategoryFilter(cat)} sx={{ fontSize: '0.7rem' }} />
                ))}
              </Stack>
            </Stack>
          </Paper>

          {/* Add Task */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                fullWidth
                size="small"
                placeholder="Add a new task..."
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addTask(); }}
              />
              <TextField
                size="small"
                placeholder="Category"
                value={newTaskCategory}
                onChange={(e) => setNewTaskCategory(e.target.value)}
                sx={{ width: 150 }}
              />
              <Button
                variant="contained"
                size="small"
                startIcon={<IconPlus size={16} />}
                onClick={addTask}
                disabled={!newTaskText.trim()}
                sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
              >
                Add
              </Button>
            </Stack>
          </Paper>

          {/* Task List */}
          {tasksLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : filteredTasks.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No tasks found</Typography>
            </Paper>
          ) : (
            <Stack spacing={1}>
              {filteredTasks.map((task) => (
                <Paper
                  key={task.id}
                  sx={{
                    p: 0,
                    overflow: 'hidden',
                    border: `1px solid ${task.completed ? alpha(theme.palette.success.main, 0.3) : alpha(theme.palette.divider, 0.5)}`,
                    bgcolor: task.completed ? alpha(theme.palette.success.main, 0.03) : 'background.paper',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 0.5,
                      p: 1.5,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) },
                    }}
                    onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                  >
                    <Checkbox
                      checked={task.completed}
                      onChange={(e) => { e.stopPropagation(); toggleTask(task.id, !task.completed); }}
                      onClick={(e) => e.stopPropagation()}
                      size="small"
                      color="success"
                      sx={{ mt: -0.5 }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          textDecoration: task.completed ? 'line-through' : 'none',
                          color: task.completed ? 'text.secondary' : 'text.primary',
                        }}
                      >
                        {task.text}
                      </Typography>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                        <Chip label={task.category} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                        {task.source && task.source !== 'manual' && (
                          <Chip label={task.source} size="small" variant="outlined" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                        )}
                        <Chip
                          label={task.completed ? 'Done' : 'Pending'}
                          size="small"
                          color={task.completed ? 'success' : 'warning'}
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      </Stack>
                    </Box>
                    <Tooltip title="Delete task">
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                        sx={{ opacity: 0.4, '&:hover': { opacity: 1, color: 'error.main' } }}
                      >
                        <IconTrash size={14} />
                      </IconButton>
                    </Tooltip>
                    {expandedTaskId === task.id ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                  </Box>
                  <Collapse in={expandedTaskId === task.id}>
                    {task.notes && (
                      <Box sx={{ px: 2, pb: 2, pt: 0, ml: 5 }}>
                        <Divider sx={{ mb: 1 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Notes:</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                          {task.notes}
                        </Typography>
                      </Box>
                    )}
                  </Collapse>
                </Paper>
              ))}
            </Stack>
          )}
        </>
      )}

      {/* ===== TAB 2: Review & Pipeline ===== */}
      {activeTab === 2 && (
        <>
          {reviewLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }} color="text.secondary">Analyzing conversations...</Typography>
            </Box>
          )}

          {!reviewLoading && reviewResults.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <IconFileText size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>No Conversations Reviewed</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select conversations from the Conversations tab and click "Review & Analyze" to extract insights and create pipeline items.
              </Typography>
              <Button variant="outlined" onClick={() => setActiveTab(0)} sx={{ textTransform: 'none' }}>
                Go to Conversations
              </Button>
            </Paper>
          )}

          {!reviewLoading && reviewResults.length > 0 && (
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', lg: 'row' } }}>
              {/* Left: Conversation Insights */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Conversation Insights ({reviewResults.length})
                    </Typography>
                    <Button size="small" variant="outlined" onClick={() => setActiveTab(0)} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
                      Select More
                    </Button>
                  </Stack>
                </Paper>

                {reviewResults.map((result) => {
                  const ins = result.insights;
                  const isExpanded = reviewExpanded === result.filename;
                  const totalInsights = ins.decisions.length + ins.tasks.length + ins.filesChanged.length +
                    ins.featuresBuilt.length + ins.bugsFixed.length + ins.keyExchanges.length;

                  return (
                    <Paper key={result.filename} sx={{ mb: 1.5, overflow: 'hidden' }}>
                      <Box
                        sx={{
                          p: 2, cursor: 'pointer',
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) },
                          display: 'flex', alignItems: 'center', gap: 1.5,
                        }}
                        onClick={() => setReviewExpanded(isExpanded ? null : result.filename)}
                      >
                        {isExpanded ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                            {result.title || result.filename}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {result.messageCount} messages &middot; {result.source} &middot; {ins.summary}
                          </Typography>
                        </Box>
                        <Chip label={`${totalInsights} insights`} size="small" color="secondary" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                      </Box>

                      <Collapse in={isExpanded}>
                        <Box sx={{ px: 2, pb: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.3)}` }}>
                          {/* Summary chips */}
                          <Stack direction="row" spacing={0.5} sx={{ mt: 1.5, mb: 2, flexWrap: 'wrap' }} useFlexGap>
                            {ins.featuresBuilt.length > 0 && <Chip label={`${ins.featuresBuilt.length} Features`} size="small" color="success" sx={{ fontSize: '0.65rem', height: 20 }} />}
                            {ins.bugsFixed.length > 0 && <Chip label={`${ins.bugsFixed.length} Fixes`} size="small" color="error" sx={{ fontSize: '0.65rem', height: 20 }} />}
                            {ins.tasks.length > 0 && <Chip label={`${ins.tasks.length} Tasks`} size="small" color="warning" sx={{ fontSize: '0.65rem', height: 20 }} />}
                            {ins.decisions.length > 0 && <Chip label={`${ins.decisions.length} Decisions`} size="small" color="info" sx={{ fontSize: '0.65rem', height: 20 }} />}
                            {ins.filesChanged.length > 0 && <Chip label={`${ins.filesChanged.length} Files`} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />}
                          </Stack>

                          {/* Features Built */}
                          {ins.featuresBuilt.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.main', display: 'block', mb: 0.5 }}>
                                Features Built
                              </Typography>
                              {ins.featuresBuilt.map((feat, fi) => (
                                <Typography key={fi} variant="body2" sx={{ fontSize: '0.82rem', pl: 1.5, py: 0.2, borderLeft: `2px solid ${theme.palette.success.main}` }}>
                                  {feat}
                                </Typography>
                              ))}
                            </Box>
                          )}

                          {/* Bugs Fixed */}
                          {ins.bugsFixed.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.main', display: 'block', mb: 0.5 }}>
                                Bugs Fixed
                              </Typography>
                              {ins.bugsFixed.map((bug, bi) => (
                                <Typography key={bi} variant="body2" sx={{ fontSize: '0.82rem', pl: 1.5, py: 0.2, borderLeft: `2px solid ${theme.palette.error.main}` }}>
                                  {bug}
                                </Typography>
                              ))}
                            </Box>
                          )}

                          {/* Tasks / Follow-ups */}
                          {ins.tasks.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: 'warning.main', display: 'block', mb: 0.5 }}>
                                Tasks & Follow-ups
                              </Typography>
                              {ins.tasks.map((task, ti) => (
                                <Typography key={ti} variant="body2" sx={{ fontSize: '0.82rem', pl: 1.5, py: 0.2, borderLeft: `2px solid ${theme.palette.warning.main}` }}>
                                  {task.text}
                                </Typography>
                              ))}
                            </Box>
                          )}

                          {/* Decisions */}
                          {ins.decisions.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: 'info.main', display: 'block', mb: 0.5 }}>
                                Decisions Made
                              </Typography>
                              {ins.decisions.slice(0, 8).map((dec, di) => (
                                <Typography key={di} variant="body2" sx={{ fontSize: '0.82rem', pl: 1.5, py: 0.2, borderLeft: `2px solid ${theme.palette.info.main}` }}>
                                  {dec}
                                </Typography>
                              ))}
                            </Box>
                          )}

                          {/* Files Changed */}
                          {ins.filesChanged.length > 0 && (
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                                Files Referenced ({ins.filesChanged.length})
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {ins.filesChanged.slice(0, 20).map((file, fi) => (
                                  <Chip key={fi} label={file} size="small" variant="outlined"
                                    sx={{ fontSize: '0.65rem', height: 20, fontFamily: 'monospace', maxWidth: 300 }} />
                                ))}
                                {ins.filesChanged.length > 20 && (
                                  <Chip label={`+${ins.filesChanged.length - 20} more`} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                                )}
                              </Box>
                            </Box>
                          )}

                          {/* Key Exchanges */}
                          {ins.keyExchanges.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                                Key Exchanges ({ins.keyExchanges.length})
                              </Typography>
                              {ins.keyExchanges.slice(0, 5).map((ex, ei) => (
                                <Paper key={ei} variant="outlined" sx={{ p: 1.5, mb: 1, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'info.main' }}>You:</Typography>
                                  <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>{ex.userMessage}</Typography>
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.main' }}>Claude:</Typography>
                                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{ex.assistantMessage}</Typography>
                                </Paper>
                              ))}
                            </Box>
                          )}
                        </Box>
                      </Collapse>
                    </Paper>
                  );
                })}
              </Box>

              {/* Right: Pipeline Export Panel */}
              <Box sx={{ width: { xs: '100%', lg: 380 }, flexShrink: 0 }}>
                <Paper sx={{ p: 2, mb: 2, position: 'sticky', top: 16 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#00897b' }}>
                    Export to OM Daily Pipeline
                  </Typography>

                  {/* Agent Tool & Horizon selectors */}
                  <Stack spacing={1.5} sx={{ mb: 2 }}>
                    <Stack direction="row" spacing={1}>
                      <TextField
                        select size="small" fullWidth label="Agent Tool"
                        value={pipelineAgentTool}
                        onChange={(e) => setPipelineAgentTool(e.target.value)}
                      >
                        <MenuItem value="">None</MenuItem>
                        {AGENT_TOOLS_CONV.map(a => (
                          <MenuItem key={a} value={a}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: AGENT_TOOL_COLORS_CONV[a] }} />
                              {AGENT_TOOL_LABELS_CONV[a]}
                            </Box>
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        select size="small" fullWidth label="Default Horizon"
                        value={pipelineHorizon}
                        onChange={(e) => setPipelineHorizon(e.target.value)}
                      >
                        {HORIZON_OPTIONS.map(h => (
                          <MenuItem key={h.value} value={h.value}>{h.label}</MenuItem>
                        ))}
                      </TextField>
                    </Stack>
                  </Stack>

                  <Divider sx={{ mb: 1.5 }} />

                  {/* Pipeline items list */}
                  <Box sx={{ maxHeight: 500, overflow: 'auto', mb: 2 }}>
                    {pipelineItems.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                        No pipeline items generated. Review conversations to extract actionable items.
                      </Typography>
                    ) : (
                      pipelineItems.map((item, idx) => (
                        <Paper
                          key={idx}
                          variant="outlined"
                          sx={{
                            p: 1.5, mb: 1,
                            opacity: item.enabled ? 1 : 0.5,
                            borderColor: item.enabled ? alpha('#00897b', 0.3) : undefined,
                            bgcolor: item.enabled ? alpha('#00897b', 0.02) : undefined,
                          }}
                        >
                          <Stack direction="row" spacing={0.5} alignItems="flex-start">
                            <Checkbox
                              size="small"
                              checked={item.enabled}
                              onChange={(e) => handleUpdatePipelineItem(idx, 'enabled', e.target.checked)}
                              sx={{ p: 0.3, mt: 0.1 }}
                            />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <TextField
                                size="small" fullWidth variant="standard"
                                value={item.title}
                                onChange={(e) => handleUpdatePipelineItem(idx, 'title', e.target.value)}
                                placeholder="Task title..."
                                sx={{ '& .MuiInput-input': { fontSize: '0.82rem', fontWeight: 600 } }}
                              />
                              <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                                <Chip
                                  label={item.priority}
                                  size="small"
                                  sx={{ fontSize: '0.6rem', height: 18, textTransform: 'capitalize', cursor: 'pointer' }}
                                  onClick={() => {
                                    const pris = ['low', 'medium', 'high', 'critical'];
                                    const next = pris[(pris.indexOf(item.priority) + 1) % pris.length];
                                    handleUpdatePipelineItem(idx, 'priority', next);
                                  }}
                                />
                                <Chip
                                  label={HORIZON_OPTIONS.find(h => h.value === item.horizon)?.label || item.horizon}
                                  size="small"
                                  sx={{ fontSize: '0.6rem', height: 18, cursor: 'pointer' }}
                                  onClick={() => {
                                    const vals = HORIZON_OPTIONS.map(h => h.value);
                                    const next = vals[(vals.indexOf(item.horizon) + 1) % vals.length];
                                    handleUpdatePipelineItem(idx, 'horizon', next);
                                  }}
                                />
                                {item.category && (
                                  <Chip label={item.category} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 18 }} />
                                )}
                              </Stack>
                            </Box>
                            <IconButton size="small" onClick={() => handleRemovePipelineItem(idx)} sx={{ opacity: 0.4, '&:hover': { opacity: 1, color: 'error.main' } }}>
                              <IconTrash size={14} />
                            </IconButton>
                          </Stack>
                        </Paper>
                      ))
                    )}
                  </Box>

                  {/* Actions */}
                  <Stack spacing={1}>
                    <Button
                      size="small" variant="outlined" fullWidth
                      startIcon={<IconPlus size={14} />}
                      onClick={handleAddPipelineItem}
                      sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                    >
                      Add Custom Item
                    </Button>
                    <Button
                      variant="contained" fullWidth
                      startIcon={pipelineExporting ? <CircularProgress size={16} /> : <IconChecklist size={16} />}
                      onClick={handleExportToPipeline}
                      disabled={pipelineExporting || pipelineItems.filter(i => i.enabled).length === 0}
                      sx={{
                        textTransform: 'none',
                        bgcolor: '#00897b',
                        '&:hover': { bgcolor: '#00695c' },
                      }}
                    >
                      Export {pipelineItems.filter(i => i.enabled).length} Item(s) to Pipeline
                    </Button>
                    <Button
                      size="small" variant="text" fullWidth
                      onClick={() => window.open('/admin/control-panel/om-daily', '_blank')}
                      sx={{ textTransform: 'none', fontSize: '0.75rem', color: '#00897b' }}
                    >
                      Open OM Daily Pipeline
                    </Button>
                  </Stack>
                </Paper>
              </Box>
            </Box>
          )}
        </>
      )}

      {/* Scroll to top */}
      <Tooltip title="Back to top">
        <IconButton
          onClick={() => topRef.current?.scrollIntoView({ behavior: 'smooth' })}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': { bgcolor: 'primary.dark' },
            boxShadow: 3,
          }}
        >
          <IconArrowUp size={20} />
        </IconButton>
      </Tooltip>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ConversationLogPage;
