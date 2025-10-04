/**
 * Unified Records Form Component
 * Leverages existing React Hook Form + Zod patterns from the codebase
 */

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Grid,
  Paper,
  Typography,
  Divider,
  Chip,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  Checkbox,
  FormGroup,
  RadioGroup,
  Radio,
  FormLabel,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { motion } from 'framer-motion';

// Types
export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'date' | 'select' | 'multiselect' | 'textarea' | 'switch' | 'checkbox' | 'radio';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: any; label: string }>;
  validation?: z.ZodType<any>;
  gridSize?: { xs?: number; sm?: number; md?: number; lg?: number };
  disabled?: boolean;
  helperText?: string;
  multiline?: boolean;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface RecordsFormProps<T = any> {
  fields: FormField[];
  initialValues?: Partial<T>;
  onSubmit: (data: T) => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
  submitLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
  className?: string;
  validationSchema?: z.ZodSchema<T>;
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all';
  disabled?: boolean;
}

export function RecordsForm<T = any>({
  fields,
  initialValues = {},
  onSubmit,
  onCancel,
  loading = false,
  error = null,
  success = null,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  showCancel = true,
  className = '',
  validationSchema,
  mode = 'onBlur',
  disabled = false,
}: RecordsFormProps<T>) {
  // Build validation schema from fields if not provided
  const builtSchema = useMemo(() => {
    if (validationSchema) return validationSchema;
    
    const schemaFields: Record<string, z.ZodType<any>> = {};
    
    fields.forEach(field => {
      let fieldSchema: z.ZodType<any>;
      
      switch (field.type) {
        case 'email':
          fieldSchema = z.string().email('Invalid email address');
          break;
        case 'number':
          fieldSchema = z.number();
          if (field.min !== undefined) fieldSchema = fieldSchema.min(field.min);
          if (field.max !== undefined) fieldSchema = fieldSchema.max(field.max);
          break;
        case 'date':
          fieldSchema = z.string().or(z.date());
          break;
        case 'multiselect':
          fieldSchema = z.array(z.any());
          break;
        case 'switch':
        case 'checkbox':
          fieldSchema = z.boolean();
          break;
        case 'radio':
          fieldSchema = z.string();
          break;
        default:
          fieldSchema = z.string();
      }
      
      if (field.required) {
        fieldSchema = fieldSchema.refine(val => {
          if (field.type === 'multiselect') return Array.isArray(val) && val.length > 0;
          if (field.type === 'switch' || field.type === 'checkbox') return typeof val === 'boolean';
          return val !== undefined && val !== null && val !== '';
        }, `${field.label} is required`);
      } else {
        fieldSchema = fieldSchema.optional();
      }
      
      if (field.validation) {
        fieldSchema = field.validation;
      }
      
      schemaFields[field.key] = fieldSchema;
    });
    
    return z.object(schemaFields);
  }, [fields, validationSchema]);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    reset,
    watch,
  } = useForm<T>({
    resolver: zodResolver(builtSchema),
    mode,
    defaultValues: initialValues as any,
  });

  // Reset form when initial values change
  useEffect(() => {
    reset(initialValues as any);
  }, [initialValues, reset]);

  const handleFormSubmit = async (data: T) => {
    try {
      await onSubmit(data);
    } catch (err) {
      console.error('Form submission error:', err);
    }
  };

  const renderField = (field: FormField) => {
    const fieldError = errors[field.key as keyof typeof errors];
    const fieldValue = watch(field.key as keyof T);

    const commonProps = {
      fullWidth: true,
      disabled: disabled || field.disabled,
      error: !!fieldError,
      helperText: fieldError?.message || field.helperText,
      placeholder: field.placeholder,
    };

    const gridProps = {
      xs: field.gridSize?.xs || 12,
      sm: field.gridSize?.sm || 6,
      md: field.gridSize?.md || 4,
      lg: field.gridSize?.lg || 3,
    };

    const renderFieldContent = () => {
      switch (field.type) {
        case 'text':
        case 'email':
          return (
            <Controller
              name={field.key as keyof T}
              control={control}
              render={({ field: controllerField }) => (
                <TextField
                  {...controllerField}
                  {...commonProps}
                  type={field.type}
                  multiline={field.multiline}
                  rows={field.rows}
                />
              )}
            />
          );

        case 'number':
          return (
            <Controller
              name={field.key as keyof T}
              control={control}
              render={({ field: controllerField }) => (
                <TextField
                  {...controllerField}
                  {...commonProps}
                  type="number"
                  inputProps={{
                    min: field.min,
                    max: field.max,
                    step: field.step,
                  }}
                />
              )}
            />
          );

        case 'date':
          return (
            <Controller
              name={field.key as keyof T}
              control={control}
              render={({ field: controllerField }) => (
                <DatePicker
                  {...controllerField}
                  label={field.label}
                  disabled={disabled || field.disabled}
                  slotProps={{
                    textField: {
                      ...commonProps,
                      error: !!fieldError,
                      helperText: fieldError?.message || field.helperText,
                    },
                  }}
                />
              )}
            />
          );

        case 'select':
          return (
            <Controller
              name={field.key as keyof T}
              control={control}
              render={({ field: controllerField }) => (
                <FormControl fullWidth error={!!fieldError} disabled={disabled || field.disabled}>
                  <InputLabel>{field.label}</InputLabel>
                  <Select
                    {...controllerField}
                    label={field.label}
                  >
                    {field.options?.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldError && <FormHelperText>{fieldError.message}</FormHelperText>}
                </FormControl>
              )}
            />
          );

        case 'multiselect':
          return (
            <Controller
              name={field.key as keyof T}
              control={control}
              render={({ field: controllerField }) => (
                <FormControl fullWidth error={!!fieldError} disabled={disabled || field.disabled}>
                  <InputLabel>{field.label}</InputLabel>
                  <Select
                    {...controllerField}
                    multiple
                    label={field.label}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as any[]).map((value) => {
                          const option = field.options?.find(opt => opt.value === value);
                          return (
                            <Chip
                              key={value}
                              label={option?.label || value}
                              size="small"
                            />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {field.options?.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldError && <FormHelperText>{fieldError.message}</FormHelperText>}
                </FormControl>
              )}
            />
          );

        case 'textarea':
          return (
            <Controller
              name={field.key as keyof T}
              control={control}
              render={({ field: controllerField }) => (
                <TextField
                  {...controllerField}
                  {...commonProps}
                  multiline
                  rows={field.rows || 4}
                />
              )}
            />
          );

        case 'switch':
          return (
            <Controller
              name={field.key as keyof T}
              control={control}
              render={({ field: controllerField }) => (
                <FormControlLabel
                  control={
                    <Switch
                      {...controllerField}
                      checked={controllerField.value || false}
                      disabled={disabled || field.disabled}
                    />
                  }
                  label={field.label}
                />
              )}
            />
          );

        case 'checkbox':
          return (
            <Controller
              name={field.key as keyof T}
              control={control}
              render={({ field: controllerField }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      {...controllerField}
                      checked={controllerField.value || false}
                      disabled={disabled || field.disabled}
                    />
                  }
                  label={field.label}
                />
              )}
            />
          );

        case 'radio':
          return (
            <Controller
              name={field.key as keyof T}
              control={control}
              render={({ field: controllerField }) => (
                <FormControl component="fieldset" error={!!fieldError}>
                  <FormLabel component="legend">{field.label}</FormLabel>
                  <RadioGroup
                    {...controllerField}
                    value={controllerField.value || ''}
                  >
                    {field.options?.map((option) => (
                      <FormControlLabel
                        key={option.value}
                        value={option.value}
                        control={<Radio disabled={disabled || field.disabled} />}
                        label={option.label}
                      />
                    ))}
                  </RadioGroup>
                  {fieldError && <FormHelperText>{fieldError.message}</FormHelperText>}
                </FormControl>
              )}
            />
          );

        default:
          return null;
      }
    };

    return (
      <Grid item {...gridProps}>
        {renderFieldContent()}
      </Grid>
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper
        elevation={2}
        sx={{
          p: 3,
          borderRadius: 2,
          maxWidth: '100%',
        }}
        className={className}
      >
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <Grid container spacing={3}>
            {fields.map((field) => (
              <motion.div
                key={field.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{ width: '100%' }}
              >
                {renderField(field)}
              </motion.div>
            ))}
          </Grid>

          {(error || success) && (
            <Box sx={{ mt: 2 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 1 }}>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert severity="success" sx={{ mb: 1 }}>
                  {success}
                </Alert>
              )}
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            {showCancel && onCancel && (
              <Button
                variant="outlined"
                onClick={onCancel}
                disabled={loading || disabled}
              >
                {cancelLabel}
              </Button>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={loading || disabled || !isValid}
              startIcon={loading && <CircularProgress size={20} />}
            >
              {loading ? 'Saving...' : submitLabel}
            </Button>
          </Box>
        </form>
      </Paper>
    </LocalizationProvider>
  );
}

export default RecordsForm;
