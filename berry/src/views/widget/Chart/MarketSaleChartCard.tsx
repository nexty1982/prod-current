// material-ui
import { alpha, useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// third party
import Chart, { Props as ChartProps } from 'react-apexcharts';

// project imports
import { ThemeMode } from 'config';
import MainCard from 'ui-component/cards/MainCard';

// assets
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { IconBrandFacebook, IconBrandYoutube, IconBrandTwitter } from '@tabler/icons-react';

// ===========================|| MARKET SHARE CHART CARD ||=========================== //

export default function MarketChartCard({ chartData }: { chartData: ChartProps }) {
  const theme = useTheme();

  return (
    <MainCard content={false}>
      <Box sx={{ p: 3 }}>
        <Grid container direction="column" spacing={3}>
          <Grid container spacing={1} sx={{ alignItems: 'center' }}>
            <Grid>
              <Typography variant="h3">Market Share</Typography>
            </Grid>
            <Grid size="grow" />
            <Grid>
              <TrendingDownIcon color="error" sx={{ mb: -0.5 }} />
            </Grid>
            <Grid>
              <Typography variant="h3">27, 695.65</Typography>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Typography sx={{ mt: -2.5, fontWeight: 400 }} color="inherit" variant="h5">
              Department wise monthly sales report
            </Typography>
          </Grid>
          <Grid container spacing={3} sx={{ justifyContent: 'space-around', alignItems: 'center' }}>
            <Grid>
              <Grid container spacing={1} sx={{ alignItems: 'center' }}>
                <Grid>
                  <Typography
                    sx={{
                      width: 40,
                      height: 40,
                      color: 'secondary.main',
                      borderRadius: '12px',
                      padding: 1,
                      bgcolor: theme.palette.mode === ThemeMode.DARK ? 'background.default' : 'secondary.light'
                    }}
                  >
                    <IconBrandFacebook stroke={1.5} />
                  </Typography>
                </Grid>
                <Grid size={{ sm: 'grow' }}>
                  <Typography variant="h4">+ 45.36%</Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid>
              <Grid container spacing={1} sx={{ alignItems: 'center' }}>
                <Grid>
                  <Typography
                    sx={{
                      width: 40,
                      height: 40,
                      color: 'primary.main',
                      borderRadius: '12px',
                      padding: 1,
                      bgcolor: theme.palette.mode === ThemeMode.DARK ? 'background.default' : 'primary.light'
                    }}
                  >
                    <IconBrandTwitter stroke={1.5} />
                  </Typography>
                </Grid>
                <Grid size={{ sm: 'grow' }}>
                  <Typography variant="h4">- 50.69%</Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid>
              <Grid container spacing={1} sx={{ alignItems: 'center' }}>
                <Grid>
                  <Typography
                    sx={{
                      width: 40,
                      height: 40,
                      color: 'error.main',
                      borderRadius: '12px',
                      padding: 1,
                      bgcolor: theme.palette.mode === ThemeMode.DARK ? 'background.default' : alpha(theme.palette.error.light, 0.25)
                    }}
                  >
                    <IconBrandYoutube stroke={2} />
                  </Typography>
                </Grid>
                <Grid size={{ sm: 'grow' }}>
                  <Typography variant="h4">+ 16.85%</Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid size="grow" />
          </Grid>
        </Grid>
      </Box>
      <Chart {...chartData} />
    </MainCard>
  );
}
