// material-ui
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';

// assets
import WatchLaterTwoToneIcon from '@mui/icons-material/WatchLaterTwoTone';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

import Avatar1 from 'assets/images/users/avatar-1.png';
import Avatar2 from 'assets/images/users/avatar-2.png';
import Avatar3 from 'assets/images/users/avatar-3.png';

// ===========================|| DATA WIDGET - USER ACTIVITY CARD ||=========================== //

export default function UserActivity() {
  const iconSX = {
    fontSize: '0.875rem',
    marginRight: 0.2,
    verticalAlign: 'sub'
  };

  return (
    <MainCard title="User Activity" content={false}>
      <CardContent>
        <Grid container spacing={gridSpacing} sx={{ alignItems: 'center' }}>
          <Grid size={12}>
            <Grid container spacing={2}>
              <Grid>
                <Box sx={{ position: 'relative' }}>
                  <Badge
                    overlap="circular"
                    badgeContent={<FiberManualRecordIcon sx={{ color: 'success.main', fontSize: '0.875rem' }} />}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right'
                    }}
                  >
                    <Avatar alt="image" src={Avatar1} />
                  </Badge>
                </Box>
              </Grid>
              <Grid size="grow">
                <Typography variant="subtitle1">John Deo</Typography>
                <Typography variant="subtitle2">Lorem Ipsum is simply dummy text.</Typography>
              </Grid>
              <Grid>
                <Typography variant="caption">
                  <WatchLaterTwoToneIcon sx={iconSX} />2 min ago
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={2}>
              <Grid>
                <Box sx={{ position: 'relative' }}>
                  <Badge
                    overlap="circular"
                    badgeContent={<FiberManualRecordIcon sx={{ color: 'error.main', fontSize: '0.875rem' }} />}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right'
                    }}
                  >
                    <Avatar alt="image" src={Avatar2} />
                  </Badge>
                </Box>
              </Grid>
              <Grid size="grow">
                <Typography variant="subtitle1">John Deo</Typography>
                <Typography variant="subtitle2">Lorem Ipsum is simply dummy text.</Typography>
              </Grid>
              <Grid>
                <Typography variant="caption">
                  <WatchLaterTwoToneIcon sx={iconSX} />2 min ago
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={2}>
              <Grid>
                <Box sx={{ position: 'relative' }}>
                  <Badge
                    overlap="circular"
                    badgeContent={<FiberManualRecordIcon sx={{ color: 'warning.main', fontSize: '0.875rem' }} />}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right'
                    }}
                  >
                    <Avatar alt="image" src={Avatar3} />
                  </Badge>
                </Box>
              </Grid>
              <Grid size="grow">
                <Typography variant="subtitle1">John Deo</Typography>
                <Typography variant="subtitle2">Lorem Ipsum is simply dummy text.</Typography>
              </Grid>
              <Grid>
                <Typography variant="caption">
                  <WatchLaterTwoToneIcon sx={iconSX} />2 min ago
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={2}>
              <Grid>
                <Box sx={{ position: 'relative' }}>
                  <Badge
                    overlap="circular"
                    badgeContent={<FiberManualRecordIcon sx={{ color: 'success.main', fontSize: '0.875rem' }} />}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right'
                    }}
                  >
                    <Avatar alt="image" src={Avatar1} />
                  </Badge>
                </Box>
              </Grid>
              <Grid size="grow">
                <Typography variant="subtitle1">John Deo</Typography>
                <Typography variant="subtitle2">Lorem Ipsum is simply dummy text.</Typography>
              </Grid>
              <Grid>
                <Typography variant="caption">
                  <WatchLaterTwoToneIcon sx={iconSX} />2 min ago
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </CardContent>
      <Divider />
      <CardActions sx={{ justifyContent: 'flex-end' }}>
        <Button variant="text" size="small">
          View all Projects
        </Button>
      </CardActions>
    </MainCard>
  );
}
