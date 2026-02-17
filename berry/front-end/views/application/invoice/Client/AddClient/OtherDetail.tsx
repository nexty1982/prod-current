// material-ui
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';

// project imports
import { gridSpacing } from 'store/constant';

// ==============================|| OTHER DETAIL ||============================== //

export default function ChangePassword() {
  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="PAN" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="GSTIN" />
      </Grid>
      <Grid size={12}>
        <FormControlLabel control={<Checkbox defaultChecked name="checkedA" color="primary" />} label="Same as billing address" />
      </Grid>
    </Grid>
  );
}
