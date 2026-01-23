/**
 * Interactive Report Wizard
 * Step-by-step wizard for creating delegation reports for incomplete records
 */

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  TextField,
  Chip,
  Paper,
  Stack,
  Alert,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { getCompletenessSeverity } from '../quality/recordCompleteness';

export interface InteractiveReportConfig {
  recordType: 'baptism' | 'marriage' | 'funeral';
  selectedRecordIds: number[];
  allowedFields: string[];
  recipients: Array<{
    email: string;
    recordIds: number[];
  }>;
  title: string;
  expiresDays: number;
}

interface InteractiveReportWizardProps {
  open: boolean;
  onClose: () => void;
  records: any[];
  recordType: 'baptism' | 'marriage' | 'funeral';
  churchId: number;
  onComplete: (config: InteractiveReportConfig) => Promise<void>;
}

const InteractiveReportWizard: React.FC<InteractiveReportWizardProps> = ({
  open,
  onClose,
  records,
  recordType,
  churchId,
  onComplete,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<number>>(new Set());
  const [allowedFields, setAllowedFields] = useState<Set<string>>(new Set());
  const [recipients, setRecipients] = useState<Array<{ email: string; recordIds: number[] }>>([]);
  const [title, setTitle] = useState('');
  const [expiresDays, setExpiresDays] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Detect incomplete records
  const incompleteRecords = useMemo(() => {
    const incomplete: Array<{ record: any; missing: string[] }> = [];
    records.forEach((record) => {
      try {
        const result = getCompletenessSeverity(recordType, record);
        if (result.severity > 0) {
          incomplete.push({ record, missing: result.missing });
        }
      } catch (error) {
        console.warn('Error checking completeness:', error);
      }
    });
    return incomplete;
  }, [records, recordType]);

  // Initialize selected records to all incomplete on step 1
  React.useEffect(() => {
    if (activeStep === 0 && incompleteRecords.length > 0 && selectedRecordIds.size === 0) {
      const ids = new Set(incompleteRecords.map((ir) => ir.record.id || ir.record._id));
      setSelectedRecordIds(ids);
    }
  }, [activeStep, incompleteRecords, selectedRecordIds.size]);

  // Get available fields from records
  const availableFields = useMemo(() => {
    const fields = new Set<string>();
    records.forEach((record) => {
      Object.keys(record).forEach((key) => {
        if (!key.startsWith('_') && key !== 'id' && key !== '_id') {
          fields.add(key);
        }
      });
    });
    return Array.from(fields).sort();
  }, [records]);

  const handleNext = () => {
    if (activeStep === 0 && selectedRecordIds.size === 0) {
      alert('Please select at least one record');
      return;
    }
    if (activeStep === 1 && allowedFields.size === 0) {
      alert('Please select at least one field');
      return;
    }
    if (activeStep === 2 && recipients.length === 0) {
      alert('Please add at least one recipient');
      return;
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    setIsSubmitting(true);
    try {
      const config: InteractiveReportConfig = {
        recordType,
        selectedRecordIds: Array.from(selectedRecordIds),
        allowedFields: Array.from(allowedFields),
        recipients,
        title: title.trim(),
        expiresDays,
      };
      await onComplete(config);
      handleClose();
    } catch (error: any) {
      alert(`Failed to create report: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setSelectedRecordIds(new Set());
    setAllowedFields(new Set());
    setRecipients([]);
    setTitle('');
    setExpiresDays(30);
    onClose();
  };

  const addRecipient = () => {
    setRecipients([...recipients, { email: '', recordIds: [] }]);
  };

  const updateRecipient = (index: number, updates: Partial<typeof recipients[0]>) => {
    const updated = [...recipients];
    updated[index] = { ...updated[index], ...updates };
    setRecipients(updated);
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const assignRecordsToRecipient = (recipientIndex: number, recordIds: number[]) => {
    updateRecipient(recipientIndex, { recordIds });
  };

  const steps = ['Select Records', 'Choose Fields', 'Assign Recipients', 'Review & Send'];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Create Interactive Report</Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4, mt: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 1: Select Records */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Incomplete Records Found: {incompleteRecords.length}
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Select the records you want to delegate for completion. All incomplete records are selected by default.
            </Alert>
            <Paper variant="outlined" sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={
                        incompleteRecords.length > 0 &&
                        incompleteRecords.every((ir) => {
                          const id = ir.record.id || ir.record._id;
                          return selectedRecordIds.has(id);
                        })
                      }
                      indeterminate={
                        selectedRecordIds.size > 0 && 
                        selectedRecordIds.size < incompleteRecords.length &&
                        !incompleteRecords.every((ir) => {
                          const id = ir.record.id || ir.record._id;
                          return selectedRecordIds.has(id);
                        })
                      }
                      onChange={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const allRecordIds = incompleteRecords.map((ir) => ir.record.id || ir.record._id);
                        const isCurrentlyAllSelected = allRecordIds.every((id) => selectedRecordIds.has(id));
                        
                        if (isCurrentlyAllSelected) {
                          // All are selected, so deselect all
                          setSelectedRecordIds(new Set());
                        } else {
                          // Not all selected, so select all
                          setSelectedRecordIds(new Set(allRecordIds));
                        }
                      }}
                    />
                  }
                  label="Select All"
                />
                <Divider />
                {incompleteRecords.map(({ record, missing }) => {
                  const recordId = record.id || record._id;
                  return (
                    <FormControlLabel
                      key={recordId}
                      control={
                        <Checkbox
                          checked={selectedRecordIds.has(recordId)}
                          onChange={(e) => {
                            const newSet = new Set(selectedRecordIds);
                            if (e.target.checked) {
                              newSet.add(recordId);
                            } else {
                              newSet.delete(recordId);
                            }
                            setSelectedRecordIds(newSet);
                          }}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2">
                            {record.first_name || record.firstName || record.name} {record.last_name || record.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Missing: {missing.join(', ')}
                          </Typography>
                        </Box>
                      }
                    />
                  );
                })}
              </Stack>
            </Paper>
          </Box>
        )}

        {/* Step 2: Choose Fields */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Requestable Fields
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Recipients will only be able to edit the fields you select here.
            </Alert>
            <Paper variant="outlined" sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={
                        availableFields.length > 0 &&
                        availableFields.every((field) => allowedFields.has(field))
                      }
                      indeterminate={
                        allowedFields.size > 0 && 
                        allowedFields.size < availableFields.length &&
                        !availableFields.every((field) => allowedFields.has(field))
                      }
                      onChange={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const isCurrentlyAllSelected = 
                          availableFields.length > 0 &&
                          availableFields.every((field) => allowedFields.has(field));
                        
                        if (isCurrentlyAllSelected) {
                          // All are selected, so deselect all
                          setAllowedFields(new Set());
                        } else {
                          // Not all selected, so select all
                          setAllowedFields(new Set(availableFields));
                        }
                      }}
                    />
                  }
                  label="Select All"
                />
                <Divider />
                {availableFields.map((field) => (
                  <FormControlLabel
                    key={field}
                    control={
                      <Checkbox
                        checked={allowedFields.has(field)}
                        onChange={(e) => {
                          const newSet = new Set(allowedFields);
                          if (e.target.checked) {
                            newSet.add(field);
                          } else {
                            newSet.delete(field);
                          }
                          setAllowedFields(newSet);
                        }}
                      />
                    }
                    label={field}
                  />
                ))}
              </Stack>
            </Paper>
          </Box>
        )}

        {/* Step 3: Assign Recipients */}
        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Assign Records to Recipients
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Enter email addresses and assign records to each recipient.
            </Alert>
            <Stack spacing={2}>
              {recipients.map((recipient, index) => (
                <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <TextField
                        label="Email"
                        type="email"
                        value={recipient.email}
                        onChange={(e) => updateRecipient(index, { email: e.target.value })}
                        fullWidth
                        size="small"
                      />
                      <IconButton onClick={() => removeRecipient(index)} color="error" size="small">
                        <CloseIcon />
                      </IconButton>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Assigned Records: {recipient.recordIds.length}
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        // Simple assignment: assign remaining unassigned records
                        const assignedIds = new Set(recipients.flatMap((r) => r.recordIds));
                        const unassignedIds = Array.from(selectedRecordIds).filter((id) => !assignedIds.has(id));
                        const toAssign = unassignedIds.slice(0, 5); // Assign 5 at a time
                        assignRecordsToRecipient(index, [...recipient.recordIds, ...toAssign]);
                      }}
                    >
                      Assign 5 Records
                    </Button>
                  </Stack>
                </Paper>
              ))}
              <Button variant="outlined" startIcon={<EmailIcon />} onClick={addRecipient}>
                Add Recipient
              </Button>
            </Stack>
          </Box>
        )}

        {/* Step 4: Review & Send */}
        {activeStep === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review & Send
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Report Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Expires in (days)"
                type="number"
                value={expiresDays}
                onChange={(e) => setExpiresDays(parseInt(e.target.value) || 30)}
                inputProps={{ min: 1, max: 365 }}
                fullWidth
              />
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Summary
                </Typography>
                <Typography variant="body2">Record Type: {recordType}</Typography>
                <Typography variant="body2">Selected Records: {selectedRecordIds.size}</Typography>
                <Typography variant="body2">Allowed Fields: {allowedFields.size}</Typography>
                <Typography variant="body2">Recipients: {recipients.length}</Typography>
              </Paper>
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleBack} disabled={activeStep === 0}>
          Back
        </Button>
        <Button onClick={handleClose}>Cancel</Button>
        {activeStep < steps.length - 1 ? (
          <Button variant="contained" onClick={handleNext}>
            Next
          </Button>
        ) : (
          <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Report'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default InteractiveReportWizard;
