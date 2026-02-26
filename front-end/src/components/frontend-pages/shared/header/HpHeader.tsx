import { CustomizerContext } from '@/context/CustomizerContext';
import { useAuth } from '@/context/AuthContext';
import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { styled } from '@mui/material/styles';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { IconMenu2, IconMoon, IconSun } from '@tabler/icons-react';
import React, { useContext } from 'react';
import MobileSidebar from './MobileSidebar';
import Navigations from './Navigations';
import PortalNavigations from './PortalNavigations';

const HpHeader = () => {
  const { authenticated, user } = useAuth();
  const isChurchStaff = authenticated && user && !['super_admin', 'admin'].includes(user.role);
  const { activeMode, setActiveMode } = useContext(CustomizerContext);
  const toggleMode = () => setActiveMode(activeMode === 'light' ? 'dark' : 'light');
  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    justifyContent: 'center',
    [theme.breakpoints.up('lg')]: {
      minHeight: '80px',
    },
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
  }));

  const ToolbarStyled = styled(Toolbar)(() => ({
    width: '100%',
    paddingLeft: '0 !important',
    paddingRight: '0 !important',
    justifyContent: 'space-between',
  }));

  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const lgDown = useMediaQuery((theme: any) => theme.breakpoints.down('lg'));

  const [open, setOpen] = React.useState(false);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  return (
    <AppBarStyled position="sticky" elevation={0}>
      <Container sx={{ maxWidth: '1400px !important' }}>
        <ToolbarStyled>
          {/* Brand */}
          <Stack direction="row" alignItems="center" spacing={1.5} component="a" href="/frontend-pages/homepage" sx={{ textDecoration: 'none' }}>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{
                fontFamily: '"Cormorant Garamond", "Palatino Linotype", Georgia, serif',
                color: 'text.primary',
                fontSize: '1.25rem',
              }}
            >
              Orthodox Metrics
            </Typography>
          </Stack>

          {lgDown ? (
            <IconButton color="inherit" aria-label="menu" onClick={handleDrawerOpen}>
              <IconMenu2 size="20" />
            </IconButton>
          ) : null}

          {lgUp ? (
            isChurchStaff ? (
              <>
                <Stack spacing={1} direction="row" alignItems="center">
                  <PortalNavigations />
                </Stack>
                <Tooltip title={`Switch to ${activeMode === 'light' ? 'dark' : 'light'} mode`}>
                  <IconButton onClick={toggleMode} size="small" sx={{ color: 'text.primary' }}>
                    {activeMode === 'light' ? <IconMoon size={20} /> : <IconSun size={20} />}
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <>
                <Stack spacing={1} direction="row" alignItems="center">
                  <Navigations />
                </Stack>
                <Tooltip title={`Switch to ${activeMode === 'light' ? 'dark' : 'light'} mode`}>
                  <IconButton onClick={toggleMode} size="small" sx={{ color: 'text.primary' }}>
                    {activeMode === 'light' ? <IconMoon size={20} /> : <IconSun size={20} />}
                  </IconButton>
                </Tooltip>
                <Button color="primary" variant="contained" href="/auth/login">
                  Church Login
                </Button>
              </>
            )
          ) : null}
        </ToolbarStyled>
      </Container>
      <Drawer
        anchor="left"
        open={open}
        variant="temporary"
        onClose={toggleDrawer(false)}
        PaperProps={{
          sx: {
            width: 270,
            border: '0 !important',
            boxShadow: (theme: any) => theme.shadows[8],
          },
        }}
      >
        <MobileSidebar isPortal={!!isChurchStaff} />
      </Drawer>
    </AppBarStyled>
  );
};

export default HpHeader;
