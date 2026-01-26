/**
 * WelcomeMessage Component
 * 
 * Welcome message page for OrthodoxMetrics.
 * Displays a welcome message to users.
 * 
 * Route: /frontend-pages/welcome-message
 */

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
} from '@mui/material';
import {
  WavingHand as WelcomeIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const WelcomeMessage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="md">
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
          }}
        >
          <WelcomeIcon sx={{ fontSize: 80, mb: 3 }} />
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
            Welcome to OrthodoxMetrics
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            Your comprehensive solution for managing church records
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, opacity: 0.85, maxWidth: 600, mx: 'auto' }}>
            We're delighted to have you here. OrthodoxMetrics helps you manage, organize, and preserve
            your church records with ease. Whether you're tracking baptisms, marriages, or other important
            events, we're here to support your mission.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate('/dashboards/super')}
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                },
              }}
            >
              Get Started
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/frontend-pages/menu')}
              sx={{
                borderColor: 'white',
                color: 'white',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.8)',
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              Explore Pages
            </Button>
          </Box>
        </Paper>

        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" gutterBottom align="center">
            Key Features
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 3,
              mt: 4,
            }}
          >
            {[
              {
                title: 'Record Management',
                description: 'Efficiently manage baptism, marriage, and other church records.',
              },
              {
                title: 'OCR Technology',
                description: 'Digitize paper records with advanced OCR capabilities.',
              },
              {
                title: 'Secure Storage',
                description: 'Your data is securely stored and backed up regularly.',
              },
            ].map((feature, index) => (
              <Paper key={index} sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default WelcomeMessage;
