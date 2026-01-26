import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Chip, Button, Divider, Alert, Stack
} from '@mui/material';
import CheckIcon from '@mui/icons-material/CheckCircle';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';

const Success: React.FC = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoDashboard = () => {
    navigate('/apps/wizard/church/dashboard');
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <CheckIcon color="success" sx={{ fontSize: 80, mb: 2 }} />
        
        <Typography variant="h4" component="h1" gutterBottom color="success.main">
          Church Setup Submitted Successfully!
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Your church setup request has been submitted and is now pending approval. 
          Our team will review your information and get back to you soon.
        </Typography>

        <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
          <Typography variant="body2">
            <strong>What happens next?</strong>
            <br />
            • Your request will be reviewed by our team within 24-48 hours
            <br />
            • You'll receive an email confirmation with your request details
            <br />
            • Once approved, your church database will be created and you'll receive access credentials
            <br />
            • You can track the status of your request in the dashboard
          </Typography>
        </Alert>

        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 4 }}>
          <Button
            variant="outlined"
            startIcon={<HomeIcon />}
            onClick={handleGoHome}
            size="large"
          >
            Go to Home
          </Button>
          
          <Button
            variant="contained"
            startIcon={<DashboardIcon />}
            onClick={handleGoDashboard}
            size="large"
          >
            View Dashboard
          </Button>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
          Need help? Contact us at{' '}
          <a href="mailto:support@orthodoxmetrics.com">support@orthodoxmetrics.com</a>
        </Typography>
      </Paper>
    </Box>
  );
};

export default Success;
