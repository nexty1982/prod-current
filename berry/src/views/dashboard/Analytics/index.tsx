// material-ui
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// project imports
import MarketShareAreaChartCard from './MarketShareAreaChartCard';
import TotalRevenueCard from './TotalRevenueCard';
import LatestCustomerTableCard from './LatestCustomerTableCard';
import { ThemeMode } from 'config';
import MainCard from 'ui-component/cards/MainCard';
import RevenueCard from 'ui-component/cards/RevenueCard';
import UserCountCard from 'ui-component/cards/UserCountCard';

import { gridSpacing } from 'store/constant';

// assets
import { IconShare, IconAccessPoint, IconCircles, IconCreditCard } from '@tabler/icons-react';
import MonetizationOnTwoToneIcon from '@mui/icons-material/MonetizationOnTwoTone';
import AccountCircleTwoTone from '@mui/icons-material/AccountCircleTwoTone';
import DescriptionTwoToneIcon from '@mui/icons-material/DescriptionTwoTone';

// ==============================|| ANALYTICS DASHBOARD ||============================== //

export default function Analytics() {
  const theme = useTheme();

  const blockSX = {
    p: 2.5,
    borderLeft: '1px solid ',
    borderBottom: '1px solid ',
    borderLeftColor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'grey.200',
    borderBottomColor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'grey.200'
  };

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={{ xs: 12, lg: 8, md: 6 }}>
        <Grid container spacing={gridSpacing}>
          <Grid size={12}>
            <MarketShareAreaChartCard />
          </Grid>
          <Grid size={{ xs: 12, lg: 6 }}>
            <RevenueCard
              primary="Revenue"
              secondary="$42,562"
              content="$50,032 Last Month"
              iconPrimary={MonetizationOnTwoToneIcon}
              color="secondary.main"
            />
          </Grid>
          <Grid size={{ xs: 12, lg: 6 }}>
            <RevenueCard
              primary="Orders Received"
              secondary="486"
              content="20% Increase"
              iconPrimary={AccountCircleTwoTone}
              color="primary.main"
            />
          </Grid>
          <Grid size={12}>
            <LatestCustomerTableCard title="Latest Customers" />
          </Grid>
        </Grid>
      </Grid>
      <Grid size={{ xs: 12, lg: 4, md: 6 }}>
        <Grid container spacing={gridSpacing}>
          <Grid size={12}>
            <MainCard
              content={false}
              sx={{
                '& svg': {
                  width: 50,
                  height: 50,
                  color: 'secondary.main',
                  borderRadius: '14px',
                  p: 1.25,
                  bgcolor: theme.palette.mode === ThemeMode.DARK ? 'background.default' : 'primary.light'
                }
              }}
            >
              <Grid container spacing={0} sx={{ alignItems: 'center' }}>
                <Grid sx={blockSX} size={{ xs: 12, sm: 6 }}>
                  <Grid container spacing={1} sx={{ alignItems: 'center', justifyContent: { xs: 'space-between', sm: 'center' } }}>
                    <Grid>
                      <IconShare stroke={1.5} />
                    </Grid>
                    <Grid size={{ sm: 'grow' }}>
                      <Typography variant="h5" align="center">
                        1000
                      </Typography>
                      <Typography variant="subtitle2" align="center">
                        SHARES
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid sx={blockSX} size={{ xs: 12, sm: 6 }}>
                  <Grid container spacing={1} sx={{ alignItems: 'center', justifyContent: { xs: 'space-between', sm: 'center' } }}>
                    <Grid>
                      <IconAccessPoint stroke={1.5} />
                    </Grid>
                    <Grid size={{ sm: 'grow' }}>
                      <Typography variant="h5" align="center">
                        600
                      </Typography>
                      <Typography variant="subtitle2" align="center">
                        NETWORK
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
              <Grid container spacing={0} sx={{ alignItems: 'center' }}>
                <Grid sx={blockSX} size={{ xs: 12, sm: 6 }}>
                  <Grid container spacing={1} sx={{ alignItems: 'center', justifyContent: { xs: 'space-between', sm: 'center' } }}>
                    <Grid>
                      <IconCircles stroke={1.5} />
                    </Grid>
                    <Grid size={{ sm: 'grow' }}>
                      <Typography variant="h5" align="center">
                        3550
                      </Typography>
                      <Typography variant="subtitle2" align="center">
                        RETURNS
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid sx={blockSX} size={{ xs: 12, sm: 6 }}>
                  <Grid container spacing={1} sx={{ alignItems: 'center', justifyContent: { xs: 'space-between', sm: 'center' } }}>
                    <Grid>
                      <IconCreditCard stroke={1.5} />
                    </Grid>
                    <Grid size={{ sm: 'grow' }}>
                      <Typography variant="h5" align="center">
                        100%
                      </Typography>
                      <Typography variant="subtitle2" align="center">
                        ORDER
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </MainCard>
          </Grid>
          <Grid size={12}>
            <TotalRevenueCard title="Total Revenue" />
          </Grid>
          <Grid size={12}>
            <UserCountCard primary="Daily user" secondary="1,658" iconPrimary={AccountCircleTwoTone} color="secondary.main" />
          </Grid>
          <Grid size={12}>
            <UserCountCard primary="Daily page view" secondary="1K" iconPrimary={DescriptionTwoToneIcon} color="primary.main" />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}
