// material-ui
import Grid from '@mui/material/Grid';

// project imports
import Virtualization from './Virtualization';
import { gridSpacing } from 'store/constant';

// ==============================|| COLUMN VIRTUALIZATION DATA GRID ||============================== //

export default function ColumnVirtualization() {
  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <Virtualization />
      </Grid>
    </Grid>
  );
}
