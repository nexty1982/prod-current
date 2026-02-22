import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  StepConnector,
  Button,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Paper,
  Stack,
  Autocomplete,
  FormGroup,
  Checkbox,
  Tabs,
  Tab,
  Tooltip,
  Snackbar,
} from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Church as ChurchIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Web as WebIcon,
  Storage as StorageIcon,
  Person as PersonIcon,
  ContentCopy as CopyIcon,
  VpnKey as TokenIcon,
  TableChart as TableIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { LiveTableBuilder } from '@/features/devel-tools/live-table-builder/components/LiveTableBuilder';
import type { TableData } from '@/features/devel-tools/live-table-builder/types';

// Types
interface ChurchWizardData {
  // Basic Info
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  website: string;
  preferred_language: string;
  timezone: string;
  currency: string;
  is_active: boolean;

  // Template Selection
  template_church_id: number | null;
  selected_tables: string[];

  // Custom Fields
  custom_fields: CustomField[];

  // User Management
  initial_users: ChurchUser[];

  // Landing Page
  custom_landing_page: {
    enabled: boolean;
    title: string;
    welcome_message: string;
    primary_color: string;
    logo_url: string;
    default_app: 'liturgical_calendar' | 'church_records' | 'notes_app';
  };

  // Custom Table Builder data
  custom_table_builder?: {
    table_name: string;
    data: TableData;
  } | null;
}

interface CustomField {
  id: string;
  table_name: string;
  field_name: string;
  field_type: 'VARCHAR' | 'TEXT' | 'INT' | 'DATE' | 'BOOLEAN';
  field_length?: number;
  is_required: boolean;
  default_value?: string;
  description: string;
}

interface ChurchUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  permissions: string[];
  send_invite: boolean;
}

interface TemplateChurch {
  id: number;
  name: string;
  city: string;
  country: string;
  available_tables: string[];
}

// Step configuration with icons and descriptions
const STEP_CONFIG = [
  { label: 'Church Information', icon: <ChurchIcon />, description: 'Basic details about your church' },
  { label: 'Template Selection', icon: <DashboardIcon />, description: 'Clone from an existing church or start fresh' },
  { label: 'Record Tables', icon: <TableIcon />, description: 'Configure database tables and custom fields' },
  { label: 'User Management', icon: <PeopleIcon />, description: 'Add initial users and set permissions' },
  { label: 'Landing Page', icon: <WebIcon />, description: 'Customize the church landing page' },
  { label: 'Review & Create', icon: <CheckIcon />, description: 'Review all settings before creating' },
  { label: 'Registration Token', icon: <TokenIcon />, description: 'Share this token so members can register' },
];

const steps = STEP_CONFIG.map(s => s.label);

const AVAILABLE_RECORD_TABLES = [
  { key: 'baptism_records', label: 'Baptism Records', description: 'Track baptism ceremonies and certificates' },
  { key: 'marriage_records', label: 'Marriage Records', description: 'Manage wedding ceremonies and certificates' },
  { key: 'funeral_records', label: 'Funeral Records', description: 'Record funeral services and memorials' },
  { key: 'clergy', label: 'Clergy Management', description: 'Manage priests, deacons, and church staff' },
  { key: 'members', label: 'Church Members', description: 'Comprehensive membership database' },
  { key: 'donations', label: 'Donations & Offerings', description: 'Track financial contributions' },
  { key: 'calendar_events', label: 'Calendar Events', description: 'Liturgical and parish events' },
  { key: 'confession_records', label: 'Confession Records', description: 'Private confession tracking (encrypted)' },
  { key: 'communion_records', label: 'Communion Records', description: 'Holy Communion participation' },
  { key: 'chrismation_records', label: 'Chrismation Records', description: 'Confirmation ceremonies' }
];

const FIELD_TYPES = [
  { value: 'VARCHAR', label: 'Text (Short)', maxLength: 255 },
  { value: 'TEXT', label: 'Text (Long)', maxLength: null },
  { value: 'INT', label: 'Number', maxLength: null },
  { value: 'DATE', label: 'Date', maxLength: null },
  { value: 'BOOLEAN', label: 'Yes/No', maxLength: null }
];

const USER_ROLES = [
  { value: 'church_admin', label: 'Church Administrator', description: 'Full access to all church functions' },
  { value: 'priest', label: 'Priest', description: 'Full clergy privileges and record lifecycle authority' },
  { value: 'deacon', label: 'Deacon', description: 'Partial clergy privileges' },
  { value: 'editor', label: 'Editor', description: 'Add and edit records' },
  { value: 'viewer', label: 'Viewer', description: 'View-only access' }
];

const AVAILABLE_PERMISSIONS = [
  'view_records', 'create_records', 'edit_records', 'delete_records',
  'view_reports', 'export_data', 'manage_users', 'view_analytics'
];

const DEFAULT_APP_OPTIONS = [
  {
    value: 'liturgical_calendar',
    label: 'Liturgical Calendar',
    description: 'Orthodox liturgical calendar with feast days and fasting periods'
  },
  {
    value: 'church_records',
    label: 'Church Records',
    description: 'Manage baptism, marriage, and funeral records'
  },
  {
    value: 'notes_app',
    label: 'Notes App',
    description: 'Personal notes and task management'
  }
];

// Styled step connector for professional look
const StyledStepConnector = styled(StepConnector)(({ theme }) => ({
  '& .MuiStepConnector-line': {
    borderColor: theme.palette.divider,
    borderLeftWidth: 2,
    minHeight: 20,
  },
}));

const ChurchSetupWizard: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [templateChurches, setTemplateChurches] = useState<TemplateChurch[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateChurch | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog states
  const [customFieldDialog, setCustomFieldDialog] = useState(false);
  const [userDialog, setUserDialog] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [editingUser, setEditingUser] = useState<ChurchUser | null>(null);

  // Completion state
  const [wizardResult, setWizardResult] = useState<{
    church_id: number;
    db_name: string;
    registration_token: string;
    church_name: string;
  } | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  // Validation schemas for each step
  const validationSchemas = [
    // Step 1: Basic Information
    Yup.object({
      name: Yup.string().required('Church name is required').min(3, 'Name must be at least 3 characters'),
      email: Yup.string().email('Invalid email format').required('Email is required'),
      phone: Yup.string().required('Phone number is required'),
      city: Yup.string().required('City is required'),
      country: Yup.string().required('Country is required'),
      preferred_language: Yup.string().required('Language is required'),
    }),
  ];

  // Formik setup
  const formik = useFormik<ChurchWizardData>({
    initialValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state_province: '',
      postal_code: '',
      country: '',
      website: '',
      preferred_language: 'en',
      timezone: 'UTC',
      currency: 'USD',
      is_active: true,
      template_church_id: null,
      selected_tables: ['baptism_records', 'marriage_records', 'funeral_records'],
      custom_fields: [],
      initial_users: [],
      custom_landing_page: {
        enabled: false,
        title: '',
        welcome_message: '',
        primary_color: '#1976d2',
        logo_url: '',
        default_app: 'liturgical_calendar'
      },
      custom_table_builder: null,
    },
    validationSchema: validationSchemas[0],
    onSubmit: async (values) => {
      await handleFinalSubmit(values);
    }
  });

  // Load template churches
  useEffect(() => {
    const fetchTemplateChurches = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/churches?preferred_language=en', {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          const templatesWithTables = await Promise.all(
            data.churches.map(async (church: any) => {
              try {
                const tablesResponse = await fetch(`/api/admin/churches/${church.id}/tables`, {
                  credentials: 'include'
                });
                const tablesData = await tablesResponse.json();
                return {
                  ...church,
                  available_tables: tablesData.tables || []
                };
              } catch {
                return {
                  ...church,
                  available_tables: []
                };
              }
            })
          );
          setTemplateChurches(templatesWithTables);
        }
      } catch (error) {
        console.error('Error fetching template churches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplateChurches();
  }, []);

  // Handle template selection
  const handleTemplateSelection = (templateId: number | null) => {
    const template = templateChurches.find(t => t.id === templateId) || null;
    setSelectedTemplate(template);
    formik.setFieldValue('template_church_id', templateId);

    if (template) {
      formik.setFieldValue('selected_tables', template.available_tables);
    }
  };

  // Handle adding custom field
  const handleAddCustomField = (field: CustomField) => {
    const currentFields = formik.values.custom_fields;
    if (editingField) {
      const updatedFields = currentFields.map(f => f.id === field.id ? field : f);
      formik.setFieldValue('custom_fields', updatedFields);
      setEditingField(null);
    } else {
      formik.setFieldValue('custom_fields', [...currentFields, { ...field, id: Date.now().toString() }]);
    }
    setCustomFieldDialog(false);
  };

  // Handle adding user
  const handleAddUser = (user: ChurchUser) => {
    const currentUsers = formik.values.initial_users;
    if (editingUser) {
      const updatedUsers = currentUsers.map(u => u.id === user.id ? user : u);
      formik.setFieldValue('initial_users', updatedUsers);
      setEditingUser(null);
    } else {
      formik.setFieldValue('initial_users', [...currentUsers, { ...user, id: Date.now().toString() }]);
    }
    setUserDialog(false);
  };

  // Handle step navigation
  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

  // Copy token to clipboard
  const handleCopyToken = async () => {
    if (wizardResult?.registration_token) {
      try {
        await navigator.clipboard.writeText(wizardResult.registration_token);
        setTokenCopied(true);
        setTimeout(() => setTokenCopied(false), 2000);
      } catch {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = wizardResult.registration_token;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setTokenCopied(true);
        setTimeout(() => setTokenCopied(false), 2000);
      }
    }
  };

  // Handle final submission
  const handleFinalSubmit = async (values: ChurchWizardData) => {
    try {
      setIsSubmitting(true);

      const response = await fetch('/api/admin/churches/wizard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(values)
      });

      if (response.ok) {
        const result = await response.json();
        // Store result and advance to token step
        setWizardResult({
          church_id: result.church_id,
          db_name: result.db_name,
          registration_token: result.registration_token,
          church_name: values.name,
        });
        setActiveStep(steps.length - 1); // Go to Registration Token step
      } else {
        const errorData = await response.json();

        if (response.status === 400 && errorData.required) {
          const missingFields = errorData.required.join(', ');
          setToast({ message: `Please fill in all required fields: ${missingFields}`, severity: 'error' });
        } else {
          setToast({ message: errorData.message || 'Failed to create church', severity: 'error' });
        }

        throw new Error(errorData.message || 'Failed to create church');
      }
    } catch (error: any) {
      console.error('Error creating church:', error);
      if (!error.message?.includes('required fields')) {
        setToast({ message: 'An unexpected error occurred. Please try again.', severity: 'error' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle table builder toast
  const handleBuilderToast = useCallback((message: string, severity?: 'success' | 'error' | 'warning' | 'info') => {
    setToast({ message, severity: severity || 'info' });
  }, []);

  // Render step content
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return <BasicInformationStep formik={formik} />;
      case 1:
        return (
          <TemplateSelectionStep
            formik={formik}
            templateChurches={templateChurches}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={handleTemplateSelection}
            loading={loading}
          />
        );
      case 2:
        return (
          <RecordTablesStep
            formik={formik}
            selectedTemplate={selectedTemplate}
            onAddCustomField={() => setCustomFieldDialog(true)}
            onEditCustomField={(field) => {
              setEditingField(field);
              setCustomFieldDialog(true);
            }}
            onDeleteCustomField={(fieldId) => {
              const updatedFields = formik.values.custom_fields.filter(f => f.id !== fieldId);
              formik.setFieldValue('custom_fields', updatedFields);
            }}
            onToast={handleBuilderToast}
          />
        );
      case 3:
        return (
          <UserManagementStep
            formik={formik}
            onAddUser={() => setUserDialog(true)}
            onEditUser={(user) => {
              setEditingUser(user);
              setUserDialog(true);
            }}
            onDeleteUser={(userId) => {
              const updatedUsers = formik.values.initial_users.filter(u => u.id !== userId);
              formik.setFieldValue('initial_users', updatedUsers);
            }}
          />
        );
      case 4:
        return <LandingPageStep formik={formik} />;
      case 5:
        return <ReviewStep formik={formik} selectedTemplate={selectedTemplate} />;
      case 6:
        return wizardResult ? (
          <RegistrationTokenStep
            result={wizardResult}
            onCopyToken={handleCopyToken}
            tokenCopied={tokenCopied}
          />
        ) : null;
      default:
        return null;
    }
  };

  // Check if user has permission to create churches
  if (!hasRole(['super_admin'])) {
    return (
      <Box p={3}>
        <Alert severity="error">
          You don't have permission to create churches. Please contact a system administrator.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3} maxWidth={1100} mx="auto">
      <Card elevation={3}>
        <CardContent sx={{ p: { xs: 2, md: 4 } }}>
          {/* Header */}
          <Box mb={4}>
            <Stack direction="row" alignItems="center" spacing={2} mb={1}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChurchIcon color="primary" fontSize="large" />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700}>
                  Church Setup Wizard
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Step {activeStep + 1} of {steps.length} &mdash; {STEP_CONFIG[activeStep].description}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Stepper
            activeStep={activeStep}
            orientation="vertical"
            connector={<StyledStepConnector />}
          >
            {steps.map((label, index) => (
              <Step key={label} completed={wizardResult ? index < steps.length - 1 : undefined}>
                <StepLabel
                  StepIconProps={{
                    sx: {
                      '&.Mui-active': { color: 'primary.main' },
                      '&.Mui-completed': { color: 'success.main' },
                    }
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="subtitle1" fontWeight={activeStep === index ? 700 : 500}>
                      {label}
                    </Typography>
                    {activeStep === index && (
                      <Chip
                        label="Current"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                  </Stack>
                </StepLabel>
                <StepContent>
                  <Box my={2}>
                    {renderStepContent(index)}
                  </Box>

                  {/* Navigation buttons - don't show on token step */}
                  {index < steps.length - 1 && (
                    <Box mt={3} display="flex" gap={1}>
                      <Button
                        disabled={activeStep === 0}
                        onClick={handleBack}
                        variant="outlined"
                        size="small"
                      >
                        Back
                      </Button>

                      {activeStep === steps.length - 2 ? (
                        <Button
                          variant="contained"
                          onClick={() => formik.handleSubmit()}
                          disabled={isSubmitting}
                          startIcon={isSubmitting ? <CircularProgress size={18} /> : <SaveIcon />}
                        >
                          {isSubmitting ? 'Creating Church...' : 'Create Church'}
                        </Button>
                      ) : (
                        <Button
                          variant="contained"
                          onClick={handleNext}
                        >
                          Continue
                        </Button>
                      )}
                    </Box>
                  )}

                  {/* Token step - show finish button */}
                  {index === steps.length - 1 && wizardResult && (
                    <Box mt={3}>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => navigate(`/apps/church-management/edit/${wizardResult.church_id}`, {
                          state: {
                            message: `Church "${wizardResult.church_name}" created successfully!`,
                            severity: 'success'
                          }
                        })}
                        startIcon={<CheckIcon />}
                      >
                        Go to Church Management
                      </Button>
                    </Box>
                  )}
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Custom Field Dialog */}
      <CustomFieldDialog
        open={customFieldDialog}
        onClose={() => {
          setCustomFieldDialog(false);
          setEditingField(null);
        }}
        onSave={handleAddCustomField}
        editingField={editingField}
        existingTables={formik.values.selected_tables}
      />

      {/* User Dialog */}
      <UserDialog
        open={userDialog}
        onClose={() => {
          setUserDialog(false);
          setEditingUser(null);
        }}
        onSave={handleAddUser}
        editingUser={editingUser}
      />

      {/* Toast */}
      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} onClose={() => setToast(null)} variant="filled">
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
};

// ============================================================================
// Step Components
// ============================================================================

const BasicInformationStep: React.FC<{ formik: any }> = ({ formik }) => (
  <Grid container spacing={3}>
    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        name="name"
        label="Church Name"
        value={formik.values.name}
        onChange={formik.handleChange}
        error={formik.touched.name && Boolean(formik.errors.name)}
        helperText={formik.touched.name && formik.errors.name}
        required
      />
    </Grid>
    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        name="email"
        label="Admin Email"
        type="email"
        value={formik.values.email}
        onChange={formik.handleChange}
        error={formik.touched.email && Boolean(formik.errors.email)}
        helperText={formik.touched.email && formik.errors.email}
        required
      />
    </Grid>
    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        name="phone"
        label="Phone Number"
        value={formik.values.phone}
        onChange={formik.handleChange}
        error={formik.touched.phone && Boolean(formik.errors.phone)}
        helperText={formik.touched.phone && formik.errors.phone}
        required
      />
    </Grid>
    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        name="website"
        label="Website URL"
        value={formik.values.website}
        onChange={formik.handleChange}
      />
    </Grid>
    <Grid item xs={12}>
      <TextField
        fullWidth
        name="address"
        label="Address"
        value={formik.values.address}
        onChange={formik.handleChange}
      />
    </Grid>
    <Grid item xs={12} md={4}>
      <TextField
        fullWidth
        name="city"
        label="City"
        value={formik.values.city}
        onChange={formik.handleChange}
        error={formik.touched.city && Boolean(formik.errors.city)}
        helperText={formik.touched.city && formik.errors.city}
        required
      />
    </Grid>
    <Grid item xs={12} md={4}>
      <TextField
        fullWidth
        name="state_province"
        label="State/Province"
        value={formik.values.state_province}
        onChange={formik.handleChange}
      />
    </Grid>
    <Grid item xs={12} md={4}>
      <TextField
        fullWidth
        name="postal_code"
        label="Postal Code"
        value={formik.values.postal_code}
        onChange={formik.handleChange}
      />
    </Grid>
    <Grid item xs={12} md={4}>
      <FormControl fullWidth>
        <InputLabel>Country</InputLabel>
        <Select
          name="country"
          label="Country"
          value={formik.values.country}
          onChange={formik.handleChange}
          error={formik.touched.country && Boolean(formik.errors.country)}
        >
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
    <Grid item xs={12} md={4}>
      <FormControl fullWidth>
        <InputLabel>Language</InputLabel>
        <Select
          name="preferred_language"
          label="Language"
          value={formik.values.preferred_language}
          onChange={formik.handleChange}
        >
          <MenuItem value="en">English</MenuItem>
          <MenuItem value="el">Greek</MenuItem>
          <MenuItem value="ro">Romanian</MenuItem>
          <MenuItem value="ru">Russian</MenuItem>
          <MenuItem value="sr">Serbian</MenuItem>
          <MenuItem value="bg">Bulgarian</MenuItem>
        </Select>
      </FormControl>
    </Grid>
    <Grid item xs={12} md={4}>
      <FormControl fullWidth>
        <InputLabel>Currency</InputLabel>
        <Select
          name="currency"
          label="Currency"
          value={formik.values.currency}
          onChange={formik.handleChange}
        >
          <MenuItem value="USD">USD ($)</MenuItem>
          <MenuItem value="CAD">CAD ($)</MenuItem>
          <MenuItem value="EUR">EUR</MenuItem>
          <MenuItem value="GBP">GBP</MenuItem>
          <MenuItem value="RON">RON (lei)</MenuItem>
          <MenuItem value="RUB">RUB</MenuItem>
        </Select>
      </FormControl>
    </Grid>
  </Grid>
);

const TemplateSelectionStep: React.FC<{
  formik: any;
  templateChurches: TemplateChurch[];
  selectedTemplate: TemplateChurch | null;
  onTemplateSelect: (templateId: number | null) => void;
  loading: boolean;
}> = ({ formik, templateChurches, selectedTemplate, onTemplateSelect, loading }) => (
  <Box>
    <Typography variant="body2" color="text.secondary" paragraph>
      Select an existing church to use as a template. This will copy its table structure and settings.
    </Typography>

    {loading ? (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
        <Typography ml={2}>Loading template churches...</Typography>
      </Box>
    ) : (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 1,
              cursor: 'pointer',
              borderColor: formik.values.template_church_id === null ? 'primary.main' : 'divider',
              borderWidth: formik.values.template_church_id === null ? 2 : 1,
              bgcolor: formik.values.template_church_id === null ? (theme: any) => alpha(theme.palette.primary.main, 0.04) : 'transparent',
            }}
            onClick={() => onTemplateSelect(null)}
          >
            <FormControlLabel
              control={<Checkbox checked={formik.values.template_church_id === null} onChange={() => onTemplateSelect(null)} />}
              label={
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>Start from Scratch</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Create a new church with default table structures
                  </Typography>
                </Box>
              }
            />
          </Paper>
        </Grid>

        {templateChurches.map((church) => (
          <Grid item xs={12} md={6} key={church.id}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                cursor: 'pointer',
                borderWidth: selectedTemplate?.id === church.id ? 2 : 1,
                borderColor: selectedTemplate?.id === church.id ? 'primary.main' : 'divider',
                bgcolor: selectedTemplate?.id === church.id ? (theme: any) => alpha(theme.palette.primary.main, 0.04) : 'transparent',
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.light' },
              }}
              onClick={() => onTemplateSelect(church.id)}
            >
              <FormControlLabel
                control={<Checkbox checked={selectedTemplate?.id === church.id} onChange={() => onTemplateSelect(church.id)} />}
                label={
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>{church.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {church.city}, {church.country}
                    </Typography>
                    <Chip label={`${church.available_tables.length} tables`} size="small" sx={{ mt: 0.5 }} />
                  </Box>
                }
              />
            </Paper>
          </Grid>
        ))}
      </Grid>
    )}
  </Box>
);

const RecordTablesStep: React.FC<{
  formik: any;
  selectedTemplate: TemplateChurch | null;
  onAddCustomField: () => void;
  onEditCustomField: (field: CustomField) => void;
  onDeleteCustomField: (fieldId: string) => void;
  onToast: (message: string, severity?: 'success' | 'error' | 'warning' | 'info') => void;
}> = ({ formik, selectedTemplate, onAddCustomField, onEditCustomField, onDeleteCustomField, onToast }) => {
  const [tabValue, setTabValue] = useState(0);

  return (
    <Box>
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="Standard Tables" icon={<StorageIcon />} iconPosition="start" />
        <Tab label="Custom Table Builder" icon={<TableIcon />} iconPosition="start" />
      </Tabs>

      {tabValue === 0 && (
        <>
          <Typography variant="body2" color="text.secondary" paragraph>
            Choose which record tables to create in the church database.
          </Typography>

          <Grid container spacing={2}>
            {AVAILABLE_RECORD_TABLES.map((table) => (
              <Grid item xs={12} md={6} key={table.key}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderColor: formik.values.selected_tables.includes(table.key) ? 'primary.main' : 'divider',
                    borderWidth: formik.values.selected_tables.includes(table.key) ? 2 : 1,
                    bgcolor: formik.values.selected_tables.includes(table.key) ? (theme: any) => alpha(theme.palette.primary.main, 0.04) : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formik.values.selected_tables.includes(table.key)}
                        onChange={(e) => {
                          const currentTables = formik.values.selected_tables;
                          if (e.target.checked) {
                            formik.setFieldValue('selected_tables', [...currentTables, table.key]);
                          } else {
                            formik.setFieldValue('selected_tables', currentTables.filter((t: string) => t !== table.key));
                          }
                        }}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>{table.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {table.description}
                        </Typography>
                      </Box>
                    }
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1" fontWeight={600}>Custom Fields</Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={onAddCustomField}
            >
              Add Custom Field
            </Button>
          </Box>

          {formik.values.custom_fields.length === 0 ? (
            <Alert severity="info" variant="outlined">
              No custom fields added. You can extend any table with additional columns.
            </Alert>
          ) : (
            <List dense>
              {formik.values.custom_fields.map((field: CustomField) => (
                <ListItem key={field.id} divider>
                  <ListItemText
                    primary={`${field.field_name} (${field.field_type})`}
                    secondary={`Table: ${field.table_name} - ${field.description}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton size="small" onClick={() => onEditCustomField(field)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => onDeleteCustomField(field.id)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </>
      )}

      {tabValue === 1 && (
        <Box>
          <Typography variant="body2" color="text.secondary" paragraph>
            Use the interactive table builder to design a custom record table. Define columns and optionally pre-populate rows.
          </Typography>

          <TextField
            fullWidth
            label="Custom Table Name"
            placeholder="e.g., special_services"
            value={formik.values.custom_table_builder?.table_name || ''}
            onChange={(e) => {
              const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
              formik.setFieldValue('custom_table_builder', {
                ...formik.values.custom_table_builder,
                table_name: sanitized,
                data: formik.values.custom_table_builder?.data || { columns: [], rows: [] },
              });
            }}
            helperText="Use lowercase letters, numbers, and underscores only"
            sx={{ mb: 2 }}
          />

          <Paper variant="outlined" sx={{ p: 2, minHeight: 300 }}>
            <LiveTableBuilder
              data={formik.values.custom_table_builder?.data || { columns: [{ id: 'col_0', label: 'Column A' }], rows: [{ id: 'row_0', cells: { col_0: '' } }] }}
              onDataChange={(data: TableData) => {
                formik.setFieldValue('custom_table_builder', {
                  ...formik.values.custom_table_builder,
                  table_name: formik.values.custom_table_builder?.table_name || '',
                  data,
                });
              }}
              onToast={onToast}
            />
          </Paper>
        </Box>
      )}
    </Box>
  );
};

const UserManagementStep: React.FC<{
  formik: any;
  onAddUser: () => void;
  onEditUser: (user: ChurchUser) => void;
  onDeleteUser: (userId: string) => void;
}> = ({ formik, onAddUser, onEditUser, onDeleteUser }) => (
  <Box>
    <Typography variant="body2" color="text.secondary" paragraph>
      Add users who will have access to the new church's records. They will receive email invitations.
    </Typography>

    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
      <Typography variant="subtitle1" fontWeight={600}>
        Users ({formik.values.initial_users.length})
      </Typography>
      <Button
        variant="outlined"
        size="small"
        startIcon={<AddIcon />}
        onClick={onAddUser}
      >
        Add User
      </Button>
    </Box>

    {formik.values.initial_users.length === 0 ? (
      <Alert severity="info" variant="outlined">
        No users added yet. Users can also be added after church creation, or they can self-register using the church's registration token.
      </Alert>
    ) : (
      <List dense>
        {formik.values.initial_users.map((user: ChurchUser) => (
          <ListItem key={user.id} divider>
            <ListItemText
              primary={`${user.first_name} ${user.last_name}`}
              secondary={`${user.email} - ${user.role.toUpperCase()}`}
            />
            <ListItemSecondaryAction>
              <Chip
                label={user.send_invite ? 'Invite' : 'No invite'}
                color={user.send_invite ? 'success' : 'default'}
                size="small"
                variant="outlined"
                sx={{ mr: 1 }}
              />
              <IconButton size="small" onClick={() => onEditUser(user)}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => onDeleteUser(user.id)} color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    )}
  </Box>
);

const LandingPageStep: React.FC<{ formik: any }> = ({ formik }) => (
  <Box>
    <Typography variant="body2" color="text.secondary" paragraph>
      Configure a custom landing page for church members.
    </Typography>

    <FormControlLabel
      control={
        <Switch
          checked={formik.values.custom_landing_page.enabled}
          onChange={(e) =>
            formik.setFieldValue('custom_landing_page.enabled', e.target.checked)
          }
        />
      }
      label="Enable Custom Landing Page"
      sx={{ mb: 3 }}
    />

    {formik.values.custom_landing_page.enabled && (
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Landing Page Title"
            value={formik.values.custom_landing_page.title}
            onChange={(e) =>
              formik.setFieldValue('custom_landing_page.title', e.target.value)
            }
            placeholder="Welcome to Our Church"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Primary Color"
            type="color"
            value={formik.values.custom_landing_page.primary_color}
            onChange={(e) =>
              formik.setFieldValue('custom_landing_page.primary_color', e.target.value)
            }
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Welcome Message"
            value={formik.values.custom_landing_page.welcome_message}
            onChange={(e) =>
              formik.setFieldValue('custom_landing_page.welcome_message', e.target.value)
            }
            placeholder="Enter a welcome message for members..."
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Logo URL"
            value={formik.values.custom_landing_page.logo_url}
            onChange={(e) =>
              formik.setFieldValue('custom_landing_page.logo_url', e.target.value)
            }
            placeholder="https://example.com/logo.png"
          />
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Default Application</InputLabel>
            <Select
              value={formik.values.custom_landing_page.default_app}
              onChange={(e) =>
                formik.setFieldValue('custom_landing_page.default_app', e.target.value)
              }
              label="Default Application"
            >
              {DEFAULT_APP_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    )}
  </Box>
);

const ReviewStep: React.FC<{
  formik: any;
  selectedTemplate: TemplateChurch | null;
}> = ({ formik, selectedTemplate }) => (
  <Box>
    <Typography variant="body2" color="text.secondary" paragraph>
      Please review all settings before creating the church.
    </Typography>

    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.03) }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <ChurchIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" fontWeight={700}>Church Information</Typography>
          </Stack>
          <Typography variant="body2"><strong>Name:</strong> {formik.values.name}</Typography>
          <Typography variant="body2"><strong>Email:</strong> {formik.values.email}</Typography>
          <Typography variant="body2"><strong>Location:</strong> {formik.values.city}, {formik.values.country}</Typography>
          <Typography variant="body2"><strong>Language:</strong> {formik.values.preferred_language}</Typography>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.info.main, 0.03) }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <StorageIcon fontSize="small" color="info" />
            <Typography variant="subtitle2" fontWeight={700}>Database Setup</Typography>
          </Stack>
          <Typography variant="body2">
            <strong>Template:</strong> {selectedTemplate ? selectedTemplate.name : 'Default'}
          </Typography>
          <Typography variant="body2">
            <strong>Tables:</strong> {formik.values.selected_tables.length} selected
          </Typography>
          <Typography variant="body2">
            <strong>Custom Fields:</strong> {formik.values.custom_fields.length}
          </Typography>
          {formik.values.custom_table_builder?.table_name && (
            <Typography variant="body2">
              <strong>Custom Table:</strong> {formik.values.custom_table_builder.table_name}
            </Typography>
          )}
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.success.main, 0.03) }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <PeopleIcon fontSize="small" color="success" />
            <Typography variant="subtitle2" fontWeight={700}>Users</Typography>
          </Stack>
          <Typography variant="body2">
            <strong>Initial Users:</strong> {formik.values.initial_users.length}
          </Typography>
          {formik.values.initial_users.slice(0, 3).map((user: ChurchUser) => (
            <Typography key={user.id} variant="body2">
              &bull; {user.first_name} {user.last_name} ({user.role})
            </Typography>
          ))}
          {formik.values.initial_users.length > 3 && (
            <Typography variant="body2" color="text.secondary">
              ... and {formik.values.initial_users.length - 3} more
            </Typography>
          )}
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.warning.main, 0.03) }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <WebIcon fontSize="small" color="warning" />
            <Typography variant="subtitle2" fontWeight={700}>Landing Page</Typography>
          </Stack>
          <Typography variant="body2">
            <strong>Enabled:</strong> {formik.values.custom_landing_page.enabled ? 'Yes' : 'No'}
          </Typography>
          {formik.values.custom_landing_page.enabled && (
            <>
              <Typography variant="body2">
                <strong>Title:</strong> {formik.values.custom_landing_page.title || 'Not set'}
              </Typography>
              <Typography variant="body2">
                <strong>Default App:</strong> {
                  DEFAULT_APP_OPTIONS.find(option =>
                    option.value === formik.values.custom_landing_page.default_app
                  )?.label || 'Not set'
                }
              </Typography>
            </>
          )}
        </Paper>
      </Grid>
    </Grid>

    <Alert severity="info" variant="outlined" sx={{ mt: 3 }}>
      A unique <strong>registration token</strong> will be generated after creation. Share it with church members so they can self-register.
    </Alert>
  </Box>
);

// ============================================================================
// Registration Token Step (Post-Creation)
// ============================================================================

const RegistrationTokenStep: React.FC<{
  result: {
    church_id: number;
    db_name: string;
    registration_token: string;
    church_name: string;
  };
  onCopyToken: () => void;
  tokenCopied: boolean;
}> = ({ result, onCopyToken, tokenCopied }) => (
  <Box>
    <Alert severity="success" sx={{ mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700}>
        Church created successfully!
      </Typography>
      <Typography variant="body2">
        "{result.church_name}" has been set up with database <code>{result.db_name}</code>.
      </Typography>
    </Alert>

    <Paper
      elevation={2}
      sx={{
        p: 3,
        mb: 3,
        border: '2px solid',
        borderColor: 'primary.main',
        borderRadius: 2,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <TokenIcon color="primary" />
        <Typography variant="h6" fontWeight={700}>
          Registration Token
        </Typography>
      </Stack>

      <Typography variant="body2" color="text.secondary" paragraph>
        Share this token with church members. They can use it along with the church name to register at:
      </Typography>

      <Paper
        variant="outlined"
        sx={{ p: 1.5, mb: 2, bgcolor: 'grey.50', borderRadius: 1 }}
      >
        <Typography variant="body2" color="primary.main" fontWeight={500} sx={{ fontFamily: 'monospace' }}>
          {window.location.origin}/auth/register
        </Typography>
      </Paper>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 2,
          bgcolor: 'grey.900',
          borderRadius: 1,
          mb: 2,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'monospace',
            color: '#4caf50',
            wordBreak: 'break-all',
            flex: 1,
            fontSize: '0.85rem',
          }}
        >
          {result.registration_token}
        </Typography>
        <Tooltip title={tokenCopied ? 'Copied!' : 'Copy to clipboard'}>
          <IconButton
            onClick={onCopyToken}
            size="small"
            sx={{ color: tokenCopied ? 'success.main' : 'grey.400' }}
          >
            {tokenCopied ? <CheckIcon /> : <CopyIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      <Alert severity="warning" variant="outlined">
        <Typography variant="body2">
          <strong>Important:</strong> Save this token securely. Users who register with this token will have their accounts locked by default until a super admin reviews and assigns them a role.
        </Typography>
      </Alert>
    </Paper>

    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom fontWeight={600}>
        Registration Details
      </Typography>
      <Typography variant="body2">
        <strong>Church Name:</strong> {result.church_name}
      </Typography>
      <Typography variant="body2">
        <strong>Church ID:</strong> {result.church_id}
      </Typography>
      <Typography variant="body2">
        <strong>Database:</strong> {result.db_name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Members will need both the <strong>church name</strong> (exactly as shown above) and the <strong>registration token</strong> to create their accounts.
      </Typography>
    </Paper>
  </Box>
);

// ============================================================================
// Dialog Components
// ============================================================================

const CustomFieldDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onSave: (field: CustomField) => void;
  editingField: CustomField | null;
  existingTables: string[];
}> = ({ open, onClose, onSave, editingField, existingTables }) => {
  const [fieldData, setFieldData] = useState<Partial<CustomField>>({
    table_name: '',
    field_name: '',
    field_type: 'VARCHAR',
    is_required: false,
    description: ''
  });

  useEffect(() => {
    if (editingField) {
      setFieldData(editingField);
    } else {
      setFieldData({
        table_name: '',
        field_name: '',
        field_type: 'VARCHAR',
        is_required: false,
        description: ''
      });
    }
  }, [editingField, open]);

  const handleSave = () => {
    if (fieldData.table_name && fieldData.field_name && fieldData.field_type) {
      onSave({
        ...fieldData,
        id: editingField?.id || Date.now().toString()
      } as CustomField);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editingField ? 'Edit Custom Field' : 'Add Custom Field'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Table</InputLabel>
              <Select
                label="Table"
                value={fieldData.table_name || ''}
                onChange={(e) => setFieldData({ ...fieldData, table_name: e.target.value })}
              >
                {existingTables.map((table) => (
                  <MenuItem key={table} value={table}>
                    {AVAILABLE_RECORD_TABLES.find(t => t.key === table)?.label || table}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Field Name"
              value={fieldData.field_name || ''}
              onChange={(e) => setFieldData({ ...fieldData, field_name: e.target.value })}
              placeholder="e.g., sponsor_name"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Field Type</InputLabel>
              <Select
                label="Field Type"
                value={fieldData.field_type || 'VARCHAR'}
                onChange={(e) => setFieldData({ ...fieldData, field_type: e.target.value as any })}
              >
                {FIELD_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            {fieldData.field_type === 'VARCHAR' && (
              <TextField
                fullWidth
                type="number"
                label="Max Length"
                value={fieldData.field_length || 255}
                onChange={(e) => setFieldData({ ...fieldData, field_length: parseInt(e.target.value) })}
              />
            )}
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description"
              value={fieldData.description || ''}
              onChange={(e) => setFieldData({ ...fieldData, description: e.target.value })}
              placeholder="Describe what this field is for..."
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={fieldData.is_required || false}
                  onChange={(e) => setFieldData({ ...fieldData, is_required: e.target.checked })}
                />
              }
              label="Required Field"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!fieldData.table_name || !fieldData.field_name || !fieldData.field_type}
        >
          {editingField ? 'Update' : 'Add'} Field
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const UserDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onSave: (user: ChurchUser) => void;
  editingUser: ChurchUser | null;
}> = ({ open, onClose, onSave, editingUser }) => {
  const [userData, setUserData] = useState<Partial<ChurchUser>>({
    email: '',
    first_name: '',
    last_name: '',
    role: 'user',
    permissions: [],
    send_invite: true
  });

  useEffect(() => {
    if (editingUser) {
      setUserData(editingUser);
    } else {
      setUserData({
        email: '',
        first_name: '',
        last_name: '',
        role: 'user',
        permissions: [],
        send_invite: true
      });
    }
  }, [editingUser, open]);

  const handleSave = () => {
    if (userData.email && userData.first_name && userData.last_name) {
      onSave({
        ...userData,
        id: editingUser?.id || Date.now().toString()
      } as ChurchUser);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editingUser ? 'Edit User' : 'Add User'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="First Name"
              value={userData.first_name || ''}
              onChange={(e) => setUserData({ ...userData, first_name: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={userData.last_name || ''}
              onChange={(e) => setUserData({ ...userData, last_name: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              type="email"
              label="Email Address"
              value={userData.email || ''}
              onChange={(e) => setUserData({ ...userData, email: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                label="Role"
                value={userData.role || 'user'}
                onChange={(e) => setUserData({ ...userData, role: e.target.value as any })}
              >
                {USER_ROLES.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {role.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={userData.send_invite || false}
                  onChange={(e) => setUserData({ ...userData, send_invite: e.target.checked })}
                />
              }
              label="Send Email Invitation"
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Permissions
            </Typography>
            <FormGroup row>
              {AVAILABLE_PERMISSIONS.map((permission) => (
                <FormControlLabel
                  key={permission}
                  control={
                    <Checkbox
                      checked={userData.permissions?.includes(permission) || false}
                      onChange={(e) => {
                        const currentPermissions = userData.permissions || [];
                        if (e.target.checked) {
                          setUserData({
                            ...userData,
                            permissions: [...currentPermissions, permission]
                          });
                        } else {
                          setUserData({
                            ...userData,
                            permissions: currentPermissions.filter(p => p !== permission)
                          });
                        }
                      }}
                    />
                  }
                  label={permission.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                />
              ))}
            </FormGroup>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!userData.email || !userData.first_name || !userData.last_name}
        >
          {editingUser ? 'Update' : 'Add'} User
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChurchSetupWizard;
