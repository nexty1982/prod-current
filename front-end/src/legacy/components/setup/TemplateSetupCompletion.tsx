import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  FormControlLabel,
  Switch,
  Checkbox,
  FormGroup,
  Alert,
  CircularProgress,
  Chip,
  Stepper,
  Step,
  StepLabel,
  Grid
} from '@mui/material';
import { Template, CheckCircle, Build, Visibility, Edit } from '@mui/icons-material';

const TemplateSetupCompletion = ({ churchId, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [setupStatus, setSetupStatus] = useState(null);
  const [templateOptions, setTemplateOptions] = useState({
    auto_setup_standard: true,
    generate_components: true,
    record_types: ['baptism', 'marriage', 'funeral'],
    template_style: 'orthodox_traditional'
  });
  const [activeStep, setActiveStep] = useState(0);

  const steps = ['Configure Options', 'Review & Setup', 'Complete'];

  useEffect(() => {
    fetchSetupStatus();
  }, [churchId]);

  const fetchSetupStatus = async () => {
    try {
      const response = await fetch(`/api/admin/churches/${churchId}/setup-status`, {
        credentials: 'include'
      });
      const result = await response.json();
      
      if (result.success) {
        setSetupStatus(result);
      }
    } catch (error) {
      console.error('Error fetching setup status:', error);
    }
  };

  const handleOptionChange = (field, value) => {
    setTemplateOptions(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRecordTypeChange = (recordType, checked) => {
    setTemplateOptions(prev => ({
      ...prev,
      record_types: checked 
        ? [...prev.record_types, recordType]
        : prev.record_types.filter(type => type !== recordType)
    }));
  };

  const handleCompleteSetup = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/churches/${churchId}/complete-template-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(templateOptions)
      });

      const result = await response.json();
      
      if (result.success) {
        setActiveStep(2);
        onComplete && onComplete(result);
      } else {
        throw new Error(result.error || 'Failed to complete template setup');
      }
    } catch (error) {
      console.error('Error completing template setup:', error);
      alert('Error completing template setup: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0: // Configure Options
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Configure Template Options
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose which record types and features to set up for your church
            </Typography>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Record Types
                </Typography>
                <FormGroup>
                  {[
                    { key: 'baptism', label: 'Baptism Records', description: 'Baptism certificates and records', icon: '⛪' },
                    { key: 'marriage', label: 'Marriage Records', description: 'Wedding ceremonies and certificates', icon: '💒' },
                    { key: 'funeral', label: 'Funeral Records', description: 'Memorial services and burial records', icon: '🕊️' }
                  ].map((recordType) => (
                    <FormControlLabel
                      key={recordType.key}
                      control={
                        <Checkbox
                          checked={templateOptions.record_types.includes(recordType.key)}
                          onChange={(e) => handleRecordTypeChange(recordType.key, e.target.checked)}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: '1.2em', marginRight: '8px' }}>{recordType.icon}</span>
                          <Box>
                            <Typography variant="body1">{recordType.label}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {recordType.description}
                            </Typography>
                          </Box>
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
                  Setup Features
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={templateOptions.auto_setup_standard}
                      onChange={(e) => handleOptionChange('auto_setup_standard', e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">Auto-create standard templates</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Duplicate global templates for immediate use
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 2, display: 'block' }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={templateOptions.generate_components}
                      onChange={(e) => handleOptionChange('generate_components', e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">Generate record components</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Create RecordEditor and RecordViewer components
                      </Typography>
                    </Box>
                  }
                  sx={{ display: 'block' }}
                />
              </CardContent>
            </Card>

            {templateOptions.generate_components && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Component Generation:</strong> This will create standardized RecordEditor.jsx and 
                  RecordViewer.jsx components for each selected record type, following the new 
                  /../features/records/records/{type}/ directory structure.
                </Typography>
              </Alert>
            )}
          </Box>
        );

      case 1: // Review & Setup
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Review Template Setup
            </Typography>
            
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Selected Record Types
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {templateOptions.record_types.map(type => (
                    <Chip 
                      key={type} 
                      label={type.charAt(0).toUpperCase() + type.slice(1)} 
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      <Build sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Standard Templates
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {templateOptions.auto_setup_standard 
                        ? `Will duplicate global templates for ${templateOptions.record_types.length} record types`
                        : 'Standard templates will not be auto-created'
                      }
                    </Typography>
                    <Chip 
                      label={templateOptions.auto_setup_standard ? 'Enabled' : 'Disabled'} 
                      color={templateOptions.auto_setup_standard ? 'success' : 'default'}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      <Edit sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Record Components
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {templateOptions.generate_components 
                        ? `Will generate RecordEditor and RecordViewer for each record type`
                        : 'Components will not be auto-generated'
                      }
                    </Typography>
                    <Chip 
                      label={templateOptions.generate_components ? 'Enabled' : 'Disabled'} 
                      color={templateOptions.generate_components ? 'success' : 'default'}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Ready to complete template setup! This will create the necessary templates and 
                components for your church's record management system.
              </Typography>
            </Alert>
          </Box>
        );

      case 2: // Complete
        return (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Template Setup Complete!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Your church's record management system is now ready to use.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button 
                variant="outlined" 
                href="/admin/template-manager"
                startIcon={<Template />}
              >
                Manage Templates
              </Button>
              <Button 
                variant="outlined" 
                href="/records"
                startIcon={<Visibility />}
              >
                View Records
              </Button>
              <Button 
                variant="contained" 
                href="/admin/dashboard"
              >
                Go to Dashboard
              </Button>
            </Box>
          </Box>
        );

      default:
        return 'Unknown step';
    }
  };

  if (!setupStatus) {
    return <CircularProgress />;
  }

  if (setupStatus.church.setup_status?.templates_setup) {
    return (
      <Alert severity="info">
        <Typography variant="body1">
          Templates have already been set up for this church.
        </Typography>
        <Button href="/admin/template-manager" sx={{ mt: 1 }}>
          Manage Templates
        </Button>
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '800px', mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Complete Template Setup
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Set up record templates for {setupStatus.church.name}
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
          disabled={activeStep === 0 || activeStep === 2}
          onClick={() => setActiveStep(activeStep - 1)}
          variant="outlined"
        >
          Back
        </Button>
        
        <Box>
          {activeStep === 0 && (
            <Button
              variant="contained"
              onClick={() => setActiveStep(1)}
              disabled={templateOptions.record_types.length === 0}
            >
              Review Setup
            </Button>
          )}
          {activeStep === 1 && (
            <Button
              variant="contained"
              onClick={handleCompleteSetup}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
            >
              {loading ? 'Setting up Templates...' : 'Complete Setup'}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default TemplateSetupCompletion;
