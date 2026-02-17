// material-ui
import Grid from '@mui/material/Grid';

// project imports
import BasicWizard from './BasicWizard';
import ValidationWizard from './ValidationWizard';
import { gridSpacing } from 'store/constant';

// ==============================|| FORMS WIZARD ||============================== //

export default function FormsWizard() {
  return (
    <Grid container spacing={gridSpacing} sx={{ justifyContent: 'center' }}>
      <Grid size={{ xs: 12, md: 9, lg: 7 }}>
        <BasicWizard />
      </Grid>
      <Grid size={{ xs: 12, md: 9, lg: 7 }}>
        <ValidationWizard />
      </Grid>
    </Grid>
  );
}
