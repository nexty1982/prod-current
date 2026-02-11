/**
 * API Explorer Page
 * Backend API route introspection + saved test cases + runner
 * Super admin only — lives under Devel Tools
 *
 * ─── Architecture ───────────────────────────────────────────────────
 * Data source:   GET /api/system/routes  (server/src/api/apiExplorer.js)
 * Discovery:     Runtime introspection of Express router stack
 *                (req.app._router.stack → recursive layer extraction)
 * Auth classify: Path-pattern heuristic (none / session / super_admin)
 * Tag classify:  Path-keyword matching (admin, auth, records, …)
 *
 * Raw model (backend → frontend):
 *   RouteInfo { method, path, auth, tags[], source }
 *
 * Normalized model (grid + export):
 *   ApiEndpointRow { id, method, path, group, tags[], auth, roles[],
 *                     source, notes }
 *   → compatible with future admin_capabilities DB table
 *
 * UI layout:     MUI DataGrid (left, flex:2) + Details/Test Cases/Run
 *                Results panel (right, flex:1)
 * Test cases:    CRUD via /api/admin/api-tests, stored in
 *                api_test_cases table (orthodoxmetrics_db)
 * Test runner:   POST /api/admin/api-tests/run → executes against
 *                localhost:3001 with session forwarding
 * ────────────────────────────────────────────────────────────────────
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
  FileDownload as ExportIcon,
  AppRegistration as RegisterIcon,
} from '@mui/icons-material';
import {
  DataGrid,
  GridColDef,
  GridRowSelectionModel,
  GridToolbarContainer,
  GridToolbarFilterButton,
  GridToolbarColumnsButton,
} from '@mui/x-data-grid';
import * as XLSX from 'xlsx';
import axios from 'axios';

// ─── Raw backend types ──────────────────────────────────────────────

interface RouteInfo {
  method: string;
  path: string;
  auth: string;
  tags: string[];
  source: string;
}

// ─── Canonical endpoint row model (Phase 1) ─────────────────────────
// Registry-ready: compatible with future admin_capabilities table

interface ApiEndpointRow {
  id: string;       // stable key: `${method}:${path}`
  method: string;   // GET / POST / PUT / DELETE / PATCH
  path: string;     // /api/...
  group: string;    // primary tag or "other"
  tags: string[];   // all tags from backend
  auth: string;     // none / session / super_admin
  roles: string[];  // empty for now
  source: string;   // source file (empty for now)
  notes: string;    // editable later
}

/** Convert raw backend RouteInfo[] to normalized ApiEndpointRow[] */
function toApiEndpointRows(routes: RouteInfo[]): ApiEndpointRow[] {
  return routes.map((r) => ({
    id: `${r.method}:${r.path}`,
    method: r.method,
    path: r.path,
    group: r.tags?.[0] || 'other',
    tags: r.tags || [],
    auth: r.auth || 'session',
    roles: [],
    source: r.source || '',
    notes: '',
  }));
}

// ─── Admin Capabilities registration helpers (Phase 4) ──────────────

/** Normalize path to dot-notation key fragment:
 *  /api/admin/churches/:id -> admin.churches._id  */
function normalizePath(path: string): string {
  return path
    .replace(/^\/api\//, '')
    .replace(/^\//, '')
    .replace(/:[a-zA-Z_]+/g, (m) => `_${m.slice(1)}`)
    .replace(/\//g, '.');
}

/** Build registry payload from selected rows (plug-and-play for future backend) */
function toAdminCapabilityPayload(rows: ApiEndpointRow[]) {
  return rows.map((r) => ({
    kind: 'route' as const,
    key: `api.${r.group || 'misc'}.${r.method.toLowerCase()}.${normalizePath(r.path)}`,
    name: `${r.method} ${r.path}`,
    method: r.method,
    path: r.path,
    tags_json: r.tags,
    roles_json: r.roles,
    auth: r.auth || null,
    source_file: r.source || null,
    status: 'active' as const,
  }));
}

// ─── XLSX export (Phase 3) ──────────────────────────────────────────

function exportToXlsx(rows: ApiEndpointRow[]) {
  const data = rows.map((r) => ({
    Method: r.method,
    Path: r.path,
    Group: r.group,
    Auth: r.auth,
    Tags: r.tags.join(', '),
    Roles: r.roles.join(', '),
    Source: r.source,
    Notes: r.notes,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  // Freeze the header row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  // Bold headers via cell styles
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) {
      ws[addr].s = { font: { bold: true } };
    }
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Endpoints');
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  XLSX.writeFile(wb, `api-explorer-export_${ts}.xlsx`);
}

// ─── Other existing types ───────────────────────────────────────────

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

// ─── Colour maps ────────────────────────────────────────────────────

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

// ─── DataGrid column definitions (Phase 2) ──────────────────────────

const gridColumns: GridColDef<ApiEndpointRow>[] = [
  {
    field: 'method',
    headerName: 'Method',
    width: 90,
    sortable: true,
    renderCell: (params) => (
      <Chip
        label={params.value}
        size="small"
        sx={{
          bgcolor: methodColors[params.value as string] || '#666',
          color: 'white',
          fontWeight: 700,
          fontSize: '0.65rem',
          height: 22,
          minWidth: 52,
          '& .MuiChip-label': { px: 0.75 },
        }}
      />
    ),
  },
  {
    field: 'path',
    headerName: 'Path',
    flex: 1,
    minWidth: 220,
    sortable: true,
    renderCell: (params) => (
      <Typography
        variant="body2"
        sx={{
          fontFamily: 'monospace',
          fontSize: '0.78rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {params.value}
      </Typography>
    ),
  },
  {
    field: 'group',
    headerName: 'Group',
    width: 110,
    sortable: true,
  },
  {
    field: 'auth',
    headerName: 'Auth',
    width: 110,
    sortable: true,
    renderCell: (params) => (
      <Chip
        label={params.value}
        size="small"
        sx={{
          bgcolor: `${authColors[params.value as string] || '#666'}20`,
          color: authColors[params.value as string] || '#666',
          fontWeight: 600,
          fontSize: '0.6rem',
          height: 20,
          '& .MuiChip-label': { px: 0.5 },
        }}
      />
    ),
  },
  {
    field: 'tags',
    headerName: 'Tags',
    width: 170,
    sortable: false,
    filterable: false,
    renderCell: (params) => {
      const tags = params.value as string[];
      if (!tags?.length) return null;
      return (
        <Box sx={{ display: 'flex', gap: 0.3, overflow: 'hidden' }}>
          {tags.slice(0, 3).map((t) => (
            <Chip
              key={t}
              label={t}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.6rem', height: 20, '& .MuiChip-label': { px: 0.5 } }}
            />
          ))}
          {tags.length > 3 && (
            <Chip
              label={`+${tags.length - 3}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.6rem', height: 20, '& .MuiChip-label': { px: 0.5 } }}
            />
          )}
        </Box>
      );
    },
  },
];

// =====================================================================
// Component
// =====================================================================

const ApiExplorerPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // -- Routes / grid state --
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routeSearch, setRouteSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedRoute, setSelectedRoute] = useState<ApiEndpointRow | null>(null);
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([]);

  // -- Test cases state --
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [testsLoading, setTestsLoading] = useState(false);
  const [rightTab, setRightTab] = useState(0);

  // -- Editor state --
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<any>(emptyTestCase);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // -- Runner state --
  const [running, setRunning] = useState(false);
  const [runReport, setRunReport] = useState<RunReport | null>(null);
  const [selectedTestIds, setSelectedTestIds] = useState<Set<number>>(new Set());
  const [expandedSnippet, setExpandedSnippet] = useState<number | null>(null);

  // -- Confirm dangerous dialog --
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingRunIds, setPendingRunIds] = useState<number[]>([]);

  // -- Messages --
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // -- Derived: normalized endpoint rows --
  const endpointRows = useMemo(() => toApiEndpointRows(routes), [routes]);

  // -- Tags for filter chips --
  const tags = useMemo(() => {
    const t = new Set<string>();
    routes.forEach((r) => r.tags?.forEach((tag) => t.add(tag)));
    return ['all', ...Array.from(t).sort()];
  }, [routes]);

  // -- Filtered rows (search + tag) --
  const filteredRows = useMemo(() => {
    return endpointRows.filter((r) => {
      const q = routeSearch.toLowerCase();
      const matchSearch =
        !q ||
        r.path.toLowerCase().includes(q) ||
        r.method.toLowerCase().includes(q) ||
        r.group.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q));
      const matchTag = selectedTag === 'all' || r.tags.includes(selectedTag);
      return matchSearch && matchTag;
    });
  }, [endpointRows, routeSearch, selectedTag]);

  // -- Load data on mount --
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

  // -- CRUD handlers --
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

  // -- Run handlers --
  const handleRunTests = useCallback(
    (ids: number[]) => {
      const cases = testCases.filter((tc) => ids.includes(tc.id));
      const hasDangerous = cases.some((tc) => tc.method !== 'GET');
      if (hasDangerous) {
        setPendingRunIds(ids);
        setConfirmOpen(true);
      } else {
        executeRun(ids, false);
      }
    },
    [testCases],
  );

  const executeRun = async (ids: number[], confirmDangerous: boolean) => {
    setRunning(true);
    setRunReport(null);
    setConfirmOpen(false);
    try {
      const res = await axios.post('/api/admin/api-tests/run', { ids, confirmDangerous });
      if (res.data.success) {
        setRunReport(res.data);
        setRightTab(2);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Run failed' });
    } finally {
      setRunning(false);
    }
  };

  const handleRunAll = () => {
    const ids = testCases.filter((tc) => tc.enabled).map((tc) => tc.id);
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
    setSelectedTestIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // -- Export handler --
  const handleExport = () => {
    exportToXlsx(filteredRows);
  };

  // -- Register handler (Phase 4 - future use) --
  const handleRegisterSelected = () => {
    const selected = endpointRows.filter((r) => selectionModel.includes(r.id));
    const payload = toAdminCapabilityPayload(selected);
    console.log('[ApiExplorer] Register payload:', payload);
    setMessage({ type: 'success', text: `Prepared ${payload.length} capability records (logged to console)` });
  };

  // -- Styles --
  const cardBg = isDark ? '#1e1e2e' : '#fff';

  // -- Custom DataGrid Toolbar --
  const CustomToolbar = () => (
    <GridToolbarContainer sx={{ px: 1.5, py: 1, gap: 1, flexWrap: 'wrap' }}>
      {/* Search */}
      <TextField
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
        sx={{ minWidth: 220, '& .MuiOutlinedInput-root': { borderRadius: 2, height: 32 } }}
      />

      {/* Tag chips */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4, flex: 1 }}>
        {tags.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            size="small"
            variant={selectedTag === tag ? 'filled' : 'outlined'}
            color={selectedTag === tag ? 'primary' : 'default'}
            onClick={() => setSelectedTag(tag)}
            sx={{ fontSize: '0.65rem', height: 24 }}
          />
        ))}
      </Box>

      {/* Row count */}
      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
        Showing {filteredRows.length} of {endpointRows.length}
      </Typography>

      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />

      {/* Export XLSX */}
      <Button size="small" startIcon={<ExportIcon />} onClick={handleExport}>
        Export XLSX
      </Button>

      {/* Register Selected (future use) */}
      {selectionModel.length > 0 && (
        <Tooltip title="Backend not ready yet - payload logged to console">
          <span>
            <Button
              size="small"
              startIcon={<RegisterIcon />}
              variant="outlined"
              onClick={handleRegisterSelected}
            >
              Register Selected ({selectionModel.length})
            </Button>
          </span>
        </Tooltip>
      )}
    </GridToolbarContainer>
  );

  // =================================================================
  // Render
  // =================================================================
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', p: 2, gap: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ApiIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h5" fontWeight={700}>
            API Explorer
          </Typography>
          <Chip label={`${endpointRows.length} endpoints`} size="small" color="primary" variant="outlined" />
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => {
              loadRoutes();
              loadTestCases();
            }}
          >
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

      {/* Main Layout: DataGrid (left / wider) + Right Panel */}
      <Box sx={{ display: 'flex', flex: 1, gap: 2, overflow: 'hidden' }}>
        {/* Left Panel: Endpoint DataGrid */}
        <Paper
          elevation={0}
          sx={{
            flex: 2,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: cardBg,
            border: '1px solid',
            borderColor: isDark ? 'grey.800' : 'grey.300',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <DataGrid
            rows={filteredRows}
            columns={gridColumns}
            loading={routesLoading}
            checkboxSelection
            disableRowSelectionOnClick={false}
            onRowSelectionModelChange={(newModel) => setSelectionModel(newModel)}
            rowSelectionModel={selectionModel}
            onRowClick={(params) => {
              setSelectedRoute(params.row as ApiEndpointRow);
              setRightTab(0);
            }}
            slots={{ toolbar: CustomToolbar }}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
              sorting: { sortModel: [{ field: 'path', sort: 'asc' }] },
            }}
            pageSizeOptions={[10, 25, 50, 100]}
            density="compact"
            getRowHeight={() => 'auto'}
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': {
                py: 0.5,
                display: 'flex',
                alignItems: 'center',
              },
              '& .MuiDataGrid-row': {
                cursor: 'pointer',
              },
              '& .MuiDataGrid-row.Mui-selected': {
                bgcolor: isDark ? 'rgba(102,126,234,0.15)' : 'rgba(102,126,234,0.08)',
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontWeight: 700,
                fontSize: '0.78rem',
              },
            }}
          />
        </Paper>

        {/* Right Panel: Details + Tests + Run */}
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            minWidth: 340,
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
            {rightTab === 0 &&
              (selectedRoute ? (
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
                        Group
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {selectedRoute.group}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>
                        Tags
                      </Typography>
                      <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {selectedRoute.tags?.map((tag) => (
                          <Chip key={tag} label={tag} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>
                        ID
                      </Typography>
                      <Typography variant="body2" fontFamily="monospace" sx={{ mt: 0.5, fontSize: '0.75rem' }}>
                        {selectedRoute.id}
                      </Typography>
                    </Box>
                    <Divider />
                    <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={handleCreateTest}>
                      Create Test Case for this Endpoint
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                  <ApiIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                  <Typography>Select an endpoint from the table</Typography>
                </Box>
              ))}

            {/* Tab 1: Test Cases */}
            {rightTab === 1 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Saved Test Cases
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<RunIcon />}
                      onClick={handleRunSelected}
                      disabled={running || selectedTestIds.size === 0}
                    >
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
                        {testCases.map((tc) => (
                          <TableRow key={tc.id} hover sx={{ opacity: tc.enabled ? 1 : 0.5 }}>
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
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                  Run Results
                </Typography>
                {running ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <CircularProgress size={32} />
                    <Typography sx={{ mt: 1 }}>Running tests...</Typography>
                  </Box>
                ) : runReport ? (
                  <Box>
                    {/* Summary */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <Chip label={`Total: ${runReport.total}`} variant="outlined" />
                      <Chip icon={<PassIcon />} label={`Passed: ${runReport.passed}`} color="success" variant="outlined" />
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
                                        sx={{
                                          transform: expandedSnippet === idx ? 'rotate(180deg)' : 'none',
                                          transition: '0.2s',
                                        }}
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
                  {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => (
                    <MenuItem key={m} value={m}>
                      {m}
                    </MenuItem>
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
            The selected tests include non-GET methods (POST/PUT/DELETE/PATCH) that will execute against{' '}
            <strong>production</strong>.
          </Typography>
          <Typography variant="body2" color="error" fontWeight={600}>
            Are you sure you want to proceed?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => executeRun(pendingRunIds, true)}>
            Yes, Run Tests
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApiExplorerPage;
