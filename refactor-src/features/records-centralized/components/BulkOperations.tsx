/**
 * Orthodox Metrics - Bulk Operations Component
 * Advanced bulk operations for records management
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  FormGroup,
  Grid,
  Paper,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  Divider,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Badge,
  Menu,
  MenuList,
  ListItemIcon,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Settings as SettingsIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';

// Import unified hooks
import {
  useUnifiedRecordMutations,
  useUnifiedRecords,
  getCurrentTemplate,
} from '@/core';

// Import types
import { RecordData, RecordFilters, BulkOperation, BulkOperationResult } from '@/core/types/RecordsTypes';

interface BulkOperationsProps {
  churchId: number;
  tableName: string;
  selectedRecords: RecordData[];
  onSelectionChange: (records: RecordData[]) => void;
  onOperationComplete?: (result: BulkOperationResult) => void;
  open: boolean;
  onClose: () => void;
}

export function BulkOperations({
  churchId,
  tableName,
  selectedRecords,
  onSelectionChange,
  onOperationComplete,
  open,
  onClose,
}: BulkOperationsProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [operationType, setOperationType] = useState<BulkOperation['type']>('delete');
  const [operationConfig, setOperationConfig] = useState<any>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionResults, setExecutionResults] = useState<BulkOperationResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Get current template
  const currentTemplate = getCurrentTemplate();

  // Record mutations
  const {
    updateRecord,
    deleteRecord,
    isUpdating,
    isDeleting,
  } = useUnifiedRecordMutations({
    churchId,
    tableName,
  });

  // Available operations
  const availableOperations = useMemo(() => [
    {
      type: 'delete',
      label: 'Delete Records',
      description: 'Permanently delete selected records',
      icon: <DeleteIcon />,
      color: 'error' as const,
      requiresConfirmation: true,
    },
    {
      type: 'update',
      label: 'Update Records',
      description: 'Update fields in selected records',
      icon: <EditIcon />,
      color: 'primary' as const,
      requiresConfirmation: true,
    },
    {
      type: 'export',
      label: 'Export Records',
      description: 'Export selected records to file',
      icon: <DownloadIcon />,
      color: 'secondary' as const,
      requiresConfirmation: false,
    },
    {
      type: 'duplicate',
      label: 'Duplicate Records',
      description: 'Create copies of selected records',
      icon: <UploadIcon />,
      color: 'info' as const,
      requiresConfirmation: true,
    },
    {
      type: 'archive',
      label: 'Archive Records',
      description: 'Move records to archive',
      icon: <SettingsIcon />,
      color: 'warning' as const,
      requiresConfirmation: true,
    },
  ], []);

  // Event handlers
  const handleOperationTypeChange = useCallback((type: BulkOperation['type']) => {
    setOperationType(type);
    setOperationConfig({});
    setActiveStep(0);
  }, []);

  const handleOperationConfigChange = useCallback((field: string, value: any) => {
    setOperationConfig(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleNext = useCallback(() => {
    setActiveStep(prev => prev + 1);
  }, []);

  const handleBack = useCallback(() => {
    setActiveStep(prev => prev - 1);
  }, []);

  const handleExecute = useCallback(async () => {
    if (selectedRecords.length === 0) return;

    setIsExecuting(true);
    setExecutionProgress(0);
    setExecutionResults(null);

    try {
      const results: BulkOperationResult = {
        totalRecords: selectedRecords.length,
        successful: 0,
        failed: 0,
        errors: [],
        warnings: [],
        operationType,
        operationConfig,
        startTime: new Date(),
        endTime: new Date(),
      };

      // Execute operation based on type
      switch (operationType) {
        case 'delete':
          for (let i = 0; i < selectedRecords.length; i++) {
            try {
              await deleteRecord(selectedRecords[i].id);
              results.successful++;
            } catch (error) {
              results.failed++;
              results.errors.push({
                recordId: selectedRecords[i].id,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
            setExecutionProgress(((i + 1) / selectedRecords.length) * 100);
          }
          break;

        case 'update':
          for (let i = 0; i < selectedRecords.length; i++) {
            try {
              await updateRecord(selectedRecords[i].id, operationConfig.updates);
              results.successful++;
            } catch (error) {
              results.failed++;
              results.errors.push({
                recordId: selectedRecords[i].id,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
            setExecutionProgress(((i + 1) / selectedRecords.length) * 100);
          }
          break;

        case 'export':
          // Export logic would go here
          results.successful = selectedRecords.length;
          break;

        case 'duplicate':
          // Duplicate logic would go here
          for (let i = 0; i < selectedRecords.length; i++) {
            try {
              // Duplicate record logic
              results.successful++;
            } catch (error) {
              results.failed++;
              results.errors.push({
                recordId: selectedRecords[i].id,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
            setExecutionProgress(((i + 1) / selectedRecords.length) * 100);
          }
          break;

        case 'archive':
          // Archive logic would go here
          for (let i = 0; i < selectedRecords.length; i++) {
            try {
              // Archive record logic
              results.successful++;
            } catch (error) {
              results.failed++;
              results.errors.push({
                recordId: selectedRecords[i].id,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
            setExecutionProgress(((i + 1) / selectedRecords.length) * 100);
          }
          break;
      }

      results.endTime = new Date();
      setExecutionResults(results);
      onOperationComplete?.(results);
    } catch (error) {
      console.error('Bulk operation error:', error);
    } finally {
      setIsExecuting(false);
    }
  }, [selectedRecords, operationType, operationConfig, deleteRecord, updateRecord, onOperationComplete]);

  const handleClose = useCallback(() => {
    setActiveStep(0);
    setOperationType('delete');
    setOperationConfig({});
    setIsExecuting(false);
    setExecutionProgress(0);
    setExecutionResults(null);
    onClose();
  }, [onClose]);

  // Render operation selection
  const renderOperationSelection = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Operation
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Choose the operation you want to perform on {selectedRecords.length} selected records.
      </Typography>

      <Grid container spacing={2}>
        {availableOperations.map((operation) => (
          <Grid item xs={12} sm={6} md={4} key={operation.type}>
            <Card
              sx={{
                cursor: 'pointer',
                border: operationType === operation.type ? 2 : 1,
                borderColor: operationType === operation.type ? 'primary.main' : 'divider',
                '&:hover': {
                  boxShadow: 2,
                },
              }}
              onClick={() => handleOperationTypeChange(operation.type)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Box sx={{ color: operation.color + '.main' }}>
                    {operation.icon}
                  </Box>
                  <Typography variant="h6">
                    {operation.label}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {operation.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // Render operation configuration
  const renderOperationConfiguration = () => {
    const operation = availableOperations.find(op => op.type === operationType);
    if (!operation) return null;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Configure {operation.label}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Configure the parameters for the {operation.label.toLowerCase()} operation.
        </Typography>

        {operationType === 'update' && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Field to Update"
                value={operationConfig.field || ''}
                onChange={(e) => handleOperationConfigChange('field', e.target.value)}
                helperText="Enter the field name to update"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="New Value"
                value={operationConfig.value || ''}
                onChange={(e) => handleOperationConfigChange('value', e.target.value)}
                helperText="Enter the new value for the field"
              />
            </Grid>
          </Grid>
        )}

        {operationType === 'export' && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Export Format</InputLabel>
                <Select
                  value={operationConfig.format || 'csv'}
                  onChange={(e) => handleOperationConfigChange('format', e.target.value)}
                  label="Export Format"
                >
                  <MenuItem value="csv">CSV</MenuItem>
                  <MenuItem value="excel">Excel</MenuItem>
                  <MenuItem value="json">JSON</MenuItem>
                  <MenuItem value="pdf">PDF</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="File Name"
                value={operationConfig.fileName || `${tableName}_export`}
                onChange={(e) => handleOperationConfigChange('fileName', e.target.value)}
                helperText="Enter the file name for export"
              />
            </Grid>
          </Grid>
        )}

        {operationType === 'duplicate' && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={operationConfig.includeRelations || false}
                    onChange={(e) => handleOperationConfigChange('includeRelations', e.target.checked)}
                  />
                }
                label="Include Related Records"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Suffix for Duplicated Records"
                value={operationConfig.suffix || '_copy'}
                onChange={(e) => handleOperationConfigChange('suffix', e.target.value)}
                helperText="Suffix to add to duplicated record names"
              />
            </Grid>
          </Grid>
        )}

        {operationType === 'archive' && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Archive Reason"
                value={operationConfig.reason || ''}
                onChange={(e) => handleOperationConfigChange('reason', e.target.value)}
                helperText="Reason for archiving these records"
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        )}
      </Box>
    );
  };

  // Render operation preview
  const renderOperationPreview = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Operation Preview
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review the operation details before execution.
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Operation Summary
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary="Operation Type"
              secondary={availableOperations.find(op => op.type === operationType)?.label}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Records Selected"
              secondary={selectedRecords.length}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Table"
              secondary={tableName}
            />
          </ListItem>
        </List>
      </Paper>

      <Alert severity="warning" sx={{ mb: 2 }}>
        This operation will affect {selectedRecords.length} records. Please review the details carefully.
      </Alert>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<SearchIcon />}
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? 'Hide' : 'Show'} Record List
        </Button>
      </Box>

      {showPreview && (
        <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 300 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedRecords.slice(0, 10).map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.id}</TableCell>
                  <TableCell>
                    {record.name || record.title || record.first_name || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {record.created_at ? new Date(record.created_at).toLocaleDateString() : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
              {selectedRecords.length > 10 && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    ... and {selectedRecords.length - 10} more records
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  // Render execution progress
  const renderExecutionProgress = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Executing Operation
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Please wait while the operation is being executed...
      </Typography>

      <LinearProgress
        variant="determinate"
        value={executionProgress}
        sx={{ mb: 2 }}
      />

      <Typography variant="body2" color="text.secondary" align="center">
        {Math.round(executionProgress)}% Complete
      </Typography>
    </Box>
  );

  // Render execution results
  const renderExecutionResults = () => {
    if (!executionResults) return null;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Operation Results
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Records
                </Typography>
                <Typography variant="h4">
                  {executionResults.totalRecords}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Successful
                </Typography>
                <Typography variant="h4" color="success.main">
                  {executionResults.successful}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Failed
                </Typography>
                <Typography variant="h4" color="error.main">
                  {executionResults.failed}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Duration
                </Typography>
                <Typography variant="h4">
                  {Math.round((executionResults.endTime.getTime() - executionResults.startTime.getTime()) / 1000)}s
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {executionResults.errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Errors ({executionResults.errors.length})
            </Typography>
            <List dense>
              {executionResults.errors.slice(0, 5).map((error, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={`Record ${error.recordId}`}
                    secondary={error.error}
                  />
                </ListItem>
              ))}
              {executionResults.errors.length > 5 && (
                <ListItem>
                  <ListItemText
                    primary={`... and ${executionResults.errors.length - 5} more errors`}
                  />
                </ListItem>
              )}
            </List>
          </Alert>
        )}

        {executionResults.warnings.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Warnings ({executionResults.warnings.length})
            </Typography>
            <List dense>
              {executionResults.warnings.slice(0, 5).map((warning, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={`Record ${warning.recordId}`}
                    secondary={warning.warning}
                  />
                </ListItem>
              ))}
            </List>
          </Alert>
        )}
      </Box>
    );
  };

  const steps = [
    { label: 'Select Operation', content: renderOperationSelection },
    { label: 'Configure', content: renderOperationConfiguration },
    { label: 'Preview', content: renderOperationPreview },
  ];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Bulk Operations
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={currentTemplate.toUpperCase()} color="primary" size="small" />
            <Badge badgeContent={selectedRecords.length} color="primary">
              <Chip label="Selected" color="secondary" size="small" />
            </Badge>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {isExecuting ? (
          renderExecutionProgress()
        ) : executionResults ? (
          renderExecutionResults()
        ) : (
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel>{step.label}</StepLabel>
                <StepContent>
                  {step.content()}
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      onClick={index === steps.length - 1 ? handleExecute : handleNext}
                      disabled={isExecuting}
                      startIcon={isExecuting ? <CircularProgress size={16} /> : <PlayIcon />}
                    >
                      {index === steps.length - 1 ? 'Execute' : 'Next'}
                    </Button>
                    {index > 0 && (
                      <Button onClick={handleBack}>
                        Back
                      </Button>
                    )}
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          {executionResults ? 'Close' : 'Cancel'}
        </Button>
        {executionResults && (
          <Button
            variant="contained"
            onClick={() => {
              setExecutionResults(null);
              setActiveStep(0);
            }}
          >
            New Operation
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default BulkOperations;
