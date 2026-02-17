// material-ui
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';

// ===========================|| WIDGET STATISTICS - PROJECT TASK CARD ||=========================== //

export default function ProjectTaskCard() {
  return (
    <MainCard>
      <Grid container spacing={gridSpacing} sx={{ alignItems: 'center' }}>
        <Grid size={{ xs: 12, lg: 3, sm: 6 }}>
          <Grid container spacing={1}>
            <Grid size={12}>
              <Typography variant="subtitle2">Published Project</Typography>
            </Grid>
            <Grid size={12}>
              <Typography variant="h3">532</Typography>
            </Grid>
            <Grid size={12}>
              <LinearProgress variant="determinate" value={40} color="secondary" aria-label="project progress" />
            </Grid>
          </Grid>
        </Grid>
        <Grid size={{ xs: 12, lg: 3, sm: 6 }}>
          <Grid container spacing={1}>
            <Grid size={12}>
              <Typography variant="subtitle2">Completed Task</Typography>
            </Grid>
            <Grid size={12}>
              <Typography variant="h3">4,569</Typography>
            </Grid>
            <Grid size={12}>
              {/** had wrong colour, colour is an enum not string */}
              <LinearProgress
                variant="determinate"
                value={70}
                sx={{ bgcolor: 'success.light', '& .MuiLinearProgress-bar': { bgcolor: 'success.dark' } }}
                aria-label="completed task progress"
              />
            </Grid>
          </Grid>
        </Grid>
        <Grid size={{ xs: 12, lg: 3, sm: 6 }}>
          <Grid container spacing={1}>
            <Grid size={12}>
              <Typography variant="subtitle2">Pending Task</Typography>
            </Grid>
            <Grid size={12}>
              <Typography variant="h3">1,005</Typography>
            </Grid>
            <Grid size={12}>
              {/** had wrong colour, colour is an enum not string */}
              <LinearProgress
                variant="determinate"
                value={30}
                sx={{ bgcolor: 'orange.light', '& .MuiLinearProgress-bar': { bgcolor: 'orange.main' } }}
                aria-label="pending task progress"
              />
            </Grid>
          </Grid>
        </Grid>
        <Grid size={{ xs: 12, lg: 3, sm: 6 }}>
          <Grid container spacing={1}>
            <Grid size={12}>
              <Typography variant="subtitle2">Issues</Typography>
            </Grid>
            <Grid size={12}>
              <Typography variant="h3">365</Typography>
            </Grid>
            <Grid size={12}>
              <LinearProgress
                variant="determinate"
                value={10}
                sx={{ bgcolor: 'error.light', '& .MuiLinearProgress-bar': { bgcolor: 'error.main' } }}
                aria-label="issues progress"
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </MainCard>
  );
}
