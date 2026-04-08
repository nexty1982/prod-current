/**
 * Page Editability Audit — Devel Tools
 *
 * Two tabs:
 *   1. Audit — Shows which public pages are properly wired for inline live editing,
 *      with static analysis results and runtime DB verification.
 *   2. Candidates — Shows pages eligible for Edit Mode conversion with
 *      preview and one-click apply for auto-wiring EditableText.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, Chip, Stack, Paper, TextField,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  CircularProgress, Alert, IconButton, Tooltip, Collapse,
  InputAdornment, FormControlLabel, Switch, Tab, Tabs,
  Checkbox, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  IconRefresh, IconSearch, IconChevronDown, IconChevronUp,
  IconAlertTriangle, IconCircleCheck, IconCircleX, IconEye,
  IconTrash, IconWand, IconPlayerPlay, IconCode,
} from '@tabler/icons-react';
import apiClient from '@/api/utils/axiosInstance';
import PageContainer from '@/shared/ui/PageContainer';

// ── Types ───────────────────────────────────────────────────────────────

interface RuleResult {
  status: string;
  [key: string]: any;
}

interface SharedSection {
  component: string;
  has_edit_key_prefix: boolean;
  edit_key_prefix: string | null;
  fields: string[];
}

interface RuntimeData {
  override_count: number;
  detected_key_count: number;
  persisted_detected_key_count: number;
  missing_detected_key_count: number;
  orphaned_override_count: number;
  translation_status_total: number;
  translation_needs_update_count: number;
}

interface AuditIssue {
  rule: string;
  severity: string;
  message: string;
}

interface PageAudit {
  id: string;
  name: string;
  file: string;
  category: string;
  route: string | null;
  pageKey: string | null;
  classification: string;
  editable_field_count: number;
  shared_section_count: number;
  shared_sections: SharedSection[];
  content_keys: string[];
  rules: Record<string, RuleResult>;
  issues: AuditIssue[];
  warnings: AuditIssue[];
  runtime: RuntimeData | null;
}

interface AuditSummary {
  total_pages: number;
  editable_compliant: number;
  partially_editable: number;
  non_editable_by_design: number;
  broken_integration: number;
  unknown: number;
  total_issues: number;
  total_warnings: number;
}

interface AuditResponse {
  success: boolean;
  timestamp: string;
  summary: AuditSummary;
  pages: PageAudit[];
}

// ── Candidate types ────────────────────────────────────────────────────

interface CandidateSignals {
  hasSubstantialText?: boolean;
  totalTranslatable?: number;
  i18nCallCount?: number;
  hardcodedStringCount?: number;
  usesI18n?: boolean;
  isDataDriven?: boolean;
  unwiredSharedSections?: number;
  inPublicLayout?: boolean;
  editableTextCount?: number;
  wiredSharedSections?: number;
}

interface Candidate {
  route: string;
  pageKey: string;
  component: string | null;
  file?: string;
  registryId?: string;
  classification: string;
  score: number;
  signals: CandidateSignals;
  rationale: string;
  inPublicLayout: boolean;
  recommended_action?: string;
  duplicateOf?: string;
}

interface CandidateSummary {
  total_public_routes: number;
  excluded_non_content: number;
  evaluated_content_pages: number;
  already_compliant: number;
  conversion_candidates: number;
  low_priority_candidates: number;
  non_candidates: number;
  needs_investigation: number;
}

interface CandidateResponse {
  success: boolean;
  timestamp: string;
  summary: CandidateSummary;
  candidates: Candidate[];
}

// ── Wire preview types ─────────────────────────────────────────────────

interface DiffChange {
  type: 'added' | 'removed' | 'context';
  line: number;
  text: string;
}

interface DiffHunk {
  startLine: number;
  changes: DiffChange[];
}

interface UncoveredCall {
  key: string;
  context: string;
  line: number;
  lineText: string;
}

interface WirePreviewResult {
  success: boolean;
  error?: string;
  file?: string;
  relativeFile?: string;
  totalChanges: number;
  phases?: {
    directElements: number;
    arrayPatterns: number;
    standaloneCalls: number;
    importAdded: boolean;
  };
  coveredPrefixes?: string[];
  uncovered?: UncoveredCall[];
  propValues?: number;
  diff?: DiffHunk[];
  allCovered?: boolean;
}

interface WireApplyResult {
  success: boolean;
  applied?: boolean;
  totalChanges?: number;
  message?: string;
  error?: string;
  uncovered?: UncoveredCall[];
  allCovered?: boolean;
}

// ── Classification config ───────────────────────────────────────────────

const CLASSIFICATION_CONFIG: Record<string, { label: string; color: 'success' | 'warning' | 'default' | 'error' | 'info' }> = {
  'editable-compliant':      { label: 'Compliant',        color: 'success' },
  'partially-editable':      { label: 'Partial',          color: 'warning' },
  'non-editable-by-design':  { label: 'By Design',        color: 'default' },
  'broken-integration':      { label: 'Broken',           color: 'error'   },
  'unknown':                 { label: 'Unknown',          color: 'info'    },
};

const CANDIDATE_CLASS_CONFIG: Record<string, { label: string; color: 'success' | 'warning' | 'default' | 'error' | 'info' | 'primary' | 'secondary' }> = {
  'conversion-candidate':    { label: 'Ready',            color: 'primary'  },
  'low-priority-candidate':  { label: 'Low Priority',     color: 'info'     },
  'already-compliant':       { label: 'Compliant',        color: 'success'  },
  'non-candidate':           { label: 'Non-Candidate',    color: 'default'  },
  'excluded':                { label: 'Excluded',         color: 'default'  },
  'needs-investigation':     { label: 'Investigate',      color: 'warning'  },
};

// ── Component ───────────────────────────────────────────────────────────

const PageEditAuditPage = () => {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [showOnlyFailures, setShowOnlyFailures] = useState(false);
  const [showOrphanedOnly, setShowOrphanedOnly] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<AuditResponse>('/admin/frontend-page-audit');
      setData(res as unknown as AuditResponse);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to fetch audit');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  const filteredPages = useMemo(() => {
    if (!data) return [];
    let pages = data.pages;

    if (search) {
      const q = search.toLowerCase();
      pages = pages.filter(p =>
        p.id.includes(q) || p.name.toLowerCase().includes(q) ||
        (p.route || '').toLowerCase().includes(q) || p.file.toLowerCase().includes(q)
      );
    }

    if (classFilter) {
      pages = pages.filter(p => p.classification === classFilter);
    }

    if (showOnlyFailures) {
      pages = pages.filter(p =>
        p.classification === 'broken-integration' ||
        p.classification === 'partially-editable' ||
        p.classification === 'unknown' ||
        p.issues.length > 0 || p.warnings.length > 0
      );
    }

    if (showOrphanedOnly) {
      pages = pages.filter(p => (p.runtime?.orphaned_override_count ?? 0) > 0);
    }

    return pages;
  }, [data, search, classFilter, showOnlyFailures, showOrphanedOnly]);

  return (
    <PageContainer title="Page Editability Audit" description="Audit frontend page edit-mode wiring">
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" fontWeight={700}>Page Editability Audit</Typography>
            {data && tab === 0 && (
              <Typography variant="body2" color="text.secondary">
                Last run: {new Date(data.timestamp).toLocaleString()} — {data.summary.total_pages} pages
              </Typography>
            )}
          </Box>
          {tab === 0 && (
            <Button
              variant="outlined"
              startIcon={<IconRefresh size={18} />}
              onClick={fetchAudit}
              disabled={loading}
            >
              {loading ? 'Running...' : 'Refresh'}
            </Button>
          )}
        </Stack>

        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Audit" />
          <Tab label="Candidates" icon={<IconWand size={16} />} iconPosition="start" />
        </Tabs>

        {tab === 0 && (
          <>
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            {loading && !data ? (
              <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
            ) : data ? (
              <>
                <SummaryBar summary={data.summary} classFilter={classFilter} onFilterChange={setClassFilter} />

                <Stack direction="row" spacing={2} alignItems="center" mb={2} flexWrap="wrap" useFlexGap>
                  <TextField
                    size="small"
                    placeholder="Search pages..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    sx={{ minWidth: 220 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment>,
                    }}
                  />
                  <FormControlLabel
                    control={<Switch size="small" checked={showOnlyFailures} onChange={e => setShowOnlyFailures(e.target.checked)} />}
                    label={<Typography variant="body2">Failures only</Typography>}
                  />
                  <FormControlLabel
                    control={<Switch size="small" checked={showOrphanedOnly} onChange={e => setShowOrphanedOnly(e.target.checked)} />}
                    label={<Typography variant="body2">Orphaned overrides</Typography>}
                  />
                  {(classFilter || showOnlyFailures || showOrphanedOnly || search) && (
                    <Button size="small" onClick={() => { setClassFilter(null); setShowOnlyFailures(false); setShowOrphanedOnly(false); setSearch(''); }}>
                      Clear filters
                    </Button>
                  )}
                </Stack>

                <AuditTable
                  pages={filteredPages}
                  expandedRow={expandedRow}
                  onToggleRow={(id) => setExpandedRow(prev => prev === id ? null : id)}
                  onRefresh={fetchAudit}
                />
              </>
            ) : null}
          </>
        )}

        {tab === 1 && <CandidatesPanel />}
      </Box>
    </PageContainer>
  );
};

export default PageEditAuditPage;

// ═══════════════════════════════════════════════════════════════════════
// CANDIDATES TAB
// ═══════════════════════════════════════════════════════════════════════

function CandidatesPanel() {
  const [data, setData] = useState<CandidateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<CandidateResponse>('/admin/frontend-page-audit/candidates');
      setData(res as unknown as CandidateResponse);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to fetch candidates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let candidates = data.candidates;
    if (classFilter) {
      candidates = candidates.filter(c => c.classification === classFilter);
    }
    // Sort by score descending
    return [...candidates].sort((a, b) => b.score - a.score);
  }, [data, classFilter]);

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading && !data ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : data ? (
        <>
          {/* Summary chips */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Last run: {new Date(data.timestamp).toLocaleString()} — {data.summary.total_public_routes} public routes evaluated
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<IconRefresh size={16} />}
              onClick={fetchCandidates}
              disabled={loading}
            >
              Refresh
            </Button>
          </Stack>

          <CandidateSummaryBar summary={data.summary} classFilter={classFilter} onFilterChange={setClassFilter} />

          {/* Candidate table */}
          {filtered.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No candidates match the current filter.</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width={32} />
                    <TableCell><Typography variant="subtitle2">Route</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2">Component</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2">Classification</Typography></TableCell>
                    <TableCell align="center"><Typography variant="subtitle2">Score</Typography></TableCell>
                    <TableCell align="right"><Typography variant="subtitle2">Translatable</Typography></TableCell>
                    <TableCell align="center"><Tooltip title="In PublicLayout (EditModeProvider available)"><Typography variant="subtitle2">PL</Typography></Tooltip></TableCell>
                    <TableCell><Typography variant="subtitle2">Action</Typography></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map(c => (
                    <CandidateRow
                      key={c.route}
                      candidate={c}
                      expanded={expandedRoute === c.route}
                      onToggle={() => setExpandedRoute(prev => prev === c.route ? null : c.route)}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      ) : null}
    </>
  );
}

function CandidateSummaryBar({ summary, classFilter, onFilterChange }: {
  summary: CandidateSummary;
  classFilter: string | null;
  onFilterChange: (v: string | null) => void;
}) {
  const items: { key: string; count: number; label: string; color: 'primary' | 'success' | 'warning' | 'default' | 'info' }[] = [
    { key: 'conversion-candidate',    count: summary.conversion_candidates,    label: 'Ready',          color: 'primary'  },
    { key: 'low-priority-candidate',  count: summary.low_priority_candidates,  label: 'Low Priority',   color: 'info'     },
    { key: 'already-compliant',       count: summary.already_compliant,        label: 'Compliant',      color: 'success'  },
    { key: 'needs-investigation',     count: summary.needs_investigation,      label: 'Investigate',    color: 'warning'  },
  ];

  return (
    <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
      {items.map(item => (
        <Chip
          key={item.key}
          label={`${item.label}: ${item.count}`}
          color={item.color}
          variant={classFilter === item.key ? 'filled' : 'outlined'}
          size="small"
          onClick={() => onFilterChange(classFilter === item.key ? null : item.key)}
          sx={{ cursor: 'pointer', fontWeight: classFilter === item.key ? 700 : 400 }}
        />
      ))}
      <Chip
        label={`Excluded: ${summary.excluded_non_content}`}
        color="default"
        variant={classFilter === 'excluded' ? 'filled' : 'outlined'}
        size="small"
        onClick={() => onFilterChange(classFilter === 'excluded' ? null : 'excluded')}
        sx={{ cursor: 'pointer', fontWeight: classFilter === 'excluded' ? 700 : 400 }}
      />
    </Stack>
  );
}

// ── Candidate Row ──────────────────────────────────────────────────────

function CandidateRow({ candidate: c, expanded, onToggle }: {
  candidate: Candidate;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cfg = CANDIDATE_CLASS_CONFIG[c.classification] || { label: c.classification, color: 'default' as const };
  const canWire = !!c.file;

  return (
    <>
      <TableRow
        hover
        onClick={onToggle}
        sx={{ cursor: 'pointer', '& > *': { borderBottom: expanded ? 'none' : undefined } }}
      >
        <TableCell>
          <IconButton size="small" sx={{ p: 0.25 }}>
            {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontFamily="monospace" fontSize={12}>{c.route}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontSize={13}>{c.component || '—'}</Typography>
        </TableCell>
        <TableCell>
          <Chip label={cfg.label} color={cfg.color as any} size="small" variant="filled" />
        </TableCell>
        <TableCell align="center">
          {c.score > 0 ? (
            <Chip
              label={c.score}
              size="small"
              variant="outlined"
              color={c.score >= 4 ? 'primary' : c.score >= 2 ? 'info' : 'default'}
              sx={{ fontWeight: 700, minWidth: 32 }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">—</Typography>
          )}
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2">
            {c.signals.totalTranslatable ?? c.signals.editableTextCount ?? '—'}
          </Typography>
        </TableCell>
        <TableCell align="center">
          {c.inPublicLayout ? (
            <IconCircleCheck size={16} color="var(--mui-palette-success-main, #4caf50)" />
          ) : (
            <Typography variant="body2" color="text.secondary">—</Typography>
          )}
        </TableCell>
        <TableCell>
          {canWire && c.file && (
            <Tooltip title="Preview wire-edit-mode transform">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
                <IconEye size={16} />
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={8} sx={{ py: 0, px: 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <CandidateDetail candidate={c} />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ── Candidate Detail Panel ─────────────────────────────────────────────

function CandidateDetail({ candidate: c }: { candidate: Candidate }) {
  const canWire = !!c.file;

  return (
    <Box sx={{ px: 3, py: 2, bgcolor: 'action.hover' }}>
      <Stack spacing={2}>
        {/* Meta */}
        <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
          {c.file && <DetailField label="File" value={c.file} mono />}
          <DetailField label="Page Key" value={c.pageKey || '—'} mono />
          {c.registryId && <DetailField label="Registry ID" value={c.registryId} mono />}
        </Stack>

        {/* Signals */}
        {c.signals && Object.keys(c.signals).length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>Analysis Signals</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {c.signals.totalTranslatable != null && (
                <Chip label={`${c.signals.totalTranslatable} translatable strings`} size="small" variant="outlined" />
              )}
              {c.signals.i18nCallCount != null && (
                <Chip label={`${c.signals.i18nCallCount} i18n calls`} size="small" variant="outlined" />
              )}
              {c.signals.usesI18n && <Chip label="Uses i18n" size="small" color="success" variant="outlined" />}
              {c.signals.isDataDriven && <Chip label="Data-driven" size="small" color="warning" variant="outlined" />}
              {c.signals.unwiredSharedSections != null && c.signals.unwiredSharedSections > 0 && (
                <Chip label={`${c.signals.unwiredSharedSections} unwired sections`} size="small" color="warning" variant="outlined" />
              )}
              {c.signals.editableTextCount != null && (
                <Chip label={`${c.signals.editableTextCount} EditableText`} size="small" color="success" variant="outlined" />
              )}
              {c.signals.wiredSharedSections != null && (
                <Chip label={`${c.signals.wiredSharedSections} wired sections`} size="small" color="success" variant="outlined" />
              )}
            </Stack>
          </Box>
        )}

        {/* Rationale */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>Rationale</Typography>
          <Typography variant="body2" color="text.secondary">{c.rationale}</Typography>
        </Box>

        {/* Recommended action */}
        {c.recommended_action && (
          <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
            <Typography variant="body2">{c.recommended_action}</Typography>
          </Alert>
        )}

        {/* Wire Edit Mode panel */}
        {canWire && <WireEditModePanel file={c.file!} />}
      </Stack>
    </Box>
  );
}

// ── Wire Edit Mode Panel ───────────────────────────────────────────────

function WireEditModePanel({ file }: { file: string }) {
  const [preview, setPreview] = useState<WirePreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<WireApplyResult | null>(null);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    setError('');
    setPreview(null);
    setApplyResult(null);
    try {
      const res = await apiClient.post('/admin/frontend-page-audit/wire-edit-mode/preview', { file }) as unknown as WirePreviewResult;
      setPreview(res);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Preview failed');
    } finally {
      setLoading(false);
    }
  }, [file]);

  const handleApply = async () => {
    setApplying(true);
    setError('');
    setConfirmOpen(false);
    try {
      const res = await apiClient.post('/admin/frontend-page-audit/wire-edit-mode/apply', { file }) as unknown as WireApplyResult;
      setApplyResult(res);
      setPreview(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Apply failed');
    } finally {
      setApplying(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
        <Typography variant="subtitle2">Wire Edit Mode</Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={loading ? <CircularProgress size={14} /> : <IconEye size={14} />}
          onClick={fetchPreview}
          disabled={loading || applying}
          sx={{ textTransform: 'none', fontSize: 12 }}
        >
          {loading ? 'Analyzing...' : 'Preview Transform'}
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 1, py: 0 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Apply result */}
      {applyResult && (
        <Alert severity={applyResult.applied ? 'success' : 'info'} sx={{ mb: 1, py: 0.5 }}>
          <Typography variant="body2">
            {applyResult.applied
              ? `Applied ${applyResult.totalChanges} transforms to ${file}. Rebuild the frontend to see changes.`
              : applyResult.message || 'No changes needed.'}
          </Typography>
          {applyResult.uncovered && applyResult.uncovered.length > 0 && (
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              {applyResult.uncovered.length} t() call(s) still need manual attention.
            </Typography>
          )}
        </Alert>
      )}

      {/* Preview results */}
      {preview && preview.success && (
        <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
          {preview.totalChanges === 0 ? (
            <Alert severity="success" sx={{ py: 0 }}>
              <Typography variant="body2">No changes needed — page is already fully wired or has no wrappable t() calls.</Typography>
            </Alert>
          ) : (
            <>
              {/* Phase summary */}
              <Stack direction="row" spacing={2} mb={1.5} flexWrap="wrap" useFlexGap>
                <Chip label={`${preview.totalChanges} total transforms`} color="primary" size="small" />
                {preview.phases && (
                  <>
                    <Chip label={`${preview.phases.directElements} direct elements`} size="small" variant="outlined" />
                    <Chip label={`${preview.phases.arrayPatterns} array patterns`} size="small" variant="outlined" />
                    {preview.phases.standaloneCalls > 0 && (
                      <Chip label={`${preview.phases.standaloneCalls} standalone`} size="small" variant="outlined" />
                    )}
                    {preview.phases.importAdded && <Chip label="+ import" size="small" color="info" variant="outlined" />}
                  </>
                )}
                {preview.propValues != null && preview.propValues > 0 && (
                  <Chip label={`${preview.propValues} prop values (skipped)`} size="small" variant="outlined" color="default" />
                )}
              </Stack>

              {/* Coverage status */}
              {preview.allCovered ? (
                <Alert severity="success" sx={{ mb: 1.5, py: 0 }}>
                  <Typography variant="body2">All renderable t() calls will be covered by EditableText or shared sections.</Typography>
                </Alert>
              ) : preview.uncovered && preview.uncovered.length > 0 ? (
                <Alert severity="warning" sx={{ mb: 1.5, py: 0.5 }}>
                  <Typography variant="body2" gutterBottom>
                    {preview.uncovered.length} t() call(s) cannot be auto-wrapped (may need manual attention):
                  </Typography>
                  {preview.uncovered.map((u, i) => (
                    <Typography key={i} variant="body2" fontFamily="monospace" fontSize={11} sx={{ ml: 1 }}>
                      Line {u.line}: {u.key}
                    </Typography>
                  ))}
                </Alert>
              ) : null}

              {/* Diff */}
              {preview.diff && preview.diff.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" mb={0.5}>
                    <IconCode size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Diff Preview
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1,
                      maxHeight: 400,
                      overflow: 'auto',
                      bgcolor: '#1e1e1e',
                      fontFamily: 'monospace',
                      fontSize: 11,
                      lineHeight: 1.5,
                    }}
                  >
                    {preview.diff.map((hunk, hi) => (
                      <Box key={hi} sx={{ mb: 1 }}>
                        {hunk.changes.map((change, ci) => (
                          <Box
                            key={ci}
                            sx={{
                              px: 1,
                              color: change.type === 'added' ? '#4ec9b0' : change.type === 'removed' ? '#f48771' : '#808080',
                              bgcolor: change.type === 'added' ? 'rgba(78,201,176,0.08)' : change.type === 'removed' ? 'rgba(244,135,113,0.08)' : 'transparent',
                              whiteSpace: 'pre',
                              overflowX: 'auto',
                            }}
                          >
                            <Typography component="span" sx={{ color: '#606060', mr: 1, display: 'inline-block', minWidth: 40, textAlign: 'right', userSelect: 'none', fontFamily: 'inherit', fontSize: 'inherit' }}>
                              {change.type === 'added' ? '+' : change.type === 'removed' ? '-' : ' '}{change.line}
                            </Typography>
                            {change.text}
                          </Box>
                        ))}
                      </Box>
                    ))}
                  </Paper>
                </Box>
              )}

              {/* Apply button */}
              <Stack direction="row" spacing={1} mt={2}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={applying ? <CircularProgress size={14} /> : <IconPlayerPlay size={16} />}
                  onClick={() => setConfirmOpen(true)}
                  disabled={applying}
                  sx={{ textTransform: 'none' }}
                >
                  Apply {preview.totalChanges} Transform{preview.totalChanges !== 1 ? 's' : ''}
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                  Writes changes to the source file. Requires frontend rebuild.
                </Typography>
              </Stack>

              {/* Confirm dialog */}
              <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Confirm Edit Mode Wiring</DialogTitle>
                <DialogContent>
                  <Typography variant="body2" gutterBottom>
                    This will apply <strong>{preview.totalChanges}</strong> EditableText transform{preview.totalChanges !== 1 ? 's' : ''} to:
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace" fontSize={12} sx={{ ml: 1, mb: 1 }}>
                    {preview.relativeFile}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    The file will be modified in place. You will need to rebuild the frontend for changes to take effect.
                  </Typography>
                  {!preview.allCovered && preview.uncovered && preview.uncovered.length > 0 && (
                    <Alert severity="warning" sx={{ mt: 1, py: 0.5 }}>
                      <Typography variant="body2">
                        {preview.uncovered.length} t() call(s) will still need manual wiring after this transform.
                      </Typography>
                    </Alert>
                  )}
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleApply}
                    disabled={applying}
                    startIcon={applying ? <CircularProgress size={14} /> : <IconPlayerPlay size={14} />}
                  >
                    {applying ? 'Applying...' : 'Apply'}
                  </Button>
                </DialogActions>
              </Dialog>
            </>
          )}
        </Paper>
      )}
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// AUDIT TAB (existing components, unchanged)
// ═══════════════════════════════════════════════════════════════════════

// ── Summary Bar ─────────────────────────────────────────────────────────

function SummaryBar({ summary, classFilter, onFilterChange }: {
  summary: AuditSummary;
  classFilter: string | null;
  onFilterChange: (v: string | null) => void;
}) {
  const items: { key: string; count: number; label: string; color: 'success' | 'warning' | 'default' | 'error' | 'info' }[] = [
    { key: 'editable-compliant',     count: summary.editable_compliant,      label: 'Compliant',  color: 'success' },
    { key: 'partially-editable',     count: summary.partially_editable,      label: 'Partial',    color: 'warning' },
    { key: 'broken-integration',     count: summary.broken_integration,      label: 'Broken',     color: 'error'   },
    { key: 'unknown',                count: summary.unknown,                 label: 'Unknown',    color: 'info'    },
    { key: 'non-editable-by-design', count: summary.non_editable_by_design,  label: 'By Design',  color: 'default' },
  ];

  return (
    <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
      {items.map(item => (
        <Chip
          key={item.key}
          label={`${item.label}: ${item.count}`}
          color={item.color}
          variant={classFilter === item.key ? 'filled' : 'outlined'}
          size="small"
          onClick={() => onFilterChange(classFilter === item.key ? null : item.key)}
          sx={{ cursor: 'pointer', fontWeight: classFilter === item.key ? 700 : 400 }}
        />
      ))}
      {(summary.total_issues > 0 || summary.total_warnings > 0) && (
        <>
          {summary.total_issues > 0 && (
            <Chip label={`${summary.total_issues} issue(s)`} color="error" size="small" variant="outlined" icon={<IconCircleX size={14} />} />
          )}
          {summary.total_warnings > 0 && (
            <Chip label={`${summary.total_warnings} warning(s)`} color="warning" size="small" variant="outlined" icon={<IconAlertTriangle size={14} />} />
          )}
        </>
      )}
    </Stack>
  );
}

// ── Audit Table ─────────────────────────────────────────────────────────

function AuditTable({ pages, expandedRow, onToggleRow, onRefresh }: {
  pages: PageAudit[];
  expandedRow: string | null;
  onToggleRow: (id: string) => void;
  onRefresh: () => void;
}) {
  if (pages.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No pages match the current filters.</Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell width={32} />
            <TableCell><Typography variant="subtitle2">Page</Typography></TableCell>
            <TableCell><Typography variant="subtitle2">Route</Typography></TableCell>
            <TableCell><Typography variant="subtitle2">Classification</Typography></TableCell>
            <TableCell align="right"><Typography variant="subtitle2">Fields</Typography></TableCell>
            <TableCell align="right"><Typography variant="subtitle2">Sections</Typography></TableCell>
            <TableCell align="right"><Typography variant="subtitle2">Overrides</Typography></TableCell>
            <TableCell align="right"><Tooltip title="DB overrides with no matching static key"><Typography variant="subtitle2" sx={{ borderBottom: '1px dashed', borderColor: 'text.secondary', display: 'inline' }}>Orphaned</Typography></Tooltip></TableCell>
            <TableCell align="right"><Tooltip title="translation_status rows"><Typography variant="subtitle2">Trans</Typography></Tooltip></TableCell>
            <TableCell align="right"><Tooltip title="Translations needing update"><Typography variant="subtitle2">Stale</Typography></Tooltip></TableCell>
            <TableCell align="center"><Typography variant="subtitle2">Issues</Typography></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pages.map(page => (
            <PageRow key={page.id} page={page} expanded={expandedRow === page.id} onToggle={() => onToggleRow(page.id)} onRefresh={onRefresh} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ── Page Row ────────────────────────────────────────────────────────────

function PageRow({ page, expanded, onToggle, onRefresh }: { page: PageAudit; expanded: boolean; onToggle: () => void; onRefresh: () => void }) {
  const cfg = CLASSIFICATION_CONFIG[page.classification] || CLASSIFICATION_CONFIG['unknown'];
  const rt = page.runtime;
  const hasProblems = page.issues.length > 0 || page.warnings.length > 0;
  const hasOrphaned = (rt?.orphaned_override_count ?? 0) > 0;

  return (
    <>
      <TableRow
        hover
        onClick={onToggle}
        sx={{ cursor: 'pointer', '& > *': { borderBottom: expanded ? 'none' : undefined } }}
      >
        <TableCell>
          <IconButton size="small" sx={{ p: 0.25 }}>
            {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={500}>{page.name}</Typography>
          <Typography variant="caption" color="text.secondary">{page.id}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontFamily="monospace" fontSize={12}>{page.route || '—'}</Typography>
        </TableCell>
        <TableCell>
          <Chip label={cfg.label} color={cfg.color} size="small" variant="filled" />
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2">{page.editable_field_count || '—'}</Typography>
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2">{page.shared_section_count || '—'}</Typography>
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2">{rt ? rt.override_count : '—'}</Typography>
        </TableCell>
        <TableCell align="right">
          {hasOrphaned ? (
            <Chip label={rt!.orphaned_override_count} color="warning" size="small" variant="filled" />
          ) : (
            <Typography variant="body2" color="text.secondary">{rt ? '0' : '—'}</Typography>
          )}
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2">{rt ? rt.translation_status_total : '—'}</Typography>
        </TableCell>
        <TableCell align="right">
          {rt && rt.translation_needs_update_count > 0 ? (
            <Chip label={rt.translation_needs_update_count} color="warning" size="small" variant="outlined" />
          ) : (
            <Typography variant="body2" color="text.secondary">{rt ? '0' : '—'}</Typography>
          )}
        </TableCell>
        <TableCell align="center">
          {hasProblems ? (
            <Stack direction="row" spacing={0.5} justifyContent="center">
              {page.issues.length > 0 && <Chip label={page.issues.length} color="error" size="small" />}
              {page.warnings.length > 0 && <Chip label={page.warnings.length} color="warning" size="small" />}
            </Stack>
          ) : (
            <IconCircleCheck size={16} color="var(--mui-palette-success-main, #4caf50)" />
          )}
        </TableCell>
      </TableRow>

      {/* Detail panel */}
      <TableRow>
        <TableCell colSpan={11} sx={{ py: 0, px: 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <PageDetail page={page} onRefresh={onRefresh} />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ── Page Detail Panel ───────────────────────────────────────────────────

function PageDetail({ page, onRefresh }: { page: PageAudit; onRefresh: () => void }) {
  const rt = page.runtime;
  const orphanedKeys: string[] = page.rules.PAGE_CONTENT_KEY_PERSISTENCE?.orphaned_keys || [];

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const toggleKey = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedKeys.size === orphanedKeys.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(orphanedKeys));
    }
  };

  const handleDelete = async () => {
    if (!page.pageKey || selectedKeys.size === 0) return;
    setDeleting(true);
    setDeleteResult(null);
    try {
      const res = await apiClient.post(`/admin/frontend-page-audit/orphaned/${page.pageKey}/delete`, {
        keys: Array.from(selectedKeys),
      }) as any;
      const data = res as { deleted_count: number; deleted_keys: string[]; skipped_keys?: string[] };
      setDeleteResult({
        type: 'success',
        message: `Deleted ${data.deleted_count} orphaned override(s)${data.skipped_keys?.length ? `. ${data.skipped_keys.length} skipped (no longer orphaned).` : '.'}`,
      });
      setSelectedKeys(new Set());
      setConfirmOpen(false);
      onRefresh();
    } catch (err: any) {
      setDeleteResult({
        type: 'error',
        message: err?.response?.data?.error || err?.message || 'Deletion failed',
      });
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ px: 3, py: 2, bgcolor: 'action.hover' }}>
      <Stack spacing={2}>
        {/* Meta */}
        <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
          <DetailField label="File" value={page.file} mono />
          <DetailField label="Page Key" value={page.pageKey || '—'} mono />
          <DetailField label="Category" value={page.category} />
        </Stack>

        {/* Runtime summary */}
        {rt && page.classification === 'editable-compliant' && (
          <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
            <DetailField label="Overrides" value={`${rt.override_count} saved`} />
            <DetailField label="Key Persistence" value={`${rt.persisted_detected_key_count}/${rt.detected_key_count} detected keys have overrides`} />
            <DetailField label="Translation Tracking" value={`${rt.translation_status_total} entries, ${rt.translation_needs_update_count} stale`} />
          </Stack>
        )}

        {/* Issues & warnings */}
        {page.issues.length > 0 && (
          <Box>
            <Typography variant="subtitle2" color="error.main" gutterBottom>Issues</Typography>
            {page.issues.map((issue, i) => (
              <Alert key={i} severity="error" variant="outlined" sx={{ mb: 0.5, py: 0 }}>
                <Typography variant="body2"><strong>{issue.rule}</strong>: {issue.message}</Typography>
              </Alert>
            ))}
          </Box>
        )}

        {page.warnings.length > 0 && (
          <Box>
            <Typography variant="subtitle2" color="warning.main" gutterBottom>Warnings</Typography>
            {page.warnings.map((w, i) => (
              <Alert key={i} severity="warning" variant="outlined" sx={{ mb: 0.5, py: 0 }}>
                <Typography variant="body2"><strong>{w.rule}</strong>: {w.message}</Typography>
              </Alert>
            ))}
          </Box>
        )}

        {/* Orphaned overrides — with cleanup controls */}
        {rt && rt.orphaned_override_count > 0 && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="subtitle2" color="warning.main">
                Orphaned Overrides ({orphanedKeys.length})
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button size="small" variant="text" onClick={toggleAll} sx={{ fontSize: 11, minWidth: 0, textTransform: 'none' }}>
                  {selectedKeys.size === orphanedKeys.length ? 'Deselect all' : 'Select all'}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<IconTrash size={14} />}
                  disabled={selectedKeys.size === 0}
                  onClick={() => setConfirmOpen(true)}
                  sx={{ fontSize: 11, textTransform: 'none' }}
                >
                  Delete selected ({selectedKeys.size})
                </Button>
              </Stack>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={1}>
              These content keys exist in page_content but no longer match any static key in the source code.
            </Typography>

            {deleteResult && (
              <Alert severity={deleteResult.type} sx={{ mb: 1, py: 0 }} onClose={() => setDeleteResult(null)}>
                <Typography variant="body2">{deleteResult.message}</Typography>
              </Alert>
            )}

            <Stack spacing={0}>
              {orphanedKeys.map((k: string) => (
                <Stack
                  key={k}
                  direction="row"
                  alignItems="center"
                  spacing={0.5}
                  onClick={() => toggleKey(k)}
                  sx={{
                    cursor: 'pointer',
                    py: 0.25,
                    px: 0.5,
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'action.selected' },
                  }}
                >
                  <Checkbox
                    size="small"
                    checked={selectedKeys.has(k)}
                    onChange={() => toggleKey(k)}
                    sx={{ p: 0.25 }}
                  />
                  <Chip label={k} size="small" variant="outlined" color="warning" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                </Stack>
              ))}
            </Stack>

            {/* Confirm dialog */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
              <DialogTitle sx={{ pb: 1 }}>
                Confirm Orphaned Override Deletion
              </DialogTitle>
              <DialogContent>
                <Typography variant="body2" gutterBottom>
                  You are about to permanently delete <strong>{selectedKeys.size}</strong> orphaned
                  override{selectedKeys.size !== 1 ? 's' : ''} from page <strong>{page.name}</strong> (page_key: <code>{page.pageKey}</code>).
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  These overrides have no matching static content key in the source code. Deletion is logged to system_logs.
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, mt: 1, maxHeight: 200, overflow: 'auto' }}>
                  <Stack spacing={0.5}>
                    {Array.from(selectedKeys).map(k => (
                      <Typography key={k} variant="body2" fontFamily="monospace" fontSize={12}>
                        {k}
                      </Typography>
                    ))}
                  </Stack>
                </Paper>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setConfirmOpen(false)} disabled={deleting}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleDelete}
                  disabled={deleting}
                  startIcon={deleting ? <CircularProgress size={14} /> : <IconTrash size={14} />}
                >
                  {deleting ? 'Deleting...' : `Delete ${selectedKeys.size} override${selectedKeys.size !== 1 ? 's' : ''}`}
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}

        {/* Shared sections */}
        {page.shared_sections.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>Shared Editable Sections</Typography>
            <Stack spacing={0.5}>
              {page.shared_sections.map((s, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={s.component}
                    size="small"
                    color={s.has_edit_key_prefix ? 'success' : 'default'}
                    variant="outlined"
                  />
                  {s.edit_key_prefix ? (
                    <Typography variant="body2" fontFamily="monospace" fontSize={12}>
                      editKeyPrefix="{s.edit_key_prefix}" — fields: {s.fields.join(', ')}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary" fontSize={12}>
                      no editKeyPrefix — fields: {s.fields.join(', ')}
                    </Typography>
                  )}
                </Stack>
              ))}
            </Stack>
          </Box>
        )}

        {/* Content keys */}
        {page.content_keys.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>Content Keys ({page.content_keys.length})</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {page.content_keys.map(k => (
                <Chip key={k} label={k} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
              ))}
            </Box>
          </Box>
        )}

        {/* Rule results */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>Rule Results</Typography>
          <Table size="small">
            <TableBody>
              {Object.entries(page.rules).map(([name, rule]) => (
                <TableRow key={name} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell sx={{ py: 0.5, width: 300 }}>
                    <Typography variant="body2" fontFamily="monospace" fontSize={12}>{name}</Typography>
                  </TableCell>
                  <TableCell sx={{ py: 0.5, width: 80 }}>
                    <RuleStatusChip status={rule.status} />
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {rule.detail || rule.reason || rule.route || (rule.exempt ? `exempt: ${rule.exempt_reason}` : '') || ''}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Stack>
    </Box>
  );
}

// ── Small helpers ───────────────────────────────────────────────────────

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontFamily={mono ? 'monospace' : undefined} fontSize={mono ? 12 : undefined}>{value}</Typography>
    </Box>
  );
}

function RuleStatusChip({ status }: { status: string }) {
  const map: Record<string, { color: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string }> = {
    pass: { color: 'success', label: 'pass' },
    fail: { color: 'error',   label: 'fail' },
    warn: { color: 'warning', label: 'warn' },
    info: { color: 'info',    label: 'info' },
    skip: { color: 'default', label: 'skip' },
  };
  const cfg = map[status] || map['info'];
  return <Chip label={cfg.label} color={cfg.color} size="small" variant="outlined" sx={{ fontSize: 11, height: 20 }} />;
}
