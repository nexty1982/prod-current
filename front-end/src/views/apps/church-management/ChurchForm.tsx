/**
 * Orthodox Metrics - Church Management Create/Edit Form
 * Form for creating and editing church information
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Box,
  Grid,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Divider,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconTrash,
} from '@tabler/icons-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import PageContainer from 'src/components/container/PageContainer';
import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import { useAuth } from 'src/context/AuthContext';
import { orthodoxMetricsAPI } from 'src/api/orthodox-metrics.api';
import { logger } from 'src/utils/logger';
import type { SupportedLanguage } from 'src/types/orthodox-metrics.types';

const validationSchema = Yup.object({
  name: Yup.string().required('Church name is required').min(2, 'Name must be at least 2 characters'),
  email: Yup.string().email('Invalid email format').required('Email is required'),
  city: Yup.string(),
  state_province: Yup.string(),
  postal_code: Yup.string(),
  country: Yup.string(),
  preferred_language: Yup.string().required('Language preference is required'),
  timezone: Yup.string().required('Timezone is required'),
  currency: Yup.string(),
  tax_id: Yup.string(),
});

interface ChurchFormProps { }

const ChurchForm: React.FC<ChurchFormProps> = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isEdit = Boolean(id);

  // Handle form field changes with logging
  const handleFieldChange = (fieldName: string, value: any) => {
    formik.setFieldValue(fieldName, value);
    
    // Log field change for important fields
    if (['name', 'email', 'preferred_language', 'timezone', 'is_active'].includes(fieldName)) {
      logger.info('Church Management', `Church form field updated: ${fieldName}`, {
        field: fieldName,
        value: typeof value === 'string' ? value : JSON.stringify(value),
        isEdit: isEdit,
        churchId: id,
        userAction: 'church_form_field_change'
      });
    }
  };

  // Handle back button click
  const handleBackClick = () => {
    logger.info('Church Management', 'Church form back button clicked', {
      isEdit: isEdit,
      churchId: id,
      formChanged: formik.dirty,
      userAction: 'church_form_back'
    });
    
    navigate('/apps/church-management');
  };

  // Handle form reset
  const handleFormReset = () => {
    formik.resetForm();
    
    logger.info('Church Management', 'Church form reset', {
      isEdit: isEdit,
      churchId: id,
      userAction: 'church_form_reset'
    });
  };

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/apps/church-management', title: 'Church Management' },
    { title: isEdit ? 'Edit Church' : 'Create Church' },
  ];

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state_province: '',
      postal_code: '',
      country: '',
      preferred_language: 'en',
      timezone: 'UTC',
      currency: 'USD',
      tax_id: '',
      website: '',
      description_multilang: '',
      settings: '',
      is_active: true,
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setLoading(true);
        setError(null);
        setSuccess(null);

        // Log form submission start
        logger.info('Church Management', `Church form submission started: ${isEdit ? 'update' : 'create'}`, {
          churchName: values.name,
          churchEmail: values.email,
          isEdit: isEdit,
          churchId: id,
          userAction: isEdit ? 'church_update_submit' : 'church_create_submit'
        });

        const churchData = {
          ...values,
          preferred_language: values.preferred_language as SupportedLanguage,
        };

        if (isEdit && id) {
          await orthodoxMetricsAPI.churches.update(parseInt(id), churchData);
          setSuccess('Church updated successfully!');
          logger.info('Church Management', 'Church updated successfully', {
            churchId: id,
            churchName: formik.values.name,
            userAction: 'church_update'
          });
        } else {
          await orthodoxMetricsAPI.churches.create(churchData);
          setSuccess('Church created successfully!');
          logger.info('Church Management', 'Church created successfully', {
            churchName: formik.values.name,
            userAction: 'church_create'
          });
        }

        // Log successful redirect
        logger.info('Church Management', 'Redirecting to church list after successful operation', {
          operation: isEdit ? 'update' : 'create',
          churchName: values.name,
          userAction: 'church_form_redirect'
        });

        // Redirect after success
        setTimeout(() => {
          navigate('/apps/church-management');
        }, 2000);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        
        // Log the error to the logging system
        logger.error('Church Management', `Church ${isEdit ? 'update' : 'creation'} failed`, {
          error: errorMessage,
          churchName: formik.values.name,
          churchEmail: formik.values.email,
          isEdit: isEdit,
          churchId: id,
          userAction: isEdit ? 'church_update' : 'church_create',
          formValues: formik.values
        });
      } finally {
        setLoading(false);
      }
    },
  });

  // Load church data for editing
  useEffect(() => {
    if (isEdit && id) {
      const loadChurch = async () => {
        try {
          setLoading(true);
          
          // Log the start of church loading for edit
          logger.info('Church Management', 'Loading church data for editing', {
            churchId: id,
            userAction: 'church_load_for_edit_start'
          });
          
          const church = await orthodoxMetricsAPI.churches.getById(parseInt(id));
          formik.setValues({
            name: church.name || '',
            email: church.email || '',
            phone: church.phone || '',
            address: church.address || '',
            city: church.city || '',
            state_province: church.state_province || '',
            postal_code: church.postal_code || '',
            country: church.country || '',
            preferred_language: church.preferred_language || 'en',
            timezone: church.timezone || 'UTC',
            currency: church.currency || 'USD',
            tax_id: church.tax_id || '',
            website: church.website || '',
            description_multilang: church.description_multilang || '',
            settings: church.settings || '',
            is_active: church.is_active ?? true,
          });
          
          // Log successful load
          logger.info('Church Management', 'Church data loaded successfully for editing', {
            churchId: id,
            churchName: church.name,
            userAction: 'church_load_for_edit_success'
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load church data';
          console.error('Error loading church for edit:', err);
          
          // Check if it's a 404 error (church not found)
          if (errorMessage.includes('404') || errorMessage.includes('not found')) {
            setError(`Church with ID ${id} not found. Available church: ID 1 (Saints Peter and Paul Orthodox Church). Please check the URL or navigate back to the church list.`);
            
            // Add a button to navigate to the existing church
            setTimeout(() => {
              if (window.confirm('Would you like to edit the available church (Saints Peter and Paul Orthodox Church) instead?')) {
                navigate('/apps/church-management/edit/1');
              } else {
                navigate('/apps/church-management');
              }
            }, 3000);
          } else {
            // For other errors, provide a user-friendly message with fallback
            setError(`Unable to load church data: ${errorMessage}. You can still create a new church with the form below.`);
          }
          
          // Log the error to the logging system
          logger.error('Church Management', 'Failed to load church data for editing', {
            error: errorMessage,
            churchId: id,
            userAction: 'church_load_for_edit',
            errorType: errorMessage.includes('404') ? 'not_found' : 'server_error'
          });
        } finally {
          setLoading(false);
        }
      };

      loadChurch();
    } else if (!isEdit) {
      // Log form opening for new church creation
      logger.info('Church Management', 'New church form opened', {
        userAction: 'church_form_open_create'
      });
    }
  }, [id, isEdit]);

  if (!hasRole(['admin', 'super_admin', 'supervisor'])) {
    // Log the access denied error
    logger.warn('Church Management', 'Access denied. Administrator privileges required to edit/create churches.', {
      userAction: 'church_form_access_denied',
      requiredRoles: ['admin', 'super_admin', 'supervisor'],
      path: window.location.pathname,
      isEdit: isEdit
    });
    
    return (
      <PageContainer title="Church Management" description="Church management system">
        <Alert severity="error">
          Access denied. Administrator privileges required.
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={isEdit ? 'Edit Church' : 'Create Church'}
      description="Church management form"
    >
      <Breadcrumb title={isEdit ? 'Edit Church' : 'Create Church'} items={BCrumb} />

      <Grid container spacing={3}>
        {/* Header */}
        <Grid size={{ xs: 12 }}>
          <Box display="flex" alignItems="center" mb={3}>
            <IconButton onClick={handleBackClick} sx={{ mr: 2 }}>
              <IconArrowLeft />
            </IconButton>
            <Typography variant="h4" color="primary">
              {isEdit ? 'Edit Church' : 'Create New Church'}
            </Typography>
          </Box>
        </Grid>

        {/* Alerts */}
        {error && (
          <Grid size={{ xs: 12 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          </Grid>
        )}

        {success && (
          <Grid size={{ xs: 12 }}>
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          </Grid>
        )}

        {/* Form */}
        <Grid size={{ xs: 12 }}>
          <form onSubmit={formik.handleSubmit}>
            <Grid container spacing={3}>
              {/* Basic Information */}
              <Grid size={{ xs: 12, lg: 8 }}>
                <Card>
                  <CardHeader title="Basic Information" />
                  <CardContent>
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label="Church Name *"
                          name="name"
                          value={formik.values.name}
                          onChange={(e) => {
                            formik.handleChange(e);
                            handleFieldChange('name', e.target.value);
                          }}
                          onBlur={formik.handleBlur}
                          error={formik.touched.name && Boolean(formik.errors.name)}
                          helperText={formik.touched.name && formik.errors.name}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="Email *"
                          name="email"
                          type="email"
                          value={formik.values.email}
                          onChange={(e) => {
                            formik.handleChange(e);
                            handleFieldChange('email', e.target.value);
                          }}
                          onBlur={formik.handleBlur}
                          error={formik.touched.email && Boolean(formik.errors.email)}
                          helperText={formik.touched.email && formik.errors.email}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="State/Province"
                          name="state_province"
                          value={formik.values.state_province}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="Postal Code"
                          name="postal_code"
                          value={formik.values.postal_code}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="Phone"
                          name="phone"
                          value={formik.values.phone}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="Website"
                          name="website"
                          type="url"
                          value={formik.values.website}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        />
                      </Grid>

                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label="Address"
                          name="address"
                          multiline
                          rows={2}
                          value={formik.values.address}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        />
                      </Grid>

                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label="Description"
                          name="description_multilang"
                          multiline
                          rows={3}
                          value={formik.values.description_multilang}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="Tax ID"
                          name="tax_id"
                          value={formik.values.tax_id}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="Currency"
                          name="currency"
                          value={formik.values.currency}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          placeholder="USD"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Location & Settings */}
              <Grid size={{ xs: 12, lg: 4 }}>
                <Grid container spacing={3}>
                  {/* Location */}
                  <Grid size={{ xs: 12 }}>
                    <Card>
                      <CardHeader title="Location" />
                      <CardContent>
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12 }}>
                            <TextField
                              fullWidth
                              label="City *"
                              name="city"
                              value={formik.values.city}
                              onChange={formik.handleChange}
                              onBlur={formik.handleBlur}
                              error={formik.touched.city && Boolean(formik.errors.city)}
                              helperText={formik.touched.city && formik.errors.city}
                            />
                          </Grid>

                          <Grid size={{ xs: 12 }}>
                            <TextField
                              fullWidth
                              label="Country *"
                              name="country"
                              value={formik.values.country}
                              onChange={formik.handleChange}
                              onBlur={formik.handleBlur}
                              error={formik.touched.country && Boolean(formik.errors.country)}
                              helperText={formik.touched.country && formik.errors.country}
                            />
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Settings */}
                  <Grid size={{ xs: 12 }}>
                    <Card>
                      <CardHeader title="Settings" />
                      <CardContent>
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12 }}>
                            <FormControl fullWidth>
                              <InputLabel>Language Preference *</InputLabel>
                              <Select
                                name="preferred_language"
                                value={formik.values.preferred_language}
                                onChange={formik.handleChange}
                                label="Language Preference *"
                                error={formik.touched.preferred_language && Boolean(formik.errors.preferred_language)}
                              >
                                <MenuItem value="en">English</MenuItem>
                                <MenuItem value="gr">Greek</MenuItem>
                                <MenuItem value="ru">Russian</MenuItem>
                                <MenuItem value="ro">Romanian</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>

                          <Grid size={{ xs: 12 }}>
                            <FormControl fullWidth>
                              <InputLabel>Timezone *</InputLabel>
                              <Select
                                name="timezone"
                                value={formik.values.timezone}
                                onChange={formik.handleChange}
                                label="Timezone *"
                                error={formik.touched.timezone && Boolean(formik.errors.timezone)}
                              >
                                <MenuItem value="UTC">UTC</MenuItem>
                                <MenuItem value="America/New_York">Eastern Time</MenuItem>
                                <MenuItem value="America/Chicago">Central Time</MenuItem>
                                <MenuItem value="America/Denver">Mountain Time</MenuItem>
                                <MenuItem value="America/Los_Angeles">Pacific Time</MenuItem>
                                <MenuItem value="Europe/Athens">Athens</MenuItem>
                                <MenuItem value="Europe/Moscow">Moscow</MenuItem>
                                <MenuItem value="Europe/Bucharest">Bucharest</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>

                          <Grid size={{ xs: 12 }}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={formik.values.is_active}
                                  onChange={(e) => {
                                    formik.setFieldValue('is_active', e.target.checked);
                                    handleFieldChange('is_active', e.target.checked);
                                  }}
                                  name="is_active"
                                />
                              }
                              label="Active"
                            />
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Grid>

              {/* Action Buttons */}
              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 3 }} />
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Button
                    variant="outlined"
                    onClick={handleBackClick}
                    disabled={loading}
                  >
                    Cancel
                  </Button>

                  <Box display="flex" gap={2}>
                    {isEdit && (
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<IconTrash />}
                        disabled={loading}
                        onClick={() => {
                          // Log delete attempt
                          logger.info('Church Management', 'Church delete confirmation requested', {
                            churchId: id,
                            churchName: formik.values.name,
                            userAction: 'church_delete_confirm_request'
                          });
                          
                          if (window.confirm('Are you sure you want to delete this church?')) {
                            // Log confirmed delete
                            logger.info('Church Management', 'Church delete confirmed', {
                              churchId: id,
                              churchName: formik.values.name,
                              userAction: 'church_delete_confirmed'
                            });
                            // Handle delete
                          } else {
                            // Log delete cancelled
                            logger.info('Church Management', 'Church delete cancelled', {
                              churchId: id,
                              churchName: formik.values.name,
                              userAction: 'church_delete_cancelled'
                            });
                          }
                        }}
                      >
                        Delete
                      </Button>
                    )}

                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={loading ? <CircularProgress size={20} /> : <IconDeviceFloppy />}
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : (isEdit ? 'Update Church' : 'Create Church')}
                    </Button>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default ChurchForm;
