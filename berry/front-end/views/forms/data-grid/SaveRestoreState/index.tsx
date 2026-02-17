// material-ui
import Grid from '@mui/material/Grid';

// project imports
import InitialState from './InitialState';
import UseGridSelector from './UseGridSelector';
import { gridSpacing } from 'store/constant';

// ==============================|| SAVE & RESTORE STATE DATA GRID ||============================== //

export default function SaveRestoreState() {
  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <InitialState />
      </Grid>
      <Grid size={12}>
        <UseGridSelector />
      </Grid>
    </Grid>
  );
}
