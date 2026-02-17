// material-ui
import Grid from '@mui/material/Grid';

// project imports
import { gridSpacing } from 'store/constant';
import BasicColumnGroup from './BasicColumnGroup';
import CustomColumnGroup from './CustomColumnGroup';

// ==============================|| COLUMN GROUPING DATA GRID ||============================== //

export default function ColumnGroups() {
  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <BasicColumnGroup />
      </Grid>
      <Grid size={12}>
        <CustomColumnGroup />
      </Grid>
    </Grid>
  );
}
