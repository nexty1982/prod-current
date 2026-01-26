import {
    ArrowBack as BackIcon,
    CheckCircle as CheckIcon,
    Church as ChurchIcon,
    ArrowForward as NextIcon,
    Person as PersonIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CircularProgress,
    Divider,
    FormControl,
    FormControlLabel,
    Grid,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Switch,
    TextField,
    Typography
} from '@mui/material';
import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext.tsx';

// Types
interface ChurchFormData {
  // Contact Person
  firstName: string;
  lastName: string;
  
  // Church Information
  churchName: string;
  email: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  timezone: string;
  jurisdiction: string;
  churchSize: string;
  phone: string;
  website: string;
  address: string;
  taxId: string;
  currency: string;
  referralSource: string;
  
  // Selected Modules
  selectedModules: string[];
  
  // Admin Accounts
  adminEmail: string;
  adminPassword: string;
  confirmPassword: string;
  addSecondAdmin: boolean;
  secondAdminEmail?: string;
  secondAdminPassword?: string;
}

const ChurchSetupWizard: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [provisionId, setProvisionId] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [formData, setFormData] = useState<ChurchFormData>({
    firstName: '',
    lastName: '',
    churchName: '',
    email: '',
    city: '',
    stateProvince: '',
    postalCode: '',
    country: 'United States',
    timezone: 'Eastern Time',
    jurisdiction: 'OCA',
    churchSize: '< 125',
    phone: '',
    website: '',
    address: '',
    taxId: '',
    currency: 'USD - US Dollar',
    referralSource: 'Social Media',
    selectedModules: ['baptism', 'marriage', 'funeral'],
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
    addSecondAdmin: false
  });

  // Available options
  const countries = ['United States', 'Canada', 'Greece', 'Romania', 'Russia', 'Serbia', 'Bulgaria', 'Other'];
  const timezones = ['Eastern Time', 'Central Time', 'Mountain Time', 'Pacific Time', 'Alaska Time', 'Hawaii Time'];
  const jurisdictions = ['OCA', 'ROCOR', 'Greek Orthodox', 'Antiochian', 'Serbian', 'Romanian', 'Bulgarian', 'Other'];
  const churchSizes = ['< 125', '125-250', '251-500', '501-1000', '1000+'];
  const currencies = ['USD - US Dollar', 'CAD - Canadian Dollar', 'EUR - Euro', 'GBP - British Pound'];
  const referralSources = ['Social Media', 'Website', 'Word of Mouth', 'Orthodox Directory', 'Conference', 'Other'];

  const recordModules = [
    {
      id: 'baptism',
      name: 'Baptism Records',
      description: 'Track baptisms, chrismations, and reception dates with family information',
      icon: '📖'
    },
    {
      id: 'marriage',
      name: 'Marriage Records', 
      description: 'Manage wedding ceremonies, couples information, and officiating priests',
      icon: '💒'
    },
    {
      id: 'funeral',
      name: 'Funeral Records',
      description: 'Document funeral services, burial information, and memorial details',
      icon: '⚱️'
    }
  ];

  // Progress calculation
  const getProgress = () => {
    switch (currentStep) {
      case 1: return 0;
      case 2: return 50;
      case 3: return 100;
      default: return 0;
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof ChurchFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: unknown } }
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  // Handle module toggle
  const handleModuleToggle = (moduleId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedModules: prev.selectedModules.includes(moduleId)
        ? prev.selectedModules.filter(id => id !== moduleId)
        : [...prev.selectedModules, moduleId]
    }));
  };

  // Navigation
  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Submit form
  const handleFinishSetup = async () => {
    setIsSubmitting(true);
    try {
      // Prepare data for submission
      const submissionData = {
        // Basic info
        name: formData.churchName,
        email: formData.adminEmail,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state_province: formData.stateProvince,
        postal_code: formData.postalCode,
        country: formData.country,
        website: formData.website,
        preferred_language: 'en',
        timezone: formData.timezone,
        currency: formData.currency.split(' - ')[0],
        is_active: true,
        
        // Contact person
        contact_first_name: formData.firstName,
        contact_last_name: formData.lastName,
        
        // Church details
        jurisdiction: formData.jurisdiction,
        church_size: formData.churchSize,
        tax_id: formData.taxId,
        referral_source: formData.referralSource,
        
        // Selected modules
        selected_tables: formData.selectedModules,
        
        // Admin user
        initial_users: [{
          email: formData.adminEmail,
          first_name: formData.firstName,
          last_name: formData.lastName,
          role: 'church_admin',
          password: formData.adminPassword,
          send_invite: false
        }]
      };

      // Add second admin if specified
      if (formData.addSecondAdmin && formData.secondAdminEmail && formData.secondAdminPassword) {
        submissionData.initial_users.push({
          email: formData.secondAdminEmail,
          first_name: 'Second',
          last_name: 'Administrator',
          role: 'church_admin',
          password: formData.secondAdminPassword,
          send_invite: false
        });
      }

      const response = await fetch('/api/admin/churches/wizard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(submissionData)
      });

      if (response.ok) {
        const result = await response.json();
        setProvisionId(result.provisionId || 'P-12345');
        setIsSuccess(true);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create provision');
      }
    } catch (error) {
      console.error('Error creating provision:', error);
      // Handle error - could show an error alert
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle navigation to dashboard
  const handleGoToDashboard = () => {
    window.location.href = '/apps/church-management';
  };

  // Check permissions
  if (!hasRole(['super_admin'])) {
    return (
      <Box p={3}>
        <Alert severity="error">
          You don't have permission to create churches. Please contact a system administrator.
        </Alert>
      </Box>
    );
  }

  // Success screen
  if (isSuccess) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: '#f8f9fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3
      }}>
        <Card sx={{ maxWidth: 500, width: '100%', textAlign: 'center', p: 4 }}>
          <Box sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: '#e8f5e8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3
          }}>
            <CheckIcon sx={{ fontSize: 40, color: '#4caf50' }} />
          </Box>
          
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Provision Created Successfully!
          </Typography>
          
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Provision created for <strong>{formData.churchName}</strong>
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">Provision ID</Typography>
              <Typography variant="h6" fontWeight="bold">{provisionId}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Contact</Typography>
              <Typography variant="body1">{formData.firstName} {formData.lastName}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Jurisdiction</Typography>
              <Typography variant="body1">{formData.jurisdiction}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Church Size</Typography>
              <Typography variant="body1">{formData.churchSize}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Referral Source</Typography>
              <Typography variant="body1">{formData.referralSource}</Typography>
            </Grid>
          </Grid>
          
          <Button
            variant="contained"
            fullWidth
            onClick={handleGoToDashboard}
            sx={{ 
              bgcolor: '#6366f1',
              '&:hover': { bgcolor: '#5855eb' },
              py: 1.5,
              fontSize: '1rem'
            }}
          >
            Go to Provision Dashboard
          </Button>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8f9fa' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e0e0e0', px: 3, py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ChurchIcon sx={{ color: '#6366f1' }} />
          <Typography variant="h6" fontWeight="bold">OrthodoxMetrics, LLC</Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 80px)' }}>
        {/* Sidebar */}
        <Box sx={{
          width: 280,
          background: 'linear-gradient(180deg, #8b5cf6 0%, #ec4899 50%, #f59e0b 100%)',
          p: 3,
          color: 'white'
        }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Create Church Wizard
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, mb: 4 }}>
            Set up your church's digital infrastructure in 3 simple steps
          </Typography>
          
          {/* Setup Progress */}
          <Typography variant="h6" gutterBottom>Setup Progress</Typography>
          
          {/* Step 1 */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: currentStep >= 1 ? '#fbbf24' : 'rgba(255,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2
            }}>
              {currentStep > 1 ? <CheckIcon /> : <Typography fontWeight="bold">1</Typography>}
            </Box>
            <Box>
              <Typography fontWeight="bold">Basic Information</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {currentStep === 1 ? 'In progress...' : currentStep > 1 ? 'Completed ✨' : ''}
              </Typography>
            </Box>
          </Box>
          
          {/* Step 2 */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: currentStep >= 2 ? '#fbbf24' : 'rgba(255,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2
            }}>
              {currentStep > 2 ? <CheckIcon /> : <Typography fontWeight="bold">2</Typography>}
            </Box>
            <Box>
              <Typography fontWeight="bold">Select Modules</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {currentStep === 2 ? 'In progress...' : currentStep > 2 ? 'Completed ✨' : ''}
              </Typography>
            </Box>
          </Box>
          
          {/* Step 3 */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: currentStep >= 3 ? '#fbbf24' : 'rgba(255,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2
            }}>
              <Typography fontWeight="bold">3</Typography>
            </Box>
            <Box>
              <Typography fontWeight="bold">Admin Accounts</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {currentStep === 3 ? 'In progress...' : ''}
              </Typography>
            </Box>
          </Box>
          
          {/* Progress Bar */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="body2" gutterBottom>Progress</Typography>
            <Box sx={{
              height: 8,
              bgcolor: 'rgba(255,255,255,0.3)',
              borderRadius: 4,
              overflow: 'hidden'
            }}>
              <Box sx={{
                height: '100%',
                bgcolor: '#fbbf24',
                width: `${getProgress()}%`,
                transition: 'width 0.3s ease'
              }} />
            </Box>
            <Typography variant="body2" sx={{ mt: 1, textAlign: 'right' }}>
              {getProgress()}%
            </Typography>
          </Box>
        </Box>

        {/* Main Content */}
        <Box sx={{ flex: 1, p: 4 }}>
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <Box>
              <Typography variant="h4" gutterBottom>
                Step 1: Basic Information
              </Typography>
              
              {/* Contact Person */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PersonIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Contact Person</Typography>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      required
                      value={formData.firstName}
                      onChange={handleInputChange('firstName')}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      required
                      value={formData.lastName}
                      onChange={handleInputChange('lastName')}
                    />
                  </Grid>
                </Grid>
              </Paper>
              
              {/* Church Information */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ChurchIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Church Information</Typography>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Church Name"
                      required
                      value={formData.churchName}
                      onChange={handleInputChange('churchName')}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      required
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange('email')}
                    />
                  </Grid>
                  
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="City"
                      required
                      value={formData.city}
                      onChange={handleInputChange('city')}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="State/Province"
                      value={formData.stateProvince}
                      onChange={handleInputChange('stateProvince')}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Postal Code"
                      value={formData.postalCode}
                      onChange={handleInputChange('postalCode')}
                    />
                  </Grid>
                  
                  <Grid item xs={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Country</InputLabel>
                      <Select
                        value={formData.country}
                        onChange={handleInputChange('country')}
                        label="Country"
                      >
                        {countries.map(country => (
                          <MenuItem key={country} value={country}>{country}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Timezone</InputLabel>
                      <Select
                        value={formData.timezone}
                        onChange={handleInputChange('timezone')}
                        label="Timezone"
                      >
                        {timezones.map(tz => (
                          <MenuItem key={tz} value={tz}>{tz}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Jurisdiction</InputLabel>
                      <Select
                        value={formData.jurisdiction}
                        onChange={handleInputChange('jurisdiction')}
                        label="Jurisdiction"
                      >
                        {jurisdictions.map(jurisdiction => (
                          <MenuItem key={jurisdiction} value={jurisdiction}>{jurisdiction}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Church Size</InputLabel>
                      <Select
                        value={formData.churchSize}
                        onChange={handleInputChange('churchSize')}
                        label="Church Size"
                      >
                        {churchSizes.map(size => (
                          <MenuItem key={size} value={size}>{size}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={formData.phone}
                      onChange={handleInputChange('phone')}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Website"
                      value={formData.website}
                      onChange={handleInputChange('website')}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Address"
                      value={formData.address}
                      onChange={handleInputChange('address')}
                    />
                  </Grid>
                  
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Tax ID"
                      value={formData.taxId}
                      onChange={handleInputChange('taxId')}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Currency</InputLabel>
                      <Select
                        value={formData.currency}
                        onChange={handleInputChange('currency')}
                        label="Currency"
                      >
                        {currencies.map(currency => (
                          <MenuItem key={currency} value={currency}>{currency}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>How did you hear about us?</InputLabel>
                      <Select
                        value={formData.referralSource}
                        onChange={handleInputChange('referralSource')}
                        label="How did you hear about us?"
                      >
                        {referralSources.map(source => (
                          <MenuItem key={source} value={source}>{source}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Paper>
              
              {/* Navigation */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button variant="outlined" disabled>
                  Cancel
                </Button>
                <Button 
                  variant="contained" 
                  onClick={handleNext}
                  endIcon={<NextIcon />}
                  sx={{ bgcolor: '#1f2937', '&:hover': { bgcolor: '#374151' } }}
                >
                  Next
                </Button>
              </Box>
            </Box>
          )}
          
          {/* Step 2: Select Modules */}
          {currentStep === 2 && (
            <Box>
              <Typography variant="h4" gutterBottom>
                Step 2: Select Modules
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Select which record types your church needs to manage. You can modify these later.
              </Typography>
              
              <Grid container spacing={2}>
                {recordModules.map((module) => (
                  <Grid item xs={12} key={module.id}>
                    <Paper sx={{
                      p: 3,
                      border: formData.selectedModules.includes(module.id) ? '2px solid #6366f1' : '1px solid #e0e0e0',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: '#6366f1' }
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="h4">{module.icon}</Typography>
                          <Box>
                            <Typography variant="h6" fontWeight="bold">
                              {module.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {module.description}
                            </Typography>
                          </Box>
                        </Box>
                        <Switch
                          checked={formData.selectedModules.includes(module.id)}
                          onChange={() => handleModuleToggle(module.id)}
                          size="large"
                        />
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  👁️ Preview Structure
                </Typography>
                <Typography variant="body2" sx={{ ml: 'auto' }}>
                  Selected: {formData.selectedModules.length} modules
                </Typography>
              </Box>
              
              {/* Navigation */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button 
                  variant="outlined" 
                  onClick={handleBack}
                  startIcon={<BackIcon />}
                >
                  Back
                </Button>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button variant="outlined">
                    Cancel
                  </Button>
                  <Button 
                    variant="contained" 
                    onClick={handleNext}
                    endIcon={<NextIcon />}
                    sx={{ bgcolor: '#1f2937', '&:hover': { bgcolor: '#374151' } }}
                  >
                    Next
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
          
          {/* Step 3: Admin Accounts */}
          {currentStep === 3 && (
            <Box>
              <Typography variant="h4" gutterBottom>
                Step 3: Admin Accounts
              </Typography>
              
              {/* Default Administrator Account */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Default Administrator Account
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Admin Email"
                      value={formData.adminEmail}
                      onChange={handleInputChange('adminEmail')}
                      required
                      placeholder="Enter admin email address"
                      helperText="This will be your primary administrator email"
                    />
                  </Grid>
                  
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Password"
                      type="password"
                      required
                      value={formData.adminPassword}
                      onChange={handleInputChange('adminPassword')}
                      placeholder="Enter secure password"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Confirm Password"
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleInputChange('confirmPassword')}
                      placeholder="Confirm password"
                    />
                  </Grid>
                </Grid>
              </Paper>
              
              {/* Additional Administrator */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">
                    Additional Administrator
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.addSecondAdmin}
                        onChange={(e) => setFormData(prev => ({ ...prev, addSecondAdmin: e.target.checked }))}
                      />
                    }
                    label="Add second account"
                  />
                </Box>
                
                {formData.addSecondAdmin && (
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Second Admin Email"
                        type="email"
                        value={formData.secondAdminEmail || ''}
                        onChange={handleInputChange('secondAdminEmail')}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Password"
                        type="password"
                        value={formData.secondAdminPassword || ''}
                        onChange={handleInputChange('secondAdminPassword')}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Confirm Password"
                        type="password"
                        placeholder="Confirm password"
                      />
                    </Grid>
                  </Grid>
                )}
              </Paper>
              
              {/* Navigation */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button 
                  variant="outlined" 
                  onClick={handleBack}
                  startIcon={<BackIcon />}
                >
                  Back
                </Button>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button variant="outlined">
                    Cancel
                  </Button>
                  <Button 
                    variant="contained" 
                    onClick={handleFinishSetup}
                    disabled={isSubmitting || !formData.adminPassword || !formData.confirmPassword || formData.adminPassword !== formData.confirmPassword}
                    startIcon={isSubmitting ? <CircularProgress size={20} /> : <CheckIcon />}
                    sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#5855eb' } }}
                  >
                    {isSubmitting ? 'Creating...' : 'Finish Setup'}
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ChurchSetupWizard;
