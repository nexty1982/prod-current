import { Box, Avatar, Typography, IconButton, Tooltip, useMediaQuery } from '@mui/material';

import img1 from 'src/assets/images/profile/user-1.jpg';
import { IconPower } from '@tabler/icons-react';

import { Link } from 'react-router';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { useContext } from 'react';
import { useAuth } from 'src/context/AuthContext';

export const Profile = () => {
  const { isSidebarHover, isCollapse } = useContext(CustomizerContext);
  const { user } = useAuth();

  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const hideMenu = lgUp ? isCollapse == 'mini-sidebar' && !isSidebarHover : '';

  return (
    <Box
      display={'flex'}
      alignItems="center"
      gap={2}
      sx={{ m: 3, p: 2, bgcolor: `${'secondary.light'}` }}
    >
      {!hideMenu ? (
        <>
          <Avatar alt="User Profile" src={img1} />

          <Box>
            <Typography variant="h6">
              {user ? `${user.first_name} ${user.last_name}` : 'Unknown User'}
            </Typography>
            <Typography variant="caption">
              {user?.role || 'User'}
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
