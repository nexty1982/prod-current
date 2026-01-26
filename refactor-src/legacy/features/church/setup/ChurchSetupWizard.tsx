import React, { useState } from 'react';
import {
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Checkbox,
  FormGroup,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Chip,
  Divider
} from '@mui/material';
import { CheckCircle, Settings, Church, Template } from '@mui/icons-material';

const ChurchSetupWizard = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [churchData, setChurchData] = useState({
    // Basic church info
    name: '',
    address: '',
    city: '',
    region: '',
    country: '',
    phone: '',
    website: '',
    preferred_language: 'en',
    timezone: 'America/New_York',
    
    // Admin user
    admin_full_name: '',
    admin_email: '',
    admin_password: '',
    admin_title: 'Father',
    
    // Template setup options
    setup_templates: true,
    auto_setup_standard: false,
    generate_components: false,
    record_types: ['baptism', 'marriage', 'funeral'],
    template_style: 'orthodox_traditional'
  });

  const steps = [
    'Church Information',
    'Administrator Account', 
    'Template Setup (Optional)',
    'Review & Create'
  ];

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleInputChange = (field, value) => {
    setChurchData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRecordTypeChange = (recordType, checked) => {
    setChurchData(prev => ({
      ...prev,
      record_types: checked 
        ? [...prev.record_types, recordType]
        : prev.record_types.filter(type => type !== recordType)
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/churches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(churchData)
      });

      const result = await response.json();
      
      if (result.success) {
        onComplete && onComplete(result);
      } else {
        throw new Error(result.error || 'Failed to create church');
      }
    } catch (error) {
      console.error('Error creating church:', error);
      alert('Error creating church: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0: // Church Information
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Church Information
            </Typography>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
              <TextField
                label="Church Name"
                required
                value={churchData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                fullWidth
              />
              <TextField
                label="Address"
                required
                value={churchData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                fullWidth
              />
              <TextField
                label="City"
                required
                value={churchData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                fullWidth
              />
              <TextField
                label="Region/State"
                value={churchData.region}
                onChange={(e) => handleInputChange('region', e.target.value)}
                fullWidth
              />
              <TextField
                label="Country"
                required
                value={churchData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                fullWidth
              />
              <TextField
                label="Phone"
                value={churchData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                fullWidth
              />
              <TextField
                label="Website"
                value={churchData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                fullWidth
              />
            </Box>
          </Box>
        );

      case 1: // Administrator Account
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Administrator Account
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create the primary administrator account for this church
            </Typography>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
              <TextField
                label="Full Name"
                required
                value={churchData.admin_full_name}
                onChange={(e) => handleInputChange('admin_full_name', e.target.value)}
                fullWidth
              />
              <TextField
                label="Email"
                type="email"
                required
                value={churchData.admin_email}
                onChange={(e) => handleInputChange('admin_email', e.target.value)}
                fullWidth
              />
              <TextField
                label="Password"
                type="password"
                required
                value={churchData.admin_password}
                onChange={(e) => handleInputChange('admin_password', e.target.value)}
                fullWidth
              />
              <TextField
                label="Title"
                value={churchData.admin_title}
                onChange={(e) => handleInputChange('admin_title', e.target.value)}
                fullWidth
                placeholder="Father, Priest, Administrator"
              />
            </Box>
          </Box>
        );

      case 2: // Template Setup
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              <Template sx={{ mr: 1, verticalAlign: 'middle' }} />
              Template Setup (Optional)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure record templates for your church. You can skip this step and set up templates later.
            </Typography>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <FormControlLabel
                  control={
                    <Switch
                      checked={churchData.setup_templates}
                      onChange={(e) => handleInputChange('setup_templates', e.target.checked)}
                    />
                  }
                  label="Set up record templates now"
                />
                <Typography variant="body2" color="text.secondary">
                  Enable template setup to create standardized record forms
                </Typography>
              </CardContent>
            </Card>

            {churchData.setup_templates && (
              <>
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Record Types
                    </Typography>
                    <FormGroup>
                      {[
                        { key: 'baptism', label: 'Baptism Records', description: 'Baptism certificates and records' },
                        { key: 'marriage', label: 'Marriage Records', description: 'Wedding ceremonies and certificates' },
                        { key: 'funeral', label: 'Funeral Records', description: 'Memorial services and burial records' }
                      ].map((recordType) => (
                        <FormControlLabel
                          key={recordType.key}
                          control={
                            <Checkbox
                              checked={churchData.record_types.includes(recordType.key)}
                              onChange={(e) => handleRecordTypeChange(recordType.key, e.target.checked)}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body1">{recordType.label}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {recordType.description}
                              </Typography>
                            </Box>
                          }
                        />
                      ))}
                    </FormGroup>
                  </CardContent>
                </Card>

                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Setup Options
                    </Typography>
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={churchData.auto_setup_standard}
                          onChange={(e) => handleInputChange('auto_setup_standard', e.target.checked)}
                        />
                      }
                      label="Auto-create standard templates"
                      sx={{ mb: 2, display: 'block' }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Automatically duplicate global templates for immediate use
                    </Typography>

                    <FormControlLabel
                      control={
                        <Switch
                          checked={churchData.generate_components}
                          onChange={(e) => handleInputChange('generate_components', e.target.checked)}
                        />
                      }
                      label="Generate record management components"
                      sx={{ mb: 2, display: 'block' }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Create RecordEditor and RecordViewer components for each record type
                    </Typography>
                  </CardContent>
                </Card>

                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Note:</strong> You can always modify templates later through the Template Manager. 
                    This step creates a foundation to get you started quickly.
                  </Typography>
                </Alert>
              </>
            )}

            {!churchData.setup_templates && (
              <Alert severity="info">
                <Typography variant="body2">
                  Template setup will be skipped. You can set up templates later from the admin panel.
                </Typography>
              </Alert>
            )}
          </Box>
        );

      case 3: // Review & Create
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Review & Create Church
            </Typography>
            
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  <Church sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Church Information
                </Typography>
                <Typography><strong>Name:</strong> {churchData.name}</Typography>
                <Typography><strong>Location:</strong> {churchData.city}, {churchData.region}, {churchData.country}</Typography>
                <Typography><strong>Contact:</strong> {churchData.phone} • {churchData.website}</Typography>
              </CardContent>
            </Card>

            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  <Settings sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Administrator
                </Typography>
                <Typography><strong>Name:</strong> {churchData.admin_full_name}</Typography>
                <Typography><strong>Email:</strong> {churchData.admin_email}</Typography>
                <Typography><strong>Title:</strong> {churchData.admin_title}</Typography>
              </CardContent>
            </Card>

            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  <Template sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Template Setup
                </Typography>
                {churchData.setup_templates ? (
                  <>
                    <Typography sx={{ mb: 1 }}>
                      <strong>Status:</strong> <Chip label="Enabled" color="success" size="small" />
                    </Typography>
                    <Typography sx={{ mb: 1 }}>
                      <strong>Record Types:</strong> {churchData.record_types.map(type => 
                        type.charAt(0).toUpperCase() + type.slice(1)
                      ).join(', ')}
                    </Typography>
                    <Typography sx={{ mb: 1 }}>
                      <strong>Auto-setup:</strong> {churchData.auto_setup_standard ? 'Yes' : 'No'}
                    </Typography>
                    <Typography>
                      <strong>Generate Components:</strong> {churchData.generate_components ? 'Yes' : 'No'}
                    </Typography>
                  </>
                ) : (
                  <Typography>
                    <strong>Status:</strong> <Chip label="Skipped" color="default" size="small" />
                    <Typography variant="body2" color="text.secondary">
                      Templates can be set up later from the admin panel
                    </Typography>
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        );

      default:
        return 'Unknown step';
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '800px', mx: 'auto', p: 3 }}>
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

      {renderStepContent(activeStep)}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
          variant="outlined"
        >
          Back
        </Button>
        
        <Box>
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
            >
              {loading ? 'Creating Church...' : 'Create Church'}
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
      </Box>
    </Box>
  );
};

export default ChurchSetupWizard;
