import { Link as RouterLink } from 'react-router-dom';

// material-ui
import Button from '@mui/material/Button';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';

// project imports
import Avatar from 'ui-component/extended/Avatar';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';

// assets
import TwitterIcon from '@mui/icons-material/Twitter';
import BusinessCenterTwoToneIcon from '@mui/icons-material/BusinessCenterTwoTone';
import DoneAllTwoToneIcon from '@mui/icons-material/DoneAllTwoTone';
import AccountCircleTwoToneIcon from '@mui/icons-material/AccountCircleTwoTone';

// ==========================|| DATA WIDGET - LATEST MESSAGES CARD ||========================== //

export default function LatestMessages() {
  return (
    <MainCard title="Messages" content={false}>
      <CardContent>
        <Grid
          container
          spacing={gridSpacing}
          sx={{
            alignItems: 'center',
            position: 'relative',

            '&>*': {
              position: 'relative',
              zIndex: '5'
            },

            '&:after': {
              content: '""',
              position: 'absolute',
              top: -24,
              left: 86,
              width: '1px',
              height: '100%',
              bgcolor: 'divider',
              zIndex: '1'
            }
          }}
        >
          <Grid size={12}>
            <Grid container spacing={2}>
              <Grid>
                <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                  <Grid size="grow">
                    <Typography variant="caption">2 hrs ago</Typography>
                  </Grid>
                  <Grid>
                    <Avatar color="info">
                      <TwitterIcon sx={{ color: 'common.white' }} />
                    </Avatar>
                  </Grid>
                </Grid>
              </Grid>
              <Grid size="grow">
                <Grid container spacing={1}>
                  <Grid size={12}>
                    <Typography variant="subtitle1">+ 1652 Followers</Typography>
                    <Typography variant="subtitle2">You’re getting more and more followers, keep it up!</Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={2}>
              <Grid>
                <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                  <Grid size="grow">
                    <Typography variant="caption">4 hrs ago</Typography>
                  </Grid>
                  <Grid>
                    <Avatar color="error">
                      <BusinessCenterTwoToneIcon sx={{ color: 'common.white' }} />
                    </Avatar>
                  </Grid>
                </Grid>
              </Grid>
              <Grid size="grow">
                <Grid container spacing={1}>
                  <Grid size={12}>
                    <Typography variant="subtitle1">+ 5 New Products were added!</Typography>
                    <Typography variant="subtitle2">Congratulations!</Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={2}>
              <Grid>
                <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                  <Grid size="grow">
                    <Typography variant="caption">1 day ago</Typography>
                  </Grid>
                  <Grid>
                    <Avatar color="success">
                      <DoneAllTwoToneIcon sx={{ color: 'common.white' }} />
                    </Avatar>
                  </Grid>
                </Grid>
              </Grid>
              <Grid size="grow">
                <Grid container spacing={1}>
                  <Grid size={12}>
                    <Typography variant="subtitle1">Database backup completed!</Typography>
                    <Typography variant="subtitle2">
                      Download the{' '}
                      <Link component={RouterLink} to="#" underline="hover">
                        latest backup
                      </Link>
                      .
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={2}>
              <Grid>
                <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                  <Grid size="grow">
                    <Typography variant="caption">2 day ago</Typography>
                  </Grid>
                  <Grid>
                    <Avatar color="primary">
                      <AccountCircleTwoToneIcon sx={{ color: 'common.white' }} />
                    </Avatar>
                  </Grid>
                </Grid>
              </Grid>
              <Grid size="grow">
                <Grid container spacing={1}>
                  <Grid size={12}>
                    <Typography variant="subtitle1">+2 Friend Requests</Typography>
                    <Typography variant="subtitle2">This is great, keep it up!</Typography>
                  </Grid>
                </Grid>
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
