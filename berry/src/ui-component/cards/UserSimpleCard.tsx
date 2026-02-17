import { useState } from 'react';

// material-ui
import { useTheme, styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

// project imports
import Avatar from '../extended/Avatar';
import { ThemeMode } from 'config';
import { gridSpacing } from 'store/constant';
import { getImageUrl, ImagePath } from 'utils/getImageUrl';

// assets
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

// types
import { UserSimpleCardProps } from 'types/user';

// styles
const FacebookWrapper = styled(Button)({
  padding: 8,
  background: 'rgba(66, 103, 178, 0.2)',
  '& svg': {
    color: '#4267B2'
  },
  '&:hover': {
    background: '#4267B2',
    '& svg': {
      color: '#fff'
    }
  }
});

const TwitterWrapper = styled(Button)({
  padding: 8,
  background: 'rgba(29, 161, 242, 0.2)',
  '& svg': {
    color: '#1DA1F2'
  },
  '&:hover': {
    background: '#1DA1F2',
    '& svg': {
      color: '#fff'
    }
  }
});

const LinkedInWrapper = styled(Button)({
  padding: 8,
  background: 'rgba(14, 118, 168, 0.12)',
  '& svg': {
    color: '#0E76A8'
  },
  '&:hover': {
    background: '#0E76A8',
    '& svg': {
      color: '#fff'
    }
  }
});

// ==============================|| USER SIMPLE CARD ||============================== //

export default function UserSimpleCard({ avatar, name, status }: UserSimpleCardProps) {
  const theme = useTheme();

  const [anchorEl, setAnchorEl] = useState<Element | (() => Element) | null | undefined>(null);
  const handleClick = (event: React.MouseEvent) => {
    setAnchorEl(event.currentTarget);
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
        borderColor: 'divider',
        '&:hover': {
          borderColor: 'primary.main'
        }
      }}
    >
      <Grid container spacing={gridSpacing}>
        <Grid size={12}>
          <Grid container spacing={gridSpacing}>
            <Grid size="grow">
              <Avatar alt={name} src={avatar && getImageUrl(`${avatar}`, ImagePath.USERS)} sx={{ width: 72, height: 72 }} />
            </Grid>
            <Grid>
              <IconButton size="small" sx={{ mt: -0.75, mr: -0.75 }} onClick={handleClick}>
                <MoreHorizOutlinedIcon
                  fontSize="small"
                  color="inherit"
                  aria-controls="menu-friend-card"
                  aria-haspopup="true"
                  sx={{ opacity: 0.6 }}
                />
              </IconButton>
              <Menu
                id="menu-simple-card"
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
                <MenuItem onClick={handleClose}>Edit</MenuItem>
                <MenuItem onClick={handleClose}>Delete</MenuItem>
              </Menu>
            </Grid>
          </Grid>
        </Grid>
        <Grid sx={{ alignItems: 'center' }} size={12}>
          <Grid container spacing={gridSpacing}>
            <Grid size="grow">
              <Typography variant="h4">{name}</Typography>
            </Grid>
            <Grid>
              {status === 'Active' ? (
                <Chip label="Active" size="small" color="success" />
              ) : (
                <Chip label="Rejected" size="small" color="error" />
              )}
            </Grid>
          </Grid>
        </Grid>
        <Grid size={12}>
          <Grid container spacing={2}>
            <Grid size={4}>
              <FacebookWrapper fullWidth>
                <FacebookIcon fontSize="small" />
              </FacebookWrapper>
            </Grid>
            <Grid size={4}>
              <TwitterWrapper fullWidth>
                <TwitterIcon fontSize="small" />
              </TwitterWrapper>
            </Grid>
            <Grid size={4}>
              <LinkedInWrapper fullWidth>
                <LinkedInIcon fontSize="small" />
              </LinkedInWrapper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Card>
  );
}
