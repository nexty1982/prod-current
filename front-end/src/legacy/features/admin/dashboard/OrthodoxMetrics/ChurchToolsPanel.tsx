import React from 'react';
import { 
  IconUsers, 
  IconUserPlus, 
  IconMail, 
  IconBuilding, 
  IconGrid3x3, 
  IconTable, 
  IconCalendar, 
  IconPalette 
} from '@tabler/icons-react';
import { Card, CardContent, Typography, Box, Grid, Button, Chip } from '@mui/material';

// Reusable Card Component
const ToolCard: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {children}
    </CardContent>
  </Card>
);

// Reusable Stat Badge Component
const StatBadge: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
}> = ({ icon, label, value, color = 'primary' }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', color: `${color}.main` }}>
      {icon}
    </Box>
    <Typography variant="body2" sx={{ flexGrow: 1 }}>
      {label}:
    </Typography>
    <Chip 
      label={value} 
      size="small" 
      color={color}
      variant="outlined"
    />
  </Box>
);

const ChurchToolsPanel: React.FC = () => {
  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={3}>
        {/* Church Manager */}
        <Grid item xs={12} md={6}>
          <ToolCard title="Church Manager">
            <Box sx={{ mb: 2 }}>
              <StatBadge 
                icon={<IconUserPlus size={18} />}
                label="New Signups"
                value={3}
                color="success"
              />
              <StatBadge 
                icon={<IconUsers size={18} />}
                label="New Users"
                value={12}
                color="info"
              />
              <StatBadge 
                icon={<IconMail size={18} />}
                label="Pending Invites"
                value={4}
                color="warning"
              />
              <StatBadge 
                icon={<IconBuilding size={18} />}
                label="Active Churches"
                value={27}
                color="primary"
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button size="small" variant="outlined" startIcon={<IconUsers />}>
                Manage Users
              </Button>
              <Button size="small" variant="outlined" startIcon={<IconBuilding />}>
                View Churches
              </Button>
            </Box>
          </ToolCard>
        </Grid>

        {/* Records Template */}
        <Grid item xs={12} md={6}>
          <ToolCard title="Records Template">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose your preferred data grid component for church records:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip label="AG Grid" color="primary" clickable />
              <Chip label="MUI DataGrid" color="secondary" clickable />
              <Chip label="Handsontable" color="info" clickable />
              <Chip label="Ant Table" color="success" clickable />
            </Box>
            <Button 
              size="small" 
              variant="outlined" 
              startIcon={<IconTable />}
              fullWidth
            >
              Configure Records View
            </Button>
          </ToolCard>
        </Grid>

        {/* Service Plans */}
        <Grid item xs={12} md={6}>
          <ToolCard title="Service Plans">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Manage liturgical services and event scheduling
            </Typography>
            <Box sx={{ mb: 2 }}>
              <StatBadge 
                icon={<IconCalendar size={18} />}
                label="Upcoming Services"
                value={8}
                color="info"
              />
              <StatBadge 
                icon={<IconGrid3x3 size={18} />}
                label="Active Templates"
                value={5}
                color="primary"
              />
            </Box>
            <Button 
              size="small" 
              variant="outlined" 
              startIcon={<IconCalendar />}
              fullWidth
            >
              Manage Service Plans
            </Button>
          </ToolCard>
        </Grid>

        {/* Orthodox Theme Manager */}
        <Grid item xs={12} md={6}>
          <ToolCard title="Orthodox Theme Manager">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Customize colors, typography, and liturgical themes
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip label="Byzantine" size="small" />
              <Chip label="Modern" size="small" />
              <Chip label="Traditional" size="small" />
              <Chip label="Festive" size="small" />
            </Box>
            <Button 
              size="small" 
              variant="outlined" 
              startIcon={<IconPalette />}
              fullWidth
            >
              Customize Themes
            </Button>
          </ToolCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ChurchToolsPanel;
