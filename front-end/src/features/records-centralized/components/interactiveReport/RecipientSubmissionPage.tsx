/**
 * Recipient Submission Page
 * Public form for recipients to submit patches
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Divider,
  Chip,
} from '@mui/material';
import { CheckCircle as CheckCircleIcon, Save as SaveIcon } from '@mui/icons-material';

interface Assignment {
  record_id: number;
  record_table: string;
  record_context_json: {
    name?: string;
    date?: string;
  };
}

interface ReportData {
  title: string;
  recordType: string;
  allowedFields: string[];
  assignments: Assignment[];
}

interface Patch {
  record_id: number;
  field: string;
  new_value: string;
}

const RecipientSubmissionPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<number, Record<string, string>>>({});

  // Load report data
  useEffect(() => {
    if (!token) {
      setError('Invalid token');
      setLoading(false);
      return;
    }

    const fetchReport = async () => {
      try {
        const response = await fetch(`/r/interactive/${token}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Invalid or expired link');
          }
          if (response.status === 410) {
            throw new Error('This link has expired or been revoked');
          }
          throw new Error('Failed to load report');
        }

        const data = await response.json();
        setReportData(data);

        // Load draft from localStorage
        const draftKey = `interactive_report_draft_${token}`;
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
          try {
            const draft = JSON.parse(savedDraft);
            setFormData(draft);
          } catch {
            // Ignore invalid draft
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [token]);

  // Autosave draft
  useEffect(() => {
    if (token && Object.keys(formData).length > 0) {
      const draftKey = `interactive_report_draft_${token}`;
      localStorage.setItem(draftKey, JSON.stringify(formData));
    }
  }, [formData, token]);

  // Handle field change
  const handleFieldChange = (recordId: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [recordId]: {
        ...prev[recordId],
        [field]: value,
      },
    }));
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!token || !reportData) return;

    // Build patches
    const patches: Patch[] = [];
    Object.entries(formData).forEach(([recordIdStr, fields]) => {
      const recordId = parseInt(recordIdStr);
      Object.entries(fields).forEach(([field, value]) => {
        if (value && value.trim() && reportData.allowedFields.includes(field)) {
          patches.push({
            record_id: recordId,
            field,
            new_value: value.trim(),
          });
        }
      });
    });

    if (patches.length === 0) {
      alert('Please fill in at least one field');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/r/interactive/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patches }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit');
      }

      // Clear draft
      const draftKey = `interactive_report_draft_${token}`;
      localStorage.removeItem(draftKey);

      setSubmitted(true);
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Check if field is date type
  const isDateField = (field: string): boolean => {
    return field.toLowerCase().includes('date') || field.toLowerCase().includes('_date');
  };

  // Check if field is long text
  const isLongTextField = (field: string): boolean => {
    return (
      field.toLowerCase().includes('notes') ||
      field.toLowerCase().includes('comment') ||
      field.toLowerCase().includes('description') ||
      field.toLowerCase().includes('address')
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (submitted) {
    return (
      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Submitted Successfully
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your updates have been submitted for review. You will be notified once they are processed.
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (!reportData) {
    return null;
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <Stack spacing={3}>
        {/* Header */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            {reportData.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Please complete the fields below for the records assigned to you. Your changes will be reviewed before
            being applied.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip label={reportData.recordType} size="small" />
            <Chip label={`${reportData.assignments.length} record(s)`} size="small" />
          </Stack>
        </Paper>

        {/* Instructions */}
        <Alert severity="info">
          <Typography variant="body2">
            • Only fill in the fields that need to be updated
            <br />• Your progress is automatically saved
            <br />• Click "Submit" when you're done
          </Typography>
        </Alert>

        {/* Form */}
        <Stack spacing={4}>
          {reportData.assignments.map((assignment) => {
            const recordId = assignment.record_id;
            const context = assignment.record_context_json;

            return (
              <Paper key={recordId} variant="outlined" sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Record #{recordId}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {context.name && `Name: ${context.name}`}
                  {context.date && ` | Date: ${context.date}`}
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Stack spacing={2}>
                  {reportData.allowedFields.map((field) => {
                    const value = formData[recordId]?.[field] || '';
                    const isDate = isDateField(field);
                    const isLongText = isLongTextField(field);

                    return (
                      <TextField
                        key={field}
                        label={field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        value={value}
                        onChange={(e) => {
                          let newValue = e.target.value;
                          // Normalize date to YYYY-MM-DD
                          if (isDate && newValue) {
                            const date = new Date(newValue);
                            if (!isNaN(date.getTime())) {
                              newValue = date.toISOString().split('T')[0];
                            }
                          }
                          handleFieldChange(recordId, field, newValue);
                        }}
                        type={isDate ? 'date' : isLongText ? undefined : 'text'}
                        multiline={isLongText}
                        rows={isLongText ? 3 : 1}
                        fullWidth
                        InputLabelProps={isDate ? { shrink: true } : undefined}
                      />
                    );
                  })}
                </Stack>
              </Paper>
            );
          })}
        </Stack>

        {/* Submit Button */}
        <Box display="flex" justifyContent="flex-end" gap={2}>
          <Button variant="outlined" startIcon={<SaveIcon />} disabled>
            Draft Saved
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={submitting}
            size="large"
          >
            {submitting ? 'Submitting...' : 'Submit Updates'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default RecipientSubmissionPage;
