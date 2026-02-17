// material-ui
import Avatar from '@mui/material/Avatar';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// third party
import PerfectScrollbar from 'react-perfect-scrollbar';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';

// assets
import WatchLaterTwoToneIcon from '@mui/icons-material/WatchLaterTwoTone';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

import Avatar1 from 'assets/images/users/avatar-1.png';
import Avatar2 from 'assets/images/users/avatar-2.png';
import Avatar3 from 'assets/images/users/avatar-3.png';
import Avatar4 from 'assets/images/users/avatar-4.png';
import Avatar5 from 'assets/images/users/avatar-5.png';

const activeSX = {
  width: 16,
  height: 16,
  verticalAlign: 'sub',
  color: 'success.main'
};

const iconSX = {
  fontSize: '0.875rem',
  mr: 0.25,
  verticalAlign: 'sub'
};

// ===========================|| DATA WIDGET - NEW CUSTOMERS CARD ||=========================== //

export default function NewCustomers() {
  return (
    <MainCard title="New Customers" content={false}>
      <PerfectScrollbar style={{ height: 370 }}>
        <CardContent>
          <Grid container spacing={gridSpacing} sx={{ alignItems: 'center' }}>
            <Grid size={12}>
              <Grid container spacing={2}>
                <Grid>
                  <Avatar alt="coverimage" src={Avatar1} />
                </Grid>
                <Grid size="grow">
                  <Typography variant="subtitle1">Alex Thompson</Typography>
                  <Grid container spacing={2}>
                    <Grid size="grow">
                      <Typography variant="subtitle2">Cheers!</Typography>
                    </Grid>
                    <Grid>
                      <Typography variant="caption">
                        <FiberManualRecordIcon sx={activeSX} />
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            <Grid size={12}>
              <Grid container spacing={2}>
                <Grid>
                  <Avatar alt="coverimage" src={Avatar2} />
                </Grid>
                <Grid size="grow">
                  <Typography variant="subtitle1">John Doue</Typography>
                  <Grid container spacing={2}>
                    <Grid size="grow">
                      <Typography variant="subtitle2">stay hungry stay foolish!</Typography>
                    </Grid>
                    <Grid>
                      <Typography variant="caption">
                        <FiberManualRecordIcon sx={activeSX} />
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            <Grid size={12}>
              <Grid container spacing={2}>
                <Grid>
                  <Avatar alt="coverimage" src={Avatar3} />
                </Grid>
                <Grid size="grow">
                  <Typography variant="subtitle1">Alex Thompson</Typography>
                  <Grid container spacing={2}>
                    <Grid size="grow">
                      <Typography variant="subtitle2">Cheers!</Typography>
                    </Grid>
                    <Grid>
                      <Typography variant="caption">
                        <WatchLaterTwoToneIcon sx={iconSX} />
                        30 min ago
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            <Grid size={12}>
              <Grid container spacing={2}>
                <Grid>
                  <Avatar alt="coverimage" src={Avatar4} />
                </Grid>
                <Grid size="grow">
                  <Typography variant="subtitle1">John Doue</Typography>
                  <Grid container spacing={2}>
                    <Grid size="grow">
                      <Typography variant="subtitle2">stay hungry stay foolish!</Typography>
                    </Grid>
                    <Grid>
                      <Typography variant="caption">
                        <WatchLaterTwoToneIcon sx={iconSX} />
                        10 min ago
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            <Grid size={12}>
              <Grid container spacing={2}>
                <Grid>
                  <Avatar alt="coverimage" src={Avatar5} />
                </Grid>
                <Grid size="grow">
                  <Typography variant="subtitle1">Shirley Hoe</Typography>
                  <Grid container spacing={2}>
                    <Grid size="grow">
                      <Typography variant="subtitle2">Cheers!</Typography>
                    </Grid>
                    <Grid>
                      <Typography variant="caption">
                        <WatchLaterTwoToneIcon sx={iconSX} />
                        30 min ago
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            <Grid size={12}>
              <Grid container spacing={2}>
                <Grid>
                  <Avatar alt="coverimage" src={Avatar1} />
                </Grid>
                <Grid size="grow">
                  <Typography variant="subtitle1">Alex Thompson</Typography>
                  <Grid container spacing={2}>
                    <Grid size="grow">
                      <Typography variant="subtitle2">Cheers!</Typography>
                    </Grid>
                    <Grid>
                      <Typography variant="caption">
                        <FiberManualRecordIcon sx={activeSX} />
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            <Grid size={12}>
              <Grid container spacing={2}>
                <Grid>
                  <Avatar alt="coverimage" src={Avatar2} />
                </Grid>
                <Grid size="grow">
                  <Typography variant="subtitle1">John Doue</Typography>
                  <Grid container spacing={2}>
                    <Grid size="grow">
                      <Typography variant="subtitle2">stay hungry stay foolish!</Typography>
                    </Grid>
                    <Grid>
                      <Typography variant="caption">
                        <FiberManualRecordIcon sx={activeSX} />
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            <Grid size={12}>
              <Grid container spacing={2}>
                <Grid>
                  <Avatar alt="coverimage" src={Avatar3} />
                </Grid>
                <Grid size="grow">
                  <Typography variant="subtitle1">Alex Thompson</Typography>
                  <Grid container spacing={2}>
                    <Grid size="grow">
                      <Typography variant="subtitle2">Cheers!</Typography>
                    </Grid>
                    <Grid>
                      <Typography variant="caption">
                        <WatchLaterTwoToneIcon sx={iconSX} />
                        30 min ago
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            <Grid size={12}>
              <Grid container spacing={2}>
                <Grid>
                  <Avatar alt="coverimage" src={Avatar4} />
                </Grid>
                <Grid size="grow">
                  <Typography variant="subtitle1">John Doue</Typography>
                  <Grid container spacing={2}>
                    <Grid size="grow">
                      <Typography variant="subtitle2">stay hungry stay foolish!</Typography>
                    </Grid>
                    <Grid>
                      <Typography variant="caption">
                        <WatchLaterTwoToneIcon sx={iconSX} />
                        10 min ago
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            <Grid size={12}>
              <Grid container spacing={2}>
                <Grid>
                  <Avatar alt="coverimage" src={Avatar5} />
                </Grid>
                <Grid size="grow">
                  <Typography variant="subtitle1">Shirley Hoe</Typography>
                  <Grid container spacing={2}>
                    <Grid size="grow">
                      <Typography variant="subtitle2">Cheers!</Typography>
                    </Grid>
                    <Grid>
                      <Typography variant="caption">
                        <WatchLaterTwoToneIcon sx={iconSX} />
                        30 min ago
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </PerfectScrollbar>
    </MainCard>
  );
}
