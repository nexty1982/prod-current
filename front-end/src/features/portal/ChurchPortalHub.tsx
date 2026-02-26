import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Typography,
  useTheme,
} from '@mui/material';
import {
  IconBook2,
  IconHeart,
  IconCross,
  IconCertificate,
  IconUpload,
  IconChartBar,
  IconUser,
  IconHelp,
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';

interface FeatureCard {
  title: string;
  description: string;
  to: string;
  icon: React.ElementType;
  roles?: string[];
  color: string;
}

const FEATURES: FeatureCard[] = [
  {
    title: 'Baptism Records',
    description: 'View and manage baptism records',
    to: '/portal/records/baptism',
    icon: IconBook2,
    color: '#1976d2',
  },
  {
    title: 'Marriage Records',
    description: 'View and manage marriage records',
    to: '/portal/records/marriage',
    icon: IconHeart,
    color: '#e91e63',
  },
  {
    title: 'Funeral Records',
    description: 'View and manage funeral records',
    to: '/portal/records/funeral',
    icon: IconCross,
    color: '#6d4c41',
  },
  {
    title: 'Certificates',
    description: 'Generate official certificates',
    to: '/portal/certificates',
    icon: IconCertificate,
    color: '#2e7d32',
  },
  {
    title: 'Upload Records',
    description: 'Upload scanned record images for processing',
    to: '/portal/upload',
    icon: IconUpload,
    roles: ['super_admin', 'admin', 'church_admin', 'priest'],
    color: '#ed6c02',
  },
  {
    title: 'Charts',
    description: 'View church record analytics',
    to: '/portal/charts',
    icon: IconChartBar,
    roles: ['super_admin', 'admin', 'church_admin', 'priest'],
    color: '#9c27b0',
  },
  {
    title: 'My Profile',
    description: 'View and update your account',
    to: '/portal/profile',
    icon: IconUser,
    color: '#0288d1',
  },
  {
    title: 'User Guide',
    description: 'Help and documentation',
    to: '/portal/guide',
    icon: IconHelp,
    color: '#757575',
  },
];

const ChurchPortalHub: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || '';

  const visibleFeatures = FEATURES.filter(
    (f) => !f.roles || f.roles.includes(role),
  );

  const greeting = user?.first_name
    ? `Welcome, ${user.first_name}`
    : 'Welcome';

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          fontWeight={700}
          sx={{
            fontFamily: '"Cormorant Garamond", "Palatino Linotype", Georgia, serif',
            color: 'text.primary',
          }}
        >
          {greeting}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
          Your church management portal
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {visibleFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={feature.to}>
              <Card
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: feature.color,
                    boxShadow: `0 4px 20px ${feature.color}22`,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardActionArea
                  onClick={() => navigate(feature.to)}
                  sx={{ p: 2.5 }}
                >
                  <CardContent sx={{ p: '0 !important' }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: `${feature.color}14`,
                        mb: 2,
                      }}
                    >
                      <Icon size={24} color={feature.color} />
                    </Box>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default ChurchPortalHub;
