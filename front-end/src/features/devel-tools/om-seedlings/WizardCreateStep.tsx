/**
 * WizardCreateStep — Step 5 of RecordCreationWizard.
 * Handles the confirmation view before creating records, output format
 * selection (database / CSV / XLSX), and the post-creation summary.
 * Extracted from RecordCreationWizard.tsx
 */
import React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { Check, Storage as SeedIcon } from '@mui/icons-material';
import Download from '@mui/icons-material/Download';
import type { WizardState, RecordType } from './recordWizardTypes';
import { RECORD_TYPE_META, yearAgo, today } from './recordWizardTypes';

interface WizardCreateStepProps {
  state: WizardState;
  createResult: any;
  creating: boolean;
  outputFormat: 'database' | 'csv' | 'xlsx';
  errorCount: number;
  warningCount: number;
  setOutputFormat: (format: 'database' | 'csv' | 'xlsx') => void;
  handleCreate: () => void;
  handleDownloadFile: (format: 'csv' | 'xlsx') => void;
  onReset: () => void;
}

const WizardCreateStep: React.FC<WizardCreateStepProps> = ({
  state,
  createResult,
  creating,
  outputFormat,
  errorCount,
  warningCount,
  setOutputFormat,
  handleCreate,
  handleDownloadFile,
  onReset,
}) => {
  if (createResult) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Check sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
        <Typography variant="h5" fontWeight={700} gutterBottom>
          {createResult.downloaded ? 'Records Downloaded' : 'Records Created Successfully'}
        </Typography>
        <Box sx={{ display: 'inline-block', textAlign: 'left', mt: 2 }}>
          <Stack spacing={1}>
            {createResult.downloaded ? (
              <>
                <Typography variant="body1">Format: <strong>{createResult.format?.toUpperCase()}</strong></Typography>
                <Typography variant="body1">Records: <strong>{createResult.count}</strong></Typography>
                <Typography variant="body1">Record Type: <strong>{createResult.record_type}</strong></Typography>
                <Typography variant="body1">Church: <strong>{createResult.church}</strong></Typography>
              </>
            ) : (
              <>
                <Typography variant="body1">Requested: <strong>{createResult.requested}</strong></Typography>
                <Typography variant="body1">Inserted: <strong>{createResult.inserted}</strong></Typography>
                {createResult.skipped > 0 && (
                  <Typography variant="body1" color="warning.main">Skipped: <strong>{createResult.skipped}</strong></Typography>
                )}
                <Typography variant="body1">Record Type: <strong>{createResult.record_type}</strong></Typography>
                <Typography variant="body1">Church: <strong>{createResult.church}</strong></Typography>
                <Typography variant="body1">Database: <strong>{createResult.database}</strong></Typography>
              </>
            )}
          </Stack>
        </Box>
        {createResult.warnings?.length > 0 && (
          <Alert severity="warning" sx={{ mt: 3, maxWidth: 500, mx: 'auto' }}>
            {createResult.warnings.length} warning(s) encountered during creation.
          </Alert>
        )}
        <Box sx={{ mt: 4 }}>
          <Button variant="contained" onClick={onReset}>
            Create More Records
          </Button>
        </Box>
      </Box>
    );
  }

  // Confirmation view before create
  const meta = RECORD_TYPE_META[state.recordType as RecordType];
  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>Confirm & Create</Typography>
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Stack spacing={1.5}>
          <Typography variant="body1">Record Type: <strong>{meta?.label}</strong></Typography>
          <Typography variant="body1">Church: <strong>{state.church?.name}</strong></Typography>
          <Typography variant="body1">Records: <strong>{state.records.length}</strong></Typography>
          <Typography variant="body1">Date Range: <strong>{state.dateStart} to {state.dateEnd}</strong></Typography>
          {errorCount > 0 && (
            <Alert severity="error">Cannot create — {errorCount} validation error(s) must be resolved first.</Alert>
          )}
          {warningCount > 0 && (
            <Alert severity="warning">{warningCount} warning(s) — records will be created but review recommended.</Alert>
          )}
        </Stack>
      </Paper>

      {/* Output format selection */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Output Format</Typography>
      <RadioGroup
        row
        value={outputFormat}
        onChange={(e) => setOutputFormat(e.target.value as 'database' | 'csv' | 'xlsx')}
        sx={{ mb: 3 }}
      >
        <FormControlLabel value="database" control={<Radio />} label="Insert into Church Database" />
        <FormControlLabel value="csv" control={<Radio />} label="Download as CSV" />
        <FormControlLabel value="xlsx" control={<Radio />} label="Download as Excel (.xlsx)" />
      </RadioGroup>

      {outputFormat === 'database' ? (
        <Button
          variant="contained"
          size="large"
          color="primary"
          onClick={handleCreate}
          disabled={creating || errorCount > 0}
          startIcon={creating ? <CircularProgress size={20} color="inherit" /> : <SeedIcon />}
        >
          {creating ? 'Creating...' : `Create ${state.records.length} Records in Database`}
        </Button>
      ) : (
        <Button
          variant="contained"
          size="large"
          color="primary"
          onClick={() => handleDownloadFile(outputFormat)}
          startIcon={<Download />}
        >
          Download {state.records.length} Records as {outputFormat.toUpperCase()}
        </Button>
      )}
    </Box>
  );
};

export default WizardCreateStep;
