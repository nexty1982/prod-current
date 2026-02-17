import { useState } from 'react';

// material-ui
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// third party
import { format } from 'date-fns';

// project imports
import Avatar from '../extended/Avatar';
import { getImageUrl, ImagePath } from 'utils/getImageUrl';

// assets
import StarTwoToneIcon from '@mui/icons-material/StarTwoTone';
import StarBorderTwoToneIcon from '@mui/icons-material/StarBorderTwoTone';
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';

// ==============================|| PRODUCT DETAILS - REVIEW ||============================== //

interface ReviewProps {
  avatar: string;
  date: Date | string;
  name: string;
  status: boolean;
  rating: number;
  review: string;
}

export default function ProductReview({ avatar, date, name, status, rating, review }: ReviewProps) {
  const [anchorEl, setAnchorEl] = useState<Element | (() => Element) | null | undefined>(null);
  const handleClick = (event: React.MouseEvent<SVGSVGElement> | undefined) => {
    setAnchorEl(event?.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 4, lg: 3, xl: 2 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Avatar alt={name} src={avatar && getImageUrl(`${avatar}`, ImagePath.USERS)} />
          <Stack spacing={0.5}>
            <Stack spacing={1} direction="row" sx={{ alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                {name}
              </Typography>
              {status && (
                <Tooltip title="Purchased Verified">
                  <VerifiedUserIcon fontSize="small" sx={{ color: 'success.dark' }} />
                </Tooltip>
              )}
              {!status && (
                <Tooltip title="Goodwill">
                  <DirectionsRunIcon fontSize="small" sx={{ color: 'error.main' }} />
                </Tooltip>
              )}
            </Stack>
            <Typography variant="caption">{format(new Date(date), 'E, MMM d yyyy')}</Typography>
          </Stack>
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 8, lg: 9, xl: 10 }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={11}>
            <Stack spacing={1}>
              <Rating
                size="small"
                name="simple-controlled"
                value={rating < 4 ? rating + 1 : rating}
                icon={<StarTwoToneIcon fontSize="inherit" />}
                emptyIcon={<StarBorderTwoToneIcon fontSize="inherit" />}
                precision={0.1}
                readOnly
              />
              <Typography variant="body2">{review}</Typography>
            </Stack>
          </Grid>
          <Grid size={1}>
            <Stack sx={{ justifyContent: 'flex-end' }}>
              <MoreHorizOutlinedIcon
                fontSize="small"
                aria-controls="menu-popular-card"
                aria-haspopup="true"
                onClick={handleClick}
                sx={{ color: 'grey.500', cursor: 'pointer' }}
              />
              <Menu
                id="menu-popular-card"
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
                <MenuItem onClick={handleClose}> Edit</MenuItem>
                <MenuItem onClick={handleClose}> Delete</MenuItem>
              </Menu>
            </Stack>
          </Grid>
        </Grid>
      </Grid>
      <Grid size={12}>
        <Divider />
      </Grid>
    </Grid>
  );
}
