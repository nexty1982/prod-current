/**
 * Orthodox Metrics - Church Management Create/Edit Form
 * Comprehensive form with user management, database config, and full validation.
 */

import { adminAPI } from '@/api/admin.api';
import { useAuth } from '@/context/AuthContext';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import { fetchWithChurchContext } from '@/shared/lib/fetchWithChurchContext';
import BlankCard from '@/shared/ui/BlankCard';
import PageContainer from '@/shared/ui/PageContainer';
import type { SupportedLanguage } from '@/types/orthodox-metrics.types';
import { logger } from '@/utils/logger';
import {
    Add as AddIcon,
    ArrowBack as ArrowBackIcon,
    Edit as EditIcon,
    Refresh as RefreshIcon,
    Save as SaveIcon,
    VpnKey as VpnKeyIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Stack,
    Switch,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import {
    IconBuilding,
    IconDatabase,
    IconRefresh,
    IconSettings,
    IconTrash,
    IconUsers
} from '@tabler/icons-react';
import { useFormik } from 'formik';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import * as Yup from 'yup';
import UserManagementDialog from './UserManagementDialog';

const validationSchema = Yup.object({
  name: Yup.string().required('Church name is required').min(2, 'Name must be at least 2 characters'),
  email: Yup.string().email('Invalid email format').required('Email is required'),
  phone: Yup.string().matches(/^[+]?[\d\s()-]*$/, 'Invalid phone format').nullable(),
  city: Yup.string(),
  state_province: Yup.string(),
  postal_code: Yup.string(),
  country: Yup.string(),
  preferred_language: Yup.string().required('Language preference is required'),
  timezone: Yup.string().required('Timezone is required'),
  currency: Yup.string(),
  tax_id: Yup.string(),
  website: Yup.string()
    .nullable()
    .transform((value) => {
      // If empty or null, return as-is
      if (!value || value.trim() === '') return value;
      
      // If it already has a protocol, return as-is
      if (/^https?:\/\//i.test(value)) return value;
      
      // Otherwise, prepend http://
      return `http://${value}`;
    })
    .url('Must be a valid URL'),
});

const ChurchForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // User management
  const [churchUsers, setChurchUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userDialogAction, setUserDialogAction] = useState<'add' | 'edit'>('add');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Database management
  const [databaseInfo, setDatabaseInfo] = useState<any>(null);
  const [loadingDatabase, setLoadingDatabase] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [updatingDatabase, setUpdatingDatabase] = useState(false);
  const [databaseUpdateResult, setDatabaseUpdateResult] = useState<{ success: boolean; message: string } | null>(null);

  // Feature flags management (global + overrides + effective)
  const [featureData, setFeatureData] = useState<{
    globalDefaults?: any;
    overrides?: any;
    effective: any;
  }>({
    effective: {
      ag_grid_enabled: false,
      power_search_enabled: false,
      custom_field_mapping_enabled: false,
      om_charts_enabled: true
    }
  });
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [updatingFeatures, setUpdatingFeatures] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'info' });

  const isEdit = Boolean(id);
  const hasLoadedRef = React.useRef(false);

  // Open users tab if navigated with state
  useEffect(() => {
    if ((location.state as any)?.openUsers) {
      setActiveTab(1);
      if (id) loadChurchUsers(id);
    }
  }, [location.state, id]);

  const loadChurchUsers = async (churchId: string) => {
    try {
      setLoadingUsers(true);
      const response = await fetchWithChurchContext(`/api/admin/churches/${churchId}/users`, {
        churchId,
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setChurchUsers(data.users || []);
      } else {
        console.error('Error loading church users: HTTP', response.status);
      }
    } catch (err) {
      console.error('Error loading church users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadDatabaseInfo = async (churchId: string) => {
    try {
      setLoadingDatabase(true);
      const response = await fetchWithChurchContext(`/api/admin/churches/${churchId}/database-info`, {
        churchId,
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setDatabaseInfo(data.database || null);
      }
    } catch (err) {
      console.error('Error loading database info:', err);
    } finally {
      setLoadingDatabase(false);
    }
  };

  const loadFeatures = async (churchId: string) => {
    try {
      setLoadingFeatures(true);
      const response = await fetch(`/api/churches/${churchId}/features`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setFeatureData({
            globalDefaults: data.data.globalDefaults,
            overrides: data.data.overrides,
            effective: data.data.effective
          });
        }
      }
    } catch (err) {
      console.error('Error loading features:', err);
    } finally {
      setLoadingFeatures(false);
    }
  };

  const updateFeature = async (featureKey: string, value: boolean) => {
    if (!id) return;
    
    try {
      setUpdatingFeatures(true);
      
      // Optimistic update
      const previousFeatureData = { ...featureData };
      setFeatureData(prev => ({
        ...prev,
        effective: { ...prev.effective, [featureKey]: value }
      }));

      const response = await fetch(`/api/churches/${id}/features`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          features: { [featureKey]: value }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setFeatureData({
            globalDefaults: data.data.globalDefaults,
            overrides: data.data.overrides,
            effective: data.data.effective
          });
          setSnackbar({ 
            open: true, 
            message: 'Feature override updated successfully', 
            severity: 'success' 
          });
        }
      } else {
        // Revert on failure
        setFeatureData(previousFeatureData);
        const errorData = await response.json();
        setSnackbar({ 
          open: true, 
          message: errorData.error?.message || 'Failed to update feature', 
          severity: 'error' 
        });
      }
    } catch (err: any) {
      // Revert on error
      setFeatureData(previousFeatureData);
      setSnackbar({ 
        open: true, 
        message: `Error: ${err.message}`, 
        severity: 'error' 
      });
    } finally {
      setUpdatingFeatures(false);
    }
  };

  const testDatabaseConnection = async (churchId: string) => {
    try {
      setLoadingDatabase(true);
      const response = await fetch(`/api/admin/churches/${churchId}/test-connection`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.connection) {
          setSnackbar({ open: true, message: `Connection OK (${data.data.connection.connection_time_ms}ms)`, severity: 'success' });
          await loadDatabaseInfo(churchId);
        } else {
          setSnackbar({ open: true, message: `Connection failed: ${data.error || 'Unknown'}`, severity: 'error' });
        }
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: `Connection error: ${err.message}`, severity: 'error' });
    } finally {
      setLoadingDatabase(false);
    }
  };

  const handleUserSave = async (userData: any) => {
    try {
      const endpoint = userDialogAction === 'add'
        ? `/api/admin/churches/${id}/users`
        : `/api/admin/churches/${id}/users/${selectedUser?.id}`;

      const response = await fetch(endpoint, {
        method: userDialogAction === 'add' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        setSnackbar({ open: true, message: `User ${userDialogAction === 'add' ? 'added' : 'updated'} successfully`, severity: 'success' });
        setUserDialogOpen(false);
        setSelectedUser(null);
        if (id) loadChurchUsers(id);
      } else {
        const data = await response.json();
        setSnackbar({ open: true, message: data.message || 'Failed to save user', severity: 'error' });
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleUserAction = async (userId: number, action: string) => {
    try {
      const response = await fetch(`/api/admin/churches/${id}/users/${userId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        setSnackbar({ open: true, message: `User ${action} successful`, severity: 'success' });
        if (id) loadChurchUsers(id);
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handlePasswordReset = async (userId: number, email: string) => {
    try {
      const response = await fetch(`/api/admin/churches/${id}/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSnackbar({ open: true, message: `Password reset for ${email}. New: ${data.newPassword}`, severity: 'success' });
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleUpdateDatabase = async () => {
    if (!selectedTemplate || !id) return;
    try {
      setUpdatingDatabase(true);
      setDatabaseUpdateResult(null);
      const response = await fetch(`/api/admin/churches/${id}/update-database`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ template: selectedTemplate }),
      });
      const result = await response.json();
      setDatabaseUpdateResult({
        success: response.ok,
        message: response.ok ? (result.message || 'Database updated') : (result.error || 'Update failed'),
      });
    } catch (err: any) {
      setDatabaseUpdateResult({ success: false, message: err.message });
    } finally {
      setUpdatingDatabase(false);
    }
  };

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
      timezone: 'America/New_York',
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
      template_church_id: null as number | null,
      default_landing_page: 'church_records',
      church_id: null as number | null,
      // Removed: enable_ag_grid, ag_grid_record_types, enable_multilingual, enable_notifications, public_calendar
      // These fields don't exist in the churches table
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setLoading(true);
        setError(null);
        setSuccess(null);

        const churchData = {
          ...values,
          preferred_language: values.preferred_language as SupportedLanguage,
        };

        if (isEdit && id) {
          await adminAPI.churches.update(parseInt(id), churchData);
          setSuccess('Church updated successfully!');
          logger.info('Church Management', 'Church updated', { churchId: id, churchName: values.name });
        } else {
          await adminAPI.churches.create(churchData);
          setSuccess('Church created successfully!');
          logger.info('Church Management', 'Church created', { churchName: values.name });
        }

        setTimeout(() => navigate('/apps/church-management'), 2000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'An error occurred';
        setError(msg);
        logger.error('Church Management', `Church ${isEdit ? 'update' : 'creation'} failed`, { error: msg });
      } finally {
        setLoading(false);
      }
    },
  });

  // Load church data for editing
  useEffect(() => {
    if (!isEdit || !id || hasLoadedRef.current) return;

    hasLoadedRef.current = true;
    let isMounted = true;

    const loadChurch = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Loading church with ID:', id);
        const church = await adminAPI.churches.getById(parseInt(id));
        console.log('Church data loaded:', church);
        
        if (!isMounted) return;
        
        if (!church) {
          throw new Error('Church data not found');
        }

        formik.setValues({
          name: church?.name || '',
          email: church?.email || '',
          phone: church?.phone || '',
          address: church?.address || '',
          city: church?.city || '',
          state_province: church?.state_province || '',
          postal_code: church?.postal_code || '',
          country: church?.country || '',
          preferred_language: church?.preferred_language || 'en',
          timezone: church?.timezone || 'America/New_York',
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
          church_id: church?.id || church?.church_id || null,
          // Removed: enable_ag_grid, ag_grid_record_types, enable_multilingual, enable_notifications, public_calendar
        });

        // Load users and database info
        if (isMounted) {
          loadChurchUsers(id);
          loadDatabaseInfo(id);
        }
      } catch (err: any) {
        if (!isMounted) return;
        
        console.error('Error loading church:', err);
        
        // Extract meaningful error message
        let msg = 'Failed to load church';
        if (err?.response?.data?.message) {
          msg = err.response.data.message;
        } else if (err?.response?.data?.error) {
          msg = err.response.data.error;
        } else if (err?.message) {
          msg = err.message;
        }
        
        // Check if it's a 404 or permission error
        const status = err?.response?.status;
        if (status === 404) {
          msg = 'Church not found. It may have been deleted.';
        } else if (status === 403) {
          msg = 'Access denied. You do not have permission to edit this church.';
        }
        
        setError(msg);
        logger.error('Church Management', 'Failed to load church for editing', { 
          churchId: id, 
          error: msg,
          status 
        });
        
        // Only redirect on 404 or if explicitly not found
        if (status === 404 || msg.toLowerCase().includes('not found')) {
          setTimeout(() => navigate('/apps/church-management'), 3000);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadChurch();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Reset hasLoadedRef when navigating to a different church
  useEffect(() => {
    hasLoadedRef.current = false;
  }, [id]);

  if (!hasRole('admin') && !hasRole('super_admin') && !hasRole('supervisor')) {
    return (
      <PageContainer title="Church Management" description="Church management system">
        <Alert severity="error">Access denied. Administrator privileges required.</Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={isEdit ? 'Edit Church' : 'Add Church'}
      description={isEdit ? 'Edit church information' : 'Create a new church'}
    >
      <Breadcrumb
        title={isEdit ? 'Edit Church' : 'Add Church'}
        items={[
          { to: '/', title: 'Home' },
          { to: '/apps/church-management', title: 'Church Management' },
          { title: isEdit ? 'Edit Church' : 'Add Church' },
        ]}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {loading && isEdit ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Stack spacing={3} alignItems="center">
            <CircularProgress size={60} />
            <Typography variant="h6">Loading church data...</Typography>
          </Stack>
        </Box>
      ) : (
        <>
          {/* Tabs for Edit mode */}
          {isEdit && (
            <BlankCard sx={{ mb: 3 }}>
              <Tabs
                value={activeTab}
                onChange={(_, val) => {
                  setActiveTab(val);
                  if (val === 1 && id && churchUsers.length === 0) loadChurchUsers(id);
                  if (val === 2 && id) {
                    if (!databaseInfo) loadDatabaseInfo(id);
                    if (!loadingFeatures) loadFeatures(id);
                  }
                }}
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab icon={<IconBuilding size={18} />} iconPosition="start" label="Church Info" />
                <Tab icon={<IconUsers size={18} />} iconPosition="start" label={`Users (${churchUsers.length})`} />
                <Tab icon={<IconDatabase size={18} />} iconPosition="start" label="Database" />
              </Tabs>
            </BlankCard>
          )}

          {/* Tab 0: Church Info Form */}
          {(activeTab === 0 || !isEdit) && (
            <form onSubmit={formik.handleSubmit}>
              <Grid container spacing={3}>
                {/* Church Identity */}
                <Grid item xs={12} lg={6}>
                  <BlankCard sx={{ borderRadius: 3, boxShadow: 3 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          mb: 3,
                          pb: 2,
                          borderBottom: '3px solid',
                          borderColor: 'primary.main',
                        }}
                      >
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: 'primary.main',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <IconBuilding size={24} />
                        </Box>
                        <Box>
                          <Typography variant="h5" fontWeight={600}>
                            Church Identity & Contact
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Basic church information
                          </Typography>
                        </Box>
                      </Box>

                      <Stack spacing={3}>
                        <TextField
                          fullWidth label="Church Name" name="name" required
                          value={formik.values.name} onChange={formik.handleChange} onBlur={formik.handleBlur}
                          error={formik.touched.name && Boolean(formik.errors.name)}
                          helperText={formik.touched.name && formik.errors.name}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                        <TextField
                          fullWidth label="Email Address" name="email" type="email" required
                          value={formik.values.email} onChange={formik.handleChange} onBlur={formik.handleBlur}
                          error={formik.touched.email && Boolean(formik.errors.email)}
                          helperText={formik.touched.email && formik.errors.email}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                        <TextField
                          fullWidth label="Phone Number" name="phone"
                          value={formik.values.phone} onChange={formik.handleChange} onBlur={formik.handleBlur}
                          error={formik.touched.phone && Boolean(formik.errors.phone)}
                          helperText={formik.touched.phone && formik.errors.phone}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                        <TextField
                          fullWidth label="Website" name="website" placeholder="https://example.com"
                          value={formik.values.website} onChange={formik.handleChange} onBlur={formik.handleBlur}
                          error={formik.touched.website && Boolean(formik.errors.website)}
                          helperText={formik.touched.website && formik.errors.website}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                        <TextField
                          fullWidth label="Address" name="address" multiline rows={2}
                          value={formik.values.address} onChange={formik.handleChange}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                        {/* Location Row */}
                        <Grid container spacing={2}>
                          <Grid item xs={6} sm={3}>
                            <TextField fullWidth label="City" name="city" size="small"
                              value={formik.values.city} onChange={formik.handleChange}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <TextField fullWidth label="State/Province" name="state_province" size="small"
                              value={formik.values.state_province} onChange={formik.handleChange}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <TextField fullWidth label="Postal Code" name="postal_code" size="small"
                              value={formik.values.postal_code} onChange={formik.handleChange}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Country</InputLabel>
                              <Select name="country" value={formik.values.country} onChange={formik.handleChange} label="Country"
                                sx={{ borderRadius: 2 }}>
                                <MenuItem value="United States">United States</MenuItem>
                                <MenuItem value="Canada">Canada</MenuItem>
                                <MenuItem value="Greece">Greece</MenuItem>
                                <MenuItem value="Romania">Romania</MenuItem>
                                <MenuItem value="Russia">Russia</MenuItem>
                                <MenuItem value="Serbia">Serbia</MenuItem>
                                <MenuItem value="Bulgaria">Bulgaria</MenuItem>
                                <MenuItem value="Other">Other</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                        </Grid>
                        <TextField
                          fullWidth label="Description" name="description_multilang" multiline rows={3}
                          value={formik.values.description_multilang} onChange={formik.handleChange}
                          placeholder="Brief description of the church..."
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                      </Stack>
                    </CardContent>
                  </BlankCard>
                </Grid>

                {/* Configuration */}
                <Grid item xs={12} lg={6}>
                  <BlankCard sx={{ borderRadius: 3, boxShadow: 3 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          mb: 3,
                          pb: 2,
                          borderBottom: '3px solid',
                          borderColor: 'success.main',
                        }}
                      >
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: 'success.main',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <IconSettings size={24} />
                        </Box>
                        <Box>
                          <Typography variant="h5" fontWeight={600}>
                            Configuration
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Settings and preferences
                          </Typography>
                        </Box>
                      </Box>

                      <Stack spacing={3}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: formik.values.is_active ? 'success.50' : 'grey.100',
                            border: '1px solid',
                            borderColor: formik.values.is_active ? 'success.main' : 'grey.300',
                          }}
                        >
                          <FormControlLabel
                            control={<Switch checked={formik.values.is_active} onChange={(e) => formik.setFieldValue('is_active', e.target.checked)} />}
                            label={<Stack direction="row" spacing={1} alignItems="center"><Typography fontWeight={500}>Church Active</Typography><Chip label={formik.values.is_active ? 'Active' : 'Inactive'} color={formik.values.is_active ? 'success' : 'default'} size="small" /></Stack>}
                          />
                        </Box>

                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Language</InputLabel>
                              <Select name="preferred_language" value={formik.values.preferred_language} onChange={formik.handleChange} label="Language"
                                sx={{ borderRadius: 2 }}>
                                <MenuItem value="en">English</MenuItem>
                                <MenuItem value="el">Greek</MenuItem>
                                <MenuItem value="ru">Russian</MenuItem>
                                <MenuItem value="ro">Romanian</MenuItem>
                                <MenuItem value="serbian">Serbian</MenuItem>
                                <MenuItem value="bulgarian">Bulgarian</MenuItem>
                                <MenuItem value="arabic">Arabic</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={6}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Timezone</InputLabel>
                              <Select name="timezone" value={formik.values.timezone} onChange={formik.handleChange} label="Timezone"
                                sx={{ borderRadius: 2 }}>
                                <MenuItem value="America/New_York">Eastern (ET)</MenuItem>
                                <MenuItem value="America/Chicago">Central (CT)</MenuItem>
                                <MenuItem value="America/Denver">Mountain (MT)</MenuItem>
                                <MenuItem value="America/Los_Angeles">Pacific (PT)</MenuItem>
                                <MenuItem value="Europe/London">GMT</MenuItem>
                                <MenuItem value="Europe/Athens">Eastern European (EET)</MenuItem>
                                <MenuItem value="Europe/Moscow">Moscow (MSK)</MenuItem>
                                <MenuItem value="UTC">UTC</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={6}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Currency</InputLabel>
                              <Select name="currency" value={formik.values.currency} onChange={formik.handleChange} label="Currency"
                                sx={{ borderRadius: 2 }}>
                                <MenuItem value="USD">USD ($)</MenuItem>
                                <MenuItem value="EUR">EUR</MenuItem>
                                <MenuItem value="GBP">GBP</MenuItem>
                                <MenuItem value="CAD">CAD</MenuItem>
                                <MenuItem value="RON">RON</MenuItem>
                                <MenuItem value="RUB">RUB</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={6}>
                            <TextField fullWidth label="Tax ID" name="tax_id" size="small"
                              value={formik.values.tax_id} onChange={formik.handleChange}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                          </Grid>
                        </Grid>

                        <TextField fullWidth label="Database Name" name="database_name" size="small"
                          value={formik.values.database_name} onChange={formik.handleChange}
                          helperText="Unique identifier for church database"
                          InputProps={{ startAdornment: <IconDatabase size={18} style={{ marginRight: 8, opacity: 0.5 }} /> }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />

                        <FormControl fullWidth size="small">
                          <InputLabel>Default Landing Page</InputLabel>
                          <Select name="default_landing_page" value={formik.values.default_landing_page} onChange={formik.handleChange} label="Default Landing Page"
                            sx={{ borderRadius: 2 }}>
                            <MenuItem value="church_records">Church Records</MenuItem>
                            <MenuItem value="liturgical_calendar">Liturgical Calendar</MenuItem>
                            <MenuItem value="notes_app">Notes App</MenuItem>
                            <MenuItem value="dashboard">Dashboard</MenuItem>
                          </Select>
                        </FormControl>

                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle1" fontWeight={600} color="info.main" mb={2}>
                            Record Types
                          </Typography>
                          <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ p: 2, borderRadius: 2, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
                          <FormControlLabel control={<Switch checked={formik.values.has_baptism_records} onChange={(e) => formik.setFieldValue('has_baptism_records', e.target.checked)} size="small" />} label="Baptism" />
                          <FormControlLabel control={<Switch checked={formik.values.has_marriage_records} onChange={(e) => formik.setFieldValue('has_marriage_records', e.target.checked)} size="small" />} label="Marriage" />
                          <FormControlLabel control={<Switch checked={formik.values.has_funeral_records} onChange={(e) => formik.setFieldValue('has_funeral_records', e.target.checked)} size="small" />} label="Funeral" />
                          </Stack>
                        </Box>

                        {/* REMOVED: Feature Flags section - columns don't exist in DB
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle1" fontWeight={600} color="secondary.main" mb={2}>
                            Feature Flags
                          </Typography>
                          <Stack spacing={1.5} sx={{ p: 2, borderRadius: 2, bgcolor: 'secondary.50', border: '1px solid', borderColor: 'secondary.200' }}>
                            <FormControlLabel control={<Switch checked={formik.values.enable_multilingual} onChange={(e) => formik.setFieldValue('enable_multilingual', e.target.checked)} size="small" />} label="Multilingual Support" />
                            <FormControlLabel control={<Switch checked={formik.values.enable_notifications} onChange={(e) => formik.setFieldValue('enable_notifications', e.target.checked)} size="small" />} label="Email Notifications" />
                            <FormControlLabel control={<Switch checked={formik.values.public_calendar} onChange={(e) => formik.setFieldValue('public_calendar', e.target.checked)} size="small" />} label="Public Calendar Access" />
                            <FormControlLabel control={<Switch checked={formik.values.setup_complete} onChange={(e) => formik.setFieldValue('setup_complete', e.target.checked)} size="small" />} label="Setup Complete" />
                          </Stack>
                        </Box>
                        */}

                        <Box>
                          <Typography variant="subtitle1" fontWeight={600} color="secondary.main" mb={2}>
                            Setup Status
                          </Typography>
                          <Stack spacing={1.5} sx={{ p: 2, borderRadius: 2, bgcolor: 'secondary.50', border: '1px solid', borderColor: 'secondary.200' }}>
                            <FormControlLabel control={<Switch checked={formik.values.setup_complete} onChange={(e) => formik.setFieldValue('setup_complete', e.target.checked)} size="small" />} label="Setup Complete" />
                          </Stack>
                        </Box>

                        {/* REMOVED: AG Grid section - columns don't exist in DB
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle1" fontWeight={600} color="warning.main" mb={2}>
                            AG Grid
                          </Typography>
                          <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
                            <FormControlLabel
                              control={<Switch checked={formik.values.enable_ag_grid} onChange={(e) => {
                                formik.setFieldValue('enable_ag_grid', e.target.checked);
                                if (!e.target.checked) formik.setFieldValue('ag_grid_record_types', []);
                              }} size="small" />}
                              label={<Stack direction="row" spacing={1} alignItems="center"><Typography fontWeight={500}>Enable AG Grid</Typography><Chip label={formik.values.enable_ag_grid ? 'Enabled' : 'Disabled'} color={formik.values.enable_ag_grid ? 'warning' : 'default'} size="small" /></Stack>}
                            />
                            {formik.values.enable_ag_grid && (
                              <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ pl: 2, mt: 1.5 }}>
                            {['baptism', 'marriage', 'funeral'].map((type) => (
                              <FormControlLabel
                                key={type}
                                control={
                                  <Switch
                                    checked={formik.values.ag_grid_record_types.includes(type)}
                                    onChange={(e) => {
                                      const current = formik.values.ag_grid_record_types || [];
                                      if (e.target.checked) {
                                        formik.setFieldValue('ag_grid_record_types', [...current, type]);
                                      } else {
                                        formik.setFieldValue('ag_grid_record_types', current.filter((t: string) => t !== type));
                                      }
                                    }}
                                    size="small"
                                  />
                                }
                                label={type.charAt(0).toUpperCase() + type.slice(1)}
                              />
                            ))}
                              </Stack>
                            )}
                          </Box>
                        </Box>
                        */}
                      </Stack>
                    </CardContent>
                  </BlankCard>
                </Grid>

                {/* Action Buttons */}
                <Grid item xs={12}>
                  <BlankCard sx={{ borderRadius: 3, boxShadow: 3 }}>
                    <CardContent sx={{ p: 3, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50' }}>
                      <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
                        <Button 
                          variant="outlined" 
                          startIcon={<ArrowBackIcon />} 
                          onClick={() => navigate('/apps/church-management')}
                          sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 500 }}
                        >
                          Back to Churches
                        </Button>
                        <Stack direction="row" spacing={2}>
                          {isEdit && (
                            <Button 
                              variant="outlined" 
                              onClick={() => window.open(`/apps/church-management/${id}/field-mapper`, '_blank')}
                              sx={{ borderRadius: 2, textTransform: 'none' }}
                            >
                              DB Table Mapping
                            </Button>
                          )}
                          <Button 
                            variant="outlined" 
                            onClick={() => formik.resetForm()}
                            sx={{ borderRadius: 2, textTransform: 'none' }}
                          >
                            Reset
                          </Button>
                          <Button
                            type="submit" 
                            variant="contained"
                            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                            disabled={loading}
                            onClick={() => {
                              console.log('Update Church button clicked');
                              console.log('Form valid:', formik.isValid);
                              console.log('Form errors:', formik.errors);
                              console.log('Form values:', formik.values);
                              formik.handleSubmit();
                            }}
                            sx={{
                              borderRadius: 2,
                              px: 4,
                              textTransform: 'none',
                              fontWeight: 600,
                              background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                              boxShadow: 4,
                              '&:hover': {
                                boxShadow: 8,
                              },
                            }}
                          >
                            {loading ? 'Saving...' : isEdit ? 'Update Church' : 'Create Church'}
                          </Button>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </BlankCard>
                </Grid>
              </Grid>
            </form>
          )}

          {/* Tab 1: User Management */}
          {activeTab === 1 && isEdit && (
            <BlankCard>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                  <Box>
                    <Typography variant="h5">
                      <IconUsers size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                      User Management
                    </Typography>
                    <Typography color="textSecondary">Manage users assigned to this church (ID: {id})</Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button startIcon={<RefreshIcon />} onClick={() => id && loadChurchUsers(id)} disabled={loadingUsers}>
                      Refresh
                    </Button>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setUserDialogAction('add'); setSelectedUser(null); setUserDialogOpen(true); }}>
                      Add User
                    </Button>
                  </Stack>
                </Stack>

                {loadingUsers ? (
                  <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                ) : churchUsers.length === 0 ? (
                  <Alert severity="info">
                    No users assigned to this church. Click "Add User" to create one.
                  </Alert>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Role</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {churchUsers.map((u: any) => (
                          <TableRow key={u.id} hover>
                            <TableCell>
                              <Typography variant="subtitle2">{u.first_name} {u.last_name}</Typography>
                            </TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                              <Chip label={u.role} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              <Chip label={u.is_active ? 'Active' : 'Inactive'} color={u.is_active ? 'success' : 'default'} size="small" />
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => { setUserDialogAction('edit'); setSelectedUser(u); setUserDialogOpen(true); }}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Reset Password">
                                  <IconButton size="small" onClick={() => handlePasswordReset(u.id, u.email)}>
                                    <VpnKeyIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={u.is_active ? 'Deactivate' : 'Activate'}>
                                  <IconButton size="small" onClick={() => handleUserAction(u.id, u.is_active ? 'deactivate' : 'activate')} sx={{ color: u.is_active ? 'warning.main' : 'success.main' }}>
                                    {u.is_active ? <IconTrash size={16} /> : <IconRefresh size={16} />}
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </BlankCard>
          )}

          {/* Tab 2: Database Management */}
          {activeTab === 2 && isEdit && (
            <BlankCard>
              <CardContent>
                <Typography variant="h5" mb={1}>
                  <IconDatabase size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  Database Management
                </Typography>
                <Typography color="textSecondary" mb={3}>Database info and template updates</Typography>

                {databaseInfo && (
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={4}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" color="textSecondary">Database Name</Typography>
                        <Typography variant="body1" fontFamily="monospace">{databaseInfo.name || formik.values.database_name || 'N/A'}</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" color="textSecondary">Size</Typography>
                        <Typography variant="body1">{databaseInfo.size || 'N/A'}</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" color="textSecondary">Tables</Typography>
                        <Typography variant="body1">{databaseInfo.table_count ?? 'N/A'}</Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                )}

                <Stack direction="row" spacing={2} mb={3}>
                  <Button variant="outlined" startIcon={loadingDatabase ? <CircularProgress size={16} /> : <RefreshIcon />} onClick={() => id && loadDatabaseInfo(id)} disabled={loadingDatabase}>
                    Refresh Info
                  </Button>
                  <Button variant="outlined" color="secondary" onClick={() => id && testDatabaseConnection(id)} disabled={loadingDatabase}>
                    Test Connection
                  </Button>
                </Stack>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" mb={2}>Update Database from Template</Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Select Template</InputLabel>
                      <Select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} label="Select Template">
                        <MenuItem value="record_template1">record_template1</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Button
                      variant="contained" color="secondary" fullWidth
                      onClick={handleUpdateDatabase}
                      disabled={!selectedTemplate || updatingDatabase}
                      startIcon={updatingDatabase ? <CircularProgress size={16} /> : null}
                    >
                      {updatingDatabase ? 'Updating...' : 'Update Database'}
                    </Button>
                  </Grid>
                </Grid>
                {databaseUpdateResult && (
                  <Alert severity={databaseUpdateResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
                    {databaseUpdateResult.message}
                  </Alert>
                )}

                <Divider sx={{ my: 4 }} />

                {/* Features Enabled Section */}
                <Typography variant="h6" mb={2}>
                  <IconSettings size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  Features Enabled
                </Typography>
                <Typography color="textSecondary" mb={1}>
                  Advanced features for this church (Global defaults + Church overrides)
                </Typography>
                {hasRole(['super_admin']) && featureData.globalDefaults && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <strong>Resolution:</strong> Church Override → Global Default → Disabled
                  </Alert>
                )}

                {loadingFeatures ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    {/* AG Grid Feature */}
                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            AG Grid
                          </Typography>
                          {hasRole(['super_admin']) ? (
                            <Switch
                              checked={featureData.effective.ag_grid_enabled}
                              onChange={(e) => updateFeature('ag_grid_enabled', e.target.checked)}
                              disabled={updatingFeatures}
                              size="small"
                            />
                          ) : (
                            <Chip
                              label={featureData.effective.ag_grid_enabled ? 'Enabled' : 'Disabled'}
                              color={featureData.effective.ag_grid_enabled ? 'success' : 'default'}
                              size="small"
                            />
                          )}
                        </Stack>
                        <Typography variant="body2" color="textSecondary" mb={1}>
                          Advanced data grid UI with sorting, filtering, and Excel-like features
                        </Typography>
                        {hasRole(['super_admin']) && featureData.globalDefaults && (
                          <Typography variant="caption" color="textSecondary">
                            Global: {featureData.globalDefaults.ag_grid_enabled ? 'ON' : 'OFF'} | 
                            Override: {featureData.overrides?.ag_grid_enabled !== undefined ? (featureData.overrides.ag_grid_enabled ? 'ON' : 'OFF') : 'None'}
                          </Typography>
                        )}
                      </Paper>
                    </Grid>

                    {/* Power Search Feature */}
                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            Power Search
                          </Typography>
                          {hasRole(['super_admin']) ? (
                            <Switch
                              checked={featureData.effective.power_search_enabled}
                              onChange={(e) => updateFeature('power_search_enabled', e.target.checked)}
                              disabled={updatingFeatures}
                              size="small"
                            />
                          ) : (
                            <Chip
                              label={featureData.effective.power_search_enabled ? 'Enabled' : 'Disabled'}
                              color={featureData.effective.power_search_enabled ? 'success' : 'default'}
                              size="small"
                            />
                          )}
                        </Stack>
                        <Typography variant="body2" color="textSecondary" mb={1}>
                          Operator-aware search with advanced query capabilities
                        </Typography>
                        {hasRole(['super_admin']) && featureData.globalDefaults && (
                          <Typography variant="caption" color="textSecondary">
                            Global: {featureData.globalDefaults.power_search_enabled ? 'ON' : 'OFF'} | 
                            Override: {featureData.overrides?.power_search_enabled !== undefined ? (featureData.overrides.power_search_enabled ? 'ON' : 'OFF') : 'None'}
                          </Typography>
                        )}
                      </Paper>
                    </Grid>

                    {/* Custom Field Mapping Feature */}
                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            Custom Field Mapping
                          </Typography>
                          {hasRole(['super_admin']) ? (
                            <Switch
                              checked={featureData.effective.custom_field_mapping_enabled}
                              onChange={(e) => updateFeature('custom_field_mapping_enabled', e.target.checked)}
                              disabled={updatingFeatures}
                              size="small"
                            />
                          ) : (
                            <Chip
                              label={featureData.effective.custom_field_mapping_enabled ? 'Enabled' : 'Disabled'}
                              color={featureData.effective.custom_field_mapping_enabled ? 'success' : 'default'}
                              size="small"
                            />
                          )}
                        </Stack>
                        <Typography variant="body2" color="textSecondary" mb={1}>
                          OCR and record field mapping tools for data import
                        </Typography>
                        {hasRole(['super_admin']) && featureData.globalDefaults && (
                          <Typography variant="caption" color="textSecondary">
                            Global: {featureData.globalDefaults.custom_field_mapping_enabled ? 'ON' : 'OFF'} |
                            Override: {featureData.overrides?.custom_field_mapping_enabled !== undefined ? (featureData.overrides.custom_field_mapping_enabled ? 'ON' : 'OFF') : 'None'}
                          </Typography>
                        )}
                      </Paper>
                    </Grid>

                    {/* OM Charts */}
                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            OM Charts
                          </Typography>
                          {hasRole(['super_admin']) ? (
                            <Switch
                              checked={featureData.effective.om_charts_enabled}
                              onChange={(e) => updateFeature('om_charts_enabled', e.target.checked)}
                              disabled={updatingFeatures}
                              size="small"
                            />
                          ) : (
                            <Chip
                              label={featureData.effective.om_charts_enabled ? 'Enabled' : 'Disabled'}
                              color={featureData.effective.om_charts_enabled ? 'success' : 'default'}
                              size="small"
                            />
                          )}
                        </Stack>
                        <Typography variant="body2" color="textSecondary" mb={1}>
                          Graphical charts from church sacramental records
                        </Typography>
                        {hasRole(['super_admin']) && featureData.globalDefaults && (
                          <Typography variant="caption" color="textSecondary">
                            Global: {featureData.globalDefaults.om_charts_enabled ? 'ON' : 'OFF'} |
                            Override: {featureData.overrides?.om_charts_enabled !== undefined ? (featureData.overrides.om_charts_enabled ? 'ON' : 'OFF') : 'None'}
                          </Typography>
                        )}
                      </Paper>
                    </Grid>

                    {/* OM Assistant */}
                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            OM Assistant
                          </Typography>
                          {hasRole(['super_admin']) ? (
                            <Switch
                              checked={featureData.effective.om_assistant_enabled}
                              onChange={(e) => updateFeature('om_assistant_enabled', e.target.checked)}
                              disabled={updatingFeatures}
                              size="small"
                            />
                          ) : (
                            <Chip
                              label={featureData.effective.om_assistant_enabled ? 'Enabled' : 'Disabled'}
                              color={featureData.effective.om_assistant_enabled ? 'success' : 'default'}
                              size="small"
                            />
                          )}
                        </Stack>
                        <Typography variant="body2" color="textSecondary" mb={1}>
                          AI assistant for chat, email intake, and record queries
                        </Typography>
                        {hasRole(['super_admin']) && featureData.globalDefaults && (
                          <Typography variant="caption" color="textSecondary">
                            Global: {featureData.globalDefaults.om_assistant_enabled ? 'ON' : 'OFF'} |
                            Override: {featureData.overrides?.om_assistant_enabled !== undefined ? (featureData.overrides.om_assistant_enabled ? 'ON' : 'OFF') : 'None'}
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                  </Grid>
                )}

                {!hasRole(['super_admin']) && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Only Super Admins can modify feature flags. Contact your administrator to enable or disable features.
                  </Alert>
                )}
              </CardContent>
            </BlankCard>
          )}
        </>
      )}

      {/* User Management Dialog */}
      <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {userDialogAction === 'add' ? 'Add New User' : 'Edit User'}
        </DialogTitle>
        <DialogContent>
          <UserManagementDialog
            user={selectedUser}
            action={userDialogAction}
            churchId={id || '0'}
            onSave={handleUserSave}
            onCancel={() => setUserDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default ChurchForm;
