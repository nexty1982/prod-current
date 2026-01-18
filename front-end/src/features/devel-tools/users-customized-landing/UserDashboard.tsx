/**
 * Orthodox Metrics - User Dashboard
 * Clean, minimal landing page for standard users (non-admin)
 * Features bouncy animated cards for quick module access
 */

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Fade,
  Card,
  CardContent,
  CardActionArea,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Person as ProfileIcon,
  BarChart as MetricsIcon,
  CloudUpload as UploadIcon,
  Translate as LanguageIcon,
  StickyNote2 as NotesIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface ModuleCard {
  icon: React.ReactNode;
  label: string;
  description: string;
  to: string;
  color: string;
  gradient: string;
}

/**
 * User Dashboard Component
 * Minimal, clean landing page with bouncy module cards
 */
export const UserDashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();

  // User modules - only these 6 items
  const modules: ModuleCard[] = [
    {
      icon: <ProfileIcon sx={{ fontSize: 48 }} />,
      label: 'My Profile',
      description: 'View and edit your profile',
      to: '/user-profile',
      color: '#1976d2',
      gradient: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
    },
    {
      icon: <MetricsIcon sx={{ fontSize: 48 }} />,
      label: 'Church Metrics',
      description: 'Baptism, marriage & funeral records',
      to: '/apps/records/baptism',
      color: '#7b1fa2',
      gradient: 'linear-gradient(135deg, #7b1fa2 0%, #ba68c8 100%)',
    },
    {
      icon: <UploadIcon sx={{ fontSize: 48 }} />,
      label: 'OM Record Uploads',
      description: 'Upload & process church documents',
      to: '/devel/enhanced-ocr-uploader',
      color: '#00897b',
      gradient: 'linear-gradient(135deg, #00897b 0%, #4db6ac 100%)',
    },
    {
      icon: <LanguageIcon sx={{ fontSize: 48 }} />,
      label: 'Multi Language',
      description: 'Language samples & translations',
      to: '/samples',
      color: '#f57c00',
      gradient: 'linear-gradient(135deg, #f57c00 0%, #ffb74d 100%)',
    },
    {
      icon: <NotesIcon sx={{ fontSize: 48 }} />,
      label: 'Sticky Notes',
      description: 'Personal notes & reminders',
      to: '/apps/notes',
      color: '#fbc02d',
      gradient: 'linear-gradient(135deg, #f9a825 0%, #ffee58 100%)',
    },
    {
      icon: <CalendarIcon sx={{ fontSize: 48 }} />,
      label: 'OM Orthodox Calendar',
      description: 'Liturgical calendar & feast days',
      to: '/apps/liturgical-calendar',
      color: '#c62828',
      gradient: 'linear-gradient(135deg, #c62828 0%, #ef5350 100%)',
    },
  ];

  const handleNavigate = (to: string) => {
    navigate(to);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Header */}
      <Box mb={6} textAlign="center">
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            mb: 2,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #90caf9 0%, #ce93d8 100%)'
              : 'linear-gradient(135deg, #1976d2 0%, #7b1fa2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Welcome Back
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ fontWeight: 400, maxWidth: 500, mx: 'auto' }}
        >
          {user?.first_name || user?.email?.split('@')[0] || 'User'}, select a module to get started
        </Typography>
      </Box>

      {/* All Modules Section */}
      <Box mb={4}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            mb: 4,
            color: 'text.primary',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <span style={{ fontSize: '1.2em' }}>🏠</span> All Modules
        </Typography>

        {/* Modules Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 3,
          }}
        >
          {modules.map((module, index) => (
            <Fade in={true} timeout={400 + index * 100} key={module.label}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 4,
                  overflow: 'hidden',
                  border: `1px solid ${theme.palette.divider}`,
                  bgcolor: 'background.paper',
                  transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)', // Bouncy easing
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-12px) scale(1.02)',
                    boxShadow: theme.palette.mode === 'dark'
                      ? `0 20px 40px ${alpha(module.color, 0.3)}, 0 0 0 1px ${alpha(module.color, 0.2)}`
                      : `0 20px 40px ${alpha(module.color, 0.25)}, 0 0 0 1px ${alpha(module.color, 0.1)}`,
                    '& .module-icon-container': {
                      transform: 'scale(1.1) rotate(-5deg)',
                    },
                    '& .module-icon': {
                      color: '#fff',
                    },
                  },
                  '&:active': {
                    transform: 'translateY(-8px) scale(0.98)',
                  },
                }}
                onClick={() => handleNavigate(module.to)}
              >
                <CardActionArea sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    {/* Icon Container */}
                    <Box
                      className="module-icon-container"
                      sx={{
                        width: 90,
                        height: 90,
                        borderRadius: '24px',
                        background: module.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 3,
                        boxShadow: `0 8px 24px ${alpha(module.color, 0.35)}`,
                        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                    >
                      <Box
                        className="module-icon"
                        sx={{
                          color: '#fff',
                          transition: 'color 0.3s ease',
                        }}
                      >
                        {module.icon}
                      </Box>
                    </Box>

                    {/* Label */}
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        mb: 1,
                        color: 'text.primary',
                      }}
                    >
                      {module.label}
                    </Typography>

                    {/* Description */}
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ lineHeight: 1.5 }}
                    >
                      {module.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Fade>
          ))}
        </Box>
      </Box>
    </Container>
  );
};

export default UserDashboard;

