import { Box, AppBar, Toolbar, styled, Stack, Button, Typography, useMediaQuery, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { IconMenu2, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import OrthodoxThemeToggle from '@/shared/ui/OrthodoxThemeToggle';
import Logo from '@/layouts/full/shared/logo/Logo';

const PublicHeader = () => {
  const navigate = useNavigate();
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
    background: theme.palette.background.paper,
    justifyContent: 'center',
    backdropFilter: 'blur(8px)',
    minHeight: 70,
  }));

  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
    color: theme.palette.text.secondary,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }));

  const NavLink = styled(Typography)(({ theme }) => ({
    color: theme.palette.text.primary,
    fontWeight: 500,
    fontSize: '0.95rem',
    cursor: 'pointer',
    padding: '8px 16px',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    textDecoration: 'none',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      color: theme.palette.primary.main,
    },
  }));

  const navItems = [
    { label: 'Home', path: '/frontend-pages/homepage' },
    { label: 'About', path: '/frontend-pages/about' },
    { label: 'Features', path: '/tour' },
    { label: 'Contact', path: '/frontend-pages/contact' },
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <AppBarStyled position="sticky" color="default">
      <ToolbarStyled>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Link to="/frontend-pages/homepage" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <Logo />
          </Link>
        </Box>

        {lgUp ? (
          <>
            <Stack direction="row" spacing={1} alignItems="center">
              {navItems.map((item) => (
                <NavLink key={item.path} onClick={() => handleNavClick(item.path)}>
                  {item.label}
                </NavLink>
              ))}
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center">
              <OrthodoxThemeToggle variant="icon" />
              <Button
                variant="outlined"
                color="primary"
                onClick={() => navigate('/auth/login2')}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, px: 3 }}
              >
                Sign In
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate('/auth/register')}
                sx={{
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  background: 'linear-gradient(135deg, #5c6bc0 0%, #7c4dff 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #4a5ab9 0%, #6b3de8 100%)' },
                }}
              >
                Get Started
              </Button>
            </Stack>
          </>
        ) : (
          <Stack direction="row" spacing={1} alignItems="center">
            <OrthodoxThemeToggle variant="icon" />
            <IconButton color="inherit" aria-label="menu" onClick={() => setMobileMenuOpen(true)}>
              <IconMenu2 size={24} />
            </IconButton>
          </Stack>
        )}

        <Drawer anchor="right" open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} PaperProps={{ sx: { width: 280, pt: 2 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, mb: 2 }}>
            <IconButton onClick={() => setMobileMenuOpen(false)}>
              <IconX size={24} />
            </IconButton>
          </Box>
          <List>
            {navItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton onClick={() => handleNavClick(item.path)}>
                  <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 500 }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Box sx={{ px: 2, mt: 2 }}>
            <Button fullWidth variant="outlined" color="primary" onClick={() => { navigate('/auth/login2'); setMobileMenuOpen(false); }} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, mb: 2 }}>
              Sign In
            </Button>
            <Button fullWidth variant="contained" color="primary" onClick={() => { navigate('/auth/register'); setMobileMenuOpen(false); }} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, background: 'linear-gradient(135deg, #5c6bc0 0%, #7c4dff 100%)', '&:hover': { background: 'linear-gradient(135deg, #4a5ab9 0%, #6b3de8 100%)' } }}>
              Get Started
            </Button>
          </Box>
        </Drawer>
      </ToolbarStyled>
    </AppBarStyled>
  );
};

export default PublicHeader;
