import React from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import PageContainer from '@/shared/ui/PageContainer';

const ModernDashboard = () => {
  return (
    <PageContainer title="Dashboard" description="Slim modern dashboard scaffold">
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 3,
        p: { xs: 2, md: 3 }
      }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 1
        }}>
          <Typography variant="h3" component="h1" sx={{ 
            fontWeight: 600, 
            letterSpacing: '-0.025em' 
          }}>
            Dashboard
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" size="medium">
              New
            </Button>
            <Button variant="outlined" size="medium">
              Configure
            </Button>
          </Box>
        </Box>

        {/* Empty State Card */}
        <Card sx={{ 
          borderRadius: 4,
          backgroundColor: 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <CardContent sx={{ p: 3 }}>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: '0.875rem' }}
            >
              This dashboard is intentionally slim. Add cards via the "Configure" flow.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </PageContainer>
  );
};

export default ModernDashboard;
