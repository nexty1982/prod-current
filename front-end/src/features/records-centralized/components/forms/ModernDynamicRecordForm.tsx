/**
 * Orthodox Metrics - Modern Dynamic Record Form
 * Updated to use the new unified configuration system and template-agnostic architecture
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Switch,
  Slider,
  RadioGroup,
  Radio,
  FormLabel,
  Divider,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { DatePicker, TimePicker, DateTimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Import unified hooks and types
import {
  useUnifiedRecordMutations,
  useTableSchema,
  useFieldDefinitions,
  useRequiredFields,
  useDropdownOptions,
  getCurrentTemplate,
} from '@/core';

// Import types
import { RecordData, FieldDefinition, ValidationResult } from '@/core/types/RecordsTypes';

interface ModernDynamicRecordFormProps {
  churchId: number;
  tableName: string;
  record?: RecordData | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: (record: RecordData) => void;
  onError?: (error: string) => void;
  readOnly?: boolean;
  mode?: 'create' | 'edit' | 'view';
  className?: string;
  style?: React.CSSProperties;
}

export function ModernDynamicRecordForm({
  churchId,
  tableName,
  record = null,
  open,
  onClose,
  onSuccess,
  onError,
  readOnly = false,
  mode = 'create',
  className,
  style,
}: ModernDynamicRecordFormProps) {
  // State management
  const [formData, setFormData] = useState<RecordData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Get current template
  const currentTemplate = getCurrentTemplate();

  // Get table schema
  const {
    schema,
    loading: schemaLoading,
    error: schemaError,
  } = useTableSchema(churchId, tableName);

  // Get field definitions
  const {
    fields,
    loading: fieldsLoading,
  } = useFieldDefinitions(churchId, tableName);

  // Get required fields
  const {
    fields: requiredFields,
  } = useRequiredFields(churchId, tableName);

  // Record mutations
  const {
    createRecord,
    updateRecord,
    isCreating,
    isUpdating,
    error: mutationError,
  } = useUnifiedRecordMutations({
    churchId,
    tableName,
    onSuccess: (data) => {
      setIsSubmitting(false);
      onSuccess?.(data);
      handleClose();
    },
    onError: (error) => {
      setIsSubmitting(false);
      onError?.(error.message);
    },
  });

  // Initialize form data
  useEffect(() => {
    if (record) {
      setFormData(record);
    } else {
      setFormData({});
    }
    setErrors({});
    setActiveStep(0);
  }, [record, open]);

  // Memoized form fields grouped by sections
  const formSections = useMemo(() => {
    if (!fields) return [];

    const sections: Array<{
      title: string;
      fields: FieldDefinition[];
      order: number;
    }> = [];

    // Group fields by section (if they have a section property)
    const groupedFields = fields.reduce((acc, field) => {
      const section = field.section || 'General';
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push(field);
      return acc;
    }, {} as Record<string, FieldDefinition[]>);

    // Create sections
    Object.entries(groupedFields).forEach(([sectionName, sectionFields]) => {
      sections.push({
        title: sectionName,
        fields: sectionFields.sort((a, b) => a.display_order - b.display_order),
        order: sectionFields[0]?.section_order || 0,
      });
    });

    return sections.sort((a, b) => a.order - b.order);
  }, [fields]);

  // Memoized visible fields
  const visibleFields = useMemo(() => {
    if (!fields) return [];
    return fields
      .filter(field => !field.is_hidden)
      .sort((a, b) => a.display_order - b.display_order);
  }, [fields]);

  // Event handlers
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
    
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  }, [errors]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      // Validate required fields
      const requiredFieldNames = requiredFields.map(f => f.column_name);
      const missingFields: string[] = [];
      
      requiredFieldNames.forEach(fieldName => {
        const value = formData[fieldName];
        if (value === undefined || value === null || value === '') {
          missingFields.push(fieldName);
        }
      });

      if (missingFields.length > 0) {
        const newErrors: Record<string, string> = {};
        missingFields.forEach(fieldName => {
          newErrors[fieldName] = 'This field is required';
        });
        setErrors(newErrors);
        setIsSubmitting(false);
        return;
      }

      // Submit data
      if (mode === 'create') {
        await createRecord(formData);
      } else if (mode === 'edit' && record?.id) {
        await updateRecord(record.id, formData);
      }
    } catch (error) {
      setIsSubmitting(false);
      onError?.(error instanceof Error ? error.message : 'An error occurred');
    }
  }, [isSubmitting, formData, requiredFields, mode, record?.id, createRecord, updateRecord, onError]);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      setFormData({});
      setErrors({});
      setActiveStep(0);
      onClose();
    }
  }, [isSubmitting, onClose]);

  const handleNext = useCallback(() => {
    setActiveStep(prev => prev + 1);
  }, []);

  const handleBack = useCallback(() => {
    setActiveStep(prev => prev - 1);
  }, []);

  // Render field based on type
  const renderField = useCallback((field: FieldDefinition) => {
    const value = formData[field.column_name];
    const error = errors[field.column_name];
    const isRequired = requiredFields.some(f => f.column_name === field.column_name);

    const commonProps = {
      fullWidth: true,
      required: isRequired,
      error: !!error,
      helperText: error || field.help_text,
      disabled: readOnly || isSubmitting,
      value: value || '',
      onChange: (e: any) => handleFieldChange(field.column_name, e.target.value),
    };

    switch (field.field_type) {
      case 'text':
        return (
          <TextField
            {...commonProps}
            label={field.display_name}
            placeholder={field.placeholder}
            multiline={field.multiline}
            rows={field.rows || 1}
            maxLength={field.max_length}
          />
        );

      case 'number':
        return (
          <TextField
            {...commonProps}
            type="number"
            label={field.display_name}
            inputProps={{
              min: field.min_value,
              max: field.max_value,
              step: field.step || 1,
            }}
          />
        );

      case 'email':
        return (
          <TextField
            {...commonProps}
            type="email"
            label={field.display_name}
            placeholder={field.placeholder}
          />
        );

      case 'phone':
        return (
          <TextField
            {...commonProps}
            type="tel"
            label={field.display_name}
            placeholder={field.placeholder}
          />
        );

      case 'url':
        return (
          <TextField
            {...commonProps}
            type="url"
            label={field.display_name}
            placeholder={field.placeholder}
          />
        );

      case 'password':
        return (
          <TextField
            {...commonProps}
            type="password"
            label={field.display_name}
            placeholder={field.placeholder}
          />
        );

      case 'date':
        return (
          <DatePicker
            label={field.display_name}
            value={value ? new Date(value) : null}
            onChange={(date) => handleFieldChange(field.column_name, date?.toISOString())}
            disabled={readOnly || isSubmitting}
            slotProps={{
              textField: {
                fullWidth: true,
                required: isRequired,
                error: !!error,
                helperText: error || field.help_text,
              },
            }}
          />
        );

      case 'time':
        return (
          <TimePicker
            label={field.display_name}
            value={value ? new Date(value) : null}
            onChange={(time) => handleFieldChange(field.column_name, time?.toISOString())}
            disabled={readOnly || isSubmitting}
            slotProps={{
              textField: {
                fullWidth: true,
                required: isRequired,
                error: !!error,
                helperText: error || field.help_text,
              },
            }}
          />
        );

      case 'datetime':
        return (
          <DateTimePicker
            label={field.display_name}
            value={value ? new Date(value) : null}
            onChange={(datetime) => handleFieldChange(field.column_name, datetime?.toISOString())}
            disabled={readOnly || isSubmitting}
            slotProps={{
              textField: {
                fullWidth: true,
                required: isRequired,
                error: !!error,
                helperText: error || field.help_text,
              },
            }}
          />
        );

      case 'select':
        return (
          <FormControl fullWidth required={isRequired} error={!!error}>
            <InputLabel>{field.display_name}</InputLabel>
            <Select
              value={value || ''}
              onChange={(e) => handleFieldChange(field.column_name, e.target.value)}
              disabled={readOnly || isSubmitting}
              label={field.display_name}
            >
              {field.options?.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {error && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
                {error}
              </Typography>
            )}
          </FormControl>
        );

      case 'checkbox':
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={!!value}
                onChange={(e) => handleFieldChange(field.column_name, e.target.checked)}
                disabled={readOnly || isSubmitting}
              />
            }
            label={field.display_name}
          />
        );

      case 'textarea':
        return (
          <TextField
            {...commonProps}
            label={field.display_name}
            placeholder={field.placeholder}
            multiline
            rows={field.rows || 4}
            maxLength={field.max_length}
          />
        );

      case 'radio':
        return (
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend">{field.display_name}</FormLabel>
            <RadioGroup
              value={value || ''}
              onChange={(e) => handleFieldChange(field.column_name, e.target.value)}
            >
              {field.options?.map((option) => (
                <FormControlLabel
                  key={option}
                  value={option}
                  control={<Radio disabled={readOnly || isSubmitting} />}
                  label={option}
                />
              ))}
            </RadioGroup>
            {error && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                {error}
              </Typography>
            )}
          </FormControl>
        );

      default:
        return (
          <TextField
            {...commonProps}
            label={field.display_name}
            placeholder={field.placeholder}
          />
        );
    }
  }, [formData, errors, requiredFields, readOnly, isSubmitting, handleFieldChange]);

  // Loading state
  if (schemaLoading || fieldsLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading form...</Typography>
      </Box>
    );
  }

  // Error state
  if (schemaError) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error loading form: {schemaError}
      </Alert>
    );
  }

  // No schema
  if (!schema) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No schema found for table: {tableName}
      </Alert>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box className={className} style={style}>
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5" component="h2">
                {mode === 'create' ? 'Create New Record' : mode === 'edit' ? 'Edit Record' : 'View Record'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label={currentTemplate.toUpperCase()}
                  color="primary"
                  size="small"
                />
                {readOnly && (
                  <Chip
                    label="READ ONLY"
                    color="warning"
                    size="small"
                  />
                )}
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {schema.displayName} • {tableName}
            </Typography>
          </Box>

          {/* Form Content */}
          <Box sx={{ p: 3 }}>
            {formSections.length > 1 ? (
              /* Multi-step form */
              <Stepper activeStep={activeStep} orientation="vertical">
                {formSections.map((section, index) => (
                  <Step key={section.title}>
                    <StepLabel>{section.title}</StepLabel>
                    <StepContent>
                      <Grid container spacing={2}>
                        {section.fields.map((field) => (
                          <Grid item xs={12} sm={6} md={4} key={field.column_name}>
                            {renderField(field)}
                          </Grid>
                        ))}
                      </Grid>
                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          onClick={index === formSections.length - 1 ? handleSubmit : handleNext}
                          disabled={isSubmitting}
                          startIcon={isSubmitting ? <CircularProgress size={16} /> : <SaveIcon />}
                        >
                          {index === formSections.length - 1 ? 'Save' : 'Next'}
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
            ) : (
              /* Single-step form */
              <Grid container spacing={2}>
                {visibleFields.map((field) => (
                  <Grid item xs={12} sm={6} md={4} key={field.column_name}>
                    {renderField(field)}
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>

          {/* Actions */}
          <Box sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={handleClose}
                disabled={isSubmitting}
                startIcon={<CancelIcon />}
              >
                Cancel
              </Button>
              {!readOnly && (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  startIcon={isSubmitting ? <CircularProgress size={16} /> : <SaveIcon />}
                >
                  {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Save Changes'}
                </Button>
              )}
            </Box>
          </Box>
        </form>
      </Box>
    </LocalizationProvider>
  );
}

export default ModernDynamicRecordForm;
