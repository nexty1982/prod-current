/**
 * Landingpage Component
 * 
 * Main landing page for OrthodoxMetrics.
 * Public-facing landing page with hero section, features, and call-to-action.
 * 
 * Route: /pages/landingpage
 */

import React from 'react';
import { Box, Container, Typography, Button, Grid, Card, CardContent } from '@mui/material';
import { Banner } from '../../landingpage/banner/Banner';
import { C2a } from '../../landingpage/c2a/C2a';

const Landingpage: React.FC = () => {
  return (
    <Box>
      {/* Hero Banner */}
      <Banner />

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" align="center" gutterBottom>
          Orthodox Metrics
        </Typography>
        <Typography variant="h5" align="center" color="text.secondary" sx={{ mb: 6 }}>
          Comprehensive church management and records system
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Records Management
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage baptism, marriage, and funeral records with ease. Digital record keeping for Orthodox churches.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Church Administration
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Comprehensive tools for managing church operations, users, and settings.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  OCR Processing
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Digitize paper records with advanced OCR technology. Convert scanned documents to digital records.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Call to Action */}
      <C2a />
    </Box>
  );
};

export default Landingpage;
