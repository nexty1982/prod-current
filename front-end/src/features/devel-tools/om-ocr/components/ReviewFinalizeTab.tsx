/**
 * ReviewFinalizeTab - Final review and commit workflow for OCR records
 * Shows drafts in review, validation, finalization, and commit to database
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Divider,
  Tabs,
  Tab,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
  useTheme,
  Badge,
} from '@mui/material';
import {
  IconCheck,
  IconAlertCircle,
  IconEdit,
  IconEye,
  IconShieldCheck,
  IconRefresh,
  IconSearch,
  IconFilter,
  IconHistory,
  IconDatabase,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { apiClient } from '@/shared/lib/axiosInstance';

// ============================================================================
// Types
// ============================================================================

interface DraftEntry {
  id: number;
  ocr_job_id: number;
  entry_index: number;
  record_type: 'baptism' | 'marriage' | 'funeral';
  record_number?: string;
  payload_json: Record<string, any>;
  workflow_status?: 'draft' | 'in_review' | 'finalized' | 'committed';
  status?: 'draft' | 'in_review' | 'finalized' | 'committed'; // fallback field
  last_saved_at?: string;
  finalized_at?: string;
  finalized_by?: string;
  committed_record_id?: number;
  updated_at?: string;
  created_at?: string;
}

interface HistoryEntry {
  id: number;
  ocr_job_id: number;
  entry_index: number;
  record_type: 'baptism' | 'marriage' | 'funeral';
  record_number?: string;
  created_record_id?: number;
  finalized_by: string;
  finalized_at: string;
  committed_at?: string;
  source_filename?: string;
  original_filename?: string;
}

interface ValidationResult {
  entry_index: number;
  missing_fields: string[];
  warnings: string[];
}

interface ReviewFinalizeTabProps {
  jobId: number;
  churchId: number;
  onEditEntry?: (entryIndex: number) => void;
  activeTab?: number; // Optional: tab index to detect when Review tab becomes active
}

// ============================================================================
// Component
// ============================================================================

export const ReviewFinalizeTab: React.FC<ReviewFinalizeTabProps> = ({
  jobId,
  churchId,
  onEditEntry,
  activeTab,
}) => {
  const theme = useTheme();

  // State
  const [activeSubTab, setActiveSubTab] = useState(0); // 0: Review, 1: History
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<DraftEntry | null>(null);
  const [validationResults, setValidationResults] = useState<Map<number, ValidationResult>>(new Map());
  const [isValidating, setIsValidating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'baptism' | 'marriage' | 'funeral'>('all');
  const [historyDays, setHistoryDays] = useState(30);

  // Load drafts
  const loadDrafts = useCallback(async () => {
    if (!churchId || !jobId) {
      setDrafts([]);
      return;
    }
    
    const url = `/api/church/${churchId}/ocr/jobs/${jobId}/fusion/drafts`;
    
    // Debug logging (dev only)
    if (process.env.NODE_ENV === 'development') {
      console.debug('[ReviewFinalizeTab] Loading drafts:', { churchId, jobId, url });
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(url);
      
      // Debug: log the raw response
      if (process.env.NODE_ENV === 'development') {
        console.debug('[ReviewFinalizeTab] Raw API response:', response);
        console.debug('[ReviewFinalizeTab] Response data:', (response as any).data);
      }
      
      // Robust response handling: support array, nested envelopes, and various response shapes
      const responseData = (response as any).data;
      const rawDrafts =
        Array.isArray(responseData) ? responseData :
        (responseData?.drafts ??
         responseData?.data?.drafts ??
         responseData?.data?.data?.drafts ??
         []);
      
      if (process.env.NODE_ENV === 'development') {
        console.debug('[ReviewFinalizeTab] Raw drafts array:', rawDrafts);
        console.debug('[ReviewFinalizeTab] Raw drafts count:', rawDrafts.length);
      }
      
      const parsedDrafts = rawDrafts.map((d: any) => ({
        ...d,
        payload_json: typeof d.payload_json === 'string' ? JSON.parse(d.payload_json) : d.payload_json,
      }));
      
      setDrafts(parsedDrafts);
      
      if (process.env.NODE_ENV === 'development') {
        console.debug('[ReviewFinalizeTab] Parsed drafts:', parsedDrafts);
        console.debug('[ReviewFinalizeTab] Loaded drafts count:', parsedDrafts.length);
      }
    } catch (err: any) {
      console.error('[Review] Load drafts error:', err);
      setError(err.message || 'Failed to load drafts');
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, [churchId, jobId]);

  // Load history
  const loadHistory = useCallback(async () => {
    if (!churchId) return;
    try {
      const response = await apiClient.get(
        `/api/church/${churchId}/ocr/finalize-history?record_type=${historyFilter}&days=${historyDays}`
      );
      const responseData = (response as any).data;
      const historyData =
        responseData?.history ??
        responseData?.data?.history ??
        responseData?.data?.data?.history ??
        (Array.isArray(responseData) ? responseData : []);
      setHistory(historyData);
    } catch (err: any) {
      console.error('[Review] Load history error:', err);
    }
  }, [churchId, historyFilter, historyDays]);

  // Fetch drafts whenever jobId or churchId changes
  useEffect(() => {
    if (!churchId || !jobId) {
      setDrafts([]);
      return;
    }
    loadDrafts();
  }, [churchId, jobId, loadDrafts]);

  // Also fetch when Review tab becomes active (if activeTab prop is provided)
  useEffect(() => {
    if (activeTab === 4 && churchId && jobId) {
      loadDrafts();
    }
  }, [activeTab, churchId, jobId, loadDrafts]);

  useEffect(() => {
    if (activeSubTab === 1) {
      loadHistory();
    }
  }, [activeSubTab, loadHistory]);

  // Validate drafts
  const handleValidate = useCallback(async () => {
    setIsValidating(true);
    setError(null);
    try {
      const response = await apiClient.post(`/api/church/${churchId}/ocr/jobs/${jobId}/fusion/validate`);
      const results = (response as any).data?.drafts || [];
      const map = new Map<number, ValidationResult>();
      results.forEach((r: any) => {
        map.set(r.entry_index, {
          entry_index: r.entry_index,
          missing_fields: r.missing_fields || [],
          warnings: r.warnings || [],
        });
      });
      setValidationResults(map);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsValidating(false);
    }
  }, [churchId, jobId]);

  // Finalize drafts
  const handleFinalize = useCallback(async (entryIndexes?: number[]) => {
    setIsFinalizing(true);
    setError(null);
    try {
      await apiClient.post(`/api/church/${churchId}/ocr/jobs/${jobId}/review/finalize`, {
        entry_indexes: entryIndexes,
      });
      await loadDrafts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsFinalizing(false);
    }
  }, [churchId, jobId, loadDrafts]);

  // Commit to database
  const handleCommit = useCallback(async (entryIndexes?: number[]) => {
    setIsCommitting(true);
    setShowCommitDialog(false);
    setError(null);
    try {
      const response = await apiClient.post(`/api/church/${churchId}/ocr/jobs/${jobId}/review/commit`, {
        entry_indexes: entryIndexes,
      });
      const result = (response as any).data;
      if (result.errors?.length > 0) {
        setError(`Committed ${result.committed?.length || 0}. Errors: ${result.errors.map((e: any) => e.error).join(', ')}`);
      }
      await loadDrafts();
      await loadHistory();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCommitting(false);
    }
  }, [churchId, jobId, loadDrafts, loadHistory]);

  // Helper to get workflow status (handles both workflow_status and status fields)
  const getWorkflowStatus = (d: DraftEntry) => d.workflow_status || d.status || 'draft';

  // Counts
  const counts = useMemo(() => {
    const inReview = drafts.filter(d => getWorkflowStatus(d) === 'in_review').length;
    const finalized = drafts.filter(d => getWorkflowStatus(d) === 'finalized').length;
    const committed = drafts.filter(d => getWorkflowStatus(d) === 'committed').length;
    const draft = drafts.filter(d => getWorkflowStatus(d) === 'draft').length;
    return { draft, inReview, finalized, committed, total: drafts.length };
  }, [drafts]);

  const canFinalize = useMemo(() => {
    return drafts.some(d => ['in_review', 'draft'].includes(getWorkflowStatus(d)));
  }, [drafts]);

  const canCommit = useMemo(() => {
    return drafts.some(d => getWorkflowStatus(d) === 'finalized');
  }, [drafts]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'in_review': return 'info';
      case 'finalized': return 'warning';
      case 'committed': return 'success';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'in_review': return 'In Review';
      case 'finalized': return 'Finalized';
      case 'committed': return 'Committed';
      default: return status;
    }
  };

  return (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={600}>
          Review & Finalize
        </Typography>
        <Stack direction="row" spacing={1}>
          <Badge badgeContent={counts.draft} color="default"><Chip size="small" label="Draft" /></Badge>
          <Badge badgeContent={counts.inReview} color="info"><Chip size="small" label="In Review" color="info" /></Badge>
          <Badge badgeContent={counts.finalized} color="warning"><Chip size="small" label="Finalized" color="warning" /></Badge>
          <Badge badgeContent={counts.committed} color="success"><Chip size="small" label="Committed" color="success" /></Badge>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onChange={(_, v) => setActiveSubTab(v)} sx={{ mb: 2 }}>
        <Tab label="Review" icon={<IconShieldCheck size={16} />} iconPosition="start" />
        <Tab label="History" icon={<IconHistory size={16} />} iconPosition="start" />
      </Tabs>

      {/* Review Tab */}
      {activeSubTab === 0 && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Action Buttons */}
          <Stack direction="row" spacing={1} mb={2}>
            <Button
              variant="outlined"
              startIcon={isValidating ? <CircularProgress size={16} /> : <IconShieldCheck size={18} />}
              onClick={handleValidate}
              disabled={isValidating || drafts.length === 0}
            >
              Validate All
            </Button>
            <Button
              variant="outlined"
              color="warning"
              startIcon={isFinalizing ? <CircularProgress size={16} /> : <IconCheck size={18} />}
              onClick={() => handleFinalize()}
              disabled={isFinalizing || !canFinalize}
            >
              Finalize All
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={isCommitting ? <CircularProgress size={16} color="inherit" /> : <IconDatabase size={18} />}
              onClick={() => setShowCommitDialog(true)}
              disabled={isCommitting || !canCommit}
            >
              Commit to Database
            </Button>
            <Box sx={{ flex: 1 }} />
            <IconButton onClick={loadDrafts} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : <IconRefresh size={20} />}
            </IconButton>
          </Stack>

          {/* Drafts Table */}
          <TableContainer component={Paper} variant="outlined" sx={{ flex: 1, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell width={60}>Entry</TableCell>
                  <TableCell width={80}>Record #</TableCell>
                  <TableCell width={100}>Type</TableCell>
                  <TableCell width={110}>Status</TableCell>
                  <TableCell width={140}>Last Saved</TableCell>
                  <TableCell>Validation</TableCell>
                  <TableCell width={120} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!jobId ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        Select a processed image to review.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : drafts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {loading ? 'Loading drafts...' : 'No drafts found for this image/job.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  drafts.map(draft => {
                    const validation = validationResults.get(draft.entry_index);
                    const hasErrors = validation && validation.missing_fields.length > 0;
                    const hasWarnings = validation && validation.warnings.length > 0;

                    return (
                      <TableRow 
                        key={draft.id} 
                        hover
                        selected={selectedEntry?.id === draft.id}
                        onClick={() => setSelectedEntry(draft)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{draft.entry_index + 1}</TableCell>
                        <TableCell>{draft.record_number || '—'}</TableCell>
                        <TableCell>
                          <Chip size="small" label={draft.record_type} variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            size="small" 
                            label={getStatusLabel(getWorkflowStatus(draft))} 
                            color={getStatusColor(getWorkflowStatus(draft)) as any}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {(draft.last_saved_at || draft.updated_at)
                              ? new Date(draft.last_saved_at || draft.updated_at!).toLocaleString() 
                              : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {validation ? (
                            <Stack direction="row" spacing={0.5}>
                              {hasErrors && (
                                <Tooltip title={validation.missing_fields.join(', ')}>
                                  <Chip 
                                    size="small" 
                                    icon={<IconAlertCircle size={14} />} 
                                    label={`${validation.missing_fields.length} missing`} 
                                    color="error" 
                                    variant="outlined"
                                  />
                                </Tooltip>
                              )}
                              {hasWarnings && (
                                <Tooltip title={validation.warnings.join(', ')}>
                                  <Chip 
                                    size="small" 
                                    icon={<IconAlertTriangle size={14} />} 
                                    label={`${validation.warnings.length} warnings`} 
                                    color="warning" 
                                    variant="outlined"
                                  />
                                </Tooltip>
                              )}
                              {!hasErrors && !hasWarnings && (
                                <Chip 
                                  size="small" 
                                  icon={<IconCheck size={14} />} 
                                  label="Valid" 
                                  color="success" 
                                  variant="outlined"
                                />
                              )}
                            </Stack>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              Not validated
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Tooltip title="View">
                              <IconButton size="small" onClick={() => setSelectedEntry(draft)}>
                                <IconEye size={18} />
                              </IconButton>
                            </Tooltip>
                            {onEditEntry && getWorkflowStatus(draft) !== 'committed' && (
                              <Tooltip title="Edit in Fusion">
                                <IconButton 
                                  size="small" 
                                  onClick={(e) => { e.stopPropagation(); onEditEntry(draft.entry_index); }}
                                >
                                  <IconEdit size={18} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Selected Entry Detail */}
          {selectedEntry && (
            <Paper variant="outlined" sx={{ mt: 2, p: 2, maxHeight: 200, overflow: 'auto' }}>
              <Typography variant="subtitle2" gutterBottom>
                Entry {selectedEntry.entry_index + 1} - {selectedEntry.record_type}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                {Object.entries(selectedEntry.payload_json || {}).map(([key, value]) => (
                  <Box key={key}>
                    <Typography variant="caption" color="text.secondary">{key}</Typography>
                    <Typography variant="body2">{String(value) || '—'}</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}
        </Box>
      )}

      {/* History Tab */}
      {activeSubTab === 1 && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Filters */}
          <Stack direction="row" spacing={2} mb={2}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={historyFilter}
                label="Type"
                onChange={(e) => setHistoryFilter(e.target.value as any)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="baptism">Baptism</MenuItem>
                <MenuItem value="marriage">Marriage</MenuItem>
                <MenuItem value="funeral">Funeral</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Days</InputLabel>
              <Select
                value={historyDays}
                label="Days"
                onChange={(e) => setHistoryDays(e.target.value as number)}
              >
                <MenuItem value={7}>Last 7 days</MenuItem>
                <MenuItem value={30}>Last 30 days</MenuItem>
                <MenuItem value={90}>Last 90 days</MenuItem>
              </Select>
            </FormControl>
            <IconButton onClick={loadHistory}>
              <IconRefresh size={20} />
            </IconButton>
          </Stack>

          {/* History Table */}
          <TableContainer component={Paper} variant="outlined" sx={{ flex: 1, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Finalized</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Record #</TableCell>
                  <TableCell>Created ID</TableCell>
                  <TableCell>By</TableCell>
                  <TableCell>Source</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No finalization history found.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map(entry => (
                    <TableRow key={entry.id} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(entry.finalized_at).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(entry.finalized_at).toLocaleTimeString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={entry.record_type} variant="outlined" />
                      </TableCell>
                      <TableCell>{entry.record_number || '—'}</TableCell>
                      <TableCell>
                        {entry.created_record_id ? (
                          <Chip size="small" label={`#${entry.created_record_id}`} color="success" />
                        ) : (
                          <Typography variant="caption" color="text.secondary">Pending</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{entry.finalized_by}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" noWrap sx={{ maxWidth: 150, display: 'block' }}>
                          {entry.original_filename || entry.source_filename || '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Commit Confirmation Dialog */}
      <Dialog open={showCommitDialog} onClose={() => setShowCommitDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconAlertTriangle size={24} color={theme.palette.warning.main} />
            <Typography variant="h6">Confirm Commit to Database</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={600}>
              You are about to create {drafts.filter(d => d.workflow_status === 'finalized').length} record(s).
            </Typography>
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Each record will have a note appended: "Finalized via Review & Finalize on MM/DD/YYYY"
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action is reversible only by manual deletion.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCommitDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="success" 
            onClick={() => handleCommit()}
            startIcon={<IconDatabase size={18} />}
          >
            Yes, Commit Records
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReviewFinalizeTab;

