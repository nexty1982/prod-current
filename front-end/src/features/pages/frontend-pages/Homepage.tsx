/**
 * Homepage Component
 * 
 * Main homepage for OrthodoxMetrics frontend.
 * Public-facing homepage with hero section, features, and navigation.
 * 
 * Route: /frontend-pages/homepage
 */

import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Grid, 
  Card, 
  CardContent,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';

interface NavItem {
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { label: 'About', path: '/frontend-pages/about' },
  { label: 'Contact', path: '/frontend-pages/contact' },
  { label: 'Pricing', path: '/frontend-pages/pricing' },
  { label: 'Tour', path: '/frontend-pages/tour' },
  { label: 'Timeline', path: '/frontend-pages/oca-timeline' },
  { label: 'Samples', path: '/frontend-pages/samples' },
  { label: 'Tasks', path: '/frontend-pages/tasks' },
];

const Homepage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    handleMenuClose();
  };

  return (
    <Box>
      {/* Header Navigation */}
      <AppBar position="static" color="transparent" elevation={0} sx={{ bgcolor: 'primary.main' }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
            <Typography
              variant="h6"
              component={Link}
              to="/frontend-pages/homepage"
              sx={{ 
                color: 'white', 
                textDecoration: 'none',
                fontWeight: 'bold',
              }}
            >
              OrthodoxMetrics
            </Typography>

            {isMobile ? (
              <>
                <IconButton color="inherit" onClick={handleMenuOpen} sx={{ color: 'white' }}>
                  <MenuIcon />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                >
                  {navItems.map((item) => (
                    <MenuItem key={item.path} onClick={() => handleNavClick(item.path)}>
                      {item.label}
                    </MenuItem>
                  ))}
                  <MenuItem onClick={() => handleNavClick('/auth/login')}>Sign In</MenuItem>
                </Menu>
              </>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {navItems.map((item) => (
                  <Button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    sx={{ color: 'white' }}
                  >
                    {item.label}
                  </Button>
                ))}
                <Button
                  variant="outlined"
                  onClick={() => navigate('/auth/login')}
                  sx={{ color: 'white', borderColor: 'white', ml: 2 }}
                >
                  Sign In
                </Button>
              </Box>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'primary.light',
          py: { xs: 6, md: 10 },
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
