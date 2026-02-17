import { useState, SyntheticEvent } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

// project imports
import { ThemeMode } from 'config';
import { getImageUrl, ImagePath } from 'utils/getImageUrl';

// assets
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined';
import PersonAddTwoToneIcon from '@mui/icons-material/PersonAddTwoTone';
import PeopleAltTwoToneIcon from '@mui/icons-material/PeopleAltTwoTone';
import PinDropTwoToneIcon from '@mui/icons-material/PinDropTwoTone';

import FavoriteTwoToneIcon from '@mui/icons-material/FavoriteTwoTone';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import GroupTwoToneIcon from '@mui/icons-material/GroupTwoTone';

// types
import { FollowerCardProps } from 'types/user';

// ==============================|| SOCIAL PROFILE - FOLLOWER CARD ||============================== //

export default function FollowerCard({ avatar, follow, location, name }: FollowerCardProps) {
  const theme = useTheme();

  const [anchorEl, setAnchorEl] = useState<Element | (() => Element) | null | undefined>(null);
  const handleClick = (event: SyntheticEvent) => {
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
        '&:hover': { borderColor: 'primary.main' }
      }}
    >
      <Grid container spacing={2}>
        <Grid size={12}>
          <Grid container spacing={2}>
            <Grid>
              <Avatar alt="User 1" src={avatar && getImageUrl(`${avatar}`, ImagePath.USERS)} />
            </Grid>
            <Grid size="grow">
              <Typography variant="h5" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                {name}
              </Typography>
              <Typography
                variant="subtitle2"
                sx={{ mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
              >
                <PinDropTwoToneIcon sx={{ mr: '6px', fontSize: '16px', verticalAlign: 'text-top' }} />
                {location}
              </Typography>
            </Grid>
            <Grid>
              <MoreHorizOutlinedIcon
                fontSize="small"
                sx={{ color: 'primary.200', cursor: 'pointer' }}
                aria-controls="menu-followers-card"
                aria-haspopup="true"
                onClick={handleClick}
              />
              <Menu
                id="menu-followers-card"
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
                  Removed
                </MenuItem>
              </Menu>
            </Grid>
          </Grid>
        </Grid>
        <Grid size={12}>
          {follow === 2 ? (
            <Button variant="contained" fullWidth startIcon={<PersonAddTwoToneIcon />}>
              Follow Back
            </Button>
          ) : (
            <Button variant="outlined" fullWidth startIcon={<PeopleAltTwoToneIcon />}>
              Followed
            </Button>
          )}
        </Grid>
      </Grid>
    </Card>
  );
}
