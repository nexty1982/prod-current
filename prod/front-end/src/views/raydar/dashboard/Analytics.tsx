import React from 'react';
import { Card, CardContent, Typography, Grid, Box, Chip } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from 'src/components/shared/DashboardCard';
import {
  IconTrendingUp,
  IconUsers,
  IconEye,
  IconChartBar,
  IconMapPin,
  IconCalendar
} from '@tabler/icons-react';

// Mock data for demonstration
const statsData = [
  {
    title: 'Total Visitors',
    value: '24,567',
    change: '+12.5%',
    trend: 'up',
    icon: IconUsers,
    color: 'primary',
  },
  {
    title: 'Page Views',
    value: '156,890',
    change: '+8.2%',
    trend: 'up', 
    icon: IconEye,
    color: 'success',
  },
  {
    title: 'Conversions',
    value: '3,245',
    change: '+15.3%',
    trend: 'up',
    icon: IconTrendingUp,
    color: 'warning',
  },
  {
    title: 'Sessions',
    value: '18,432',
    change: '+5.7%',
    trend: 'up',
    icon: IconChartBar,
    color: 'error',
  },
];

const Analytics = () => {
  return (
    <PageContainer title="Raydar Analytics" description="Advanced analytics dashboard">
      <Box>
        <Typography variant="h4" mb={3}>
          📡 Raydar Analytics Dashboard
        </Typography>
        
        <Grid container spacing={3}>
          {/* Stats Cards */}
          {statsData.map((stat, index) => (
            <Grid item xs={12} sm={6} lg={3} key={index}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        {stat.title}
                      </Typography>
                      <Typography variant="h5" component="div">
                        {stat.value}
                      </Typography>
                      <Chip
                        label={stat.change}
                        size="small"
                        color={stat.color as any}
                        icon={<IconTrendingUp size={14} />}
                        sx={{ mt: 1 }}
                      />
                    </Box>
                    <Box>
                      <stat.icon size={40} color={`var(--mui-palette-${stat.color}-main)`} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}

          {/* Main Chart Area */}
          <Grid item xs={12} lg={8}>
            <DashboardCard title="📊 Advanced Chart Visualization">
              <Box p={3} textAlign="center">
                <Typography variant="h6" color="textSecondary">
                  Advanced Apex Charts Integration
                </Typography>
                <Typography variant="body2" color="textSecondary" mt={1}>
                  This area will showcase Raydar's advanced chart capabilities including:
                </Typography>
                <Box mt={2}>
                  <Chip label="Area Charts" sx={{ m: 0.5 }} />
                  <Chip label="Candlestick" sx={{ m: 0.5 }} />
                  <Chip label="Heatmaps" sx={{ m: 0.5 }} />
                  <Chip label="Timeline" sx={{ m: 0.5 }} />
                  <Chip label="Treemap" sx={{ m: 0.5 }} />
                </Box>
              </Box>
            </DashboardCard>
          </Grid>

          {/* Sidebar Info */}
          <Grid item xs={12} lg={4}>
            <DashboardCard title="🗺️ Geographic Data">
              <Box p={3}>
                <Box display="flex" alignItems="center" mb={2}>
                  <IconMapPin size={20} />
                  <Typography variant="h6" ml={1}>
                    Vector Maps
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary" mb={2}>
                  Raydar includes interactive vector maps for:
                </Typography>
                <Box>
                  <Chip label="World Map" size="small" sx={{ m: 0.25 }} />
                  <Chip label="USA" size="small" sx={{ m: 0.25 }} />
                  <Chip label="Canada" size="small" sx={{ m: 0.25 }} />
                  <Chip label="Russia" size="small" sx={{ m: 0.25 }} />
                  <Chip label="Italy" size="small" sx={{ m: 0.25 }} />
                  <Chip label="Spain" size="small" sx={{ m: 0.25 }} />
                </Box>
              </Box>
            </DashboardCard>

            <Box mt={3}>
              <DashboardCard title="🎯 Advanced Features">
                <Box p={3}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <IconCalendar size={20} />
                    <Typography variant="h6" ml={1}>
                      Enhanced Components
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="textSecondary" mb={2}>
                    Raydar brings premium UI components:
                  </Typography>
                  <Box>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      • Advanced Form Validation
                    </Typography>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      • Rating Components
                    </Typography>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      • Swiper Sliders
                    </Typography>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      • Sweet Alerts
                    </Typography>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                      • GridJS Tables
                    </Typography>
                  </Box>
                </Box>
              </DashboardCard>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default Analytics;