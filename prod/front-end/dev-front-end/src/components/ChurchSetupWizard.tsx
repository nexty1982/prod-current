// Enhanced Church Setup Wizard - Multi-step configuration
import React, { useState, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axios from 'axios';

// Types
interface Church {
  id: number;
  church_id: string;
  name: string;
  email: string;
  created_at: string;
  slug?: string;
  database_name?: string;
}

interface ChurchDetails {
  name: string;
  email: string;
  language: string;
  timezone: string;
  city: string;
  country: string;
  address: string;
  phone: string;
  tax_id: string;
  recordCounts: {
    baptism: number;
    marriage: number;
    funeral: number;
  };
}

interface ClergyMember {
  id?: number;
  name: string;
  title: string;
  email: string;
  phone: string;
  role: string;
}

interface BrandingSettings {
  logo?: File;
  primaryColor: string;
  secondaryColor: string;
  agGridTheme: string;
}

const CLERGY_ROLES = [
  'Priest',
  'Deacon', 
  'Reader',
  'Chanter',
  'Parish Council President',
  'Parish Council Member',
  'Treasurer',
  'Secretary',
  'Other'
];

const AG_GRID_THEMES = [
  'ag-theme-alpine',
  'ag-theme-alpine-dark',
  'ag-theme-balham',
  'ag-theme-balham-dark',
  'ag-theme-material',
  'ag-theme-quartz',
  'ag-theme-quartz-dark'
];

const steps = [
  'Church Selection',
  'Test Connection',
  'Church Information',
  'Parish Clergy',
  'Branding & Customization'
];

export default function ChurchSetupWizard() {
  const { enqueueSnackbar } = useSnackbar();
  const [activeStep, setActiveStep] = useState(0);
  const [recentChurches, setRecentChurches] = useState<Church[]>([]);
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [churchDetails, setChurchDetails] = useState<ChurchDetails | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState<string>('');
  const [clergyMembers, setClergyMembers] = useState<ClergyMember[]>([]);
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings>({
    primaryColor: '#1976d2',
    secondaryColor: '#dc004e',
    agGridTheme: 'ag-theme-alpine'
  });
  const [loading, setLoading] = useState(false);
  const [clergyDialogOpen, setClergyDialogOpen] = useState(false);
  const [newClergy, setNewClergy] = useState<ClergyMember>({
    name: '',
    title: '',
    email: '',
    phone: '',
    role: 'Priest'
  });

  // Load recent churches on component mount
  useEffect(() => {
    loadRecentChurches();
  }, []);

  const loadRecentChurches = async () => {
    try {
      const response = await axios.get('/api/churches/recent?limit=10');
      if (response.data.success) {
        setRecentChurches(response.data.churches);
      }
    } catch (error) {
      console.error('Failed to load recent churches:', error);
      enqueueSnackbar('Failed to load recent churches', { 
        variant: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'center' }
      });
    }
  };

  const handleChurchSelection = async (church: Church) => {
    setSelectedChurch(church);
    setConnectionStatus('idle');
    setActiveStep(1);
    
    // Auto-advance to step 2 for connection test
    setTimeout(() => {
      testDatabaseConnection(church);
    }, 500);
  };

  const testDatabaseConnection = async (church: Church) => {
    setConnectionStatus('testing');
    setConnectionError('');
    
    try {
      const response = await axios.post(`/api/churches/test-connection/${church.church_id}`);
      
      if (response.data.success) {
        setConnectionStatus('success');
        setActiveStep(2);
        loadChurchDetails(church);
        enqueueSnackbar('Database connection successful!', { 
          variant: 'success',
          anchorOrigin: { vertical: 'top', horizontal: 'center' }
        });
      } else {
        setConnectionStatus('error');
        setConnectionError(response.data.error || 'Connection failed');
      }
    } catch (error: any) {
      setConnectionStatus('error');
      setConnectionError(error.response?.data?.error || 'Network error occurred');
      console.error('Connection test failed:', error);
    }
  };

  const loadChurchDetails = async (church: Church) => {
    try {
      const response = await axios.get(`/api/churches/${church.church_id}/details`);
      if (response.data.success) {
        setChurchDetails(response.data.details);
      }
    } catch (error) {
      console.error('Failed to load church details:', error);
    }
  };

  const loadClergyMembers = async () => {
    if (!selectedChurch) return;
    
    try {
      const response = await axios.get(`/api/churches/${selectedChurch.church_id}/clergy`);
      if (response.data.success) {
        setClergyMembers(response.data.clergy);
      }
    } catch (error) {
      console.error('Failed to load clergy:', error);
    }
  };

  const handleAddClergy = async () => {
    if (!selectedChurch) return;
    
    try {
      const response = await axios.post(`/api/churches/${selectedChurch.church_id}/clergy`, newClergy);
      if (response.data.success) {
        setClergyMembers([...clergyMembers, response.data.clergy]);
        setNewClergy({ name: '', title: '', email: '', phone: '', role: 'Priest' });
        setClergyDialogOpen(false);
        enqueueSnackbar('Clergy member added successfully', { 
          variant: 'success',
          anchorOrigin: { vertical: 'top', horizontal: 'center' }
        });
      }
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Failed to add clergy member', { 
        variant: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'center' }
      });
    }
  };

  const handleDeleteClergy = async (clergyId: number) => {
    if (!selectedChurch) return;
    
    try {
      await axios.delete(`/api/churches/${selectedChurch.church_id}/clergy/${clergyId}`);
      setClergyMembers(clergyMembers.filter(c => c.id !== clergyId));
      enqueueSnackbar('Clergy member removed', { 
        variant: 'success',
        anchorOrigin: { vertical: 'top', horizontal: 'center' }
      });
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Failed to remove clergy member', { 
        variant: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'center' }
      });
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === 'image/png' || file.type === 'image/svg+xml')) {
      setBrandingSettings({ ...brandingSettings, logo: file });
    } else {
      enqueueSnackbar('Please upload a PNG or SVG file', { 
        variant: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'center' }
      });
    }
  };

  const handleFinishSetup = async () => {
    if (!selectedChurch) return;
    
    setLoading(true);
    try {
      // Save branding settings
      const formData = new FormData();
      if (brandingSettings.logo) {
        formData.append('logo', brandingSettings.logo);
      }
      formData.append('primaryColor', brandingSettings.primaryColor);
      formData.append('secondaryColor', brandingSettings.secondaryColor);
      formData.append('agGridTheme', brandingSettings.agGridTheme);
      
      await axios.post(`/api/churches/${selectedChurch.church_id}/branding`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      enqueueSnackbar('Church setup completed successfully!', { 
        variant: 'success',
        anchorOrigin: { vertical: 'top', horizontal: 'center' }
      });
      
      // Reset wizard
      setActiveStep(0);
      setSelectedChurch(null);
      setChurchDetails(null);
      setClergyMembers([]);
      setBrandingSettings({
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e',
        agGridTheme: 'ag-theme-alpine'
      });
      
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Failed to complete setup', { 
        variant: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'center' }
      });
    } finally {
      setLoading(false);
    }
  };

  // Load clergy when stepping to clergy section
  useEffect(() => {
    if (activeStep === 3 && selectedChurch) {
      loadClergyMembers();
    }
  }, [activeStep, selectedChurch]);

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Church Selection
        return (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Select a Church to Set Up
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Choose from the 10 most recently added churches
              </Typography>
              
              {recentChurches.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  No recent churches found. Please add a church first.
                </Alert>
              ) : (
                <FormControl fullWidth>
                  <InputLabel>Select Church</InputLabel>
                  <Select
                    value={selectedChurch?.id || ''}
                    onChange={(e) => {
                      const church = recentChurches.find(c => c.id === e.target.value);
                      if (church) handleChurchSelection(church);
                    }}
                  >
                    {recentChurches.map((church) => (
                      <MenuItem key={church.id} value={church.id}>
                        {church.name} — {new Date(church.created_at).toLocaleDateString()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadRecentChurches}
                >
                  Refresh List
                </Button>
              </Box>
            </CardContent>
          </Card>
        );

      case 1: // Test Database Connection
        return (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Database Connection
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Testing connection to: {selectedChurch?.name}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => selectedChurch && testDatabaseConnection(selectedChurch)}
                  disabled={connectionStatus === 'testing'}
                  startIcon={connectionStatus === 'testing' ? <CircularProgress size={20} /> : <RefreshIcon />}
                >
                  {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                </Button>
                
                {connectionStatus === 'success' && (
                  <Chip icon={<CheckIcon />} label="Connected" color="success" />
                )}
                {connectionStatus === 'error' && (
                  <Chip icon={<ErrorIcon />} label="Failed" color="error" />
                )}
              </Box>
              
              {connectionError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {connectionError}
                </Alert>
              )}
              
              {connectionStatus === 'success' && (
                <Alert severity="success">
                  Database connection successful! Ready to proceed with setup.
                </Alert>
              )}
            </CardContent>
          </Card>
        );

      case 2: // Church Information Summary
        return (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Church Information Summary
              </Typography>
              
              {churchDetails ? (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Basic Information</Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText primary="Name" secondary={churchDetails.name} />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Email" secondary={churchDetails.email} />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Phone" secondary={churchDetails.phone || 'Not provided'} />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Tax ID" secondary={churchDetails.tax_id || 'Not provided'} />
                      </ListItem>
                    </List>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Location & Settings</Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText primary="Address" secondary={churchDetails.address || 'Not provided'} />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="City, Country" secondary={`${churchDetails.city || 'Unknown'}, ${churchDetails.country || 'Unknown'}`} />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Language" secondary={churchDetails.language} />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Timezone" secondary={churchDetails.timezone} />
                      </ListItem>
                    </List>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Record Counts
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Chip label={`Baptism: ${churchDetails.recordCounts.baptism}`} color="primary" variant="outlined" />
                      <Chip label={`Marriage: ${churchDetails.recordCounts.marriage}`} color="secondary" variant="outlined" />
                      <Chip label={`Funeral: ${churchDetails.recordCounts.funeral}`} color="default" variant="outlined" />
                    </Box>
                  </Grid>
                </Grid>
              ) : (
                <CircularProgress />
              )}
            </CardContent>
          </Card>
        );

      case 3: // Parish Clergy Information
        return (
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Parish Clergy Information
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setClergyDialogOpen(true)}
                >
                  Add Clergy
                </Button>
              </Box>
              
              {clergyMembers.length === 0 ? (
                <Alert severity="info">
                  No clergy members added yet. Click "Add Clergy" to get started.
                </Alert>
              ) : (
                <List>
                  {clergyMembers.map((clergy, index) => (
                    <ListItem key={clergy.id || index} divider>
                      <ListItemText
                        primary={`${clergy.title} ${clergy.name}`}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {clergy.role} • {clergy.email} • {clergy.phone}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => clergy.id && handleDeleteClergy(clergy.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        );

      case 4: // Branding & Customization
        return (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Branding & Customization
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                This step is optional. Customize the church's visual appearance.
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Logo Upload</Typography>
                  <input
                    accept="image/png,image/svg+xml"
                    style={{ display: 'none' }}
                    id="logo-upload"
                    type="file"
                    onChange={handleLogoUpload}
                  />
                  <label htmlFor="logo-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<UploadIcon />}
                      fullWidth
                    >
                      Upload Logo (PNG/SVG)
                    </Button>
                  </label>
                  {brandingSettings.logo && (
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Selected: {brandingSettings.logo.name}
                    </Typography>
                  )}
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>AG Grid Theme</InputLabel>
                    <Select
                      value={brandingSettings.agGridTheme}
                      onChange={(e) => setBrandingSettings({
                        ...brandingSettings,
                        agGridTheme: e.target.value
                      })}
                    >
                      {AG_GRID_THEMES.map(theme => (
                        <MenuItem key={theme} value={theme}>
                          {theme.replace('ag-theme-', '').replace('-', ' ').toUpperCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Primary Color"
                    type="color"
                    value={brandingSettings.primaryColor}
                    onChange={(e) => setBrandingSettings({
                      ...brandingSettings,
                      primaryColor: e.target.value
                    })}
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Secondary Color"
                    type="color"
                    value={brandingSettings.secondaryColor}
                    onChange={(e) => setBrandingSettings({
                      ...brandingSettings,
                      secondaryColor: e.target.value
                    })}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Church Setup Wizard
      </Typography>
      
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {renderStepContent()}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          disabled={activeStep === 0}
          onClick={() => setActiveStep(activeStep - 1)}
        >
          Back
        </Button>
        
        <Box>
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleFinishSetup}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : undefined}
            >
              {loading ? 'Finishing...' : 'Complete Setup'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={() => setActiveStep(activeStep + 1)}
              disabled={
                (activeStep === 0 && !selectedChurch) ||
                (activeStep === 1 && connectionStatus !== 'success')
              }
            >
              Next
            </Button>
          )}
        </Box>
      </Box>

      {/* Add Clergy Dialog */}
      <Dialog open={clergyDialogOpen} onClose={() => setClergyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Clergy Member</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Name"
                value={newClergy.name}
                onChange={(e) => setNewClergy({ ...newClergy, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Title"
                value={newClergy.title}
                onChange={(e) => setNewClergy({ ...newClergy, title: e.target.value })}
                placeholder="e.g., Fr., Deacon"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={newClergy.role}
                  onChange={(e) => setNewClergy({ ...newClergy, role: e.target.value })}
                >
                  {CLERGY_ROLES.map(role => (
                    <MenuItem key={role} value={role}>{role}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newClergy.email}
                onChange={(e) => setNewClergy({ ...newClergy, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Phone"
                value={newClergy.phone}
                onChange={(e) => setNewClergy({ ...newClergy, phone: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClergyDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddClergy}
            disabled={!newClergy.name || !newClergy.email}
          >
            Add Clergy
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
