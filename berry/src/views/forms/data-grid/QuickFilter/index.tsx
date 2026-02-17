// material-ui
import Grid from '@mui/material/Grid';

// project imports
import Initialize from './Initialize';
import CustomFilter from './CustomFilter';
import ParsingValues from './ParsingValues';
import ExcludeHiddenColumns from './ExcludeHiddenColumns';

import { gridSpacing } from 'store/constant';

// ==============================|| QUICK FILTER DATA GRID ||============================== //

export default function QuickFilter() {
  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <Initialize />
      </Grid>
      <Grid size={12}>
        <ExcludeHiddenColumns />
      </Grid>
      <Grid size={12}>
        <CustomFilter />
      </Grid>
      <Grid size={12}>
        <ParsingValues />
      </Grid>
    </Grid>
  );
}
