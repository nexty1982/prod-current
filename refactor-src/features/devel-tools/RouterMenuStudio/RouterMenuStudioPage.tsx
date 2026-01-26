/**
 * Router Menu Studio Page
 * Main page component for the Router/Menu Studio feature
 */

import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  AppBar,
  Toolbar,
  Alert,
  Chip
} from '@mui/material';
import {
  IconRouter,
  IconMenu2,
  IconDeviceDesktop
} from '@tabler/icons-react';

const RouterMenuStudioPage: React.FC = () => {
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconDeviceDesktop size={24} style={{ marginRight: 16 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Router/Menu Studio
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip
              label="Role: super_admin"
              color="primary"
              variant="outlined"
              size="small"
            />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main content area */}
      <Box sx={{ flex: 1, overflow: 'hidden', p: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          🚀 Router/Menu Studio is now available! The database and API are ready.
        </Alert>

        <Grid container spacing={3} sx={{ height: '100%' }}>
          {/* Left Panel - Routes */}
          <Grid item xs={6}>
            <Paper
              elevation={2}
              sx={{
                height: '400px',
                display: 'flex',
                flexDirection: 'column',
                p: 2
              }}
            >
              <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
                <IconRouter size={20} />
                <Typography variant="h6">Routes Management</Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Manage SPA routes and component mappings
              </Typography>

              <Box sx={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: 'grey.50',
                borderRadius: 1
              }}>
                <Typography variant="body1" color="text.secondary">
                  🚧 Route Grid Component Coming Soon
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Right Panel - Menu */}
          <Grid item xs={6}>
            <Paper
              elevation={2}
              sx={{
                height: '400px',
                display: 'flex',
                flexDirection: 'column',
                p: 2
              }}
            >
              <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
                <IconMenu2 size={20} />
                <Typography variant="h6">Menu Management</Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Design and organize navigation menus
              </Typography>

              <Box sx={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: 'grey.50',
                borderRadius: 1
              }}>
                <Typography variant="body1" color="text.secondary">
                  🚧 Menu Tree Component Coming Soon
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Status Information */}
        <Paper elevation={1} sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Implementation Status
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Chip label="✅ Database Schema" color="success" variant="outlined" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Chip label="✅ API Routes" color="success" variant="outlined" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Chip label="✅ Types & Client" color="success" variant="outlined" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Chip label="�� UI Components" color="warning" variant="outlined" />
            </Grid>
          </Grid>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Phase 1 (Database & API) and Phase 2 (Types & Client) are complete.
            Phase 3 (UI Components) is in progress.
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default RouterMenuStudioPage;
