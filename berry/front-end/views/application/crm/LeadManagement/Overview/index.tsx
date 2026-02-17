import { useEffect, useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';

// project imports
import LeadCards from './LeadCards';
import LeadSource from './LeadSource';
import LeadSummary from './LeadSummary';
import SalesPerformance from './SalesPerformance';
import UpcomingTask from './UpcomingTask';

import { gridSpacing } from 'store/constant';

// ==============================|| LEAD OVERVIEW ||============================== //

export default function Overview() {
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <LeadSummary isLoading={isLoading} />
      </Grid>
      <Grid size={12}>
        <LeadCards isLoading={isLoading} />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Stack spacing={gridSpacing}>
          <LeadSource />
          <UpcomingTask />
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        <SalesPerformance isLoading={isLoading} />
      </Grid>
    </Grid>
  );
}
