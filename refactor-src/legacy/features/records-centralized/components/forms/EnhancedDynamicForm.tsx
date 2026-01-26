/**
 * Orthodox Metrics - Enhanced Dynamic Form
 * Advanced form system with comprehensive field types, validation, and UX enhancements
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  CardActions,
  Autocomplete,
  DatePicker,
  TimePicker,
  DateTimePicker,
  LocalizationProvider,
  AdapterDateFns,
  Rating,
  LinearProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

// Import unified hooks and types
import {
  useUnifiedRecordMutations,
  useTableSchema,
  useFieldDefinitions,
  useRequiredFields,
  useDropdownOptions,
  useRecordValidation,
  getCurrentTemplate,
} from '@/core';

// Import types
import { RecordData, FieldDefinition, ValidationResult, FormSection } from '@/core/types/RecordsTypes';

interface EnhancedDynamicFormProps {
  churchId: number;
  tableName: string;
  record?: RecordData | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: (record: RecordData) => void;
  onError?: (error: string) => void;
  readOnly?: boolean;
  mode?: 'create' | 'edit' | 'view';
  sections?: FormSection[];
  showProgress?: boolean;
  enableValidation?: boolean;
  enableAutoSave?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function EnhancedDynamicForm({
  churchId,
  tableName,
  record = null,
  open,
  onClose,
  onSuccess,
  onError,
  readOnly = false,
  mode = 'create',
  sections = [],
  showProgress = true,
  enableValidation = true,
  enableAutoSave = false,
  className,
  style,
}: EnhancedDynamicFormProps) {
  // State management
  const [formData, setFormData] = useState<RecordData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState(0);

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

  // Get dropdown options
  const {
    options: dropdownOptions,
    loading: optionsLoading,
  } = useDropdownOptions(churchId, tableName);

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
      setAutoSaveStatus('saved');
      onSuccess?.(data);
      handleClose();
    },
    onError: (error) => {
      setIsSubmitting(false);
      setAutoSaveStatus('error');
      onError?.(error.message);
    },
  });

  // Record validation
  const {
    validateRecord,
    validationRules,
  } = useRecordValidation(churchId, tableName);

  // Initialize form data
  useEffect(() => {
    if (record) {
      setFormData(record);
    } else {
      setFormData({});
    }
    setErrors({});
    setWarnings({});
    setActiveStep(0);
    setTouchedFields(new Set());
  }, [record, open]);

  // Auto-save functionality
  useEffect(() => {
    if (enableAutoSave && touchedFields.size > 0) {
      const timeoutId = setTimeout(() => {
        handleAutoSave();
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timeoutId);
    }
  }, [formData, touchedFields, enableAutoSave]);

  // Memoized form sections
  const formSections = useMemo(() => {
    if (sections.length > 0) {
      return sections;
    }

    if (!fields) return [];

    const sectionMap = new Map<string, FormSection>();
    
    fields
      .filter(field => !field.is_hidden)
      .sort((a, b) => a.display_order - b.display_order)
      .forEach(field => {
        const sectionName = field.section || 'General';
        if (!sectionMap.has(sectionName)) {
          sectionMap.set(sectionName, {
            title: sectionName,
            fields: [],
            order: field.section_order || 0,
            description: field.section_description || '',
            collapsible: field.section_collapsible || false,
          });
        }
        sectionMap.get(sectionName)!.fields.push(field);
      });

    return Array.from(sectionMap.values()).sort((a, b) => a.order - b.order);
  }, [fields, sections]);

  // Event handlers
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
    
    setTouchedFields(prev => new Set(prev).add(fieldName));
    
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }

    // Clear warning for this field
    if (warnings[fieldName]) {
      setWarnings(prev => {
        const newWarnings = { ...prev };
        delete newWarnings[fieldName];
        return newWarnings;
      });
    }

    // Real-time validation
    if (enableValidation) {
      validateField(fieldName, value);
    }
  }, [errors, warnings, enableValidation]);

  const validateField = useCallback(async (fieldName: string, value: any) => {
    if (!validationRules[fieldName]) return;

    try {
      const result = await validateRecord({ [fieldName]: value });
      if (result.errors[fieldName]) {
        setErrors(prev => ({ ...prev, [fieldName]: result.errors[fieldName] }));
      }
      if (result.warnings[fieldName]) {
        setWarnings(prev => ({ ...prev, [fieldName]: result.warnings[fieldName] }));
      }
    } catch (error) {
      console.error('Validation error:', error);
    }
  }, [validationRules, validateRecord]);

  const handleAutoSave = useCallback(async () => {
    if (mode === 'view' || readOnly) return;

    setAutoSaveStatus('saving');
    try {
      if (record?.id) {
        await updateRecord(record.id, formData);
      } else {
        await createRecord(formData);
      }
      setAutoSaveStatus('saved');
    } catch (error) {
      setAutoSaveStatus('error');
    }
  }, [mode, readOnly, record?.id, formData, updateRecord, createRecord]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrors({});
    setWarnings({});

    try {
      // Validate all fields
      if (enableValidation) {
        const validation = await validateRecord(formData);
        if (Object.keys(validation.errors).length > 0) {
          setErrors(validation.errors);
          setWarnings(validation.warnings);
          setIsSubmitting(false);
          return;
        }
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
  }, [isSubmitting, formData, enableValidation, validateRecord, mode, record?.id, createRecord, updateRecord, onError]);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      setFormData({});
      setErrors({});
      setWarnings({});
      setActiveStep(0);
      setTouchedFields(new Set());
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
    const warning = warnings[field.column_name];
    const isRequired = requiredFields.some(f => f.column_name === field.column_name);
    const isTouched = touchedFields.has(field.column_name);

    const commonProps = {
      fullWidth: true,
      required: isRequired,
      error: !!error,
      helperText: error || warning || field.help_text,
      disabled: readOnly || isSubmitting,
      value: value || '',
      onChange: (e: any) => handleFieldChange(field.column_name, e.target.value),
    };

    const getFieldIcon = () => {
      if (error) return <ErrorIcon color="error" />;
      if (warning) return <WarningIcon color="warning" />;
      if (isTouched && !error && !warning) return <CheckCircleIcon color="success" />;
      return null;
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
            InputProps={{
              endAdornment: getFieldIcon(),
            }}
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
            InputProps={{
              endAdornment: getFieldIcon(),
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
            InputProps={{
              endAdornment: getFieldIcon(),
            }}
          />
        );

      case 'phone':
        return (
          <TextField
            {...commonProps}
            type="tel"
            label={field.display_name}
            placeholder={field.placeholder}
            InputProps={{
              endAdornment: getFieldIcon(),
            }}
          />
        );

      case 'url':
        return (
          <TextField
            {...commonProps}
            type="url"
            label={field.display_name}
            placeholder={field.placeholder}
            InputProps={{
              endAdornment: getFieldIcon(),
            }}
          />
        );

      case 'password':
        return (
          <TextField
            {...commonProps}
            type="password"
            label={field.display_name}
            placeholder={field.placeholder}
            InputProps={{
              endAdornment: getFieldIcon(),
            }}
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
                helperText: error || warning || field.help_text,
                InputProps: {
                  endAdornment: getFieldIcon(),
                },
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
                helperText: error || warning || field.help_text,
                InputProps: {
                  endAdornment: getFieldIcon(),
                },
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
                helperText: error || warning || field.help_text,
                InputProps: {
                  endAdornment: getFieldIcon(),
                },
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
              endAdornment={getFieldIcon()}
            >
              {field.options?.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {(error || warning) && (
              <Typography variant="caption" color={error ? 'error' : 'warning'} sx={{ mt: 0.5, ml: 2 }}>
                {error || warning}
              </Typography>
            )}
          </FormControl>
        );

      case 'autocomplete':
        return (
          <Autocomplete
            options={field.options || []}
            value={value || ''}
            onChange={(_, newValue) => handleFieldChange(field.column_name, newValue)}
            disabled={readOnly || isSubmitting}
            renderInput={(params) => (
              <TextField
                {...params}
                label={field.display_name}
                required={isRequired}
                error={!!error}
                helperText={error || warning || field.help_text}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: getFieldIcon(),
                }}
              />
            )}
          />
        );

      case 'checkbox':
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={!!value}
                onChange={(e) => handleFieldChange(field.column_name, e.target.checked)}
                disabled={readOnly || isSubmitting}
                color={error ? 'error' : warning ? 'warning' : 'primary'}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {field.display_name}
                {getFieldIcon()}
              </Box>
            }
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
            InputProps={{
              endAdornment: getFieldIcon(),
            }}
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
            {(error || warning) && (
              <Typography variant="caption" color={error ? 'error' : 'warning'} sx={{ mt: 0.5 }}>
                {error || warning}
              </Typography>
            )}
          </FormControl>
        );

      case 'slider':
        return (
          <Box>
            <Typography gutterBottom>{field.display_name}</Typography>
            <Slider
              value={value || field.min_value || 0}
              onChange={(_, newValue) => handleFieldChange(field.column_name, newValue)}
              disabled={readOnly || isSubmitting}
              min={field.min_value || 0}
              max={field.max_value || 100}
              step={field.step || 1}
              marks={field.marks}
              valueLabelDisplay="auto"
            />
            <Typography variant="caption" color="text.secondary">
              {value || field.min_value || 0}
            </Typography>
          </Box>
        );

      case 'rating':
        return (
          <Box>
            <Typography gutterBottom>{field.display_name}</Typography>
            <Rating
              value={value || 0}
              onChange={(_, newValue) => handleFieldChange(field.column_name, newValue)}
              disabled={readOnly || isSubmitting}
              max={field.max_value || 5}
            />
          </Box>
        );

      case 'switch':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={!!value}
                onChange={(e) => handleFieldChange(field.column_name, e.target.checked)}
                disabled={readOnly || isSubmitting}
                color={error ? 'error' : warning ? 'warning' : 'primary'}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {field.display_name}
                {getFieldIcon()}
              </Box>
            }
          />
        );

      default:
        return (
          <TextField
            {...commonProps}
            label={field.display_name}
            placeholder={field.placeholder}
            InputProps={{
              endAdornment: getFieldIcon(),
            }}
          />
        );
    }
  }, [formData, errors, warnings, requiredFields, touchedFields, readOnly, isSubmitting, handleFieldChange]);

  // Render form section
  const renderFormSection = useCallback((section: FormSection, index: number) => {
    if (section.collapsible) {
      return (
        <Accordion key={section.title} defaultExpanded={index === 0}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{section.title}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {section.fields.map((field) => (
                <Grid item xs={12} sm={6} md={4} key={field.column_name}>
                  {renderField(field)}
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      );
    }

    return (
      <Card key={section.title} sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {section.title}
          </Typography>
          {section.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {section.description}
            </Typography>
          )}
          <Grid container spacing={2}>
            {section.fields.map((field) => (
              <Grid item xs={12} sm={6} md={4} key={field.column_name}>
                {renderField(field)}
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    );
  }, [renderField]);

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
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip label={currentTemplate.toUpperCase()} color="primary" size="small" />
                {readOnly && <Chip label="READ ONLY" color="warning" size="small" />}
                {enableAutoSave && (
                  <Chip
                    label={autoSaveStatus.toUpperCase()}
                    color={autoSaveStatus === 'saved' ? 'success' : autoSaveStatus === 'error' ? 'error' : 'default'}
                    size="small"
                  />
                )}
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {schema.displayName} • {tableName}
            </Typography>
          </Box>

          {/* Progress Bar */}
          {showProgress && formSections.length > 1 && (
            <Box sx={{ p: 2 }}>
              <LinearProgress
                variant="determinate"
                value={(activeStep / formSections.length) * 100}
                sx={{ mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                Step {activeStep + 1} of {formSections.length}
              </Typography>
            </Box>
          )}

          {/* Form Content */}
          <Box sx={{ p: 3 }}>
            {formSections.length > 1 ? (
              /* Multi-step form */
              <Stepper activeStep={activeStep} orientation="vertical">
                {formSections.map((section, index) => (
                  <Step key={section.title}>
                    <StepLabel>{section.title}</StepLabel>
                    <StepContent>
                      {renderFormSection(section, index)}
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
            ) : formSections.length === 1 ? (
              /* Single section form */
              renderFormSection(formSections[0], 0)
            ) : (
              /* Tabbed form */
              <Box>
                <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} sx={{ mb: 2 }}>
                  {formSections.map((section, index) => (
                    <Tab key={section.title} label={section.title} />
                  ))}
                </Tabs>
                {formSections.map((section, index) => (
                  <Box key={section.title} hidden={activeTab !== index}>
                    {renderFormSection(section, index)}
                  </Box>
                ))}
              </Box>
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

export default EnhancedDynamicForm;
