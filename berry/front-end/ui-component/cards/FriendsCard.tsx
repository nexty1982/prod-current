import { useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';

// project imports
import { ThemeMode } from 'config';
import { gridSpacing } from 'store/constant';
import { getImageUrl, ImagePath } from 'utils/getImageUrl';

// assets
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined';
import PinDropTwoToneIcon from '@mui/icons-material/PinDropTwoTone';
import VideoCallTwoToneIcon from '@mui/icons-material/VideoCallTwoTone';
import ChatBubbleTwoToneIcon from '@mui/icons-material/ChatBubbleTwoTone';

import FavoriteTwoToneIcon from '@mui/icons-material/FavoriteTwoTone';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import GroupTwoToneIcon from '@mui/icons-material/GroupTwoTone';

// types
import { FriendsCardProps } from 'types/user';

// ==============================|| SOCIAL PROFILE - FRIENDS CARD ||============================== //

export default function FriendsCard({ avatar, location, name }: FriendsCardProps) {
  const theme = useTheme();

  const btnSX = {
    borderColor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'grey.200',
    bgcolor: 'background.paper'
  };

  const [anchorEl, setAnchorEl] = useState<Element | (() => Element) | null | undefined>(null);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement> | undefined) => {
    setAnchorEl(event?.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Card
      sx={{
        p: 2,
        bgcolor: theme.palette.mode === ThemeMode.DARK ? 'background.default' : 'grey.50',
        border: '1px solid',
        borderColor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'grey.100',
        '&:hover': {
          borderColor: 'primary.main'
        }
      }}
    >
      <Grid container spacing={2}>
        <Grid size={12}>
          <Grid container spacing={gridSpacing}>
            <Grid>
              <Avatar alt="User 1" src={avatar && getImageUrl(`${avatar}`, ImagePath.USERS)} />
            </Grid>
            <Grid size="grow">
              <Typography variant="h5" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                {name}
              </Typography>
              <Typography
                variant="subtitle2"
                sx={{ mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
              >
                <PinDropTwoToneIcon fontSize="inherit" sx={{ mr: 0.5, fontSize: '0.875rem', verticalAlign: 'text-top' }} />
                {location}
              </Typography>
            </Grid>
            <Grid>
              <IconButton size="small" sx={{ mt: -0.75, mr: -0.75 }} onClick={handleClick} aria-label="more-options">
                <MoreHorizOutlinedIcon
                  fontSize="small"
                  aria-controls="menu-friend-card"
                  aria-haspopup="true"
                  color="primary"
                  sx={{ opacity: 0.6 }}
                />
              </IconButton>
              <Menu
                id="menu-friend-card"
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleClose}
                variant="selectedMenu"
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right'
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right'
                }}
              >
                <MenuItem onClick={handleClose}>
                  <ListItemIcon>
                    <FavoriteTwoToneIcon fontSize="small" />
                  </ListItemIcon>
                  Favorites
                </MenuItem>
                <MenuItem onClick={handleClose}>
                  <ListItemIcon>
                    <GroupTwoToneIcon fontSize="small" />
                  </ListItemIcon>
                  Edit Friend List
                </MenuItem>
                <MenuItem onClick={handleClose}>
                  <ListItemIcon>
                    <DeleteTwoToneIcon fontSize="small" />
                  </ListItemIcon>
                  Unfriend
                </MenuItem>
              </Menu>
            </Grid>
          </Grid>
        </Grid>
        <Grid size={12}>
          <Grid container spacing={1}>
            <Grid size={6}>
              <Tooltip title="Video Call" placement="top">
                <Button variant="outlined" color="secondary" fullWidth sx={btnSX}>
                  <VideoCallTwoToneIcon fontSize="small" />
                </Button>
              </Tooltip>
            </Grid>
            <Grid size={6}>
              <Tooltip title="Message" placement="top">
                <Button variant="outlined" fullWidth sx={btnSX}>
                  <ChatBubbleTwoToneIcon fontSize="small" />
                </Button>
              </Tooltip>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Card>
  );
}
