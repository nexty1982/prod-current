import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Divider,
  Alert,
  Stack
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Edit as EditIcon,
  Send as SubmitIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import { useProvisionStore } from '@/store/provision';

const Summary: React.FC = () => {
  const navigate = useNavigate();
  const { basic, modules, accounts, submitProvision, isSubmitting } = useProvisionStore();

  const handleEdit = (step: number) => {
    navigate(`/apps/wizard/church/step${step}`);
  };

  const handleSubmit = async () => {
    try {
      await submitProvision();
      // Navigate to success page or dashboard
      navigate('/apps/wizard/church/success');
    } catch (error) {
      console.error('Error submitting provision:', error);
    }
  };

  const handleBack = () => {
    navigate('/apps/wizard/church/step3');
  };

  // Check if all steps are complete
  const isComplete = basic && modules && accounts;

  if (!isComplete) {
    return (
      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please complete all steps before viewing the summary.
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/apps/wizard/church/step1')}
          startIcon={<BackIcon />}
        >
          Go to Step 1
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Church Setup Summary
      </Typography>
      
      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
        Review your church information before submitting for approval
      </Typography>

      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h2">
                Basic Information
              </Typography>
              <Button
                size="small"
                startIcon={<EditIcon />}
                onClick={() => handleEdit(1)}
              >
                Edit
              </Button>
            </Box>
            
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Church Name</Typography>
                <Typography variant="body1">{basic.churchName}</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Contact Email</Typography>
                <Typography variant="body1">{basic.email}</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Location</Typography>
                <Typography variant="body1">
                  {basic.city}, {basic.state && `${basic.state}, `}{basic.country}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Jurisdiction</Typography>
                <Chip label={basic.jurisdiction} color="primary" size="small" />
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Population Bracket</Typography>
                <Chip label={basic.population_bracket} color="secondary" size="small" />
              </Box>
              
              {basic.phone && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
                  <Typography variant="body1">{basic.phone}</Typography>
                </Box>
              )}
              
              {basic.address && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Address</Typography>
                  <Typography variant="body1">{basic.address}</Typography>
                </Box>
              )}
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Timezone</Typography>
                <Typography variant="body1">{basic.timezone}</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        {/* Module Selection */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h2">
                Selected Modules
              </Typography>
              <Button
                size="small"
                startIcon={<EditIcon />}
                onClick={() => handleEdit(2)}
              >
                Edit
              </Button>
            </Box>
            
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Your church will have access to the following record management modules:
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {modules.include.map((module) => (
                  <Chip
                    key={module}
                    label={module.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    color="success"
                    variant="outlined"
                    icon={<CheckIcon />}
                  />
                ))}
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                {modules.include.length} module{modules.include.length !== 1 ? 's' : ''} selected
              </Typography>
            </Stack>
          </Paper>
        </Grid>

        {/* Account Information */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h2">
                Account Information
              </Typography>
              <Button
                size="small"
                startIcon={<EditIcon />}
                onClick={() => handleEdit(3)}
              >
                Edit
              </Button>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Primary Account
                </Typography>
                <Typography variant="body1">{accounts.defaultEmail}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Password: ••••••••••
                </Typography>
              </Grid>
              
              {accounts.extraEmail && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Additional Account
                  </Typography>
                  <Typography variant="body1">{accounts.extraEmail}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Password: ••••••••••
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={handleBack}
        >
          Back to Step 3
        </Button>
        
        <Button
          variant="contained"
          size="large"
          startIcon={<SubmitIcon />}
          onClick={handleSubmit}
          disabled={isSubmitting}
          sx={{ minWidth: 200 }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
        </Button>
      </Box>

      {/* Important Notes */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Important:</strong> After submission, your church setup will be reviewed by our team. 
          You will receive an email confirmation and can track the status in your dashboard.
        </Typography>
      </Alert>
    </Box>
  );
};

export default Summary;
