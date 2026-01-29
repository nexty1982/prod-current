import { IconButton, Box, AppBar, useMediaQuery, Toolbar, styled, Stack, Tooltip } from '@mui/material';
import React, { useState, useEffect, useContext } from 'react';
import config from '@/context/config';
import { IconMenu2 } from '@tabler/icons-react';
import { Wrench } from 'lucide-react';

// Components
import Notifications from './Notification';
import Profile from './Profile';
import LastLoggedIn from './LastLoggedIn';
import Language from './Language';
import Navigation from './Navigation';
import MobileRightSidebar from './MobileRightSidebar';
import OrthodoxThemeToggle from '@/shared/ui/OrthodoxThemeToggle';

// Contexts & Hooks
import { CustomizerContext } from '@/context/CustomizerContext';
import { useAuth } from '@/context/AuthContext';
import { useMaintenanceStatus } from '@/hooks/useMaintenanceStatus';

const Header = () => {
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const lgDown = useMediaQuery((theme: any) => theme.breakpoints.down('lg'));
  const { authenticated, isSuperAdmin } = useAuth();
  const { isInMaintenance, toggleMaintenanceMode, isToggling } = useMaintenanceStatus();
  
  // 3-Dot Health Status State
  const [systemStatus, setSystemStatus] = useState<'production' | 'updating' | 'frontend_only'>('production');

  // Polling for System Health
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/system/health');
        const data = await response.json();
        setSystemStatus(data.status);
      } catch (error) {
        setSystemStatus('frontend_only'); // Fail-safe to 1 green dot
      }
    };

    const interval = setInterval(fetchHealth, 30000);
    fetchHealth();
    return () => clearInterval(interval);
  }, []);

  const TopbarHeight = config.topbarHeight;
  const { setIsCollapse, isCollapse, isMobileSidebar, setIsMobileSidebar, headerBackground } = useContext(CustomizerContext);

  const getBackground = () => {
    const fallbackGradient = 'linear-gradient(135deg, #1a0d2e 0%, #2d1b4e 50%, #3d1f5d 100%)';
    if (headerBackground) {
      return `linear-gradient(135deg, #1a0d2e 0%, #2d1b4e 50%, #3d1f5d 100%), url(/images/backgrounds/bgtiled${headerBackground}.png) repeat`;
    }
    if (authenticated) {
      return `linear-gradient(135deg, #1a0d2e 0%, #2d1b4e 50%, #3d1f5d 100%), url(/images/backgrounds/bgtiled.png) repeat`;
    }
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
    color: '#FFFFFF',
  }));

  return (
    <AppBarStyled position="sticky" color="default">
      <ToolbarStyled>
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
        >
          <IconMenu2 size="20" />
        </IconButton>

        {lgUp ? <Navigation /> : null}

        <Box flexGrow={1} />
        
        <Stack spacing={2} direction="row" alignItems="center">
          {/* ------------------------------------------- */}
          {/* Maintenance Mode Toggle - Super Admin Only */}
          {/* ------------------------------------------- */}
          {authenticated && isSuperAdmin() && (
            <Tooltip title={isInMaintenance ? "Disable Maintenance Mode" : "Enable Maintenance Mode"}>
              <button 
                onClick={() => toggleMaintenanceMode(!isInMaintenance)}
                disabled={isToggling}
                style={{
                  padding: '5px 14px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: isToggling ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  backgroundColor: isInMaintenance ? '#f97316' : 'transparent',
                  color: isInMaintenance ? '#ffffff' : '#22c55e',
                  border: `1px solid ${isInMaintenance ? '#f97316' : '#22c55e'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Wrench size={14} className={(isToggling || isInMaintenance) ? 'animate-spin' : ''} />
                {isInMaintenance ? 'MAINTENANCE ON' : 'MAINTENANCE OFF'}
              </button>
            </Tooltip>
          )}

          <LastLoggedIn />
          <Language />
          <OrthodoxThemeToggle variant="icon" />
          <Notifications />
          
          {lgDown ? <MobileRightSidebar /> : null}

          {/* ------------------------------------------- */}
          {/* 3-Dot Health Indicator */}
          {/* ------------------------------------------- */}
          <Box sx={{ display: 'flex', gap: '5px', px: 1, alignItems: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)', ml: 1 }}>
            {/* Dot 1: Frontend - Always Green */}
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
            
            {/* Dot 2: API/Backend - Green if production or updating */}
            <Box sx={{ 
              width: 8, height: 8, borderRadius: '50%', 
              bgcolor: systemStatus !== 'frontend_only' ? '#22c55e' : '#64748b' 
            }} />
            
            {/* Dot 3: Database Sync - Green ONLY if production */}
            <Box sx={{ 
              width: 8, height: 8, borderRadius: '50%', 
              bgcolor: systemStatus === 'production' ? '#22c55e' : '#64748b' 
            }} />
          </Box>

          <Profile />
        </Stack>
      </ToolbarStyled>
    </AppBarStyled>
  );
};

export default Header;
