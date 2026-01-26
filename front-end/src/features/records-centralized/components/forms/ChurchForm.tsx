/**
 * Orthodox Metrics - Church Management Create/Edit Form
 * Form for creating and editing church information
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
} from '@mui/material';
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconTrash,
  IconBuilding,
  IconMail,
  IconMapPin,
  IconSettings,
  IconDatabase,
} from '@tabler/icons-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import BlankCard from '@/shared/ui/BlankCard';
import { useAuth } from '@/context/AuthContext';
import { adminAPI } from '@/api/admin.api';
import { logger } from '@/utils/logger';
import type { SupportedLanguage } from '@/types/orthodox-metrics.types';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Storage as StorageIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  VpnKey as VpnKeyIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import UserManagementDialog from './UserManagementDialog';

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
  church_id: Yup.number()
    .positive('Church ID must be a positive number')
    .integer('Church ID must be an integer')
    .nullable(),
});

interface ChurchFormProps { }

const ChurchForm: React.FC<ChurchFormProps> = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [templateChurches, setTemplateChurches] = useState<any[]>([]);
  const [loadingTemplateChurches, setLoadingTemplateChurches] = useState(false);
  const [isFieldModified, setIsFieldModified] = useState<Record<string, boolean>>({});
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    users: false,
    advanced: false,
    database: false
  });
  
  // Church management data
  const [churchUsers, setChurchUsers] = useState<any[]>([]);
  const [recordCounts, setRecordCounts] = useState<Record<string, number>>({});
  
  // Database update functionality
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [updatingDatabase, setUpdatingDatabase] = useState(false);
  const [databaseUpdateResult, setDatabaseUpdateResult] = useState<{success: boolean, message: string} | null>(null);
  const [databaseInfo, setDatabaseInfo] = useState<any>(null);
  const [databaseLogs, setDatabaseLogs] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [loadingDatabase, setLoadingDatabase] = useState(false);
  
  // User management dialogs
  const [userDialog, setUserDialog] = useState({ open: false, user: null, action: '' });
  const [passwordResetDialog, setPasswordResetDialog] = useState({ open: false, user: null });

  const isEdit = Boolean(id);

  // Handle form field changes with logging
  const handleFieldChange = (fieldName: string, value: any) => {
    setIsFieldModified(prev => ({ ...prev, [fieldName]: true }));
    
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

  // Load church users
  const loadChurchUsers = async (churchId: string) => {
    try {
      setLoadingUsers(true);
      const response = await fetch(`/api/admin/churches/${churchId}/users`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setChurchUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error loading church users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load record counts
  const loadRecordCounts = async (churchId: string) => {
    try {
      setLoadingRecords(true);
      const response = await fetch(`/api/admin/churches/${churchId}/record-counts`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setRecordCounts(data.counts || {});
      }
    } catch (error) {
      console.error('Error loading record counts:', error);
    } finally {
      setLoadingRecords(false);
    }
  };

  // Load database information
  const loadDatabaseInfo = async (churchId: string) => {
    try {
      setLoadingDatabase(true);
      console.log('🔍 Loading database info for church ID:', churchId);
      
      const response = await fetch(`/api/admin/churches/${churchId}/database-info`, {
        credentials: 'include'
      });
      
      console.log('🔍 Database info response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Database info response data:', data);
        console.log('🔍 Database object:', data.database);
        console.log('🔍 Database name:', data.database?.name);
        
        setDatabaseInfo(data.database || null);
        setDatabaseLogs(data.logs || []);
      } else {
        const errorText = await response.text();
        console.error('🔍 Database info API error:', response.status, errorText);
        setError(`Failed to load database info: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('🔍 Error loading database info:', error);
      setError(`Error loading database info: ${error.message}`);
    } finally {
      setLoadingDatabase(false);
    }
  };

  // Test database connection
  const testDatabaseConnection = async (churchId: string) => {
    try {
      setLoadingDatabase(true);
      setError(null); // Clear any previous errors
      setSuccess(null); // Clear any previous success messages
      
      console.log('🔍 Testing database connection for church ID:', churchId);
      
      const response = await fetch(`/api/admin/churches/${churchId}/test-connection`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('🔍 Test connection response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Test connection response data:', data);
        
        if (data.success && data.data?.connection) {
          const connection = data.data.connection;
          setSuccess(`Database connection successful! Connection time: ${connection.connection_time_ms}ms`);
          // Refresh database info after successful test
          await loadDatabaseInfo(churchId);
        } else {
          setError(`Database connection failed: ${data.error || 'Unknown error'}`);
        }
      } else {
        const errorText = await response.text();
        console.error('🔍 Test connection API error:', response.status, errorText);
        setError(`Failed to test database connection: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('🔍 Error testing database connection:', error);
      setError(`Error testing database connection: ${error.message}`);
    } finally {
      setLoadingDatabase(false);
    }
  };

  // Handle section expansion
  const handleSectionToggle = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));

    // Load data when section is expanded for the first time
    if (!expandedSections[section] && isEdit && id) {
      switch (section) {
        case 'users':
          loadChurchUsers(id);
          break;
        case 'advanced':
          loadRecordCounts(id);
          break;
        case 'database':
          loadDatabaseInfo(id);
          break;
      }
    }
  };

  // User management functions
  const handleUserAction = async (user: any, action: string) => {
    try {
      const response = await fetch(`/api/admin/churches/${id}/users/${user.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        setSuccess(`User ${action} successful`);
        loadChurchUsers(id!);
      } else {
        throw new Error(`Failed to ${action} user`);
      }
    } catch (error) {
      setError(`Error: ${error.message}`);
    }
  };

  const handlePasswordReset = async (user: any) => {
    try {
      const response = await fetch(`/api/admin/churches/${id}/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`Password reset for ${user.email}. New password: ${data.newPassword}`);
      } else {
        throw new Error('Failed to reset password');
      }
    } catch (error) {
      setError(`Error resetting password: ${error.message}`);
    }
  };

  // Handle user save (add/edit)
  const handleUserSave = async (userData: any) => {
    try {
      const endpoint = userDialog.action === 'add' 
        ? `/api/admin/churches/${id}/users`
        : `/api/admin/churches/${id}/users/${userDialog.user?.id}`;
      
      const method = userDialog.action === 'add' ? 'POST' : 'PUT';

      const response = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        setSuccess(`User ${userDialog.action === 'add' ? 'added' : 'updated'} successfully`);
        // Refresh the users list if we're in edit mode
        if (expandedSections.users && id) {
          loadChurchUsers(id);
        }
      } else {
        const data = await response.json();
        throw new Error(data.message || `Failed to ${userDialog.action} user`);
      }
    } catch (error) {
      setError(`Error ${userDialog.action === 'add' ? 'adding' : 'updating'} user: ${error.message}`);
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

  // Load English churches for template selection
  useEffect(() => {
    const fetchEnglishChurches = async () => {
      if (!isEdit) { // Only fetch for new churches
        try {
          setLoadingTemplateChurches(true);
          const response = await fetch('/api/admin/churches?preferred_language=en', {
            credentials: 'include'
          });

          if (!response.ok) {
            throw new Error('Failed to fetch template churches');
          }

          const data = await response.json();
          setTemplateChurches(data.churches || []);
        } catch (err) {
          console.error('Error fetching template churches:', err);
        } finally {
          setLoadingTemplateChurches(false);
        }
      }
    };

    fetchEnglishChurches();
  }, [isEdit]);

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
      database_name: '',
      has_baptism_records: true,
      has_marriage_records: true,
      has_funeral_records: true,
      setup_complete: false,
      template_church_id: null, // New template field
      default_landing_page: 'church_records', // Default to church records
      church_id: null, // Church ID for linkage with records
    },
    validationSchema,
    onSubmit: async (values) => {
      console.log('Submitting form with values:', values);
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
          description_multilang: values.description_multilang,
          settings: values.settings,
          database_name: values.database_name,
          has_baptism_records: values.has_baptism_records,
          has_marriage_records: values.has_marriage_records,
          has_funeral_records: values.has_funeral_records,
          setup_complete: values.setup_complete,
          template_church_id: values.template_church_id, // Include template selection
          church_id: values.church_id, // Include church_id for database linkage
        };

        if (isEdit && id) {
          await adminAPI.churches.update(parseInt(id), churchData);
          setSuccess('Church updated successfully!');
          logger.info('Church Management', 'Church updated successfully', {
            churchId: id,
            churchName: formik.values.name,
            userAction: 'church_update'
          });
        } else {
          await adminAPI.churches.create(churchData);
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
    validateOnBlur: true,
    validateOnChange: true,
    validate: (values) => {
      const errors = {};
      const validation = validationSchema.validateSync(values, { abortEarly: false });
      if (validation && validation.inner && validation.inner.length > 0) {
        validation.inner.forEach((err) => {
          errors[err.path] = err.message;
        });
        console.log('Formik validation errors:', errors);
      }
      return errors;
    },
  });

  // Database update handler
  const handleUpdateDatabase = async () => {
    if (!selectedTemplate || !id) return;
    
    try {
      setUpdatingDatabase(true);
      setDatabaseUpdateResult(null);
      
      const response = await fetch(`/api/admin/churches/${id}/update-database`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          template: selectedTemplate
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setDatabaseUpdateResult({
          success: true,
          message: result.message || 'Database updated successfully!'
        });
      } else {
        setDatabaseUpdateResult({
          success: false,
          message: result.error || 'Failed to update database'
        });
      }
    } catch (error) {
      setDatabaseUpdateResult({
        success: false,
        message: 'Error updating database: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
    } finally {
      setUpdatingDatabase(false);
    }
  };

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
          
          const church = await adminAPI.churches.getById(parseInt(id));
          
          // Add null safety check
          if (!church) {
            throw new Error('Church data not found or invalid response from server');
          }
          
          console.log('📋 Loaded church data for editing:', church);
          
          // Set all form values with null safety and fallback defaults
          const churchValues = {
            name: church?.name || '',
            email: church?.email || '',
            phone: church?.phone || '',
            address: church?.address || '',
            city: church?.city || '',
            state_province: church?.state_province || '',
            postal_code: church?.postal_code || '',
            country: church?.country || '',
            preferred_language: church?.preferred_language || 'en',
            timezone: church?.timezone || 'UTC',
            currency: church?.currency || 'USD',
            tax_id: church?.tax_id || '',
            website: church?.website || '',
            description_multilang: church?.description_multilang || '',
            settings: church?.settings || '',
            is_active: church?.is_active ?? true,
            database_name: church?.database_name || '',
            has_baptism_records: church?.has_baptism_records ?? true,
            has_marriage_records: church?.has_marriage_records ?? true,
            has_funeral_records: church?.has_funeral_records ?? true,
            setup_complete: church?.setup_complete ?? false,
            template_church_id: church?.template_church_id || null,
            default_landing_page: church?.default_landing_page || 'church_records',
            church_id: church?.id || church?.church_id || null, // Include church_id for database linkage
          };

          // Ensure all required fields have fallback values
          if (!churchValues.name && church?.church_name) {
            churchValues.name = church.church_name;
          }
          
          console.log('📝 Setting form values:', churchValues);
          
          // Use setValues to populate the form
          formik.setValues(churchValues);
          
          // Also set individual fields as a fallback
          Object.keys(churchValues).forEach(key => {
            formik.setFieldValue(key, churchValues[key]);
          });
          
          console.log('✅ Form values set, current formik values:', formik.values);
          
          // Log successful load
          logger.info('Church Management', 'Church data loaded successfully for editing', {
            churchId: id,
            churchName: church?.name || 'Unknown',
            userAction: 'church_load_for_edit_success'
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load church data';
          console.error('Error loading church for edit:', err);
          
          // Check if it's a 404 error (church not found)
          if (errorMessage.includes('404') || errorMessage.includes('not found')) {
            setError(`Church with ID ${id} not found. Please check the URL or navigate back to the church list.`);
            
            // Navigate back to church list after a delay
            setTimeout(() => {
              navigate('/apps/church-management');
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

  if (!hasRole('admin') && !hasRole('super_admin') && !hasRole('supervisor')) {
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
      title={isEdit ? "Edit Church" : "Add Church"} 
      description={isEdit ? "Edit church information" : "Create a new church"}
    >
      <Breadcrumb 
        title={isEdit ? "Edit Church" : "Add Church"} 
        items={[
          { to: '/', title: 'Home' },
          { to: '/apps/church-management', title: 'Church Management' },
          { title: isEdit ? 'Edit Church' : 'Add Church' }
        ]} 
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {loading && isEdit && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} />
            <Typography>Loading church data...</Typography>
          </Stack>
        </Alert>
      )}

            <form onSubmit={formik.handleSubmit}>
        {loading && isEdit ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <Stack spacing={3} alignItems="center">
              <CircularProgress size={60} />
              <Typography variant="h6">Loading church data...</Typography>
              <Typography color="textSecondary">Please wait while we fetch the church information.</Typography>
            </Stack>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Church Identity & Contact Information */}
            <Grid item xs={12} lg={6}>
            <BlankCard>
              <CardContent>
                <Typography variant="h5" mb={1}>
                  <IconBuilding size={24} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  Church Identity & Contact
                </Typography>
                <Typography color="textSecondary" mb={3}>
                  Basic church information and contact details
                </Typography>

                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label="Church Name"
                    name="name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.name && Boolean(formik.errors.name)}
                    helperText={formik.touched.name && formik.errors.name}
                    required
                  />

                  <TextField
                    fullWidth
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.email && Boolean(formik.errors.email)}
                    helperText={formik.touched.email && formik.errors.email}
                    InputProps={{
                      startAdornment: <IconMail size={20} style={{ marginRight: 8, opacity: 0.7 }} />
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Phone Number"
                    name="phone"
                    value={formik.values.phone}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.phone && Boolean(formik.errors.phone)}
                    helperText={formik.touched.phone && formik.errors.phone}
                  />

                  <TextField
                    fullWidth
                    label="Address"
                    name="address"
                    multiline
                    rows={3}
                    value={formik.values.address}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.address && Boolean(formik.errors.address)}
                    helperText={formik.touched.address && formik.errors.address}
                    InputProps={{
                      startAdornment: <IconMapPin size={20} style={{ marginRight: 8, opacity: 0.7, alignSelf: 'flex-start', marginTop: 12 }} />
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Website URL"
                    name="website"
                    value={formik.values.website}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.website && Boolean(formik.errors.website)}
                    helperText={formik.touched.website && formik.errors.website}
                    placeholder="https://example.com"
                  />

                  <TextField
                    fullWidth
                    label="Description"
                    name="description"
                    multiline
                    rows={4}
                    value={formik.values.description}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.description && Boolean(formik.errors.description)}
                    helperText={formik.touched.description && formik.errors.description}
                    placeholder="Brief description of the church..."
                  />
                </Stack>
              </CardContent>
            </BlankCard>
          </Grid>

          {/* Status, Configuration & Settings */}
          <Grid item xs={12} lg={6}>
            <BlankCard>
              <CardContent>
                <Typography variant="h5" mb={1}>
                  <IconSettings size={24} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  Status & Configuration
                </Typography>
                <Typography color="textSecondary" mb={3}>
                  Church status, timezone, and system settings
                </Typography>

                <Stack spacing={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formik.values.is_active}
                        onChange={(e) => formik.setFieldValue('is_active', e.target.checked)}
                        name="is_active"
                      />
                    }
                    label="Church Active Status"
                  />

                  <FormControl fullWidth>
                    <InputLabel>Preferred Language</InputLabel>
                    <Select
                      name="preferred_language"
                      value={formik.values.preferred_language}
                      onChange={formik.handleChange}
                      label="Preferred Language"
                    >
                      <MenuItem value="english">English</MenuItem>
                      <MenuItem value="greek">Greek</MenuItem>
                      <MenuItem value="russian">Russian</MenuItem>
                      <MenuItem value="serbian">Serbian</MenuItem>
                      <MenuItem value="romanian">Romanian</MenuItem>
                      <MenuItem value="bulgarian">Bulgarian</MenuItem>
                      <MenuItem value="arabic">Arabic</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Timezone</InputLabel>
                    <Select
                      name="timezone"
                      value={formik.values.timezone}
                      onChange={formik.handleChange}
                      label="Timezone"
                    >
                      <MenuItem value="America/New_York">Eastern Time (ET)</MenuItem>
                      <MenuItem value="America/Chicago">Central Time (CT)</MenuItem>
                      <MenuItem value="America/Denver">Mountain Time (MT)</MenuItem>
                      <MenuItem value="America/Los_Angeles">Pacific Time (PT)</MenuItem>
                      <MenuItem value="Europe/London">Greenwich Mean Time (GMT)</MenuItem>
                      <MenuItem value="Europe/Athens">Eastern European Time (EET)</MenuItem>
                      <MenuItem value="Europe/Moscow">Moscow Time (MSK)</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    label="Database Name"
                    name="database_name"
                    value={formik.values.database_name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.database_name && Boolean(formik.errors.database_name)}
                    helperText={formik.touched.database_name && formik.errors.database_name || "Unique identifier for church database"}
                    InputProps={{
                      startAdornment: <IconDatabase size={20} style={{ marginRight: 8, opacity: 0.7 }} />
                    }}
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={formik.values.enable_multilingual}
                        onChange={(e) => formik.setFieldValue('enable_multilingual', e.target.checked)}
                        name="enable_multilingual"
                      />
                    }
                    label="Enable Multilingual Support"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={formik.values.enable_notifications}
                        onChange={(e) => formik.setFieldValue('enable_notifications', e.target.checked)}
                        name="enable_notifications"
                      />
                    }
                    label="Enable Email Notifications"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={formik.values.public_calendar}
                        onChange={(e) => formik.setFieldValue('public_calendar', e.target.checked)}
                        name="public_calendar"
                      />
                    }
                    label="Public Calendar Access"
                  />
                </Stack>
              </CardContent>
            </BlankCard>
          </Grid>

          {/* Action Buttons */}
          {/* Database Update Section - Only show for existing churches */}
          {isEdit && (
            <Grid item xs={12}>
              <BlankCard>
                <CardHeader title="Database Management" />
                <CardContent>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Update the church database by adding missing tables from a template.
                  </Typography>
                  
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Select Template</InputLabel>
                        <Select
                          value={selectedTemplate}
                          onChange={(e) => setSelectedTemplate(e.target.value)}
                          label="Select Template"
                        >
                          <MenuItem value="record_template1">record_template1</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={handleUpdateDatabase}
                        disabled={!selectedTemplate || updatingDatabase}
                        startIcon={updatingDatabase ? <CircularProgress size={16} /> : null}
                        fullWidth
                      >
                        {updatingDatabase ? 'Updating Database...' : 'Update Database'}
                      </Button>
                    </Grid>
                  </Grid>
                  
                  {databaseUpdateResult && (
                    <Alert severity={databaseUpdateResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
                      {databaseUpdateResult.message}
                    </Alert>
                  )}
                </CardContent>
              </BlankCard>
            </Grid>
          )}

          <Grid item xs={12}>
            <BlankCard>
              <CardContent>
                <Stack 
                  direction="row" 
                  spacing={2} 
                  justifyContent="space-between" 
                  alignItems="center"
                >
                  <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/apps/church-management')}
                  >
                    Back to Churches
                  </Button>

                  <Stack direction="row" spacing={2}>
                    {isEdit && (
                      <Button
                        variant="outlined"
                        onClick={() => window.open(`/apps/church-management/${id}/field-mapper`, "_blank", "noopener,noreferrer,width=1200,height=800")}
                        sx={{ borderRadius: '16px' }}
                      >
                        DB → Table Mapping
                      </Button>
                    )}
                    
                    <Button
                      variant="outlined"
                      onClick={() => formik.resetForm()}
                    >
                      Reset
                    </Button>
                    
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
                      disabled={loading || !formik.isValid}
                    >
                      {loading ? 'Saving...' : (isEdit ? 'Update Church' : 'Create Church')}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </BlankCard>
          </Grid>
        </Grid>
        )}
      </form>
    </PageContainer>
  );
};

export default ChurchForm;
