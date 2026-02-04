import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
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
  LinearProgress,
  Snackbar,
  Tooltip,
  StepConnector,
} from '@mui/material';
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
  ErrorOutline as ErrorIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useFormik } from 'formik';
import * as Yup from 'yup';

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
  template_profile_id: string | null;
  selected_templates: { [recordType: string]: string } | null;

  // Record Tables
  selected_tables: string[];

  // AG Grid Configuration
  enable_ag_grid: boolean;
  ag_grid_record_types: string[];

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
  role: string;
  permissions: string[];
  send_invite: boolean;
}

interface TemplateProfile {
  id: string;
  name: string;
  description: string;
  templates: { [recordType: string]: string };
}

const steps = [
  { label: 'Basic Information', icon: <ChurchIcon fontSize="small" />, description: 'Church name, contact, and location' },
  { label: 'Template Selection', icon: <StorageIcon fontSize="small" />, description: 'Choose a database template profile' },
  { label: 'Record Tables & Custom Fields', icon: <SettingsIcon fontSize="small" />, description: 'Select tables and add custom fields' },
  { label: 'User Management', icon: <PeopleIcon fontSize="small" />, description: 'Add initial users and roles' },
  { label: 'Landing Page Configuration', icon: <WebIcon fontSize="small" />, description: 'Customize the church landing page' },
  { label: 'Review & Create', icon: <CheckIcon fontSize="small" />, description: 'Review all settings and create' },
];

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

// Per-step validation schemas
const stepValidationSchemas: { [step: number]: Yup.ObjectSchema<any> } = {
  0: Yup.object({
    name: Yup.string().required('Church name is required').min(3, 'Name must be at least 3 characters'),
    email: Yup.string().email('Invalid email format').required('Email is required'),
    phone: Yup.string()
      .matches(/^[+]?[\d\s()-]*$/, 'Invalid phone number format')
      .required('Phone number is required'),
    city: Yup.string().required('City is required'),
    country: Yup.string().required('Country is required'),
    preferred_language: Yup.string().required('Language is required'),
    timezone: Yup.string().required('Timezone is required'),
  }),
  // Steps 1-4 don't have required fields but we validate what we can
  1: Yup.object({}),
  2: Yup.object({}),
  3: Yup.object({}),
  4: Yup.object({}),
  5: Yup.object({
    name: Yup.string().required('Church name is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
    phone: Yup.string().required('Phone is required'),
    city: Yup.string().required('City is required'),
    country: Yup.string().required('Country is required'),
  }),
};

const ChurchSetupWizard: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [templateProfiles, setTemplateProfiles] = useState<TemplateProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<TemplateProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step validation tracking
  const [stepValidation, setStepValidation] = useState<{ [step: number]: 'valid' | 'invalid' | 'pending' }>({
    0: 'pending', 1: 'pending', 2: 'pending', 3: 'pending', 4: 'pending', 5: 'pending',
  });
  const [stepErrors, setStepErrors] = useState<{ [step: number]: string[] }>({});

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({
    open: false, message: '', severity: 'info',
  });

  // Dialog states
  const [customFieldDialog, setCustomFieldDialog] = useState(false);
  const [userDialog, setUserDialog] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [editingUser, setEditingUser] = useState<ChurchUser | null>(null);

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
      template_profile_id: null,
      selected_templates: null,
      selected_tables: [],
      enable_ag_grid: false,
      ag_grid_record_types: [],
      custom_fields: [],
      initial_users: [],
      custom_landing_page: {
        enabled: false,
        title: '',
        welcome_message: '',
        primary_color: '#1976d2',
        logo_url: '',
        default_app: 'liturgical_calendar'
      }
    },
    validationSchema: stepValidationSchemas[5], // Full validation on submit
    onSubmit: async (values) => {
      await handleFinalSubmit(values);
    }
  });

  // Validate a specific step
  const validateStep = useCallback(async (step: number): Promise<boolean> => {
    const schema = stepValidationSchemas[step];
    if (!schema) return true;

    try {
      await schema.validate(formik.values, { abortEarly: false });
      setStepValidation(prev => ({ ...prev, [step]: 'valid' }));
      setStepErrors(prev => ({ ...prev, [step]: [] }));
      return true;
    } catch (err: any) {
      const errors = err.inner?.map((e: any) => e.message) || [err.message];
      setStepValidation(prev => ({ ...prev, [step]: 'invalid' }));
      setStepErrors(prev => ({ ...prev, [step]: errors }));
      return false;
    }
  }, [formik.values]);

  // Load template profiles
  useEffect(() => {
    const fetchTemplateProfiles = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/churches/wizard/template-profiles', {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.profiles) {
            setTemplateProfiles(data.profiles);
            const defaultProfile = data.profiles.find((p: TemplateProfile) => p.id === 'standard_en');
            if (defaultProfile) {
              setSelectedProfile(defaultProfile);
              formik.setFieldValue('template_profile_id', 'standard_en');
              formik.setFieldValue('selected_templates', defaultProfile.templates);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching template profiles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplateProfiles();
  }, []);

  // Handle template profile selection
  const handleTemplateSelection = (profileId: string | null) => {
    const profile = templateProfiles.find(p => p.id === profileId) || null;
    setSelectedProfile(profile);

    if (profileId === 'start_from_scratch' || !profileId) {
      formik.setFieldValue('template_profile_id', null);
      formik.setFieldValue('selected_templates', null);
      formik.setFieldValue('selected_tables', []);
    } else if (profile) {
      formik.setFieldValue('template_profile_id', profileId);
      formik.setFieldValue('selected_templates', profile.templates);
      const tableNames = Object.keys(profile.templates).map(rt => `${rt}_records`);
      formik.setFieldValue('selected_tables', tableNames);
    } else {
      formik.setFieldValue('template_profile_id', null);
      formik.setFieldValue('selected_templates', null);
      formik.setFieldValue('selected_tables', []);
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

  // Handle step navigation with validation
  const handleNext = async () => {
    // Touch all fields in the current step to show errors
    if (activeStep === 0) {
      await formik.setFieldTouched('name', true);
      await formik.setFieldTouched('email', true);
      await formik.setFieldTouched('phone', true);
      await formik.setFieldTouched('city', true);
      await formik.setFieldTouched('country', true);
      await formik.setFieldTouched('preferred_language', true);
      await formik.setFieldTouched('timezone', true);
    }

    const isValid = await validateStep(activeStep);

    if (!isValid && activeStep === 0) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields before proceeding.',
        severity: 'error',
      });
      return;
    }

    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

  // Navigate to a specific step (only if prior required steps are valid)
  const handleStepClick = async (step: number) => {
    if (step < activeStep) {
      setActiveStep(step);
      return;
    }
    // Only allow jumping forward if step 0 is valid
    if (step > 0) {
      const step0Valid = await validateStep(0);
      if (!step0Valid) {
        setSnackbar({
          open: true,
          message: 'Please complete Basic Information before proceeding to other steps.',
          severity: 'warning',
        });
        return;
      }
    }
    setActiveStep(step);
  };

  // Handle final submission
  const handleFinalSubmit = async (values: ChurchWizardData) => {
    // Validate step 0 (required fields) before submitting
    const step0Valid = await validateStep(0);
    if (!step0Valid) {
      setSnackbar({
        open: true,
        message: 'Please go back and fill in all required fields in Basic Information.',
        severity: 'error',
      });
      setActiveStep(0);
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch('/api/admin/churches/wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values)
      });

      if (response.ok) {
        const result = await response.json();
        navigate(`/apps/church-management/edit/${result.church.id}`, {
          state: {
            message: `Church "${values.name}" created successfully with wizard setup!`,
            severity: 'success'
          }
        });
      } else {
        const errorData = await response.json();

        if (response.status === 400 && errorData.required) {
          const missingFields = errorData.required.join(', ');
          setSnackbar({
            open: true,
            message: `Please fill in all required fields: ${missingFields}`,
            severity: 'error',
          });
        } else {
          setSnackbar({
            open: true,
            message: errorData.message || 'Failed to create church. Please try again.',
            severity: 'error',
          });
        }
      }
    } catch (error) {
      console.error('Error creating church:', error);
      setSnackbar({
        open: true,
        message: 'Network error occurred. Please check your connection and try again.',
        severity: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate completion percentage
  const getCompletionPercentage = (): number => {
    let filled = 0;
    let total = 8; // total trackable items

    if (formik.values.name) filled++;
    if (formik.values.email) filled++;
    if (formik.values.phone) filled++;
    if (formik.values.city) filled++;
    if (formik.values.country) filled++;
    if (formik.values.template_profile_id || formik.values.selected_tables.length > 0) filled++;
    if (formik.values.initial_users.length > 0) filled++;
    if (formik.values.custom_landing_page.enabled ? formik.values.custom_landing_page.title : true) filled++;

    return Math.round((filled / total) * 100);
  };

  // Get step validation icon
  const getStepIcon = (index: number) => {
    const validation = stepValidation[index];
    if (index < activeStep) {
      if (validation === 'invalid') {
        return <ErrorIcon color="error" fontSize="small" />;
      }
      return <CheckIcon color="success" fontSize="small" />;
    }
    if (index === activeStep && validation === 'invalid') {
      return <ErrorIcon color="error" fontSize="small" />;
    }
    return undefined;
  };

  // Get review warnings for optional-but-recommended fields
  const getReviewWarnings = (): string[] => {
    const warnings: string[] = [];
    if (!formik.values.address) warnings.push('No street address provided');
    if (!formik.values.website) warnings.push('No website URL provided');
    if (!formik.values.postal_code) warnings.push('No postal code provided');
    if (formik.values.initial_users.length === 0) warnings.push('No initial users added - you can add them later');
    if (formik.values.selected_tables.length === 0 && !formik.values.template_profile_id) {
      warnings.push('No record tables or template selected - church will start with default tables');
    }
    if (formik.values.custom_fields.length === 0) warnings.push('No custom fields defined');
    return warnings;
  };

  // Render step content
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return <BasicInformationStep formik={formik} />;
      case 1:
        return (
          <TemplateSelectionStep
            formik={formik}
            templateProfiles={templateProfiles}
            selectedProfile={selectedProfile}
            onTemplateSelect={handleTemplateSelection}
            loading={loading}
          />
        );
      case 2:
        return (
          <RecordTablesStep
            formik={formik}
            selectedProfile={selectedProfile}
            onAddCustomField={() => setCustomFieldDialog(true)}
            onEditCustomField={(field) => {
              setEditingField(field);
              setCustomFieldDialog(true);
            }}
            onDeleteCustomField={(fieldId) => {
              const updatedFields = formik.values.custom_fields.filter(f => f.id !== fieldId);
              formik.setFieldValue('custom_fields', updatedFields);
            }}
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
        return <ReviewStep formik={formik} selectedProfile={selectedProfile} warnings={getReviewWarnings()} />;
      default:
        return null;
    }
  };

  // Check permission
  if (!hasRole(['super_admin'])) {
    return (
      <Box p={3}>
        <Alert severity="error">
          You don't have permission to create churches. Please contact a system administrator.
        </Alert>
      </Box>
    );
  }

  const completionPct = getCompletionPercentage();

  return (
    <Box p={3}>
      <Card>
        <CardContent>
          {/* Header */}
          <Box mb={3}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="h4" gutterBottom>
                  <ChurchIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Church Setup Wizard
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Create a new church with comprehensive setup including templates, custom fields, users, and landing page configuration.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => navigate('/apps/church-management')}
                sx={{ flexShrink: 0 }}
              >
                Cancel
              </Button>
            </Stack>
          </Box>

          {/* Progress bar */}
          <Box mb={3}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="body2" color="text.secondary">
                Step {activeStep + 1} of {steps.length} - {steps[activeStep].label}
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                {completionPct}% Complete
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={completionPct}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  bgcolor: completionPct === 100 ? 'success.main' : 'primary.main',
                },
              }}
            />
          </Box>

          {/* Step error summary */}
          {stepErrors[activeStep]?.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Please fix the following errors:</Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {stepErrors[activeStep].map((err, i) => (
                  <li key={i}><Typography variant="body2">{err}</Typography></li>
                ))}
              </ul>
            </Alert>
          )}

          {/* Stepper */}
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel
                  optional={
                    <Typography variant="caption" color="text.secondary">
                      {step.description}
                    </Typography>
                  }
                  error={stepValidation[index] === 'invalid' && index <= activeStep}
                  icon={getStepIcon(index)}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleStepClick(index)}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h6">{step.label}</Typography>
                    {stepValidation[index] === 'valid' && index < activeStep && (
                      <Chip label="Complete" size="small" color="success" variant="outlined" />
                    )}
                    {stepValidation[index] === 'invalid' && index < activeStep && (
                      <Chip label="Needs Attention" size="small" color="error" variant="outlined" />
                    )}
                  </Stack>
                </StepLabel>
                <StepContent>
                  <Box my={2}>
                    {renderStepContent(index)}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      disabled={activeStep === 0}
                      onClick={handleBack}
                    >
                      Back
                    </Button>

                    {activeStep === steps.length - 1 ? (
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => formik.handleSubmit()}
                        disabled={isSubmitting}
                        startIcon={isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
                        size="large"
                      >
                        {isSubmitting ? 'Creating Church...' : 'Create Church'}
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        onClick={handleNext}
                      >
                        Next
                      </Button>
                    )}

                    <Box flexGrow={1} />

                    {activeStep < steps.length - 1 && (
                      <Typography variant="caption" color="text.secondary">
                        {activeStep === 0 ? 'Required fields must be filled' : 'This step is optional'}
                      </Typography>
                    )}
                  </Stack>
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

      {/* Snackbar notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// ─── Step Components ────────────────────────────────────────────────────────────

const BasicInformationStep: React.FC<{ formik: any }> = ({ formik }) => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <Alert severity="info" sx={{ mb: 1 }}>
        Fields marked with * are required. Fill in all required fields to proceed to the next step.
      </Alert>
    </Grid>
    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        name="name"
        label="Church Name"
        value={formik.values.name}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
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
        onBlur={formik.handleBlur}
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
        onBlur={formik.handleBlur}
        error={formik.touched.phone && Boolean(formik.errors.phone)}
        helperText={formik.touched.phone && formik.errors.phone}
        required
        placeholder="+1 (555) 123-4567"
      />
    </Grid>
    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        name="website"
        label="Website URL"
        value={formik.values.website}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        placeholder="https://www.example.com"
      />
    </Grid>
    <Grid item xs={12}>
      <TextField
        fullWidth
        name="address"
        label="Street Address"
        value={formik.values.address}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        placeholder="123 Main Street"
      />
    </Grid>
    <Grid item xs={12} md={3}>
      <TextField
        fullWidth
        name="city"
        label="City"
        value={formik.values.city}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.city && Boolean(formik.errors.city)}
        helperText={formik.touched.city && formik.errors.city}
        required
      />
    </Grid>
    <Grid item xs={12} md={3}>
      <TextField
        fullWidth
        name="state_province"
        label="State/Province"
        value={formik.values.state_province}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
      />
    </Grid>
    <Grid item xs={12} md={3}>
      <TextField
        fullWidth
        name="postal_code"
        label="Postal Code"
        value={formik.values.postal_code}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
      />
    </Grid>
    <Grid item xs={12} md={3}>
      <FormControl fullWidth required error={formik.touched.country && Boolean(formik.errors.country)}>
        <InputLabel>Country</InputLabel>
        <Select
          name="country"
          value={formik.values.country}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          label="Country"
        >
          <MenuItem value="United States">United States</MenuItem>
          <MenuItem value="Canada">Canada</MenuItem>
          <MenuItem value="Greece">Greece</MenuItem>
          <MenuItem value="Romania">Romania</MenuItem>
          <MenuItem value="Russia">Russia</MenuItem>
          <MenuItem value="Serbia">Serbia</MenuItem>
          <MenuItem value="Bulgaria">Bulgaria</MenuItem>
          <MenuItem value="Cyprus">Cyprus</MenuItem>
          <MenuItem value="Australia">Australia</MenuItem>
          <MenuItem value="United Kingdom">United Kingdom</MenuItem>
          <MenuItem value="Other">Other</MenuItem>
        </Select>
        {formik.touched.country && formik.errors.country && (
          <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
            {formik.errors.country}
          </Typography>
        )}
      </FormControl>
    </Grid>

    <Grid item xs={12}>
      <Divider sx={{ my: 1 }} />
      <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1, mb: 1 }}>
        Regional Settings
      </Typography>
    </Grid>

    <Grid item xs={12} md={4}>
      <FormControl fullWidth required>
        <InputLabel>Language</InputLabel>
        <Select
          name="preferred_language"
          value={formik.values.preferred_language}
          onChange={formik.handleChange}
          label="Language"
        >
          <MenuItem value="en">English</MenuItem>
          <MenuItem value="el">Greek</MenuItem>
          <MenuItem value="ro">Romanian</MenuItem>
          <MenuItem value="ru">Russian</MenuItem>
          <MenuItem value="sr">Serbian</MenuItem>
          <MenuItem value="bg">Bulgarian</MenuItem>
          <MenuItem value="ar">Arabic</MenuItem>
        </Select>
      </FormControl>
    </Grid>
    <Grid item xs={12} md={4}>
      <FormControl fullWidth required>
        <InputLabel>Timezone</InputLabel>
        <Select
          name="timezone"
          value={formik.values.timezone}
          onChange={formik.handleChange}
          label="Timezone"
        >
          <MenuItem value="America/New_York">Eastern Time (US)</MenuItem>
          <MenuItem value="America/Chicago">Central Time (US)</MenuItem>
          <MenuItem value="America/Denver">Mountain Time (US)</MenuItem>
          <MenuItem value="America/Los_Angeles">Pacific Time (US)</MenuItem>
          <MenuItem value="America/Toronto">Eastern Time (Canada)</MenuItem>
          <MenuItem value="Europe/Athens">Athens (EET)</MenuItem>
          <MenuItem value="Europe/Bucharest">Bucharest (EET)</MenuItem>
          <MenuItem value="Europe/Moscow">Moscow (MSK)</MenuItem>
          <MenuItem value="Europe/Belgrade">Belgrade (CET)</MenuItem>
          <MenuItem value="Europe/Sofia">Sofia (EET)</MenuItem>
          <MenuItem value="Europe/London">London (GMT)</MenuItem>
          <MenuItem value="Australia/Sydney">Sydney (AEST)</MenuItem>
          <MenuItem value="UTC">UTC</MenuItem>
        </Select>
      </FormControl>
    </Grid>
    <Grid item xs={12} md={4}>
      <FormControl fullWidth>
        <InputLabel>Currency</InputLabel>
        <Select
          name="currency"
          value={formik.values.currency}
          onChange={formik.handleChange}
          label="Currency"
        >
          <MenuItem value="USD">USD ($)</MenuItem>
          <MenuItem value="CAD">CAD ($)</MenuItem>
          <MenuItem value="EUR">EUR</MenuItem>
          <MenuItem value="GBP">GBP</MenuItem>
          <MenuItem value="RON">RON (lei)</MenuItem>
          <MenuItem value="RUB">RUB</MenuItem>
          <MenuItem value="AUD">AUD ($)</MenuItem>
        </Select>
      </FormControl>
    </Grid>
  </Grid>
);

const TemplateSelectionStep: React.FC<{
  formik: any;
  templateProfiles: TemplateProfile[];
  selectedProfile: TemplateProfile | null;
  onTemplateSelect: (profileId: string | null) => void;
  loading: boolean;
}> = ({ formik, templateProfiles, selectedProfile, onTemplateSelect, loading }) => (
  <Box>
    <Typography variant="body2" color="text.secondary" paragraph>
      Choose a template profile to provision record tables. Templates define the structure of your baptism, marriage, and funeral record tables.
    </Typography>

    {loading ? (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress size={24} />
        <Typography ml={2}>Loading template profiles...</Typography>
      </Box>
    ) : templateProfiles.length === 0 ? (
      <Alert severity="info">
        No template profiles available. The church will be created with default table structures.
      </Alert>
    ) : (
      <Grid container spacing={2}>
        {templateProfiles.map((profile) => {
          const isSelected = selectedProfile?.id === profile.id || (profile.id === 'start_from_scratch' && formik.values.template_profile_id === null);
          return (
            <Grid item xs={12} md={6} key={profile.id}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  backgroundColor: isSelected ? 'action.selected' : 'background.paper',
                  transition: 'all 0.2s ease',
                  '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
                }}
                onClick={() => onTemplateSelect(profile.id === 'start_from_scratch' ? null : profile.id)}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isSelected}
                      onChange={() => onTemplateSelect(profile.id === 'start_from_scratch' ? null : profile.id)}
                    />
                  }
                  label={
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle1" fontWeight={600}>{profile.name}</Typography>
                        {profile.id === 'standard_en' && (
                          <Chip label="Recommended" size="small" color="primary" />
                        )}
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {profile.description}
                      </Typography>
                      {profile.templates && Object.keys(profile.templates).length > 0 && (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1, gap: 0.5 }}>
                          {Object.values(profile.templates).filter(Boolean).map((tpl, i) => (
                            <Chip key={i} label={tpl} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      )}
                    </Box>
                  }
                />
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    )}

    {selectedProfile && selectedProfile.id !== 'start_from_scratch' && (
      <Alert severity="info" sx={{ mt: 2 }}>
        <strong>Template Selected:</strong> {selectedProfile.name}
        <br />
        Record tables will be created from global templates in <code>orthodoxmetrics_db.templates</code>.
        {selectedProfile.templates && Object.keys(selectedProfile.templates).length > 0 && (
          <>
            <br />
            <strong>Templates:</strong> {Object.entries(selectedProfile.templates)
              .filter(([_, slug]) => slug)
              .map(([type, slug]) => `${type}: ${slug}`)
              .join(', ')}
          </>
        )}
      </Alert>
    )}
  </Box>
);

const RecordTablesStep: React.FC<{
  formik: any;
  selectedProfile: TemplateProfile | null;
  onAddCustomField: () => void;
  onEditCustomField: (field: CustomField) => void;
  onDeleteCustomField: (fieldId: string) => void;
}> = ({ formik, selectedProfile, onAddCustomField, onEditCustomField, onDeleteCustomField }) => (
  <Box>
    <Typography variant="body2" color="text.secondary" paragraph>
      Choose which record tables to create in your church database. You can also add custom fields to extend existing tables.
    </Typography>

    <Grid container spacing={2}>
      {AVAILABLE_RECORD_TABLES.map((table) => {
        const isChecked = formik.values.selected_tables?.includes(table.key);
        return (
          <Grid item xs={12} md={6} key={table.key}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderColor: isChecked ? 'primary.main' : 'divider',
                bgcolor: isChecked ? 'action.selected' : 'background.paper',
                transition: 'all 0.2s ease',
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isChecked}
                    onChange={(e) => {
                      const currentTables = formik.values.selected_tables || [];
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
                    <Typography variant="subtitle2">{table.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {table.description}
                    </Typography>
                  </Box>
                }
              />
            </Paper>
          </Grid>
        );
      })}
    </Grid>

    <Box sx={{ mt: 2 }}>
      <Typography variant="body2" color="text.secondary">
        <strong>{formik.values.selected_tables?.length || 0}</strong> table(s) selected
      </Typography>
    </Box>

    <Divider sx={{ my: 3 }} />

    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
      <Typography variant="h6">Custom Fields</Typography>
      <Button
        variant="contained"
        size="small"
        startIcon={<AddIcon />}
        onClick={onAddCustomField}
        disabled={!formik.values.selected_tables?.length}
      >
        Add Custom Field
      </Button>
    </Stack>

    {!formik.values.selected_tables?.length ? (
      <Alert severity="info">
        Select at least one record table above to add custom fields.
      </Alert>
    ) : formik.values.custom_fields.length === 0 ? (
      <Alert severity="info">
        No custom fields added yet. Custom fields extend your record tables with additional data points.
      </Alert>
    ) : (
      <List>
        {formik.values.custom_fields.map((field: CustomField) => (
          <ListItem key={field.id} divider>
            <ListItemText
              primary={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="subtitle2">{field.field_name}</Typography>
                  <Chip label={field.field_type} size="small" variant="outlined" />
                  {field.is_required && <Chip label="Required" size="small" color="error" variant="outlined" />}
                </Stack>
              }
              secondary={`Table: ${AVAILABLE_RECORD_TABLES.find(t => t.key === field.table_name)?.label || field.table_name} - ${field.description}`}
            />
            <ListItemSecondaryAction>
              <IconButton onClick={() => onEditCustomField(field)} size="small">
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton onClick={() => onDeleteCustomField(field.id)} color="error" size="small">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    )}

    <Divider sx={{ my: 3 }} />

    {/* AG Grid Configuration */}
    <Typography variant="h6" gutterBottom>AG Grid View</Typography>
    <Typography variant="body2" color="text.secondary" paragraph>
      Enable AG Grid to provide an advanced spreadsheet-style view for record tables. This gives users sorting, filtering, column reordering, and export capabilities.
    </Typography>

    <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: formik.values.enable_ag_grid ? 'primary.main' : 'divider', bgcolor: formik.values.enable_ag_grid ? 'action.selected' : 'background.paper' }}>
      <FormControlLabel
        control={
          <Switch
            checked={formik.values.enable_ag_grid}
            onChange={(e) => {
              formik.setFieldValue('enable_ag_grid', e.target.checked);
              if (e.target.checked && formik.values.selected_tables?.length > 0) {
                const recordTypes = formik.values.selected_tables
                  .filter((t: string) => ['baptism_records', 'marriage_records', 'funeral_records'].includes(t))
                  .map((t: string) => t.replace('_records', ''));
                formik.setFieldValue('ag_grid_record_types', recordTypes);
              } else if (!e.target.checked) {
                formik.setFieldValue('ag_grid_record_types', []);
              }
            }}
          />
        }
        label={
          <Box>
            <Typography variant="subtitle2">Enable AG Grid for Record Tables</Typography>
            <Typography variant="caption" color="text.secondary">
              Advanced data grid with sorting, filtering, and export
            </Typography>
          </Box>
        }
      />
    </Paper>

    {formik.values.enable_ag_grid && (
      <Box sx={{ pl: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Select which record types should use AG Grid view:
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          {['baptism', 'marriage', 'funeral'].map((type) => (
            <FormControlLabel
              key={type}
              control={
                <Checkbox
                  checked={formik.values.ag_grid_record_types?.includes(type)}
                  onChange={(e) => {
                    const current = formik.values.ag_grid_record_types || [];
                    if (e.target.checked) {
                      formik.setFieldValue('ag_grid_record_types', [...current, type]);
                    } else {
                      formik.setFieldValue('ag_grid_record_types', current.filter((t: string) => t !== type));
                    }
                  }}
                />
              }
              label={type.charAt(0).toUpperCase() + type.slice(1) + ' Records'}
            />
          ))}
        </Stack>
        {formik.values.ag_grid_record_types?.length === 0 && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            AG Grid is enabled but no record types are selected. Select at least one record type.
          </Alert>
        )}
      </Box>
    )}
  </Box>
);

const UserManagementStep: React.FC<{
  formik: any;
  onAddUser: () => void;
  onEditUser: (user: ChurchUser) => void;
  onDeleteUser: (userId: string) => void;
}> = ({ formik, onAddUser, onEditUser, onDeleteUser }) => (
  <Box>
    <Typography variant="body2" color="text.secondary" paragraph>
      Add users who will have access to the new church's records. They will receive email invitations when the church is created.
    </Typography>

    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
      <Typography variant="subtitle1" fontWeight={600}>
        Users ({formik.values.initial_users.length})
      </Typography>
      <Button
        variant="contained"
        size="small"
        startIcon={<AddIcon />}
        onClick={onAddUser}
      >
        Add User
      </Button>
    </Stack>

    {formik.values.initial_users.length === 0 ? (
      <Alert severity="info">
        No users added yet. This is optional - you can add users after church creation from the church management panel.
      </Alert>
    ) : (
      <List>
        {formik.values.initial_users.map((user: ChurchUser) => {
          const roleInfo = USER_ROLES.find(r => r.value === user.role);
          return (
            <ListItem key={user.id} divider>
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="subtitle2">{user.first_name} {user.last_name}</Typography>
                    <Chip label={roleInfo?.label || user.role} size="small" color="primary" variant="outlined" />
                  </Stack>
                }
                secondary={
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                    <Typography variant="caption">{user.email}</Typography>
                    {user.send_invite && (
                      <Chip label="Will send invite" size="small" color="success" variant="outlined" />
                    )}
                    {user.permissions?.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {user.permissions.length} permission(s)
                      </Typography>
                    )}
                  </Stack>
                }
              />
              <ListItemSecondaryAction>
                <IconButton onClick={() => onEditUser(user)} size="small">
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton onClick={() => onDeleteUser(user.id)} color="error" size="small">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          );
        })}
      </List>
    )}
  </Box>
);

const LandingPageStep: React.FC<{ formik: any }> = ({ formik }) => (
  <Box>
    <Typography variant="body2" color="text.secondary" paragraph>
      Configure a custom landing page for users when they access the church system.
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
      label={
        <Box>
          <Typography variant="subtitle2">Enable Custom Landing Page</Typography>
          <Typography variant="caption" color="text.secondary">
            When disabled, users will see the default dashboard
          </Typography>
        </Box>
      }
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
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              fullWidth
              label="Primary Color"
              value={formik.values.custom_landing_page.primary_color}
              onChange={(e) =>
                formik.setFieldValue('custom_landing_page.primary_color', e.target.value)
              }
              placeholder="#1976d2"
            />
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: formik.values.custom_landing_page.primary_color,
                flexShrink: 0,
                cursor: 'pointer',
              }}
              component="label"
            >
              <input
                type="color"
                value={formik.values.custom_landing_page.primary_color}
                onChange={(e) => formik.setFieldValue('custom_landing_page.primary_color', e.target.value)}
                style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
              />
            </Box>
          </Stack>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Welcome Message"
            value={formik.values.custom_landing_page.welcome_message}
            onChange={(e) =>
              formik.setFieldValue('custom_landing_page.welcome_message', e.target.value)
            }
            placeholder="Enter a welcome message for new users..."
          />
        </Grid>
        <Grid item xs={12} md={6}>
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
        <Grid item xs={12} md={6}>
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
                  <Box>
                    <Typography variant="body2">{option.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{option.description}</Typography>
                  </Box>
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
  selectedProfile: TemplateProfile | null;
  warnings: string[];
}> = ({ formik, selectedProfile, warnings }) => (
  <Box>
    <Typography variant="body2" color="text.secondary" paragraph>
      Please review all settings before creating the church.
    </Typography>

    {/* Warnings for optional-but-recommended fields */}
    {warnings.length > 0 && (
      <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
        <Typography variant="subtitle2" gutterBottom>Optional fields not set:</Typography>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {warnings.map((w, i) => (
            <li key={i}><Typography variant="body2">{w}</Typography></li>
          ))}
        </ul>
      </Alert>
    )}

    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <ChurchIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1" fontWeight={600}>Basic Information</Typography>
          </Stack>
          <Divider sx={{ mb: 1 }} />
          <Typography variant="body2"><strong>Name:</strong> {formik.values.name || <em>Not set</em>}</Typography>
          <Typography variant="body2"><strong>Email:</strong> {formik.values.email || <em>Not set</em>}</Typography>
          <Typography variant="body2"><strong>Phone:</strong> {formik.values.phone || <em>Not set</em>}</Typography>
          {formik.values.website && (
            <Typography variant="body2"><strong>Website:</strong> {formik.values.website}</Typography>
          )}
          <Typography variant="body2">
            <strong>Location:</strong> {[formik.values.city, formik.values.state_province, formik.values.country].filter(Boolean).join(', ') || <em>Not set</em>}
          </Typography>
          <Typography variant="body2">
            <strong>Language:</strong> {formik.values.preferred_language} | <strong>Timezone:</strong> {formik.values.timezone} | <strong>Currency:</strong> {formik.values.currency}
          </Typography>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <SettingsIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1" fontWeight={600}>Template & Tables</Typography>
          </Stack>
          <Divider sx={{ mb: 1 }} />
          <Typography variant="body2">
            <strong>Template Profile:</strong> {selectedProfile ? selectedProfile.name : 'Start from Scratch'}
          </Typography>
          {formik.values.selected_templates && Object.keys(formik.values.selected_templates).length > 0 && (
            <Typography variant="body2">
              <strong>Templates:</strong> {Object.entries(formik.values.selected_templates)
                .filter(([_, slug]) => slug)
                .map(([type, slug]) => `${type}: ${slug}`)
                .join(', ')}
            </Typography>
          )}
          <Typography variant="body2">
            <strong>Selected Tables:</strong> {formik.values.selected_tables?.length || 0}
          </Typography>
          {formik.values.selected_tables?.length > 0 && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5, gap: 0.5 }}>
              {formik.values.selected_tables.map((t: string) => (
                <Chip key={t} label={AVAILABLE_RECORD_TABLES.find(rt => rt.key === t)?.label || t} size="small" variant="outlined" />
              ))}
            </Stack>
          )}
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            <strong>Custom Fields:</strong> {formik.values.custom_fields.length}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            <strong>AG Grid:</strong> {formik.values.enable_ag_grid ? 'Enabled' : 'Disabled'}
            {formik.values.enable_ag_grid && formik.values.ag_grid_record_types?.length > 0 && (
              <> ({formik.values.ag_grid_record_types.join(', ')})</>
            )}
          </Typography>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <PeopleIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1" fontWeight={600}>Users</Typography>
          </Stack>
          <Divider sx={{ mb: 1 }} />
          <Typography variant="body2">
            <strong>Initial Users:</strong> {formik.values.initial_users.length}
          </Typography>
          {formik.values.initial_users.map((user: ChurchUser) => (
            <Typography key={user.id} variant="body2">
              {user.first_name} {user.last_name} - {USER_ROLES.find(r => r.value === user.role)?.label || user.role}
              {user.send_invite && ' (invite)'}
            </Typography>
          ))}
          {formik.values.initial_users.length === 0 && (
            <Typography variant="caption" color="text.secondary">No users added - can be done after creation</Typography>
          )}
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <WebIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1" fontWeight={600}>Landing Page</Typography>
          </Stack>
          <Divider sx={{ mb: 1 }} />
          <Typography variant="body2">
            <strong>Custom Landing:</strong> {formik.values.custom_landing_page.enabled ? 'Enabled' : 'Disabled (default dashboard)'}
          </Typography>
          {formik.values.custom_landing_page.enabled && (
            <>
              <Typography variant="body2">
                <strong>Title:</strong> {formik.values.custom_landing_page.title || <em>Not set</em>}
              </Typography>
              <Typography variant="body2">
                <strong>Welcome Message:</strong> {formik.values.custom_landing_page.welcome_message ? 'Yes' : 'No'}
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

    <Alert severity="warning" sx={{ mt: 3 }}>
      <strong>Important:</strong> Once created, some settings like the database structure cannot be easily changed.
      Please ensure all information is correct before proceeding.
    </Alert>
  </Box>
);

// ─── Dialog Components ──────────────────────────────────────────────────────────

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
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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
    setErrors({});
  }, [editingField, open]);

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!fieldData.table_name) newErrors.table_name = 'Table is required';
    if (!fieldData.field_name) newErrors.field_name = 'Field name is required';
    else if (!/^[a-z][a-z0-9_]*$/.test(fieldData.field_name)) {
      newErrors.field_name = 'Must start with a letter, use only lowercase letters, numbers, and underscores';
    }
    if (!fieldData.field_type) newErrors.field_type = 'Field type is required';
    if (!fieldData.description) newErrors.description = 'Description is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
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
            <FormControl fullWidth error={Boolean(errors.table_name)} required>
              <InputLabel>Table</InputLabel>
              <Select
                value={fieldData.table_name || ''}
                onChange={(e) => setFieldData({ ...fieldData, table_name: e.target.value })}
                label="Table"
              >
                {(existingTables || []).map((table) => (
                  <MenuItem key={table} value={table}>
                    {AVAILABLE_RECORD_TABLES.find(t => t.key === table)?.label || table}
                  </MenuItem>
                ))}
              </Select>
              {errors.table_name && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>{errors.table_name}</Typography>
              )}
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Field Name"
              value={fieldData.field_name || ''}
              onChange={(e) => setFieldData({ ...fieldData, field_name: e.target.value })}
              placeholder="e.g., sponsor_name"
              error={Boolean(errors.field_name)}
              helperText={errors.field_name || 'Lowercase letters, numbers, underscores only'}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Field Type</InputLabel>
              <Select
                value={fieldData.field_type || 'VARCHAR'}
                onChange={(e) => setFieldData({ ...fieldData, field_type: e.target.value as any })}
                label="Field Type"
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
                inputProps={{ min: 1, max: 255 }}
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
              error={Boolean(errors.description)}
              helperText={errors.description}
              required
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
    role: 'viewer',
    permissions: [],
    send_invite: true
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (editingUser) {
      setUserData(editingUser);
    } else {
      setUserData({
        email: '',
        first_name: '',
        last_name: '',
        role: 'viewer',
        permissions: [],
        send_invite: true
      });
    }
    setErrors({});
  }, [editingUser, open]);

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!userData.first_name || userData.first_name.length < 2) newErrors.first_name = 'First name is required (min 2 characters)';
    if (!userData.last_name || userData.last_name.length < 2) newErrors.last_name = 'Last name is required (min 2 characters)';
    if (!userData.email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) newErrors.email = 'Invalid email format';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave({
        ...userData,
        id: editingUser?.id || Date.now().toString()
      } as ChurchUser);
    }
  };

  const selectedRole = USER_ROLES.find(r => r.value === userData.role);

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
              error={Boolean(errors.first_name)}
              helperText={errors.first_name}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={userData.last_name || ''}
              onChange={(e) => setUserData({ ...userData, last_name: e.target.value })}
              error={Boolean(errors.last_name)}
              helperText={errors.last_name}
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
              error={Boolean(errors.email)}
              helperText={errors.email}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={userData.role || 'viewer'}
                onChange={(e) => setUserData({ ...userData, role: e.target.value })}
                label="Role"
              >
                {USER_ROLES.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{role.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{role.description}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedRole && (
              <Box sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  <strong>{selectedRole.label}:</strong> {selectedRole.description}
                </Typography>
              </Box>
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={userData.send_invite || false}
                  onChange={(e) => setUserData({ ...userData, send_invite: e.target.checked })}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Send Email Invitation</Typography>
                  <Typography variant="caption" color="text.secondary">
                    User will receive login credentials via email
                  </Typography>
                </Box>
              }
            />
          </Grid>
          <Grid item xs={12}>
            <Divider sx={{ mb: 1 }} />
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
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Typography>
                  }
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
        >
          {editingUser ? 'Update' : 'Add'} User
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChurchSetupWizard;
