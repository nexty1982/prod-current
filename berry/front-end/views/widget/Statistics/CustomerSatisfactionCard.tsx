// material-ui
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';

// ===========================|| WIDGET STATISTICS - CUSTOMER SATISFACTION ||=========================== //

export default function CustomerSatisfactionCard() {
  return (
    <MainCard title="Customer satisfaction">
      <Grid container spacing={3}>
        <Grid size={12}>
          <Typography variant="h3" align="center">
            89.73%
          </Typography>
        </Grid>
        <Grid size={12}>
          <LinearProgress variant="determinate" value={67} color="primary" aria-label="Customer satisfaction percentage" />
        </Grid>
        <Grid size={12}>
          <Grid container spacing={gridSpacing}>
            <Grid size={4}>
              <Grid container spacing={1}>
                <Grid size={12}>
                  <Typography variant="subtitle2">previous</Typography>
                </Grid>
                <Grid size={12}>
                  <Typography variant="h5">56.75</Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid size={4}>
              <Grid container spacing={1}>
                <Grid size={12}>
                  <Typography variant="subtitle2">Change</Typography>
                </Grid>
                <Grid size={12}>
                  <Typography variant="h5">+12.60</Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid size={4}>
              <Grid container spacing={1}>
                <Grid size={12}>
                  <Typography variant="subtitle2">Trend</Typography>
                </Grid>
                <Grid size={12}>
                  <Typography variant="h5">23.78</Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </MainCard>
  );
}
