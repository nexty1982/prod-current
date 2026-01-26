/**
 * Homepage Component
 * 
 * Main homepage for OrthodoxMetrics frontend.
 * Public-facing homepage with hero section, features, and navigation.
 * 
 * Route: /frontend-pages/homepage
 */

import React from 'react';
import { Box, Container, Typography, Button, Grid, Card, CardContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Homepage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'primary.light',
          py: { xs: 8, md: 12 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="h2" component="h1" gutterBottom fontWeight="bold">
            OrthodoxMetrics
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
            Comprehensive church management and records system for Orthodox communities
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/auth/login')}
            >
              Sign In
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/auth/register')}
            >
              Get Started
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" align="center" gutterBottom>
          Features
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 6 }}>
          Everything you need to manage your Orthodox church
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Records Management
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage baptism, marriage, and funeral records digitally. Easy search, filtering, and export capabilities.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Church Administration
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Comprehensive tools for managing church operations, users, permissions, and settings.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  OCR Processing
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Digitize paper records with advanced OCR technology. Convert scanned documents to searchable digital records.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Call to Action */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          py: 8,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            Ready to get started?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Join Orthodox churches already using OrthodoxMetrics to manage their records and operations.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/auth/register')}
          >
            Create Account
          </Button>
        </Container>
      </Box>
    </Box>
  );
};

export default Homepage;
