import React, { useState, useEffect } from 'react';
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
  Checkbox
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
  Person as PersonIcon
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

const steps = [
  'Basic Information',
  'Template Selection',
  'Record Tables & Custom Fields',
  'User Management',
  'Landing Page Configuration',
  'Review & Create'
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
    label: '📅 Liturgical Calendar', 
    description: 'Orthodox liturgical calendar with feast days and fasting periods' 
  },
  { 
    value: 'church_records', 
    label: '📋 Church Records', 
    description: 'Manage baptism, marriage, and funeral records' 
  },
  { 
    value: 'notes_app', 
    label: '📝 Notes App', 
    description: 'Personal notes and task management' 
  }
];

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
    // Additional schemas for other steps can be added as needed
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
      }
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
              // Fetch available tables for each template
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
      // Pre-populate with template's available tables
      formik.setFieldValue('selected_tables', template.available_tables);
    }
  };

  // Handle adding custom field
  const handleAddCustomField = (field: CustomField) => {
    const currentFields = formik.values.custom_fields;
    if (editingField) {
      // Update existing field
      const updatedFields = currentFields.map(f => f.id === field.id ? field : f);
      formik.setFieldValue('custom_fields', updatedFields);
      setEditingField(null);
    } else {
      // Add new field
      formik.setFieldValue('custom_fields', [...currentFields, { ...field, id: Date.now().toString() }]);
    }
    setCustomFieldDialog(false);
  };

  // Handle adding user
  const handleAddUser = (user: ChurchUser) => {
    const currentUsers = formik.values.initial_users;
    if (editingUser) {
      // Update existing user
      const updatedUsers = currentUsers.map(u => u.id === user.id ? user : u);
      formik.setFieldValue('initial_users', updatedUsers);
      setEditingUser(null);
    } else {
      // Add new user
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
        // Show success and redirect
        navigate(`/apps/church-management/edit/${result.church.id}`, {
          state: { 
            message: `Church "${values.name}" created successfully with wizard setup!`,
            severity: 'success'
          }
        });
      } else {
        const errorData = await response.json();
        
        // Handle 400 validation errors by showing specific missing fields
        if (response.status === 400 && errorData.required) {
          const missingFields = errorData.required.join(", ");
          alert(`Please fill in all required fields: ${missingFields}`);
        } else {
          alert(errorData.message || "Failed to create church");
        }
        
        throw new Error(errorData.message || "Failed to create church");
      }
    } catch (error) {
      console.error("Error creating church:", error);
      // Error is already handled above for API responses
      // This catch handles network errors or other unexpected issues
      if (!error.message.includes("required fields")) {
        alert("Network error or unexpected issue occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
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
    <Box p={3}>
      <Card>
        <CardContent>
          <Box mb={3}>
            <Typography variant="h4" gutterBottom>
              <ChurchIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Church Setup Wizard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create a new church with comprehensive setup including templates, custom fields, users, and landing page configuration.
            </Typography>
          </Box>

          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel>
                  <Typography variant="h6">{label}</Typography>
                </StepLabel>
                <StepContent>
                  <Box my={2}>
                    {renderStepContent(index)}
                  </Box>
                  
                  <Box mt={3}>
                    <Button
                      disabled={activeStep === 0}
                      onClick={handleBack}
                      sx={{ mr: 1 }}
                    >
                      Back
                    </Button>
                    
                    {activeStep === steps.length - 1 ? (
                      <Button
                        variant="contained"
                        onClick={() => formik.handleSubmit()}
                        disabled={isSubmitting}
                        startIcon={isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
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
                  </Box>
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
    </Box>
  );
};

// Step Components
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
          <MenuItem value="EUR">EUR (€)</MenuItem>
          <MenuItem value="GBP">GBP (£)</MenuItem>
          <MenuItem value="RON">RON (lei)</MenuItem>
          <MenuItem value="RUB">RUB (₽)</MenuItem>
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
    <Typography variant="h6" gutterBottom>
      Choose a Template Church (Optional)
    </Typography>
    <Typography variant="body2" color="text.secondary" paragraph>
      Select an existing English-language church to use as a template. This will copy its structure, pages, themes, and settings.
    </Typography>

    {loading ? (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
        <Typography ml={2}>Loading template churches...</Typography>
      </Box>
    ) : (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formik.values.template_church_id === null}
                  onChange={() => onTemplateSelect(null)}
                />
              }
              label={
                <Box>
                  <Typography variant="subtitle1">Start from Scratch</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Create a new church without using any template
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
                border: selectedTemplate?.id === church.id ? 2 : 1,
                borderColor: selectedTemplate?.id === church.id ? 'primary.main' : 'divider'
              }}
              onClick={() => onTemplateSelect(church.id)}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedTemplate?.id === church.id}
                    onChange={() => onTemplateSelect(church.id)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="subtitle1">{church.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {church.city}, {church.country}
                    </Typography>
                    <Typography variant="caption" display="block">
                      {church.available_tables.length} available table(s)
                    </Typography>
                  </Box>
                }
              />
            </Paper>
          </Grid>
        ))}
      </Grid>
    )}

    {selectedTemplate && (
      <Alert severity="info" sx={{ mt: 2 }}>
        <strong>Template Selected:</strong> {selectedTemplate.name}
        <br />
        This church's structure and settings will be copied to your new church.
      </Alert>
    )}
  </Box>
);

const RecordTablesStep: React.FC<{
  formik: any;
  selectedTemplate: TemplateChurch | null;
  onAddCustomField: () => void;
  onEditCustomField: (field: CustomField) => void;
  onDeleteCustomField: (fieldId: string) => void;
}> = ({ formik, selectedTemplate, onAddCustomField, onEditCustomField, onDeleteCustomField }) => (
  <Box>
    <Typography variant="h6" gutterBottom>
      Select Record Tables
    </Typography>
    <Typography variant="body2" color="text.secondary" paragraph>
      Choose which record tables to create in your church database. Standard tables are always created, 
      but you can select additional specialized tables.
    </Typography>

    <Grid container spacing={2}>
      {AVAILABLE_RECORD_TABLES.map((table) => (
        <Grid item xs={12} md={6} key={table.key}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formik.values.selected_tables.includes(table.key)}
                  onChange={(e) => {
                    const currentTables = formik.values.selected_tables;
                    if (e.target.checked) {
                      formik.setFieldValue('selected_tables', [...currentTables, table.key]);
                    } else {
                      formik.setFieldValue('selected_tables', currentTables.filter(t => t !== table.key));
                    }
                  }}
                />
              }
              label={
                <Box>
                  <Typography variant="subtitle1">{table.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
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
      <Typography variant="h6">Custom Fields</Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={onAddCustomField}
      >
        Add Custom Field
      </Button>
    </Box>

    {formik.values.custom_fields.length === 0 ? (
      <Alert severity="info">
        No custom fields added yet. You can add custom fields to extend the functionality of your record tables.
      </Alert>
    ) : (
      <List>
        {formik.values.custom_fields.map((field) => (
          <ListItem key={field.id} divider>
            <ListItemText
              primary={`${field.field_name} (${field.field_type})`}
              secondary={`Table: ${field.table_name} - ${field.description}`}
            />
            <ListItemSecondaryAction>
              <IconButton onClick={() => onEditCustomField(field)}>
                <EditIcon />
              </IconButton>
              <IconButton onClick={() => onDeleteCustomField(field.id)} color="error">
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
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
    <Typography variant="h6" gutterBottom>
      Initial Users
    </Typography>
    <Typography variant="body2" color="text.secondary" paragraph>
      Add users who will have access to the new church's records. They will receive email invitations.
    </Typography>

    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
      <Typography variant="subtitle1">Users</Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={onAddUser}
      >
        Add User
      </Button>
    </Box>

    {formik.values.initial_users.length === 0 ? (
      <Alert severity="info">
        No users added yet. You can add users after church creation from the church management panel.
      </Alert>
    ) : (
      <List>
        {formik.values.initial_users.map((user) => (
          <ListItem key={user.id} divider>
            <ListItemText
              primary={`${user.first_name} ${user.last_name}`}
              secondary={`${user.email} - ${user.role.toUpperCase()}`}
            />
            <ListItemSecondaryAction>
              <Chip
                label={user.send_invite ? 'Will send invite' : 'No invite'}
                color={user.send_invite ? 'success' : 'default'}
                size="small"
                sx={{ mr: 1 }}
              />
              <IconButton onClick={() => onEditUser(user)}>
                <EditIcon />
              </IconButton>
              <IconButton onClick={() => onDeleteUser(user.id)} color="error">
                <DeleteIcon />
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
    <Typography variant="h6" gutterBottom>
      Custom Landing Page
    </Typography>
    <Typography variant="body2" color="text.secondary" paragraph>
      Configure a custom landing page that new users will see when they first access the church system.
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
            rows={4}
            label="Welcome Message"
            value={formik.values.custom_landing_page.welcome_message}
            onChange={(e) => 
              formik.setFieldValue('custom_landing_page.welcome_message', e.target.value)
            }
            placeholder="Enter a welcome message for new users..."
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
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Select which application users will see by default when they access the church system.
          </Typography>
          {formik.values.custom_landing_page.default_app && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Selected:</strong> {
                  DEFAULT_APP_OPTIONS.find(option => 
                    option.value === formik.values.custom_landing_page.default_app
                  )?.description
                }
              </Typography>
            </Alert>
          )}
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
    <Typography variant="h6" gutterBottom>
      Review Church Configuration
    </Typography>
    <Typography variant="body2" color="text.secondary" paragraph>
      Please review all settings before creating the church.
    </Typography>

    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            <ChurchIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Basic Information
          </Typography>
          <Typography variant="body2"><strong>Name:</strong> {formik.values.name}</Typography>
          <Typography variant="body2"><strong>Email:</strong> {formik.values.email}</Typography>
          <Typography variant="body2"><strong>Location:</strong> {formik.values.city}, {formik.values.country}</Typography>
          <Typography variant="body2"><strong>Language:</strong> {formik.values.preferred_language}</Typography>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Template & Tables
          </Typography>
          <Typography variant="body2">
            <strong>Template:</strong> {selectedTemplate ? selectedTemplate.name : 'None (Start from scratch)'}
          </Typography>
          <Typography variant="body2">
            <strong>Selected Tables:</strong> {formik.values.selected_tables.length}
          </Typography>
          <Typography variant="body2">
            <strong>Custom Fields:</strong> {formik.values.custom_fields.length}
          </Typography>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            <PeopleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Users
          </Typography>
          <Typography variant="body2">
            <strong>Initial Users:</strong> {formik.values.initial_users.length}
          </Typography>
          {formik.values.initial_users.slice(0, 3).map((user) => (
            <Typography key={user.id} variant="body2">
              • {user.first_name} {user.last_name} ({user.role})
            </Typography>
          ))}
          {formik.values.initial_users.length > 3 && (
            <Typography variant="body2">
              ... and {formik.values.initial_users.length - 3} more
            </Typography>
          )}
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            <WebIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Landing Page
          </Typography>
          <Typography variant="body2">
            <strong>Custom Landing:</strong> {formik.values.custom_landing_page.enabled ? 'Yes' : 'No'}
          </Typography>
          {formik.values.custom_landing_page.enabled && (
            <>
              <Typography variant="body2">
                <strong>Title:</strong> {formik.values.custom_landing_page.title || 'Not set'}
              </Typography>
              <Typography variant="body2">
                <strong>Has Welcome Message:</strong> {formik.values.custom_landing_page.welcome_message ? 'Yes' : 'No'}
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

// Dialog Components
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