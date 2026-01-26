import { Box, Avatar, Typography, IconButton, Tooltip, useMediaQuery } from '@mui/material';

import { IconPower } from '@tabler/icons-react';

import { Link } from 'react-router-dom';
import { CustomizerContext } from '@/context/CustomizerContext';
import { UserDataContext } from '@/context/UserDataContext';
import { useContext } from 'react';
import { useAuth } from '@/context/AuthContext';

// Default profile image fallback (using Orthodox default)
const defaultImg = '/orthodox/avatars/default.svg';

export const Profile = () => {
  const { isSidebarHover, isCollapse } = useContext(CustomizerContext);
  const { user } = useAuth();
  
  // Use UserDataContext for profile data synchronization
  const userDataContext = useContext(UserDataContext);
  const profileData = userDataContext?.profileData;
  
  // Use profile avatar from context, fallback to default
  const profileImage = profileData?.avatar || defaultImg;

  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const hideMenu = lgUp ? isCollapse == 'mini-sidebar' && !isSidebarHover : '';

  // Don't show profile if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <Box
      display={'flex'}
      alignItems="center"
      gap={2}
      sx={{ m: 3, p: 2, bgcolor: `${'secondary.light'}` }}
    >
      {!hideMenu ? (
        <>
          <Avatar alt="User Profile" src={profileImage} />

          <Box>
            <Typography variant="h6">
              {profileData?.name || 
               (user?.first_name?.trim() && user?.last_name?.trim()
                ? `${user.first_name} ${user.last_name}`
                : user?.email || 'Unknown User')}
            </Typography>
            <Typography variant="caption">
              {profileData?.role || user?.role || 'User'}
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Tooltip title="Logout" placement="top">
              <IconButton
                color="primary"
                component={Link}
                to="auth/login"
                aria-label="logout"
                size="small"
              >
                <IconPower size="20" />
              </IconButton>
            </Tooltip>
          </Box>
        </>
      ) : (
        ''
      )}
    </Box>
  );
};
