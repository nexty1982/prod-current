// material-ui
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';

// ==============================|| LEAD - UPCOMING TASK ||============================== //

export default function UpcomingTask() {
  return (
    <MainCard content={false}>
      <Box sx={{ px: 2.5, py: 2 }}>
        <Grid container spacing={gridSpacing}>
          <Grid sx={{ alignItems: 'center', justifyContent: 'space-between' }} size={12}>
            <Typography variant="h4">Upcoming Task & Follow-ups</Typography>
          </Grid>
          <Grid size={12}>
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography variant="h3">200</Typography>
              <Chip label="Follow-up" color="primary" />
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </MainCard>
  );
}
