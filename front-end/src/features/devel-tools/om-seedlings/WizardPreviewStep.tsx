/**
 * WizardPreviewStep — Step 4 of RecordCreationWizard.
 * Displays the generated records table with inline editing, validation
 * issue summary, and row-level actions (edit, regenerate, delete).
 * Extracted from RecordCreationWizard.tsx
 */
import React from 'react';
import {
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Check,
  Close,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import type { FieldConfig, WizardState, RecordType } from './recordWizardTypes';
import { RECORD_TYPE_META } from './recordWizardTypes';

interface WizardPreviewStepProps {
  state: WizardState;
  loading: boolean;
  fieldConfigs: FieldConfig[];
  editingRow: number | null;
  editRowData: Record<string, any>;
  errorCount: number;
  warningCount: number;
  handleGeneratePreview: () => void;
  handleEditRow: (idx: number) => void;
  handleSaveRow: () => void;
  handleDeleteRow: (idx: number) => void;
  handleRegenerateRow: (idx: number) => void;
  setEditingRow: (idx: number | null) => void;
  setEditRowData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}

const WizardPreviewStep: React.FC<WizardPreviewStepProps> = ({
  state,
  loading,
  fieldConfigs,
  editingRow,
  editRowData,
  errorCount,
  warningCount,
  handleGeneratePreview,
  handleEditRow,
  handleSaveRow,
  handleDeleteRow,
  handleRegenerateRow,
  setEditingRow,
  setEditRowData,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (loading) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2 }}>Generating preview...</Typography>
      </Box>
    );
  }

  if (state.records.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">No records generated. Go back and configure.</Typography>
        <Button sx={{ mt: 2 }} onClick={handleGeneratePreview} startIcon={<RefreshIcon />}>
          Generate Preview
        </Button>
      </Box>
    );
  }

  const meta = RECORD_TYPE_META[state.recordType as RecordType];

  return (
    <Box sx={{ py: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>
            Preview: {state.records.length} {meta?.label} Records
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
            {errorCount > 0 && (
              <Chip icon={<ErrorIcon />} label={`${errorCount} error${errorCount > 1 ? 's' : ''}`} size="small" color="error" />
            )}
            {warningCount > 0 && (
              <Chip icon={<WarningIcon />} label={`${warningCount} warning${warningCount > 1 ? 's' : ''}`} size="small" color="warning" />
            )}
            {errorCount === 0 && warningCount === 0 && (
              <Chip icon={<Check />} label="All valid" size="small" color="success" />
            )}
          </Stack>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={handleGeneratePreview}>
            Regenerate All
          </Button>
        </Stack>
      </Stack>

      {/* Validation issues summary */}
      {state.validationIssues.length > 0 && (
        <Box sx={{ mb: 2 }}>
          {state.validationIssues.slice(0, 10).map((issue, idx) => (
            <Alert
              key={idx}
              severity={issue.severity}
              icon={issue.severity === 'error' ? <ErrorIcon fontSize="small" /> : issue.severity === 'warning' ? <WarningIcon fontSize="small" /> : <InfoIcon fontSize="small" />}
              sx={{ mb: 0.5, py: 0 }}
            >
              <Typography variant="body2">
                Row {issue.row}: {issue.message}
                {issue.field !== 'duplicate' && ` (${issue.field})`}
              </Typography>
            </Alert>
          ))}
          {state.validationIssues.length > 10 && (
            <Typography variant="caption" color="text.secondary">
              ...and {state.validationIssues.length - 10} more issues
            </Typography>
          )}
        </Box>
      )}

      {/* Records table */}
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: 50 }}>#</TableCell>
              {fieldConfigs.map(f => (
                <TableCell key={f.key} sx={{ fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                  {f.label}
                </TableCell>
              ))}
              <TableCell sx={{ fontWeight: 700, width: 120 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {state.records.map((record, idx) => {
              const rowIssues = state.validationIssues.filter(v => v.row === idx + 1);
              const hasError = rowIssues.some(v => v.severity === 'error');
              const isEditing = editingRow === idx;

              return (
                <TableRow
                  key={idx}
                  sx={{
                    bgcolor: hasError ? alpha(theme.palette.error.main, isDark ? 0.1 : 0.04) : undefined,
                  }}
                >
                  <TableCell>
                    <Typography variant="caption" fontWeight={600}>{idx + 1}</Typography>
                    {hasError && <ErrorIcon fontSize="small" color="error" sx={{ ml: 0.5, fontSize: 14 }} />}
                  </TableCell>
                  {fieldConfigs.map(f => (
                    <TableCell key={f.key} sx={{ fontSize: '0.75rem', maxWidth: 160 }}>
                      {isEditing ? (
                        <TextField
                          size="small"
                          variant="standard"
                          value={editRowData[f.key] ?? ''}
                          onChange={(e) => setEditRowData(prev => ({ ...prev, [f.key]: e.target.value }))}
                          type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                          fullWidth
                          InputProps={{ sx: { fontSize: '0.75rem' } }}
                        />
                      ) : (
                        <Tooltip title={String(record[f.key] || '')}>
                          <Typography variant="body2" fontSize="0.75rem" noWrap>
                            {record[f.key] ?? '—'}
                          </Typography>
                        </Tooltip>
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    {isEditing ? (
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" color="primary" onClick={handleSaveRow}><Check fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => setEditingRow(null)}><Close fontSize="small" /></IconButton>
                      </Stack>
                    ) : (
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" onClick={() => handleEditRow(idx)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => handleRegenerateRow(idx)}><RefreshIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteRow(idx)}><DeleteIcon fontSize="small" /></IconButton>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default WizardPreviewStep;
