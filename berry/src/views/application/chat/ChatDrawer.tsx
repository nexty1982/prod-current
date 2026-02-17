import { useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Drawer from '@mui/material/Drawer';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// third party
import PerfectScrollbar from 'react-perfect-scrollbar';

// project imports
import UserList from './UserList';
import AvatarStatus from './AvatarStatus';
import UserAvatar from './UserAvatar';
import { ThemeMode } from 'config';
import useAuth from 'hooks/useAuth';
import MainCard from 'ui-component/cards/MainCard';
import { appDrawerWidth as drawerWidth, gridSpacing } from 'store/constant';

// assets
import SearchTwoToneIcon from '@mui/icons-material/SearchTwoTone';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import useConfig from 'hooks/useConfig';

// types
import { UserProfile } from 'types/user-profile';

// ==============================|| CHAT DRAWER ||============================== //

interface ChatDrawerProps {
  handleDrawerOpen: () => void;
  openChatDrawer: boolean | undefined;
  setUser: (u: UserProfile) => void;
}

export default function ChatDrawer({ handleDrawerOpen, openChatDrawer, setUser }: ChatDrawerProps) {
  const theme = useTheme();

  const { user } = useAuth();
  const { borderRadius } = useConfig();
  const downLG = useMediaQuery(theme.breakpoints.down('lg'));

  // show menu to set current user status
  const [anchorEl, setAnchorEl] = useState<Element | (() => Element) | null | undefined>();
  const handleClickRightMenu = (event: React.MouseEvent<HTMLButtonElement> | undefined) => {
    setAnchorEl(event?.currentTarget);
  };

  const handleCloseRightMenu = () => {
    setAnchorEl(null);
  };

  // set user status on status menu click
  const [status, setStatus] = useState('available');
  const handleRightMenuItemClick = (userStatus: string) => () => {
    setStatus(userStatus);
    handleCloseRightMenu();
  };

  const drawerBG = theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'grey.50';

  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        zIndex: { xs: 1100, lg: 0 },
        '& .MuiDrawer-paper': {
          height: { xs: '100%', lg: 'auto' },
          width: drawerWidth,
          boxSizing: 'border-box',
          position: 'relative',
          border: 'none',
          borderRadius: { sx: 'none', lg: `${borderRadius}px` }
        }
      }}
      variant={downLG ? 'temporary' : 'persistent'}
      anchor="left"
      open={openChatDrawer}
      ModalProps={{ keepMounted: true }}
      onClose={handleDrawerOpen}
    >
      {openChatDrawer && (
        <MainCard sx={{ bgcolor: { xs: 'transparent', lg: drawerBG } }} border={theme.palette.mode !== ThemeMode.DARK} content={false}>
          <Box sx={{ p: 3, pb: 2 }}>
            <Grid container spacing={gridSpacing}>
              <Grid size={12}>
                <Grid container spacing={2} sx={{ alignItems: 'center', flexWrap: 'nowrap' }}>
                  <Grid>
                    <UserAvatar user={{ online_status: status, avatar: 'avatar-5.png', name: 'User 1' }} />
                  </Grid>
                  <Grid size="grow">
                    <Typography variant="h4">{user?.name}</Typography>
                  </Grid>
                  <Grid>
                    <IconButton onClick={handleClickRightMenu} size="large" aria-label="expandMore">
                      <ExpandMoreIcon />
                    </IconButton>
                    <Menu
                      id="simple-menu"
                      anchorEl={anchorEl}
                      keepMounted
                      open={Boolean(anchorEl)}
                      onClose={handleCloseRightMenu}
                      anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right'
                      }}
                      transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right'
                      }}
                    >
                      <MenuItem onClick={handleRightMenuItemClick('available')}>
                        <AvatarStatus status="available" mr={1} />
                        Available
                      </MenuItem>
                      <MenuItem onClick={handleRightMenuItemClick('do_not_disturb')}>
                        <AvatarStatus status="do_not_disturb" mr={1} />
                        Do not disturb
                      </MenuItem>
                      <MenuItem onClick={handleRightMenuItemClick('offline')}>
                        <AvatarStatus status="offline" mr={1} />
                        Offline
                      </MenuItem>
                    </Menu>
                  </Grid>
                </Grid>
              </Grid>
              <Grid size={12}>
                <OutlinedInput
                  fullWidth
                  id="input-search-header"
                  placeholder="Search Mail"
                  startAdornment={
                    <InputAdornment position="start">
                      <SearchTwoToneIcon fontSize="small" />
                    </InputAdornment>
                  }
                />
              </Grid>
            </Grid>
          </Box>
          <PerfectScrollbar
            style={{
              overflowX: 'hidden',
              height: downLG ? 'calc(100vh - 190px)' : 'calc(100vh - 440px)',
              minHeight: downLG ? 0 : 536
            }}
          >
            <Box sx={{ p: 3, pt: 0 }}>
              <UserList setUser={setUser} />
            </Box>
          </PerfectScrollbar>
        </MainCard>
      )}
    </Drawer>
  );
}
