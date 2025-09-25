import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Alert
} from '@mui/material';
import {
  IconDatabase,
  IconTemplate,
  IconSettings,
  IconEye,
  IconArrowRight
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

const RecordsSuiteHome: React.FC = () => {
  const navigate = useNavigate();

  const suiteFeatures = [
    {
      title: 'Template Gallery',
      description: 'Browse and manage record display templates. Create custom layouts for different parish needs.',
      icon: <IconTemplate size={48} />,
      route: '/devel/records-suite/templates',
      status: 'Active',
      color: 'primary'
    },
    {
      title: 'Parish Customizer',
      description: 'Customize field labels, colors, theme assets, and parish-specific settings.',
      icon: <IconSettings size={48} />,
      route: '/devel/records-suite/customize',
      status: 'Active',
      color: 'secondary'
    },
    {
      title: 'Records Viewer',
      description: 'Schema-agnostic browser for all *_records tables. Search, filter, and export data.',
      icon: <IconEye size={48} />,
      route: '/devel/records-suite/view',
      status: 'Active',
      color: 'success'
    }
  ];

  const quickStats = {
    totalTemplates: 2,
    activePparishes: 12,
    recordTables: 15,
    lastSync: '2024-01-01T12:00:00Z'
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconDatabase size={32} style={{ marginRight: 16 }} />
          <Typography variant="h4" component="h1">
            Records Management Suite
          </Typography>
        </Box>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Schema-agnostic records browsing and management system with template-driven UI and per-parish theming.
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          This suite provides unified access to all *_records tables across church databases with customizable display templates.
        </Alert>

        {/* Quick Stats */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h5" color="primary">
                  {quickStats.totalTemplates}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Templates
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h5" color="secondary">
                  {quickStats.activePparishes}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Active Parishes
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h5" color="success.main">
                  {quickStats.recordTables}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Record Tables
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Last Sync
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(quickStats.lastSync).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Feature Cards */}
        <Grid container spacing={3}>
          {suiteFeatures.map((feature, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ color: `${feature.color}.main`, mr: 2 }}>
                      {feature.icon}
                    </Box>
                    <Chip 
                      label={feature.status} 
                      color={feature.color as any} 
                      size="small" 
                    />
                  </Box>
                  
                  <Typography variant="h6" component="h3" gutterBottom>
                    {feature.title}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
                
                <CardActions>
                  <Button
                    size="small"
                    color={feature.color as any}
                    endIcon={<IconArrowRight size={16} />}
                    onClick={() => navigate(feature.route)}
                  >
                    Open
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default RecordsSuiteHome;