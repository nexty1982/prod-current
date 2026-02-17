import { useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import ButtonBase from '@mui/material/ButtonBase';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Grid from '@mui/material/Grid';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

// project imports
import { ThemeMode } from 'config';
import Avatar from 'ui-component/extended/Avatar';
import { gridSpacing } from 'store/constant';
import { getImageUrl, ImagePath } from 'utils/getImageUrl';

// assets
import MoreVertTwoToneIcon from '@mui/icons-material/MoreVertTwoTone';
import EventTwoToneIcon from '@mui/icons-material/EventTwoTone';

// types
import { GenericCardProps } from 'types';

// ==============================|| SOCIAL PROFILE - GALLERY CARD ||============================== //

export default function GalleryCard({ dateTime, image, title }: GenericCardProps) {
  const theme = useTheme();

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
        bgcolor: theme.palette.mode === ThemeMode.DARK ? 'background.default' : 'grey.50',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 5
      }}
    >
      <CardMedia component="img" image={image && getImageUrl(`${image}`, ImagePath.PROFILE)} title="Slider5 image" />
      <CardContent sx={{ p: 2, pb: '16px !important' }}>
        <Grid container spacing={gridSpacing}>
          <Grid size="grow">
            <Typography
              variant="h5"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                mb: 0.5
              }}
            >
              {title}
            </Typography>
            <Typography variant="caption" sx={{ mt: 1, fontSize: '12px' }}>
              <EventTwoToneIcon sx={{ mr: 0.5, fontSize: '0.875rem', verticalAlign: 'text-top' }} />
              {dateTime}
            </Typography>
          </Grid>
          <Grid>
            <ButtonBase sx={{ borderRadius: '12px' }} onClick={handleClick}>
              <Avatar
                variant="rounded"
                sx={{
                  ...theme.typography.commonAvatar,
                  ...theme.typography.mediumAvatar,
                  bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'secondary.light',
                  color: theme.palette.mode === ThemeMode.DARK ? 'dark.light' : 'secondary.dark',
                  zIndex: 1,
                  transition: 'all .2s ease-in-out',
                  '&[aria-controls="menu-list-grow"],&:hover': {
                    bgcolor: 'secondary.main',
                    color: 'secondary.light'
                  }
                }}
                aria-controls="menu-post"
                aria-haspopup="true"
              >
                <MoreVertTwoToneIcon fontSize="inherit" />
              </Avatar>
            </ButtonBase>

            <Menu
              id="menu-gallery-card"
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
              <MenuItem onClick={handleClose}> Remove Tag</MenuItem>
              <MenuItem onClick={handleClose}> Download</MenuItem>
              <MenuItem onClick={handleClose}> Make Profile Picture </MenuItem>
              <MenuItem onClick={handleClose}> Make Cover Photo </MenuItem>
              <MenuItem onClick={handleClose}> Find Support or Report Photo </MenuItem>
            </Menu>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
