/**
 * API Explorer Page
 * Backend API route introspection + saved test cases + runner
 * Super admin only - lives under Devel Tools
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  IconButton,
  Chip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  Divider,
  Stack,
  useTheme,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  PlayArrow as RunIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  CheckCircle as PassIcon,
  Cancel as FailIcon,
  Api as ApiIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandIcon,
  Warning as WarningIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import axios from 'axios';

// Types
interface RouteInfo {
  method: string;
  path: string;
  auth: string;
  tags: string[];
  source: string;
}

interface TestCase {
  id: number;
  name: string;
  method: string;
  path: string;
  headers_json: string | null;
  query_json: string | null;
  body_json: string | null;
  expected_status: number;
  expected_contains: string | null;
  enabled: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface TestResult {
  id: number;
  name: string;
  ok: boolean;
  expected_status: number;
  actual_status: number;
  duration_ms: number;
  snippet: string;
  error: string | null;
}

interface RunReport {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}

// Method color mapping
const methodColors: Record<string, string> = {
  GET: '#4caf50',
  POST: '#2196f3',
  PUT: '#ff9800',
  DELETE: '#f44336',
  PATCH: '#9c27b0',
};

const authColors: Record<string, string> = {
  none: '#4caf50',
  session: '#ff9800',
  super_admin: '#f44336',
};

// Empty test case template
const emptyTestCase = {
  name: '',
  method: 'GET',
  path: '',
  headers_json: '',
  query_json: '',
  body_json: '',
  expected_status: 200,
  expected_contains: '',
  enabled: 1,
};

const ApiExplorerPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Routes state
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routeSearch, setRouteSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedRoute, setSelectedRoute] = useState<RouteInfo | null>(null);

  // Test cases state
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [testsLoading, setTestsLoading] = useState(false);
  const [rightTab, setRightTab] = useState(0);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<any>(emptyTestCase);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Runner state
  const [running, setRunning] = useState(false);
  const [runReport, setRunReport] = useState<RunReport | null>(null);
  const [selectedTestIds, setSelectedTestIds] = useState<Set<number>>(new Set());
  const [expandedSnippet, setExpandedSnippet] = useState<number | null>(null);

  // Confirm dangerous dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingRunIds, setPendingRunIds] = useState<number[]>([]);

  // Messages
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load routes and test cases on mount
  useEffect(() => {
    loadRoutes();
    loadTestCases();
  }, []);

  const loadRoutes = async () => {
    setRoutesLoading(true);
    try {
      const res = await axios.get('/api/system/routes');
      if (res.data.success) setRoutes(res.data.routes || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to load routes: ' + (err.response?.data?.error || err.message) });
    } finally {
      setRoutesLoading(false);
    }
  };

  const loadTestCases = async () => {
    setTestsLoading(true);
    try {
      const res = await axios.get('/api/admin/api-tests');
      if (res.data.success) setTestCases(res.data.tests || []);
    } catch (err: any) {
      console.error('Failed to load test cases:', err);
    } finally {
      setTestsLoading(false);
    }
  };

  // Filter routes
  const tags = useMemo(() => {
    const t = new Set<string>();
    routes.forEach(r => r.tags?.forEach(tag => t.add(tag)));
    return ['all', ...Array.from(t).sort()];
  }, [routes]);

  const filteredRoutes = useMemo(() => {
    return routes.filter(r => {
      const matchSearch = !routeSearch ||
        r.path.toLowerCase().includes(routeSearch.toLowerCase()) ||
        r.method.toLowerCase().includes(routeSearch.toLowerCase());
      const matchTag = selectedTag === 'all' || r.tags?.includes(selectedTag);
      return matchSearch && matchTag;
    });
  }, [routes, routeSearch, selectedTag]);

  // Group routes by tag
  const groupedRoutes = useMemo(() => {
    const groups: Record<string, RouteInfo[]> = {};
    filteredRoutes.forEach(r => {
      const tag = r.tags?.[0] || 'other';
      if (!groups[tag]) groups[tag] = [];
      groups[tag].push(r);
    });
    return groups;
  }, [filteredRoutes]);

  // CRUD handlers
  const handleCreateTest = () => {
    setEditingId(null);
    setEditingTest({
      ...emptyTestCase,
      path: selectedRoute?.path || '',
      method: selectedRoute?.method || 'GET',
    });
    setEditorOpen(true);
  };

  const handleEditTest = (tc: TestCase) => {
    setEditingId(tc.id);
    setEditingTest({
      name: tc.name,
      method: tc.method,
      path: tc.path,
      headers_json: tc.headers_json || '',
      query_json: tc.query_json || '',
      body_json: tc.body_json || '',
      expected_status: tc.expected_status,
      expected_contains: tc.expected_contains || '',
      enabled: tc.enabled,
    });
    setEditorOpen(true);
  };

  const handleSaveTest = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await axios.put(`/api/admin/api-tests/${editingId}`, editingTest);
        setMessage({ type: 'success', text: 'Test case updated' });
      } else {
        await axios.post('/api/admin/api-tests', editingTest);
        setMessage({ type: 'success', text: 'Test case created' });
      }
      setEditorOpen(false);
      await loadTestCases();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTest = async (id: number) => {
    if (!window.confirm('Delete this test case?')) return;
    try {
      await axios.delete(`/api/admin/api-tests/${id}`);
      setMessage({ type: 'success', text: 'Test case deleted' });
      await loadTestCases();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete' });
    }
  };

  // Run handlers
  const handleRunTests = useCallback((ids: number[]) => {
    const cases = testCases.filter(tc => ids.includes(tc.id));
    const hasDangerous = cases.some(tc => tc.method !== 'GET');
    if (hasDangerous) {
      setPendingRunIds(ids);
      setConfirmOpen(true);
    } else {
      executeRun(ids, false);
    }
  }, [testCases]);

  const executeRun = async (ids: number[], confirmDangerous: boolean) => {
    setRunning(true);
    setRunReport(null);
    setConfirmOpen(false);
    try {
      const res = await axios.post('/api/admin/api-tests/run', { ids, confirmDangerous });
      if (res.data.success) {
        setRunReport(res.data);
        setRightTab(2); // Switch to Run tab
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Run failed' });
    } finally {
      setRunning(false);
    }
  };

  const handleRunAll = () => {
    const ids = testCases.filter(tc => tc.enabled).map(tc => tc.id);
    if (ids.length === 0) {
      setMessage({ type: 'error', text: 'No enabled test cases to run' });
      return;
    }
    handleRunTests(ids);
  };

  const handleRunSelected = () => {
    const ids = Array.from(selectedTestIds);
    if (ids.length === 0) {
      setMessage({ type: 'error', text: 'No tests selected' });
      return;
    }
    handleRunTests(ids);
  };

  const handleRunSingle = (id: number) => {
    handleRunTests([id]);
  };

  const toggleTestSelection = (id: number) => {
    setSelectedTestIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Styles
  const cardBg = isDark ? '#1e1e2e' : '#fff';
  const panelBg = isDark ? '#181825' : '#f5f5f5';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', p: 2, gap: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ApiIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h5" fontWeight={700}>API Explorer</Typography>
          <Chip label={`${routes.length} endpoints`} size="small" color="primary" variant="outlined" />
        </Box>
        <Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<RefreshIcon />} onClick={() => { loadRoutes(); loadTestCases(); }}>
            Refresh
          </Button>
          <Button size="small" variant="contained" startIcon={<RunIcon />} onClick={handleRunAll} disabled={running}>
            {running ? 'Running...' : 'Run All Tests'}
          </Button>
        </Stack>
      </Box>

      {/* Message */}
      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ py: 0.5 }}>
          {message.text}
        </Alert>
      )}

      {/* Main Layout: Left Panel + Right Panel */}
      <Box sx={{ display: 'flex', flex: 1, gap: 2, overflow: 'hidden' }}>
        {/* Left Panel: Endpoint List */}
        <Paper
          elevation={0}
          sx={{
            width: { xs: '100%', md: 380 },
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: cardBg,
            border: '1px solid',
            borderColor: isDark ? 'grey.800' : 'grey.300',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {/* Search */}
          <Box sx={{ p: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search endpoints..."
              value={routeSearch}
              onChange={(e) => setRouteSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>

          {/* Tag Filter */}
          <Box sx={{ px: 1.5, pb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {tags.map(tag => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                variant={selectedTag === tag ? 'filled' : 'outlined'}
                color={selectedTag === tag ? 'primary' : 'default'}
                onClick={() => setSelectedTag(tag)}
                sx={{ fontSize: '0.7rem', height: 24 }}
              />
            ))}
          </Box>

          <Divider />

          {/* Route List */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {routesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              Object.entries(groupedRoutes).map(([tag, tagRoutes]) => (
                <Box key={tag}>
                  <Typography
                    variant="caption"
                    sx={{
                      px: 1.5,
                      py: 0.75,
                      display: 'block',
                      bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      color: 'text.secondary',
                      fontSize: '0.65rem',
                    }}
                  >
                    {tag} ({tagRoutes.length})
                  </Typography>
                  {tagRoutes.map((r, idx) => (
                    <Box
                      key={`${r.method}-${r.path}-${idx}`}
                      onClick={() => { setSelectedRoute(r); setRightTab(0); }}
                      sx={{
                        px: 1.5,
                        py: 0.75,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        bgcolor: selectedRoute?.path === r.path && selectedRoute?.method === r.method
                          ? (isDark ? 'rgba(102, 126, 234, 0.15)' : 'rgba(102, 126, 234, 0.08)')
                          : 'transparent',
                        '&:hover': {
                          bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                        },
                        borderBottom: '1px solid',
                        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',
                      }}
                    >
                      <Chip
                        label={r.method}
                        size="small"
                        sx={{
                          bgcolor: methodColors[r.method] || '#666',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '0.6rem',
                          height: 20,
                          minWidth: 48,
                          '& .MuiChip-label': { px: 0.75 },
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          flex: 1,
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {r.path}
                      </Typography>
                      <Chip
                        label={r.auth}
                        size="small"
                        sx={{
                          bgcolor: `${authColors[r.auth] || '#666'}20`,
                          color: authColors[r.auth] || '#666',
                          fontWeight: 600,
                          fontSize: '0.55rem',
                          height: 18,
                          '& .MuiChip-label': { px: 0.5 },
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              ))
            )}
          </Box>
        </Paper>

        {/* Right Panel: Details + Tests + Run */}
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: cardBg,
            border: '1px solid',
            borderColor: isDark ? 'grey.800' : 'grey.300',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Tabs
            value={rightTab}
            onChange={(_, v) => setRightTab(v)}
            sx={{ borderBottom: '1px solid', borderColor: isDark ? 'grey.800' : 'grey.300', minHeight: 40 }}
          >
            <Tab label="Details" sx={{ minHeight: 40, fontSize: '0.8rem' }} />
            <Tab label={`Test Cases (${testCases.length})`} sx={{ minHeight: 40, fontSize: '0.8rem' }} />
            <Tab label="Run Results" sx={{ minHeight: 40, fontSize: '0.8rem' }} />
          </Tabs>

          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {/* Tab 0: Route Details */}
            {rightTab === 0 && (
              selectedRoute ? (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <Chip
                      label={selectedRoute.method}
                      sx={{
                        bgcolor: methodColors[selectedRoute.method] || '#666',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                      }}
                    />
                    <Typography variant="h6" fontFamily="monospace" fontWeight={600}>
                      {selectedRoute.path}
                    </Typography>
                  </Box>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>
                        Authentication
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          label={selectedRoute.auth}
                          size="small"
                          sx={{
                            bgcolor: `${authColors[selectedRoute.auth] || '#666'}20`,
                            color: authColors[selectedRoute.auth] || '#666',
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>
                        Tags
                      </Typography>
                      <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5 }}>
                        {selectedRoute.tags?.map(tag => (
                          <Chip key={tag} label={tag} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                    <Divider />
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={handleCreateTest}
                    >
                      Create Test Case for this Endpoint
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                  <ApiIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                  <Typography>Select an endpoint from the left panel</Typography>
                </Box>
              )
            )}

            {/* Tab 1: Test Cases */}
            {rightTab === 1 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700}>Saved Test Cases</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" startIcon={<RunIcon />} onClick={handleRunSelected} disabled={running || selectedTestIds.size === 0}>
                      Run Selected ({selectedTestIds.size})
                    </Button>
                    <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={handleCreateTest}>
                      New Test
                    </Button>
                  </Stack>
                </Box>

                {testsLoading ? (
                  <CircularProgress size={24} />
                ) : testCases.length === 0 ? (
                  <Alert severity="info">No test cases yet. Create one to get started.</Alert>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox" sx={{ width: 40 }}></TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Name</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', width: 70 }}>Method</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Path</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', width: 80 }}>Expected</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', width: 120 }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {testCases.map(tc => (
                          <TableRow
                            key={tc.id}
                            hover
                            sx={{ opacity: tc.enabled ? 1 : 0.5 }}
                          >
                            <TableCell padding="checkbox">
                              <input
                                type="checkbox"
                                checked={selectedTestIds.has(tc.id)}
                                onChange={() => toggleTestSelection(tc.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                                {tc.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={tc.method}
                                size="small"
                                sx={{
                                  bgcolor: methodColors[tc.method] || '#666',
                                  color: 'white',
                                  fontWeight: 700,
                                  fontSize: '0.6rem',
                                  height: 20,
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.75rem' }}>
                                {tc.path}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={tc.expected_status} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5}>
                                <Tooltip title="Run">
                                  <IconButton size="small" onClick={() => handleRunSingle(tc.id)} disabled={running}>
                                    <RunIcon fontSize="small" color="success" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => handleEditTest(tc)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton size="small" onClick={() => handleDeleteTest(tc.id)}>
                                    <DeleteIcon fontSize="small" color="error" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* Tab 2: Run Results */}
            {rightTab === 2 && (
              <Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Run Results</Typography>
                {running ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <CircularProgress size={32} />
                    <Typography sx={{ mt: 1 }}>Running tests...</Typography>
                  </Box>
                ) : runReport ? (
                  <Box>
                    {/* Summary */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <Chip
                        label={`Total: ${runReport.total}`}
                        variant="outlined"
                      />
                      <Chip
                        icon={<PassIcon />}
                        label={`Passed: ${runReport.passed}`}
                        color="success"
                        variant="outlined"
                      />
                      <Chip
                        icon={<FailIcon />}
                        label={`Failed: ${runReport.failed}`}
                        color="error"
                        variant={runReport.failed > 0 ? 'filled' : 'outlined'}
                      />
                    </Box>

                    {/* Results Table */}
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', width: 40 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', width: 100 }}>Expected</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', width: 100 }}>Actual</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', width: 80 }}>Duration</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', width: 60 }}></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {runReport.results.map((r, idx) => (
                            <React.Fragment key={idx}>
                              <TableRow hover>
                                <TableCell>
                                  {r.ok ? <PassIcon color="success" fontSize="small" /> : <FailIcon color="error" fontSize="small" />}
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                                    {r.name}
                                  </Typography>
                                  {r.error && (
                                    <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                                      {r.error}
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Chip label={r.expected_status} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={r.actual_status || 'N/A'}
                                    size="small"
                                    color={r.ok ? 'success' : 'error'}
                                    variant="outlined"
                                    sx={{ fontSize: '0.7rem', height: 22 }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                    {r.duration_ms}ms
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Tooltip title="View response">
                                    <IconButton
                                      size="small"
                                      onClick={() => setExpandedSnippet(expandedSnippet === idx ? null : idx)}
                                    >
                                      <ExpandIcon
                                        fontSize="small"
                                        sx={{ transform: expandedSnippet === idx ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
                                      />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                              {expandedSnippet === idx && (
                                <TableRow>
                                  <TableCell colSpan={6} sx={{ p: 0 }}>
                                    <Box
                                      sx={{
                                        p: 2,
                                        bgcolor: isDark ? '#0d0d1a' : '#f0f0f0',
                                        fontFamily: 'monospace',
                                        fontSize: '0.75rem',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all',
                                        maxHeight: 300,
                                        overflow: 'auto',
                                      }}
                                    >
                                      {(() => {
                                        try {
                                          return JSON.stringify(JSON.parse(r.snippet), null, 2);
                                        } catch {
                                          return r.snippet || '(empty response)';
                                        }
                                      })()}
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                    <RunIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                    <Typography>Run tests to see results here</Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Test Case Editor Dialog */}
      <Dialog open={editorOpen} onClose={() => setEditorOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Test Case' : 'Create Test Case'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              fullWidth
              size="small"
              value={editingTest.name}
              onChange={(e) => setEditingTest({ ...editingTest, name: e.target.value })}
            />
            <Stack direction="row" spacing={2}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Method</InputLabel>
                <Select
                  label="Method"
                  value={editingTest.method}
                  onChange={(e) => setEditingTest({ ...editingTest, method: e.target.value })}
                >
                  {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Path"
                fullWidth
                size="small"
                value={editingTest.path}
                onChange={(e) => setEditingTest({ ...editingTest, path: e.target.value })}
                placeholder="/api/system/health"
              />
            </Stack>
            <TextField
              label="Headers (JSON)"
              fullWidth
              size="small"
              multiline
              rows={2}
              value={editingTest.headers_json}
              onChange={(e) => setEditingTest({ ...editingTest, headers_json: e.target.value })}
              placeholder='{"Authorization": "Bearer ..."}'
              sx={{ '& .MuiInputBase-root': { fontFamily: 'monospace', fontSize: '0.8rem' } }}
            />
            <TextField
              label="Query Params (JSON)"
              fullWidth
              size="small"
              multiline
              rows={2}
              value={editingTest.query_json}
              onChange={(e) => setEditingTest({ ...editingTest, query_json: e.target.value })}
              placeholder='{"page": "1", "limit": "10"}'
              sx={{ '& .MuiInputBase-root': { fontFamily: 'monospace', fontSize: '0.8rem' } }}
            />
            {editingTest.method !== 'GET' && (
              <TextField
                label="Body (JSON)"
                fullWidth
                size="small"
                multiline
                rows={4}
                value={editingTest.body_json}
                onChange={(e) => setEditingTest({ ...editingTest, body_json: e.target.value })}
                placeholder='{"key": "value"}'
                sx={{ '& .MuiInputBase-root': { fontFamily: 'monospace', fontSize: '0.8rem' } }}
              />
            )}
            <Stack direction="row" spacing={2}>
              <TextField
                label="Expected Status"
                type="number"
                size="small"
                sx={{ width: 150 }}
                value={editingTest.expected_status}
                onChange={(e) => setEditingTest({ ...editingTest, expected_status: parseInt(e.target.value) || 200 })}
              />
              <TextField
                label="Expected Contains (optional)"
                fullWidth
                size="small"
                value={editingTest.expected_contains}
                onChange={(e) => setEditingTest({ ...editingTest, expected_contains: e.target.value })}
                placeholder="Substring to match in response"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditorOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveTest}
            disabled={saving || !editingTest.name || !editingTest.path}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dangerous Run Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" />
          Confirm Dangerous Test Execution
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            The selected tests include non-GET methods (POST/PUT/DELETE/PATCH) that will execute against <strong>production</strong>.
          </Typography>
          <Typography variant="body2" color="error" fontWeight={600}>
            Are you sure you want to proceed?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => executeRun(pendingRunIds, true)}
          >
            Yes, Run Tests
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApiExplorerPage;
