/**
 * Repository Operations Hub
 *
 * Unified admin page: Build info, git context, remote-authoritative branch cleanup.
 *
 * Data sources:
 *   - GET /api/system/version         — server build info
 *   - GET /api/ops/git/status         — git status raw output
 *   - GET /api/ops/git/branch-analysis — remote-authoritative branch analysis
 *   - getBuildInfo()                   — frontend build info (Vite env)
 *
 * Architecture:
 *   - Remote branches (origin/*) are the source of truth for cleanup
 *   - Local branches are secondary context (current, tracking, local-only)
 *   - All comparisons are against origin/main, not local main
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  IconButton,
  Collapse,
  Drawer,
  Divider,
  Tooltip,
  useTheme,
  MenuItem,
  Select,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Checkbox,
  LinearProgress,
} from '@mui/material';
import {
  IconRefresh,
  IconPlayerPlay,
  IconGitBranch,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
  IconSearch,
  IconGitMerge,
  IconGitFork,
  IconTrash,
  IconEye,
  IconArchive,
  IconTerminal2,
  IconServer,
  IconBrowser,
  IconCalendar,
  IconUpload,
  IconCloud,
  IconDeviceDesktop,
  IconCloudOff,
  IconParking,
} from '@tabler/icons-react';
import { getBuildInfo } from '@/shared/lib/buildInfo';
import { useServerVersion } from '@/hooks/useServerVersion';
import apiClient from '@/api/utils/axiosInstance';

// ── Types ───────────────────────────────────────────────────────

type BranchClassification = 'Already Merged' | 'Safe To Delete' | 'Fast-Forward Safe' | 'Needs Rebase' | 'Parked Work' | 'Stale / Diverged' | 'Manual Review';
type RecommendedAction = 'Delete' | 'Merge' | 'Review' | 'Rebase' | 'Archive' | 'Push';
type ConfidenceLevel = 'high' | 'medium' | 'low';
type BranchSource = 'remote' | 'local' | 'both';

interface RemoteBranch {
  name: string;
  remoteRef: string;
  ahead: number;
  behind: number;
  lastCommit: string;
  lastCommitDate: string;
  lastCommitSha: string;
  changedFiles: number;
  classification: BranchClassification;
  recommendedAction: RecommendedAction;
  confidence: ConfidenceLevel;
  commitAgeDays: number;
  mergeBase: string;
  isMerged: boolean;
  hasLocal: boolean;
  isCurrent: boolean;
  source: BranchSource;
  note: string | null;
  noteUpdated: string | null;
}

interface LocalOnlyBranch {
  name: string;
  ahead: number;
  behind: number;
  lastCommit: string;
  lastCommitDate: string;
  lastCommitSha: string;
  isCurrent: boolean;
  hasUnpushedCommits: boolean;
  isMerged: boolean;
  recommendedAction: RecommendedAction;
  source: 'local';
}

interface BranchAnalysis {
  fetchOk: boolean;
  comparisonTarget: string;
  originMainSha: string;
  localContext: {
    currentBranch: string;
    isClean: boolean;
    trackingRemote: string | null;
  };
  remoteBranches: RemoteBranch[];
  localOnlyBranches: LocalOnlyBranch[];
  summary: {
    totalRemote: number;
    totalLocalOnly: number;
    alreadyMerged: number;
    safeToDelete: number;
    fastForwardSafe: number;
    needsRebase: number;
    parkedWork: number;
    staleDiverged: number;
    manualReview: number;
  };
}

// ── Helpers ─────────────────────────────────────────────────────

const CLASSIFICATION_COLORS: Record<BranchClassification, { bg: string; bgDark: string; color: string; colorDark: string; border: string; borderDark: string }> = {
  'Already Merged': { bg: '#f3e8ff', bgDark: 'rgba(139,92,246,0.15)', color: '#7c3aed', colorDark: '#a78bfa', border: '#ddd6fe', borderDark: 'rgba(139,92,246,0.3)' },
  'Safe To Delete': { bg: '#f3e8ff', bgDark: 'rgba(139,92,246,0.12)', color: '#6d28d9', colorDark: '#c4b5fd', border: '#ddd6fe', borderDark: 'rgba(139,92,246,0.25)' },
  'Fast-Forward Safe': { bg: '#dcfce7', bgDark: 'rgba(34,197,94,0.15)', color: '#16a34a', colorDark: '#4ade80', border: '#bbf7d0', borderDark: 'rgba(34,197,94,0.3)' },
  'Needs Rebase': { bg: '#fef3c7', bgDark: 'rgba(245,158,11,0.15)', color: '#d97706', colorDark: '#fbbf24', border: '#fde68a', borderDark: 'rgba(245,158,11,0.3)' },
  'Parked Work': { bg: '#e0f2fe', bgDark: 'rgba(14,165,233,0.15)', color: '#0284c7', colorDark: '#38bdf8', border: '#bae6fd', borderDark: 'rgba(14,165,233,0.3)' },
  'Stale / Diverged': { bg: '#fce4ec', bgDark: 'rgba(233,30,99,0.15)', color: '#c62828', colorDark: '#ef9a9a', border: '#f8bbd0', borderDark: 'rgba(233,30,99,0.3)' },
  'Manual Review': { bg: '#fee2e2', bgDark: 'rgba(239,68,68,0.15)', color: '#dc2626', colorDark: '#f87171', border: '#fecaca', borderDark: 'rgba(239,68,68,0.3)' },
};

const ACTION_ICONS: Record<RecommendedAction, React.ElementType> = {
  Delete: IconTrash,
  Merge: IconGitMerge,
  Review: IconEye,
  Rebase: IconGitFork,
  Archive: IconArchive,
  Push: IconUpload,
};

const SOURCE_CONFIG: Record<BranchSource, { icon: React.ElementType; label: string }> = {
  remote: { icon: IconCloud, label: 'remote only' },
  local: { icon: IconDeviceDesktop, label: 'local only' },
  both: { icon: IconGitBranch, label: 'tracked' },
};

// ── Component ───────────────────────────────────────────────────

const RepoOpsPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Build info
  const buildInfo = getBuildInfo();
  const { serverVersion, isLoading: serverLoading, refetch: refetchServer } = useServerVersion();
  const versionsMatch = serverVersion && buildInfo.gitSha === serverVersion.gitSha;

  // Git status
  const [gitStatus, setGitStatus] = useState<string | null>(null);
  const [gitLoading, setGitLoading] = useState(false);

  // Branch analysis
  const [analysis, setAnalysis] = useState<BranchAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // UI state
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [localOnlyOpen, setLocalOnlyOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<RemoteBranch | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');

  // Delete branch
  const [deleteTarget, setDeleteTarget] = useState<RemoteBranch | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  // Merge branch
  const [mergeTarget, setMergeTarget] = useState<RemoteBranch | null>(null);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [merging, setMerging] = useState(false);

  // Bulk delete
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState<{ succeeded: number; failed: number; total: number } | null>(null);

  // Branch notes
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // ── Data Fetchers ───────────────────────────────────────────

  const fetchGitStatus = useCallback(async () => {
    setGitLoading(true);
    try {
      const res: any = await apiClient.get('/ops/git/status');
      setGitStatus(res.output || '');
    } catch {
      setGitStatus(null);
    } finally {
      setGitLoading(false);
    }
  }, []);

  const fetchAnalysis = useCallback(async () => {
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const res: any = await apiClient.get('/ops/git/branch-analysis');
      setAnalysis(res);
    } catch (err: any) {
      setAnalysisError(err.message || 'Analysis failed');
    } finally {
      setAnalysisLoading(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    refetchServer();
    fetchGitStatus();
    fetchAnalysis();
  }, [refetchServer, fetchGitStatus, fetchAnalysis]);

  useEffect(() => {
    fetchGitStatus();
    fetchAnalysis();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Branch Deletion ─────────────────────────────────────────

  const SAFE_DELETE_CLASSIFICATIONS: BranchClassification[] = ['Already Merged', 'Safe To Delete', 'Stale / Diverged'];

  const openDeleteDialog = (branch: RemoteBranch) => {
    setDeleteTarget(branch);
    setDeleteDialogOpen(true);
  };

  const handleDeleteBranch = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res: any = await apiClient.delete(`/ops/git/branch/${encodeURIComponent(deleteTarget.name)}`);
      setSnackbar({ open: true, message: res.message || `Branch "${deleteTarget.name}" deleted`, severity: 'success' });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      // Close drawer if the deleted branch was selected
      if (selectedBranch?.name === deleteTarget.name) {
        setDrawerOpen(false);
        setSelectedBranch(null);
      }
      // Refresh analysis to reflect the deletion
      fetchAnalysis();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Deletion failed', severity: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  // ── Merge Branch ────────────────────────────────────────────

  const openMergeDialog = (branch: RemoteBranch) => {
    setMergeTarget(branch);
    setMergeDialogOpen(true);
  };

  const handleMergeBranch = async () => {
    if (!mergeTarget) return;
    setMerging(true);
    try {
      const res: any = await apiClient.post(`/ops/git/branch/${encodeURIComponent(mergeTarget.name)}/merge`);
      setSnackbar({ open: true, message: res.message || `Branch "${mergeTarget.name}" merged into main`, severity: 'success' });
      setMergeDialogOpen(false);
      setMergeTarget(null);
      if (selectedBranch?.name === mergeTarget.name) {
        setDrawerOpen(false);
        setSelectedBranch(null);
      }
      fetchAnalysis();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Merge failed', severity: 'error' });
    } finally {
      setMerging(false);
    }
  };

  // ── Branch Notes ────────────────────────────────────────────

  const handleSaveNote = async (branch: RemoteBranch) => {
    setSavingNote(true);
    try {
      await apiClient.put(`/ops/git/branch-notes/${encodeURIComponent(branch.name)}`, { note: noteText });
      setSnackbar({ open: true, message: noteText.trim() ? 'Note saved' : 'Note removed', severity: 'success' });
      setEditingNote(false);
      fetchAnalysis(); // refresh to pick up note in data
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to save note', severity: 'error' });
    } finally {
      setSavingNote(false);
    }
  };

  // ── Bulk Delete ────────────────────────────────────────────

  const safeBranches = (analysis?.remoteBranches || []).filter(
    b => SAFE_DELETE_CLASSIFICATIONS.includes(b.classification) && !b.isCurrent
  );
  const allSafeSelected = safeBranches.length > 0 && safeBranches.every(b => selectedForDelete.has(b.name));
  const someSafeSelected = safeBranches.some(b => selectedForDelete.has(b.name));

  const toggleBranchSelect = (name: string) => {
    setSelectedForDelete(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const toggleSelectAllSafe = () => {
    if (allSafeSelected) {
      setSelectedForDelete(new Set());
    } else {
      setSelectedForDelete(new Set(safeBranches.map(b => b.name)));
    }
  };

  const handleBulkDelete = async () => {
    const branches = Array.from(selectedForDelete);
    if (branches.length === 0) return;
    setBulkDeleting(true);
    setBulkDeleteProgress(null);
    try {
      const res: any = await apiClient.post('/ops/git/branches/bulk-delete', { branches });
      setBulkDeleteProgress({ succeeded: res.succeeded, failed: res.failed, total: res.total });
      setSnackbar({
        open: true,
        message: res.message || `Deleted ${res.succeeded} branch(es)`,
        severity: res.failed === 0 ? 'success' : 'error',
      });
      setSelectedForDelete(new Set());
      setBulkDeleteDialogOpen(false);
      fetchAnalysis();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Bulk delete failed', severity: 'error' });
    } finally {
      setBulkDeleting(false);
    }
  };

  // Clear selections when analysis refreshes
  useEffect(() => {
    setSelectedForDelete(new Set());
  }, [analysis]);

  // ── Derived state ────────────────────────────────────────────

  const currentBranch = analysis?.localContext?.currentBranch || '...';
  const isClean = analysis?.localContext?.isClean ?? null;
  const trackingRemote = analysis?.localContext?.trackingRemote || null;

  const filteredBranches = (analysis?.remoteBranches || []).filter(b => {
    if (searchQuery && !b.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterClass !== 'all' && b.classification !== filterClass) return false;
    return true;
  });

  // ── Styling shortcuts ────────────────────────────────────────

  const f = "'Inter', sans-serif";
  const cardBg = isDark ? 'rgba(255,255,255,0.02)' : '#fff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const labelColor = isDark ? '#9ca3af' : '#6b7280';
  const textColor = isDark ? '#f3f4f6' : '#111827';
  const subBg = isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb';

  const classChip = (cls: BranchClassification) => {
    const c = CLASSIFICATION_COLORS[cls];
    if (!c) return {};
    return {
      bgcolor: isDark ? c.bgDark : c.bg,
      color: isDark ? c.colorDark : c.color,
      border: `1px solid ${isDark ? c.borderDark : c.border}`,
    };
  };

  const sourceChip = (source: BranchSource) => {
    const colors: Record<BranchSource, { bg: string; color: string }> = {
      remote: { bg: isDark ? 'rgba(96,165,250,0.12)' : '#dbeafe', color: isDark ? '#93c5fd' : '#2563eb' },
      local: { bg: isDark ? 'rgba(251,191,36,0.12)' : '#fef3c7', color: isDark ? '#fbbf24' : '#d97706' },
      both: { bg: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', color: labelColor },
    };
    return colors[source] || colors.both;
  };

  // Classification explanation text
  const classExplanation = (branch: RemoteBranch): string => {
    switch (branch.classification) {
      case 'Already Merged':
        return `All commits on this branch are reachable from origin/main (merged). No unique work remains. Safe to delete from remote.`;
      case 'Safe To Delete':
        return `This branch has no unique commits ahead of origin/main and is behind by ${branch.behind} commit(s). It can be safely deleted.`;
      case 'Fast-Forward Safe':
        return `This branch has ${branch.ahead} unique commit(s) and is not behind origin/main. It can be merged with a fast-forward merge — no conflicts possible.`;
      case 'Needs Rebase':
        return `This branch has ${branch.ahead} unique commit(s) and is ${branch.behind} commit(s) behind origin/main. It has recent activity and a small divergence — rebase onto origin/main before merging.`;
      case 'Parked Work':
        return `This is a substantial feature branch with ${branch.ahead} unique commit(s) and only ${branch.behind} commit(s) behind origin/main. The divergence is trivial relative to the amount of work. This branch is viable and can be rebased cleanly when ready.`;
      case 'Stale / Diverged':
        return `This branch has ${branch.ahead} unique commit(s) but is ${branch.behind} commit(s) behind origin/main. ${branch.commitAgeDays > 14 ? `Last commit was ${branch.commitAgeDays} days ago (stale). ` : ''}${branch.behind >= 20 ? `Significantly diverged from main. ` : ''}It is unlikely to merge cleanly and is recommended for deletion or manual review.`;
      case 'Manual Review':
        return `This branch is in an unusual state that requires manual investigation before any action.`;
      default:
        return '';
    }
  };

  // ── Render ────────────────────────────────────────────────────

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>

      {/* ── Page Header ─────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 2, mb: 2, borderBottom: `1px solid ${cardBorder}` }}>
        <Box>
          <Typography sx={{ fontFamily: f, fontSize: '1.5rem', fontWeight: 600, color: textColor }}>
            Repository Operations
          </Typography>
          <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', color: labelColor, mt: 0.25 }}>
            Build status, git context, and remote-authoritative branch cleanup
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<IconRefresh size={16} />}
            onClick={refreshAll}
            disabled={serverLoading || gitLoading || analysisLoading}
            sx={{ fontFamily: f, fontSize: '0.8125rem', textTransform: 'none' }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<IconPlayerPlay size={16} />}
            onClick={fetchAnalysis}
            disabled={analysisLoading}
            sx={{ fontFamily: f, fontSize: '0.8125rem', textTransform: 'none' }}
          >
            Run Analysis
          </Button>
        </Box>
      </Box>

      {/* ── Fetch Warning ────────────────────────────────────── */}
      {analysis && !analysis.fetchOk && (
        <Alert severity="warning" sx={{ mb: 2, fontFamily: f, fontSize: '0.8125rem' }}>
          Remote fetch failed — analysis may use stale data. Check network connectivity to origin.
        </Alert>
      )}

      {/* ── Status Strip ────────────────────────────────────── */}
      <Paper
        variant="outlined"
        sx={{ p: 2.5, mb: 3, borderRadius: 2, borderColor: cardBorder, bgcolor: cardBg }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(6, 1fr)' }, gap: 3 }}>
          <Box>
            <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Current Branch
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 600, color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={currentBranch}
            >
              {currentBranch}
            </Typography>
            {trackingRemote && (
              <Typography sx={{ fontFamily: f, fontSize: '0.625rem', color: labelColor, mt: 0.25 }}>
                tracking {trackingRemote}
              </Typography>
            )}
          </Box>
          <Box>
            <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Working Tree
            </Typography>
            {isClean === null ? (
              <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', color: labelColor }}>...</Typography>
            ) : (
              <Chip
                size="small"
                icon={isClean ? <IconCheck size={14} /> : <IconX size={14} />}
                label={isClean ? 'Clean' : 'Dirty'}
                sx={{
                  fontFamily: f, fontSize: '0.75rem', fontWeight: 600, height: 24,
                  bgcolor: isClean
                    ? isDark ? 'rgba(34,197,94,0.15)' : '#dcfce7'
                    : isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7',
                  color: isClean
                    ? isDark ? '#4ade80' : '#16a34a'
                    : isDark ? '#fbbf24' : '#d97706',
                  '& .MuiChip-icon': { color: 'inherit' },
                }}
              />
            )}
          </Box>
          <Box>
            <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Build Sync
            </Typography>
            {serverLoading ? (
              <CircularProgress size={14} />
            ) : (
              <Chip
                size="small"
                icon={versionsMatch ? <IconCheck size={14} /> : <IconAlertTriangle size={14} />}
                label={versionsMatch ? 'Synchronized' : 'Mismatch'}
                sx={{
                  fontFamily: f, fontSize: '0.75rem', fontWeight: 600, height: 24,
                  bgcolor: versionsMatch
                    ? isDark ? 'rgba(34,197,94,0.15)' : '#dcfce7'
                    : isDark ? 'rgba(249,115,22,0.15)' : '#ffedd5',
                  color: versionsMatch
                    ? isDark ? '#4ade80' : '#16a34a'
                    : isDark ? '#fb923c' : '#ea580c',
                  '& .MuiChip-icon': { color: 'inherit' },
                }}
              />
            )}
          </Box>
          <Box>
            <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Comparison Target
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: textColor }}>
              {analysis?.comparisonTarget || 'origin/main'}
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.625rem', color: labelColor, mt: 0.25 }}>
              {analysis?.originMainSha || '...'}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Remote Branches
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 600, color: textColor }}>
              {analysis?.summary?.totalRemote ?? '...'}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Last Build
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: textColor }}>
              {buildInfo.buildTime ? new Date(buildInfo.buildTime).toLocaleString() : 'unknown'}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* ── Build Summary Cards ───────────────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
        {/* Frontend */}
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: cardBorder, bgcolor: cardBg }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <IconBrowser size={18} color={isDark ? '#93c5fd' : '#3b82f6'} />
            <Typography sx={{ fontFamily: f, fontSize: '0.875rem', fontWeight: 600, color: textColor }}>Frontend Build</Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            {[
              { label: 'Version', value: buildInfo.version || 'N/A' },
              { label: 'Environment', value: buildInfo.environment || 'development' },
              { label: 'Git SHA', value: buildInfo.gitSha || 'unknown', mono: true },
              { label: 'Build Time', value: buildInfo.buildTime ? new Date(buildInfo.buildTime).toLocaleString() : 'N/A' },
            ].map(item => (
              <Box key={item.label}>
                <Typography sx={{ fontFamily: f, fontSize: '0.625rem', color: labelColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {item.label}
                </Typography>
                <Typography sx={{ fontFamily: item.mono ? 'monospace' : f, fontSize: '0.75rem', color: textColor, fontWeight: 500 }}>
                  {item.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>

        {/* Server */}
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: cardBorder, bgcolor: cardBg }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <IconServer size={18} color={isDark ? '#c4b5fd' : '#7c3aed'} />
            <Typography sx={{ fontFamily: f, fontSize: '0.875rem', fontWeight: 600, color: textColor }}>Server Build</Typography>
            <Box sx={{ ml: 'auto' }}>
              <Tooltip title="Refresh server version">
                <IconButton size="small" onClick={refetchServer} disabled={serverLoading}>
                  {serverLoading ? <CircularProgress size={14} /> : <IconRefresh size={14} />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          {serverLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={20} /></Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              {[
                { label: 'Version', value: serverVersion?.version || 'N/A' },
                { label: 'Node.js', value: serverVersion?.nodeVersion || 'N/A' },
                { label: 'Git SHA', value: serverVersion?.gitSha || 'unknown', mono: true },
                { label: 'Uptime', value: serverVersion?.uptime ? `${Math.floor(serverVersion.uptime / 3600)}h ${Math.floor((serverVersion.uptime % 3600) / 60)}m` : 'N/A' },
              ].map(item => (
                <Box key={item.label}>
                  <Typography sx={{ fontFamily: f, fontSize: '0.625rem', color: labelColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {item.label}
                  </Typography>
                  <Typography sx={{ fontFamily: item.mono ? 'monospace' : f, fontSize: '0.75rem', color: textColor, fontWeight: 500 }}>
                    {item.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </Box>

      {/* ── Branch Cleanup Table (Remote-Authoritative) ────── */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ fontFamily: f, fontSize: '1.125rem', fontWeight: 600, color: textColor }}>
              Branch Cleanup
            </Typography>
            <Chip
              size="small"
              icon={<IconCloud size={12} />}
              label="remote-authoritative"
              sx={{ fontFamily: f, fontSize: '0.6rem', height: 20, bgcolor: isDark ? 'rgba(96,165,250,0.12)' : '#dbeafe', color: isDark ? '#93c5fd' : '#2563eb', '& .MuiChip-icon': { color: 'inherit' } }}
            />
          </Box>
          {analysis && (
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {analysis.summary.alreadyMerged > 0 && (
                <Chip size="small" label={`${analysis.summary.alreadyMerged} merged`} sx={{ fontFamily: f, fontSize: '0.6875rem', ...classChip('Already Merged') }} />
              )}
              {analysis.summary.safeToDelete > 0 && (
                <Chip size="small" label={`${analysis.summary.safeToDelete} safe delete`} sx={{ fontFamily: f, fontSize: '0.6875rem', ...classChip('Safe To Delete') }} />
              )}
              {analysis.summary.fastForwardSafe > 0 && (
                <Chip size="small" label={`${analysis.summary.fastForwardSafe} ff-safe`} sx={{ fontFamily: f, fontSize: '0.6875rem', ...classChip('Fast-Forward Safe') }} />
              )}
              {analysis.summary.needsRebase > 0 && (
                <Chip size="small" label={`${analysis.summary.needsRebase} rebase`} sx={{ fontFamily: f, fontSize: '0.6875rem', ...classChip('Needs Rebase') }} />
              )}
              {analysis.summary.parkedWork > 0 && (
                <Chip size="small" label={`${analysis.summary.parkedWork} parked`} sx={{ fontFamily: f, fontSize: '0.6875rem', ...classChip('Parked Work') }} />
              )}
              {analysis.summary.staleDiverged > 0 && (
                <Chip size="small" label={`${analysis.summary.staleDiverged} stale`} sx={{ fontFamily: f, fontSize: '0.6875rem', ...classChip('Stale / Diverged') }} />
              )}
              {analysis.summary.manualReview > 0 && (
                <Chip size="small" label={`${analysis.summary.manualReview} review`} sx={{ fontFamily: f, fontSize: '0.6875rem', ...classChip('Manual Review') }} />
              )}
            </Box>
          )}
        </Box>

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
          <TextField
            size="small"
            placeholder="Search branches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment>,
              sx: { fontFamily: f, fontSize: '0.8125rem' },
            }}
            sx={{ flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <Select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              sx={{ fontFamily: f, fontSize: '0.8125rem' }}
            >
              <MenuItem value="all">All Classifications</MenuItem>
              <MenuItem value="Already Merged">Already Merged</MenuItem>
              <MenuItem value="Safe To Delete">Safe To Delete</MenuItem>
              <MenuItem value="Fast-Forward Safe">Fast-Forward Safe</MenuItem>
              <MenuItem value="Needs Rebase">Needs Rebase</MenuItem>
              <MenuItem value="Parked Work">Parked Work</MenuItem>
              <MenuItem value="Stale / Diverged">Stale / Diverged</MenuItem>
              <MenuItem value="Manual Review">Manual Review</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Bulk action bar */}
        {selectedForDelete.size > 0 && (
          <Paper
            variant="outlined"
            sx={{
              px: 2, py: 1.25, mb: 1.5, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              bgcolor: isDark ? 'rgba(139,92,246,0.08)' : '#f5f3ff',
              borderColor: isDark ? 'rgba(139,92,246,0.25)' : '#ddd6fe',
            }}
          >
            <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', fontWeight: 600, color: isDark ? '#c4b5fd' : '#7c3aed' }}>
              {selectedForDelete.size} branch{selectedForDelete.size !== 1 ? 'es' : ''} selected
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                onClick={() => setSelectedForDelete(new Set())}
                sx={{ fontFamily: f, fontSize: '0.75rem', textTransform: 'none', color: labelColor }}
              >
                Clear
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<IconTrash size={14} />}
                onClick={() => setBulkDeleteDialogOpen(true)}
                sx={{
                  fontFamily: f, fontSize: '0.75rem', textTransform: 'none',
                  bgcolor: isDark ? 'rgba(139,92,246,0.8)' : '#7c3aed',
                  '&:hover': { bgcolor: isDark ? 'rgba(139,92,246,0.95)' : '#6d28d9' },
                }}
              >
                Delete Selected
              </Button>
            </Box>
          </Paper>
        )}

        {analysisError && (
          <Alert severity="error" sx={{ mb: 2, fontFamily: f, fontSize: '0.8125rem' }}>{analysisError}</Alert>
        )}

        {analysisLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 4, justifyContent: 'center' }}>
            <CircularProgress size={20} />
            <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', color: labelColor }}>Fetching remote branches and analyzing...</Typography>
          </Box>
        ) : (
          <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: cardBorder, overflow: 'hidden' }}>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${cardBorder}`, background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}>
                    <th style={{ padding: '10px 4px 10px 12px', width: 36 }}>
                      <Tooltip title={allSafeSelected ? 'Deselect all safe branches' : `Select all safe branches (${safeBranches.length})`} arrow>
                        <Checkbox
                          size="small"
                          checked={allSafeSelected}
                          indeterminate={someSafeSelected && !allSafeSelected}
                          onChange={toggleSelectAllSafe}
                          disabled={safeBranches.length === 0}
                          sx={{ p: 0, '& .MuiSvgIcon-root': { fontSize: 16 }, color: isDark ? '#c4b5fd' : '#7c3aed', '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: isDark ? '#c4b5fd' : '#7c3aed' } }}
                        />
                      </Tooltip>
                    </th>
                    {['Branch', 'Source', 'Ahead / Behind', 'Last Commit', 'Files', 'Classification', 'Action', ''].map(col => (
                      <th
                        key={col || 'view'}
                        style={{
                          padding: '10px 12px',
                          textAlign: 'left',
                          fontFamily: f,
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          color: labelColor,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBranches.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{ padding: '32px 16px', textAlign: 'center', fontFamily: f, fontSize: '0.8125rem', color: labelColor }}
                      >
                        {analysis ? 'No branches match filter' : 'No branch data available'}
                      </td>
                    </tr>
                  ) : (
                    filteredBranches.map(branch => {
                      const ActionIcon = ACTION_ICONS[branch.recommendedAction] || IconEye;
                      const isSelected = selectedBranch?.name === branch.name;
                      const sc = sourceChip(branch.source);
                      const isSafeDeletable = SAFE_DELETE_CLASSIFICATIONS.includes(branch.classification) && !branch.isCurrent;
                      const isChecked = selectedForDelete.has(branch.name);
                      return (
                        <tr
                          key={branch.name}
                          onClick={() => { setSelectedBranch(branch); setDrawerOpen(true); setEditingNote(false); }}
                          style={{
                            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                            background: isChecked ? (isDark ? 'rgba(139,92,246,0.06)' : '#faf5ff') : isSelected ? (isDark ? 'rgba(255,255,255,0.04)' : '#f0f7ff') : 'transparent',
                            cursor: 'pointer',
                            transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => { if (!isSelected && !isChecked) (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.02)' : '#fafafa'); }}
                          onMouseLeave={e => { if (!isSelected && !isChecked) (e.currentTarget.style.background = 'transparent'); }}
                        >
                          <td style={{ padding: '10px 4px 10px 12px', width: 36 }}>
                            {isSafeDeletable ? (
                              <Checkbox
                                size="small"
                                checked={isChecked}
                                onChange={(e) => { e.stopPropagation(); toggleBranchSelect(branch.name); }}
                                onClick={(e) => e.stopPropagation()}
                                sx={{ p: 0, '& .MuiSvgIcon-root': { fontSize: 16 }, color: isDark ? '#c4b5fd' : '#7c3aed', '&.Mui-checked': { color: isDark ? '#c4b5fd' : '#7c3aed' } }}
                              />
                            ) : (
                              <Box sx={{ width: 16 }} />
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', maxWidth: 340 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <IconGitBranch size={14} color={labelColor} style={{ flexShrink: 0 }} />
                              <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: textColor, fontWeight: branch.isCurrent ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                title={branch.name}
                              >
                                {branch.name}
                              </Typography>
                              {branch.isCurrent && (
                                <Chip size="small" label="current" sx={{ fontFamily: f, fontSize: '0.55rem', height: 16, bgcolor: isDark ? 'rgba(59,130,246,0.15)' : '#dbeafe', color: isDark ? '#93c5fd' : '#2563eb' }} />
                              )}
                            </Box>
                          </td>
                          <td style={{ padding: '10px 8px' }}>
                            <Chip
                              size="small"
                              label={SOURCE_CONFIG[branch.source]?.label || branch.source}
                              sx={{
                                fontFamily: f, fontSize: '0.55rem', height: 18,
                                bgcolor: sc.bg, color: sc.color,
                              }}
                            />
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: branch.ahead > 0 ? (isDark ? '#4ade80' : '#16a34a') : labelColor }}>
                                +{branch.ahead}
                              </Typography>
                              <Typography sx={{ fontFamily: f, fontSize: '0.7rem', color: labelColor }}>/</Typography>
                              <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: branch.behind > 0 ? (isDark ? '#f87171' : '#dc2626') : labelColor }}>
                                -{branch.behind}
                              </Typography>
                            </Box>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <Typography sx={{ fontFamily: f, fontSize: '0.7rem', color: labelColor, whiteSpace: 'nowrap' }}>
                              {branch.lastCommitDate}
                            </Typography>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 500, color: textColor }}>
                              {branch.changedFiles || '-'}
                            </Typography>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Chip
                                size="small"
                                label={branch.classification}
                                sx={{ fontFamily: f, fontSize: '0.625rem', fontWeight: 600, height: 22, ...classChip(branch.classification) }}
                              />
                              {branch.confidence && (
                                <Tooltip title={`Confidence: ${branch.confidence}`} arrow>
                                  <Box sx={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    bgcolor: branch.confidence === 'high' ? '#16a34a' : branch.confidence === 'medium' ? '#d97706' : '#dc2626',
                                    flexShrink: 0,
                                  }} />
                                </Tooltip>
                              )}
                            </Box>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <ActionIcon size={13} color={labelColor} />
                              <Typography sx={{ fontFamily: f, fontSize: '0.75rem', fontWeight: 500, color: textColor }}>
                                {branch.recommendedAction}
                              </Typography>
                            </Box>
                          </td>
                          <td style={{ padding: '10px 8px' }}>
                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                              <Button
                                size="small"
                                variant="text"
                                onClick={(e) => { e.stopPropagation(); setSelectedBranch(branch); setDrawerOpen(true); setEditingNote(false); }}
                                sx={{ fontFamily: f, fontSize: '0.7rem', textTransform: 'none', minWidth: 0, color: labelColor, px: 1 }}
                              >
                                View
                              </Button>
                              {SAFE_DELETE_CLASSIFICATIONS.includes(branch.classification) && (
                                <Tooltip title="Delete branch" arrow>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => { e.stopPropagation(); openDeleteDialog(branch); }}
                                    sx={{ color: isDark ? '#c4b5fd' : '#7c3aed', p: 0.5, '&:hover': { bgcolor: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(124,58,237,0.08)' } }}
                                  >
                                    <IconTrash size={14} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </Box>
            {analysis && (
              <Box sx={{ px: 2, py: 1.5, borderTop: `1px solid ${cardBorder}`, bgcolor: subBg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor }}>
                  Showing {filteredBranches.length} of {analysis.summary.totalRemote} remote branches
                </Typography>
                <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor }}>
                  Compared against {analysis.comparisonTarget} ({analysis.originMainSha})
                </Typography>
              </Box>
            )}
          </Paper>
        )}
      </Box>

      {/* ── Local-Only Branches Warning ───────────────────────── */}
      {analysis && analysis.localOnlyBranches.length > 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: isDark ? 'rgba(251,191,36,0.2)' : '#fde68a', overflow: 'hidden', mb: 3 }}>
          <Box
            onClick={() => setLocalOnlyOpen(!localOnlyOpen)}
            sx={{
              px: 2.5, py: 1.5,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer',
              bgcolor: isDark ? 'rgba(251,191,36,0.06)' : '#fffbeb',
              '&:hover': { bgcolor: isDark ? 'rgba(251,191,36,0.1)' : '#fef3c7' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconCloudOff size={16} color={isDark ? '#fbbf24' : '#d97706'} />
              <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', fontWeight: 600, color: isDark ? '#fbbf24' : '#92400e' }}>
                Local-Only Branches ({analysis.localOnlyBranches.length})
              </Typography>
              <Typography sx={{ fontFamily: f, fontSize: '0.75rem', color: isDark ? '#fcd34d' : '#b45309' }}>
                — no remote counterpart, not in repo cleanup scope
              </Typography>
            </Box>
            {localOnlyOpen ? <IconChevronUp size={16} color={labelColor} /> : <IconChevronDown size={16} color={labelColor} />}
          </Box>
          <Collapse in={localOnlyOpen}>
            <Divider sx={{ borderColor: isDark ? 'rgba(251,191,36,0.15)' : '#fde68a' }} />
            <Box sx={{ p: 2 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${cardBorder}` }}>
                    {['Branch', 'Ahead / Behind', 'Last Commit', 'Status', 'Action'].map(col => (
                      <th key={col} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: f, fontSize: '0.625rem', fontWeight: 600, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysis.localOnlyBranches.map(branch => (
                    <tr key={branch.name} style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                      <td style={{ padding: '8px 12px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <IconDeviceDesktop size={14} color={isDark ? '#fbbf24' : '#d97706'} />
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: textColor, fontWeight: branch.isCurrent ? 600 : 400 }}>
                            {branch.name}
                          </Typography>
                          {branch.isCurrent && (
                            <Chip size="small" label="current" sx={{ fontFamily: f, fontSize: '0.55rem', height: 16, bgcolor: isDark ? 'rgba(59,130,246,0.15)' : '#dbeafe', color: isDark ? '#93c5fd' : '#2563eb' }} />
                          )}
                        </Box>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: branch.ahead > 0 ? (isDark ? '#4ade80' : '#16a34a') : labelColor }}>+{branch.ahead}</Typography>
                          <Typography sx={{ fontFamily: f, fontSize: '0.7rem', color: labelColor }}>/</Typography>
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: branch.behind > 0 ? (isDark ? '#f87171' : '#dc2626') : labelColor }}>-{branch.behind}</Typography>
                        </Box>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <Typography sx={{ fontFamily: f, fontSize: '0.7rem', color: labelColor }}>{branch.lastCommitDate}</Typography>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {branch.isMerged ? (
                          <Chip size="small" label="merged" sx={{ fontFamily: f, fontSize: '0.55rem', height: 16, ...classChip('Already Merged') }} />
                        ) : branch.hasUnpushedCommits ? (
                          <Chip size="small" label="unpushed" sx={{ fontFamily: f, fontSize: '0.55rem', height: 16, bgcolor: isDark ? 'rgba(251,191,36,0.12)' : '#fef3c7', color: isDark ? '#fbbf24' : '#d97706' }} />
                        ) : (
                          <Chip size="small" label="stale" sx={{ fontFamily: f, fontSize: '0.55rem', height: 16, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', color: labelColor }} />
                        )}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {React.createElement(ACTION_ICONS[branch.recommendedAction] || IconEye, { size: 13, color: labelColor })}
                          <Typography sx={{ fontFamily: f, fontSize: '0.75rem', fontWeight: 500, color: textColor }}>
                            {branch.recommendedAction}
                          </Typography>
                        </Box>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Collapse>
        </Paper>
      )}

      {/* ── Raw Diagnostics (Collapsed) ──────────────────────── */}
      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: cardBorder, overflow: 'hidden', mb: 3 }}>
        <Box
          onClick={() => setDiagnosticsOpen(!diagnosticsOpen)}
          sx={{
            px: 2.5, py: 1.5,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer',
            bgcolor: subBg,
            '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconTerminal2 size={16} color={labelColor} />
            <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', fontWeight: 600, color: textColor }}>
              Raw Diagnostics
            </Typography>
          </Box>
          {diagnosticsOpen ? <IconChevronUp size={16} color={labelColor} /> : <IconChevronDown size={16} color={labelColor} />}
        </Box>
        <Collapse in={diagnosticsOpen}>
          <Divider />
          <Box sx={{ p: 2.5 }}>
            <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', fontWeight: 600, color: textColor, mb: 1 }}>
              Git Status Output
            </Typography>
            <Paper
              variant="outlined"
              sx={{ p: 2, bgcolor: isDark ? 'rgba(0,0,0,0.3)' : '#f9fafb', fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto', color: textColor, mb: 2 }}
            >
              {gitLoading ? 'Loading...' : gitStatus || 'No data'}
            </Paper>

            <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', fontWeight: 600, color: textColor, mb: 1 }}>
              Build Data
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: isDark ? 'rgba(0,0,0,0.3)' : '#f9fafb', fontFamily: 'monospace', fontSize: '0.7rem', overflow: 'auto', maxHeight: 200, color: textColor }}>
                <pre style={{ margin: 0 }}>{JSON.stringify(buildInfo, null, 2)}</pre>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: isDark ? 'rgba(0,0,0,0.3)' : '#f9fafb', fontFamily: 'monospace', fontSize: '0.7rem', overflow: 'auto', maxHeight: 200, color: textColor }}>
                <pre style={{ margin: 0 }}>{JSON.stringify(serverVersion, null, 2)}</pre>
              </Paper>
            </Box>
          </Box>
        </Collapse>
      </Paper>

      {/* ── Branch Details Drawer ────────────────────────────── */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, bgcolor: isDark ? '#1a1a2e' : '#fff' } }}
      >
        {selectedBranch && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconGitBranch size={20} color={textColor} />
                <Typography sx={{ fontFamily: f, fontSize: '1rem', fontWeight: 600, color: textColor }}>Branch Details</Typography>
              </Box>
              <IconButton size="small" onClick={() => setDrawerOpen(false)}>
                <IconX size={18} />
              </IconButton>
            </Box>

            {/* Branch name */}
            <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor, mb: 0.5 }}>Branch Name</Typography>
            <Paper variant="outlined" sx={{ p: 1.5, mb: 2, fontFamily: 'monospace', fontSize: '0.8125rem', color: textColor, bgcolor: subBg, borderColor: cardBorder, wordBreak: 'break-all' }}>
              {selectedBranch.name}
            </Paper>

            {/* Classification + Source + Confidence */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor, mb: 0.5 }}>Classification</Typography>
                <Chip
                  label={selectedBranch.classification}
                  sx={{ fontFamily: f, fontSize: '0.8125rem', fontWeight: 600, ...classChip(selectedBranch.classification) }}
                />
              </Box>
              <Box>
                <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor, mb: 0.5 }}>Source</Typography>
                <Chip
                  size="small"
                  label={SOURCE_CONFIG[selectedBranch.source]?.label || selectedBranch.source}
                  sx={{ fontFamily: f, fontSize: '0.75rem', fontWeight: 500, height: 28, bgcolor: sourceChip(selectedBranch.source).bg, color: sourceChip(selectedBranch.source).color }}
                />
              </Box>
              {selectedBranch.confidence && (
                <Box>
                  <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor, mb: 0.5 }}>Confidence</Typography>
                  <Chip
                    size="small"
                    label={selectedBranch.confidence}
                    sx={{
                      fontFamily: f, fontSize: '0.75rem', fontWeight: 600, height: 28, textTransform: 'capitalize',
                      bgcolor: selectedBranch.confidence === 'high' ? (isDark ? 'rgba(22,163,74,0.15)' : '#dcfce7')
                        : selectedBranch.confidence === 'medium' ? (isDark ? 'rgba(217,119,6,0.15)' : '#fef3c7')
                        : (isDark ? 'rgba(220,38,38,0.15)' : '#fee2e2'),
                      color: selectedBranch.confidence === 'high' ? (isDark ? '#4ade80' : '#16a34a')
                        : selectedBranch.confidence === 'medium' ? (isDark ? '#fbbf24' : '#d97706')
                        : (isDark ? '#f87171' : '#dc2626'),
                    }}
                  />
                </Box>
              )}
            </Box>

            {/* Comparison target */}
            <Paper sx={{ p: 1.5, mb: 2, borderRadius: 1.5, bgcolor: isDark ? 'rgba(96,165,250,0.06)' : '#eff6ff', border: `1px solid ${isDark ? 'rgba(96,165,250,0.15)' : '#dbeafe'}` }}>
              <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: isDark ? '#93c5fd' : '#2563eb' }}>
                Compared against <strong>{analysis?.comparisonTarget}</strong> ({analysis?.originMainSha})
              </Typography>
            </Paper>

            <Divider sx={{ my: 2 }} />

            {/* Commit Info */}
            <Typography sx={{ fontFamily: f, fontSize: '0.875rem', fontWeight: 600, color: textColor, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <IconCalendar size={16} /> Commit Information
            </Typography>
            <Box sx={{ display: 'grid', gap: 1.5, mb: 2 }}>
              <Box>
                <Typography sx={{ fontFamily: f, fontSize: '0.625rem', color: labelColor, textTransform: 'uppercase' }}>Last Commit</Typography>
                <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', color: textColor }}>{selectedBranch.lastCommitDate}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontFamily: f, fontSize: '0.625rem', color: labelColor, textTransform: 'uppercase' }}>Message</Typography>
                <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', color: textColor }}>{selectedBranch.lastCommit}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontFamily: f, fontSize: '0.625rem', color: labelColor, textTransform: 'uppercase' }}>SHA / Merge Base</Typography>
                <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: textColor }}>{selectedBranch.lastCommitSha} / {selectedBranch.mergeBase}</Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Relationship */}
            <Typography sx={{ fontFamily: f, fontSize: '0.875rem', fontWeight: 600, color: textColor, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <IconGitMerge size={16} /> Branch Relationship vs origin/main
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
              <Paper sx={{ p: 2, borderRadius: 1.5, bgcolor: subBg, textAlign: 'center' }}>
                <Typography sx={{ fontFamily: f, fontSize: '0.625rem', color: labelColor, textTransform: 'uppercase', mb: 0.5 }}>Ahead</Typography>
                <Typography sx={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 700, color: selectedBranch.ahead > 0 ? (isDark ? '#4ade80' : '#16a34a') : labelColor }}>
                  {selectedBranch.ahead}
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, borderRadius: 1.5, bgcolor: subBg, textAlign: 'center' }}>
                <Typography sx={{ fontFamily: f, fontSize: '0.625rem', color: labelColor, textTransform: 'uppercase', mb: 0.5 }}>Behind</Typography>
                <Typography sx={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 700, color: selectedBranch.behind > 0 ? (isDark ? '#f87171' : '#dc2626') : labelColor }}>
                  {selectedBranch.behind}
                </Typography>
              </Paper>
            </Box>

            {selectedBranch.changedFiles > 0 && (
              <Paper sx={{ p: 2, borderRadius: 1.5, bgcolor: subBg, mb: 2 }}>
                <Typography sx={{ fontFamily: f, fontSize: '0.625rem', color: labelColor, textTransform: 'uppercase', mb: 0.5 }}>Changed Files</Typography>
                <Typography sx={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 700, color: textColor }}>{selectedBranch.changedFiles}</Typography>
              </Paper>
            )}

            {/* Local tracking info */}
            {selectedBranch.hasLocal && (
              <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb', mb: 2, border: `1px solid ${cardBorder}` }}>
                <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor }}>
                  <IconDeviceDesktop size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Local branch exists{selectedBranch.isCurrent ? ' (currently checked out)' : ''}
                </Typography>
              </Paper>
            )}

            {/* Operator Note */}
            <Divider sx={{ my: 2 }} />
            <Typography sx={{ fontFamily: f, fontSize: '0.875rem', fontWeight: 600, color: textColor, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <IconArchive size={16} /> Operator Note
            </Typography>
            {editingNote ? (
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  maxRows={4}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="e.g. Parked OCR feature work — do not delete"
                  inputProps={{ maxLength: 500 }}
                  sx={{ mb: 1, '& .MuiInputBase-input': { fontFamily: f, fontSize: '0.8125rem' } }}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={savingNote}
                    onClick={() => handleSaveNote(selectedBranch)}
                    sx={{ fontFamily: f, textTransform: 'none', fontSize: '0.75rem' }}
                  >
                    {savingNote ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setEditingNote(false)}
                    disabled={savingNote}
                    sx={{ fontFamily: f, textTransform: 'none', fontSize: '0.75rem' }}
                  >
                    Cancel
                  </Button>
                  {selectedBranch.note && (
                    <Button
                      size="small"
                      color="error"
                      disabled={savingNote}
                      onClick={() => { setNoteText(''); handleSaveNote(selectedBranch); }}
                      sx={{ fontFamily: f, textTransform: 'none', fontSize: '0.75rem', ml: 'auto' }}
                    >
                      Remove
                    </Button>
                  )}
                </Box>
              </Box>
            ) : (
              <Box sx={{ mb: 2 }}>
                {selectedBranch.note ? (
                  <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: isDark ? 'rgba(14,165,233,0.06)' : '#f0f9ff', border: `1px solid ${isDark ? 'rgba(14,165,233,0.15)' : '#bae6fd'}`, mb: 1 }}>
                    <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', color: textColor, whiteSpace: 'pre-wrap' }}>
                      {selectedBranch.note}
                    </Typography>
                    {selectedBranch.noteUpdated && (
                      <Typography sx={{ fontFamily: f, fontSize: '0.625rem', color: labelColor, mt: 0.5 }}>
                        Updated {new Date(selectedBranch.noteUpdated).toLocaleDateString()}
                      </Typography>
                    )}
                  </Paper>
                ) : (
                  <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', color: labelColor, fontStyle: 'italic', mb: 1 }}>
                    No operator note
                  </Typography>
                )}
                <Button
                  size="small"
                  variant="text"
                  onClick={() => { setNoteText(selectedBranch.note || ''); setEditingNote(true); }}
                  sx={{ fontFamily: f, textTransform: 'none', fontSize: '0.7rem', color: labelColor, p: 0 }}
                >
                  {selectedBranch.note ? 'Edit note' : 'Add note'}
                </Button>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Recommended Action */}
            <Typography sx={{ fontFamily: f, fontSize: '0.875rem', fontWeight: 600, color: textColor, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <IconAlertTriangle size={16} /> Recommended Action
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, borderColor: cardBorder, mb: 2 }}>
              <Typography sx={{ fontFamily: f, fontSize: '0.875rem', fontWeight: 600, color: textColor, mb: 0.5 }}>
                {selectedBranch.recommendedAction}
              </Typography>
              <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', color: labelColor }}>
                {classExplanation(selectedBranch)}
              </Typography>
            </Paper>

            {/* Info for parked work branches */}
            {selectedBranch.classification === 'Parked Work' && (
              <Alert
                severity="info"
                icon={<IconParking size={18} />}
                sx={{ mb: 2, fontFamily: f, fontSize: '0.8125rem' }}
              >
                This is a large feature branch with {selectedBranch.ahead} unique commits and minimal divergence from main ({selectedBranch.behind} behind).
                It can be rebased cleanly when ready to resume work.
              </Alert>
            )}

            {/* Warning for stale/diverged branches */}
            {selectedBranch.classification === 'Stale / Diverged' && (
              <Alert
                severity="error"
                icon={<IconAlertTriangle size={18} />}
                sx={{ mb: 2, fontFamily: f, fontSize: '0.8125rem' }}
              >
                This branch is stale or significantly diverged from main.
                {selectedBranch.commitAgeDays > 14 && ` Last commit was ${selectedBranch.commitAgeDays} days ago.`}
                {selectedBranch.behind >= 20 && ` It is ${selectedBranch.behind} commits behind main.`}
                {' '}Rebasing is unlikely to succeed cleanly — consider deleting and re-branching if the work is still needed.
              </Alert>
            )}

            {/* Warning for manual review branches */}
            {selectedBranch.classification === 'Manual Review' && (
              <Alert
                severity="warning"
                icon={<IconAlertTriangle size={18} />}
                sx={{ mb: 2, fontFamily: f, fontSize: '0.8125rem' }}
              >
                This branch is in an unusual state. Review carefully before proceeding.
              </Alert>
            )}

            {/* Action buttons */}
            <Box sx={{ display: 'grid', gap: 1, mt: 3 }}>
              {SAFE_DELETE_CLASSIFICATIONS.includes(selectedBranch.classification) ? (
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<IconTrash size={16} />}
                  onClick={() => openDeleteDialog(selectedBranch)}
                  disabled={deleting}
                  sx={{
                    fontFamily: f, textTransform: 'none', fontSize: '0.875rem',
                    bgcolor: isDark ? 'rgba(139,92,246,0.8)' : '#7c3aed',
                    '&:hover': { bgcolor: isDark ? 'rgba(139,92,246,0.95)' : '#6d28d9' },
                  }}
                >
                  Delete Branch
                </Button>
              ) : selectedBranch.recommendedAction === 'Merge' && selectedBranch.behind === 0 && selectedBranch.ahead > 0 ? (
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<IconGitMerge size={16} />}
                  onClick={() => openMergeDialog(selectedBranch)}
                  disabled={merging}
                  sx={{
                    fontFamily: f, textTransform: 'none', fontSize: '0.875rem',
                    bgcolor: isDark ? 'rgba(34,197,94,0.8)' : '#16a34a',
                    '&:hover': { bgcolor: isDark ? 'rgba(34,197,94,0.95)' : '#15803d' },
                  }}
                >
                  Merge Branch
                </Button>
              ) : (
                <>
                  <Button
                    variant="contained"
                    fullWidth
                    disabled
                    sx={{ fontFamily: f, textTransform: 'none', fontSize: '0.875rem' }}
                  >
                    {selectedBranch.recommendedAction === 'Merge' && 'Merge Branch'}
                    {selectedBranch.recommendedAction === 'Review' && 'Review Changes'}
                    {selectedBranch.recommendedAction === 'Rebase' && 'Rebase Branch'}
                    {selectedBranch.recommendedAction === 'Archive' && 'Archive Branch'}
                    {selectedBranch.recommendedAction === 'Push' && 'Push to Remote'}
                    {selectedBranch.recommendedAction === 'Delete' && 'Delete Branch'}
                  </Button>
                  <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor, textAlign: 'center' }}>
                    This action is not yet available — use git CLI for now
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        )}
      </Drawer>

      {/* ── Delete Confirmation Dialog ─────────────────────── */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 2, maxWidth: 480, fontFamily: f } }}
      >
        <DialogTitle sx={{ fontFamily: f, fontWeight: 600, fontSize: '1.05rem', pb: 0.5 }}>
          Delete Branch
        </DialogTitle>
        <DialogContent>
          {deleteTarget && (
            <Box sx={{ mt: 1 }}>
              <Paper variant="outlined" sx={{ p: 1.5, mb: 2, fontFamily: 'monospace', fontSize: '0.8125rem', wordBreak: 'break-all', bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}>
                {deleteTarget.name}
              </Paper>

              <Chip
                size="small"
                label={deleteTarget.classification}
                sx={{ mb: 2, fontFamily: f, fontSize: '0.75rem', fontWeight: 600, ...classChip(deleteTarget.classification) }}
              />

              <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', color: labelColor, mb: 1.5 }}>
                {deleteTarget.classification === 'Already Merged'
                  ? 'All commits on this branch have been merged into main. No unique work will be lost.'
                  : deleteTarget.classification === 'Stale / Diverged'
                  ? `This branch has ${deleteTarget.ahead} commit(s) ahead but is ${deleteTarget.behind} commit(s) behind main. It is stale or significantly diverged and unlikely to merge cleanly.`
                  : 'This branch has no unique commits ahead of main. No work will be lost.'}
              </Typography>

              {deleteTarget.hasLocal && (
                <Alert severity="info" sx={{ mb: 1.5, fontFamily: f, fontSize: '0.8125rem' }}>
                  The local tracking branch will also be removed (safe delete).
                </Alert>
              )}

              <Typography sx={{ fontFamily: f, fontSize: '0.75rem', color: labelColor }}>
                This will run <code>git push origin --delete {deleteTarget.name}</code>
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
            sx={{ fontFamily: f, textTransform: 'none', fontSize: '0.8125rem' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDeleteBranch}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : <IconTrash size={14} />}
            sx={{
              fontFamily: f, textTransform: 'none', fontSize: '0.8125rem',
              bgcolor: isDark ? 'rgba(139,92,246,0.8)' : '#7c3aed',
              '&:hover': { bgcolor: isDark ? 'rgba(139,92,246,0.95)' : '#6d28d9' },
            }}
          >
            {deleting ? 'Deleting...' : 'Confirm Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Merge Confirmation Dialog ─────────────────────── */}
      <Dialog
        open={mergeDialogOpen}
        onClose={() => !merging && setMergeDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 2, maxWidth: 480, fontFamily: f } }}
      >
        <DialogTitle sx={{ fontFamily: f, fontWeight: 600, fontSize: '1.05rem', pb: 0.5 }}>
          Merge Branch
        </DialogTitle>
        <DialogContent>
          {mergeTarget && (
            <Box sx={{ mt: 1 }}>
              <Paper variant="outlined" sx={{ p: 1.5, mb: 2, fontFamily: 'monospace', fontSize: '0.8125rem', wordBreak: 'break-all', bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}>
                {mergeTarget.name}
              </Paper>

              <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', color: labelColor, mb: 1.5 }}>
                This branch has <strong>{mergeTarget.ahead}</strong> unique commit{mergeTarget.ahead !== 1 ? 's' : ''} and is not behind main.
                It will be fast-forward merged into <strong>main</strong>, pushed to origin, and the branch will be deleted.
              </Typography>

              <Typography sx={{ fontFamily: f, fontSize: '0.75rem', color: labelColor }}>
                This will run <code>git merge --ff-only {mergeTarget.name}</code> into main
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={() => setMergeDialogOpen(false)}
            disabled={merging}
            sx={{ fontFamily: f, textTransform: 'none', fontSize: '0.8125rem' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleMergeBranch}
            disabled={merging}
            startIcon={merging ? <CircularProgress size={14} color="inherit" /> : <IconGitMerge size={14} />}
            sx={{
              fontFamily: f, textTransform: 'none', fontSize: '0.8125rem',
              bgcolor: isDark ? 'rgba(34,197,94,0.8)' : '#16a34a',
              '&:hover': { bgcolor: isDark ? 'rgba(34,197,94,0.95)' : '#15803d' },
            }}
          >
            {merging ? 'Merging...' : 'Confirm Merge'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Bulk Delete Confirmation Dialog ──────────────── */}
      <Dialog
        open={bulkDeleteDialogOpen}
        onClose={() => !bulkDeleting && setBulkDeleteDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 2, maxWidth: 520, fontFamily: f } }}
      >
        <DialogTitle sx={{ fontFamily: f, fontWeight: 600, fontSize: '1.05rem', pb: 0.5 }}>
          Delete {selectedForDelete.size} Branch{selectedForDelete.size !== 1 ? 'es' : ''}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', color: labelColor, mb: 2 }}>
              The following branches are classified as <strong>Already Merged</strong>, <strong>Safe To Delete</strong>, or <strong>Stale / Diverged</strong>.
              Each branch will be independently verified server-side before deletion.
            </Typography>

            <Paper
              variant="outlined"
              sx={{
                maxHeight: 200, overflow: 'auto', mb: 2,
                bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb',
              }}
            >
              {Array.from(selectedForDelete).map(name => {
                const branch = analysis?.remoteBranches.find(b => b.name === name);
                return (
                  <Box
                    key={name}
                    sx={{
                      px: 1.5, py: 0.75,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: textColor }}>
                      {name}
                    </Typography>
                    {branch && (
                      <Chip
                        size="small"
                        label={branch.classification}
                        sx={{ fontFamily: f, fontSize: '0.55rem', height: 18, ...classChip(branch.classification) }}
                      />
                    )}
                  </Box>
                );
              })}
            </Paper>

            <Alert severity="info" sx={{ fontFamily: f, fontSize: '0.8125rem' }}>
              Remote branches will be deleted. Local tracking branches will also be removed (safe delete) where they exist.
            </Alert>

            {bulkDeleting && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress sx={{ borderRadius: 1 }} />
                <Typography sx={{ fontFamily: f, fontSize: '0.75rem', color: labelColor, mt: 0.5, textAlign: 'center' }}>
                  Deleting branches...
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={() => setBulkDeleteDialogOpen(false)}
            disabled={bulkDeleting}
            sx={{ fontFamily: f, textTransform: 'none', fontSize: '0.8125rem' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            startIcon={bulkDeleting ? <CircularProgress size={14} color="inherit" /> : <IconTrash size={14} />}
            sx={{
              fontFamily: f, textTransform: 'none', fontSize: '0.8125rem',
              bgcolor: isDark ? 'rgba(139,92,246,0.8)' : '#7c3aed',
              '&:hover': { bgcolor: isDark ? 'rgba(139,92,246,0.95)' : '#6d28d9' },
            }}
          >
            {bulkDeleting ? 'Deleting...' : `Delete ${selectedForDelete.size} Branch${selectedForDelete.size !== 1 ? 'es' : ''}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar feedback ─────────────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ fontFamily: f, fontSize: '0.8125rem' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RepoOpsPage;
