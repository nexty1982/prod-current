import config from '@/context/config';
import { AppBar, Box, IconButton, Stack, Toolbar, styled, useMediaQuery } from '@mui/material';
import { IconMenu2 } from '@tabler/icons-react';
import { useContext } from 'react';

// Components
import OrthodoxThemeToggle from '@/shared/ui/OrthodoxThemeToggle';
import ChurchHeader from '../../../../components/layout/ChurchHeader';
import Language from './Language';
import LastLoggedIn from './LastLoggedIn';
import MobileRightSidebar from './MobileRightSidebar';
import Navigation from './Navigation';
import Notifications from './Notification';
import Profile from './Profile';
import UpdatesIndicator from './UpdatesIndicator';

// Contexts & Hooks
import { useAuth } from '@/context/AuthContext';
import { CustomizerContext } from '@/context/CustomizerContext';

const Header = () => {
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const lgDown = useMediaQuery((theme: any) => theme.breakpoints.down('lg'));
  const { authenticated } = useAuth();

  const TopbarHeight = config.topbarHeight;
  const { setIsCollapse, isCollapse, isMobileSidebar, setIsMobileSidebar, headerBackground } = useContext(CustomizerContext);

  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    boxShadow: theme.palette.mode === 'dark' 
      ? '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2)'
      : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    background: theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, rgba(30, 30, 40, 0.98) 0%, rgba(45, 40, 60, 0.95) 100%)'
      : 'linear-gradient(135deg, rgba(250, 250, 252, 0.98) 0%, rgba(245, 242, 250, 0.95) 100%)',
    backdropFilter: 'blur(10px)',
    borderBottom: theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.08)'
      : '1px solid rgba(0, 0, 0, 0.06)',
    [theme.breakpoints.up('lg')]: {
      minHeight: TopbarHeight,
    },
  }));

  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    width: '100%',
    color: theme.palette.mode === 'dark' ? '#FFFFFF' : '#1a1a2e',
    padding: '0 16px',
    minHeight: TopbarHeight,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  }));

  return (
    <AppBarStyled position="sticky" color="default">
      <ToolbarStyled>
        {/* Menu Toggle Button */}
        <IconButton
          color="inherit"
          aria-label="menu"
          onClick={() => {
            if (lgUp) {
              isCollapse === "full-sidebar" ? setIsCollapse("mini-sidebar") : setIsCollapse("full-sidebar");
            } else {
              setIsMobileSidebar(!isMobileSidebar);
            }
          }}
          sx={{ 
            mr: 1,
            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
          }}
        >
          <IconMenu2 size="20" />
        </IconButton>

        {/* Navigation Links */}
        {lgUp ? (
          <Box sx={{ mr: 2 }}>
            <Navigation />
          </Box>
        ) : null}

        {/* Church Header with Switch Dropdown */}
        {authenticated && (
          <Box sx={{ mr: 'auto' }}>
            <ChurchHeader />
          </Box>
        )}

        {/* Right Side Actions */}
        <Stack spacing={1.5} direction="row" alignItems="center" sx={{ ml: 'auto' }}>

          {/* User Tools */}
          <LastLoggedIn />
          <Language />
          <OrthodoxThemeToggle variant="icon" />
          <UpdatesIndicator />
          <Notifications />
          
          {lgDown ? <MobileRightSidebar /> : null}

          {/* Profile - Slightly separated */}
          <Box sx={{ ml: 0.5 }}>
            <Profile />
          </Box>
        </Stack>
      </ToolbarStyled>
    </AppBarStyled>
  );
};

export default Header;
