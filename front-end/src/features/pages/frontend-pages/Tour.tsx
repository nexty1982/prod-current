/**
 * Tour Component
 * 
 * Guided tour page for OrthodoxMetrics.
 * Displays a step-by-step walkthrough of the application.
 * 
 * Route: /tour
 */

import C2a from '@/components/frontend-pages/shared/c2a';
import Footer from '@/components/frontend-pages/shared/footer';
import HeaderAlert from '@/components/frontend-pages/shared/header/HeaderAlert';
import HpHeader from '@/components/frontend-pages/shared/header/HpHeader';
import ScrollToTop from '@/components/frontend-pages/shared/scroll-to-top';
import {
    CheckCircle as CheckIcon,
    Close as CloseIcon,
    NavigateNext as NextIcon,
    NavigateBefore as PrevIcon,
} from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardContent,
    Container,
    IconButton,
    Paper,
    Step,
    StepContent,
    StepLabel,
    Stepper,
    Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface TourStep {
  title: string;
  description: string;
  content: string;
}

const Tour: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  const tourSteps: TourStep[] = [
    {
      title: 'Welcome to OrthodoxMetrics',
      description: 'Get started with your church record management',
      content: 'OrthodoxMetrics is a comprehensive platform designed to help you manage and organize your church records efficiently. This tour will guide you through the key features.',
    },
    {
      title: 'Dashboard Overview',
      description: 'Navigate your main dashboard',
      content: 'The dashboard provides a central hub for all your activities. You can view statistics, recent records, and quick access to common tasks. Use the navigation menu to access different sections.',
    },
    {
      title: 'Record Management',
      description: 'Manage baptism, marriage, and other records',
      content: 'Create, edit, and organize church records with ease. Our system supports various record types including baptisms, marriages, funerals, and more. All records are securely stored and easily searchable.',
    },
    {
      title: 'OCR Technology',
      description: 'Digitize paper records automatically',
      content: 'Use our advanced OCR (Optical Character Recognition) technology to convert paper records into digital format. Simply upload scanned documents and let the system extract the information automatically.',
    },
    {
      title: 'Reports & Analytics',
      description: 'Generate reports and view statistics',
      content: 'Create custom reports and view analytics about your church records. Track trends, generate annual reports, and export data in various formats for your needs.',
    },
    {
      title: 'User Management',
      description: 'Manage users and permissions',
      content: 'Control access to your records with our user management system. Assign roles, set permissions, and ensure that only authorized users can access sensitive information.',
    },
  ];

  const handleNext = () => {
    if (activeStep < tourSteps.length - 1) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    } else {
      // Tour complete, navigate to dashboard
      navigate('/dashboards/super');
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSkip = () => {
    navigate('/dashboards/super');
  };

  return (
    <Box>
      <HeaderAlert />
      <HpHeader />

      {/* Banner */}
      <Box sx={{ backgroundColor: 'primary.light', py: { xs: 4, lg: 6 }, textAlign: 'center' }}>
        <Container maxWidth="lg">
          <Typography variant="h2" fontWeight={700} mb={1}>
            Application Tour
          </Typography>
          <Typography variant="body1" color="text.secondary" fontSize="16px">
            A step-by-step walkthrough of Orthodox Metrics
          </Typography>
        </Container>
      </Box>

      <Box sx={{ py: 8, minHeight: '60vh', bgcolor: 'background.default' }}>
        <Container maxWidth="md">
          <Paper sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <Typography variant="h4" gutterBottom>
                Application Tour
              </Typography>
              <IconButton onClick={handleSkip} color="inherit">
                <CloseIcon />
              </IconButton>
            </Box>

            <Stepper activeStep={activeStep} orientation="vertical">
              {tourSteps.map((step, index) => (
                <Step key={step.title}>
                  <StepLabel
                    optional={
                      index === tourSteps.length - 1 ? (
                        <Typography variant="caption">Last step</Typography>
                      ) : null
                    }
                  >
                    <Typography variant="h6">{step.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {step.description}
                    </Typography>
                  </StepLabel>
                  <StepContent>
                    <Card sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="body1" paragraph>
                          {step.content}
                        </Typography>
                      </CardContent>
                    </Card>
                    <Box sx={{ mb: 2 }}>
                      <Button
                        variant="contained"
                        onClick={handleNext}
                        sx={{ mt: 1, mr: 1 }}
                        endIcon={activeStep === tourSteps.length - 1 ? <CheckIcon /> : <NextIcon />}
                      >
                        {activeStep === tourSteps.length - 1 ? 'Complete Tour' : 'Next'}
                      </Button>
                      <Button
                        disabled={activeStep === 0}
                        onClick={handleBack}
                        sx={{ mt: 1, mr: 1 }}
                        startIcon={<PrevIcon />}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleSkip}
                        sx={{ mt: 1 }}
                      >
                        Skip Tour
                      </Button>
                    </Box>
                  </StepContent>
                </Step>
              ))}
            </Stepper>

            {activeStep === tourSteps.length && (
              <Paper sx={{ p: 3, mt: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                <Typography variant="h6" gutterBottom>
                  Tour Complete!
                </Typography>
                <Typography variant="body2">
                  You're all set to start using OrthodoxMetrics. Click the button below to go to your dashboard.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => navigate('/dashboards/super')}
                  sx={{ mt: 2 }}
                  endIcon={<CheckIcon />}
                >
                  Go to Dashboard
                </Button>
              </Paper>
            )}
          </Paper>
        </Container>
      </Box>

      <C2a />
      <Footer />
      <ScrollToTop />
    </Box>
  );
};

export default Tour;
