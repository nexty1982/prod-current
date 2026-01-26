import { IconButton, Box, AppBar, useMediaQuery, Toolbar, styled, Stack } from '@mui/material';

import config from '@/context/config'
import { useContext } from "react";

import { IconMenu2 } from '@tabler/icons-react';
import Notifications from './Notification';
import Profile from './Profile';
import LastLoggedIn from './LastLoggedIn';
import Language from './Language';
import Navigation from './Navigation';
import MobileRightSidebar from './MobileRightSidebar';
import OrthodoxThemeToggle from '@/shared/ui/OrthodoxThemeToggle';
import { CustomizerContext } from '@/context/CustomizerContext';
import { useAuth } from '@/context/AuthContext';

const Header = () => {
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const lgDown = useMediaQuery((theme: any) => theme.breakpoints.down('lg'));
  const { authenticated } = useAuth();

  const TopbarHeight = config.topbarHeight;

  // drawer
  const { setIsCollapse, isCollapse, isMobileSidebar, setIsMobileSidebar, headerBackground } = useContext(CustomizerContext);

  // Default background for authenticated users is bgtiled.png
  // Uses CSS fallback mechanism - if image fails to load, gradient is used
  const getBackground = () => {
    const fallbackGradient = 'linear-gradient(135deg, #1a0d2e 0%, #2d1b4e 50%, #3d1f5d 100%)';
    
    if (headerBackground) {
      // Check if file exists in backgrounds folder, otherwise fallback to gradient
      // Files are at /images/backgrounds/bgtiled{number}.png
      // CSS will fallback to gradient if image doesn't exist
      return `linear-gradient(135deg, #1a0d2e 0%, #2d1b4e 50%, #3d1f5d 100%), url(/images/backgrounds/bgtiled${headerBackground}.png) repeat`;
    }
    // For authenticated users, default to bgtiled.png (if exists) or gradient
    if (authenticated) {
      // Try default bgtiled.png, but fallback to gradient if not found
      // CSS will fallback to gradient if image doesn't exist
      return `linear-gradient(135deg, #1a0d2e 0%, #2d1b4e 50%, #3d1f5d 100%), url(/images/backgrounds/bgtiled.png) repeat`;
    }
    // For unauthenticated users, use gradient
    return fallbackGradient;
  };

  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    boxShadow: 'none',
    background: getBackground(),
    backgroundSize: 'auto',
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
    [theme.breakpoints.up('lg')]: {
      minHeight: TopbarHeight,
    },
  }));
  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    width: '100%',
    color: '#FFFFFF', // Explicit white color for header text to override theme inheritance
  }));

  return (
    <AppBarStyled position="sticky" color="default">
      <ToolbarStyled>
        {/* ------------------------------------------- */}
        {/* Toggle Button Sidebar */}
        {/* ------------------------------------------- */}
        <IconButton
          color="inherit"
          aria-label="menu"
          onClick={() => {
            // Toggle sidebar on both mobile and desktop based on screen size
            if (lgUp) {
              // For large screens, toggle between full-sidebar and mini-sidebar
              isCollapse === "full-sidebar" ? setIsCollapse("mini-sidebar") : setIsCollapse("full-sidebar");
            } else {
              // For smaller screens, toggle mobile sidebar
              setIsMobileSidebar(!isMobileSidebar);
            }
          }}
        >
          <IconMenu2 size="20" />
        </IconButton>

        {lgUp ? (
          <>
            <Navigation />
          </>
        ) : null}

        <Box flexGrow={1} />
        <Stack spacing={1} direction="row" alignItems="center">
          <LastLoggedIn />
          <Language />
          {/* ------------------------------------------- */}
          {/* Orthodox Theme Toggle */}
          {/* ------------------------------------------- */}
          <OrthodoxThemeToggle variant="icon" />
          <Notifications />
          {/* ------------------------------------------- */}
          {/* Toggle Right Sidebar for mobile */}
          {/* ------------------------------------------- */}
          {lgDown ? <MobileRightSidebar /> : null}
          <Profile />
        </Stack>
      </ToolbarStyled>
    </AppBarStyled>
  );
};

export default Header;
