/**
 * Interactive Report Review Screen
 * Priest/admin review interface for submitted patches
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Stack,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Snackbar,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

interface Patch {
  id: string;
  record_id: number;
  field_key: string;
  old_value_snapshot: string | null;
  new_value: string;
  status: 'pending' | 'accepted' | 'rejected';
  recipient_email: string;
  submitted_at: string;
  record_context_json: any;
}

interface Report {
  id: string;
  title: string;
  record_type: string;
  status: string;
  created_at: string;
  expires_at: string;
  recipients: Array<{
    id: string;
    email: string;
    status: string;
    last_opened_at: string | null;
    submitted_at: string | null;
  }>;
  patchCounts: {
    pending: number;
    accepted: number;
    rejected: number;
  };
}

const InteractiveReportReview: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const [report, setReport] = useState<Report | null>(null);
  const [patches, setPatches] = useState<Record<number, Patch[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPatch, setEditingPatch] = useState<{ patchId: string; value: string } | null>(null);
  const [acceptAllDialog, setAcceptAllDialog] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  // Fetch report and patches
  const fetchData = useCallback(async () => {
    if (!reportId) return;

    try {
      setLoading(true);
      const [reportRes, patchesRes] = await Promise.all([
        fetch(`/api/records/interactive-reports/${reportId}`),
        fetch(`/api/records/interactive-reports/${reportId}/patches`),
      ]);

      if (!reportRes.ok || !patchesRes.ok) {
        throw new Error('Failed to load report data');
      }

      const reportData = await reportRes.json();
      const patchesData = await patchesRes.json();

      setReport(reportData);
      setPatches(patchesData.patches || {});
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Memoized patch counts
  const patchStats = useMemo(() => {
    const allPatches = Object.values(patches).flat();
    return {
      pending: allPatches.filter((p) => p.status === 'pending').length,
      accepted: allPatches.filter((p) => p.status === 'accepted').length,
      rejected: allPatches.filter((p) => p.status === 'rejected').length,
      total: allPatches.length,
    };
  }, [patches]);

  // Handle patch action
  const handlePatchAction = async (
    patchId: string,
    action: 'accept' | 'reject',
    modifiedValue?: string
  ) => {
    try {
      const endpoint =
        action === 'accept'
          ? `/api/records/interactive-reports/${reportId}/patches/${patchId}/accept`
          : `/api/records/interactive-reports/${reportId}/patches/${patchId}/reject`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modifiedValue !== undefined ? { modifiedValue } : {}),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} patch`);
      }

      setSnackbar({ message: `Patch ${action}ed successfully`, severity: 'success' });
      fetchData(); // Refresh
    } catch (err: any) {
      setSnackbar({ message: err.message, severity: 'error' });
    }
  };

  // Handle accept all for a record
  const handleAcceptRecord = async (recordId: number) => {
    const recordPatches = patches[recordId] || [];
    const pendingPatches = recordPatches.filter((p) => p.status === 'pending');
    
    if (pendingPatches.length === 0) {
      return;
    }

    try {
      // Accept each pending patch for this record
      for (const patch of pendingPatches) {
        const response = await fetch(
          `/api/records/interactive-reports/${reportId}/patches/${patch.id}/accept`,
          { method: 'POST' }
        );
        if (!response.ok) {
          throw new Error(`Failed to accept patch ${patch.id}`);
        }
      }

      setSnackbar({ message: `All ${pendingPatches.length} patches for this record accepted`, severity: 'success' });
      fetchData();
    } catch (err: any) {
      setSnackbar({ message: err.message, severity: 'error' });
    }
  };

  // Handle accept all
  const handleAcceptAll = async () => {
    try {
      const response = await fetch(`/api/records/interactive-reports/${reportId}/accept-all`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to accept all patches');
      }

      const result = await response.json();
      setSnackbar({
        message: `Accepted ${result.accepted} patches. ${result.skipped} skipped.`,
        severity: 'success',
      });
      setAcceptAllDialog(false);
      fetchData();
    } catch (err: any) {
      setSnackbar({ message: err.message, severity: 'error' });
    }
  };

  // Handle revoke
  const handleRevoke = async () => {
    if (!confirm('Are you sure you want to revoke this report? Recipients will no longer be able to access it.')) {
      return;
    }

    try {
      const response = await fetch(`/api/records/interactive-reports/${reportId}/revoke`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to revoke report');
      }

      setSnackbar({ message: 'Report revoked', severity: 'success' });
      fetchData();
    } catch (err: any) {
      setSnackbar({ message: err.message, severity: 'error' });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !report) {
    return (
      <Box p={3}>
        <Alert severity="error">{error || 'Report not found'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );
  }

  const recordIds = Object.keys(patches).map(Number).sort();

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
            Back
          </Button>
          <Box display="flex" justifyContent="space-between" alignItems="start">
            <Box>
              <Typography variant="h4" gutterBottom>
                {report.title}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip label={report.record_type} size="small" />
                <Chip label={report.status} size="small" color={report.status === 'revoked' ? 'error' : 'default'} />
                <Typography variant="body2" color="text.secondary">
                  Created: {new Date(report.created_at).toLocaleDateString()}
                </Typography>
                {report.expires_at && (
                  <Typography variant="body2" color="text.secondary">
                    Expires: {new Date(report.expires_at).toLocaleDateString()}
                  </Typography>
                )}
              </Stack>
            </Box>
            <Stack direction="row" spacing={1}>
              <IconButton onClick={fetchData} size="small">
                <RefreshIcon />
              </IconButton>
              {report.status !== 'revoked' && (
                <Button variant="outlined" color="error" onClick={handleRevoke} size="small">
                  Revoke
                </Button>
              )}
            </Stack>
          </Box>
        </Box>

        {/* Summary Banner */}
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Pending:</strong> {patchStats.pending} | <strong>Accepted:</strong> {patchStats.accepted} |{' '}
            <strong>Rejected:</strong> {patchStats.rejected} | <strong>Total:</strong> {patchStats.total}
          </Typography>
        </Alert>

        {/* Recipient Status Panel */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Recipients
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Opened</TableCell>
                  <TableCell>Submitted</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.recipients.map((recipient) => (
                  <TableRow key={recipient.id}>
                    <TableCell>{recipient.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={recipient.status}
                        size="small"
                        color={
                          recipient.status === 'submitted'
                            ? 'success'
                            : recipient.status === 'revoked'
                            ? 'error'
                            : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {recipient.last_opened_at
                        ? new Date(recipient.last_opened_at).toLocaleString()
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      {recipient.submitted_at ? new Date(recipient.submitted_at).toLocaleString() : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Global Actions */}
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            color="success"
            onClick={() => setAcceptAllDialog(true)}
            disabled={patchStats.pending === 0 || report.status === 'revoked'}
          >
            Accept All Updates ({patchStats.pending})
          </Button>
        </Box>

        {/* Patches Grouped by Record */}
        <Typography variant="h6">Patches by Record</Typography>
        {recordIds.length === 0 ? (
          <Alert severity="info">No patches submitted yet.</Alert>
        ) : (
          <Stack spacing={2}>
            {recordIds.map((recordId) => {
              const recordPatches = patches[recordId] || [];
              const pendingPatches = recordPatches.filter((p) => p.status === 'pending');
              const context = recordPatches[0]?.record_context_json || {};

              return (
                <Accordion key={recordId} defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Typography variant="subtitle1" sx={{ flex: 1 }}>
                        Record #{recordId} - {context.name || 'Unknown'} ({context.date || 'No date'})
                      </Typography>
                      <Chip label={`${pendingPatches.length} pending`} size="small" color="warning" />
                      {pendingPatches.length > 0 && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptRecord(recordId);
                          }}
                        >
                          Accept All
                        </Button>
                      )}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Field</TableCell>
                            <TableCell>Old Value</TableCell>
                            <TableCell>New Value</TableCell>
                            <TableCell>Submitted By</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {recordPatches.map((patch) => (
                            <TableRow key={patch.id}>
                              <TableCell>
                                <strong>{patch.field_key}</strong>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {patch.old_value_snapshot || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {editingPatch?.patchId === patch.id ? (
                                  <TextField
                                    size="small"
                                    value={editingPatch.value}
                                    onChange={(e) =>
                                      setEditingPatch({ ...editingPatch, value: e.target.value })
                                    }
                                    onBlur={() => setEditingPatch(null)}
                                    autoFocus
                                  />
                                ) : (
                                  <Typography variant="body2">{patch.new_value}</Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{patch.recipient_email}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(patch.submitted_at).toLocaleString()}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={patch.status}
                                  size="small"
                                  color={
                                    patch.status === 'accepted'
                                      ? 'success'
                                      : patch.status === 'rejected'
                                      ? 'error'
                                      : 'warning'
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                {patch.status === 'pending' && (
                                  <Stack direction="row" spacing={1}>
                                    <Tooltip title="Edit then accept">
                                      <IconButton
                                        size="small"
                                        onClick={() =>
                                          setEditingPatch({ patchId: patch.id, value: patch.new_value })
                                        }
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Accept">
                                      <IconButton
                                        size="small"
                                        color="success"
                                        onClick={() =>
                                          handlePatchAction(
                                            patch.id,
                                            'accept',
                                            editingPatch?.patchId === patch.id ? editingPatch.value : undefined
                                          )
                                        }
                                      >
                                        <CheckCircleIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Reject">
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handlePatchAction(patch.id, 'reject')}
                                      >
                                        <CancelIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Stack>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        )}
      </Stack>

      {/* Accept All Dialog */}
      <Dialog open={acceptAllDialog} onClose={() => setAcceptAllDialog(false)}>
        <DialogTitle>Accept All Updates</DialogTitle>
        <DialogContent>
          <Typography>
            This will accept all {patchStats.pending} pending patches. Invalid patches will be skipped.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAcceptAllDialog(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleAcceptAll}>
            Accept All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={6000}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message}
      />
    </Box>
  );
};

export default InteractiveReportReview;
