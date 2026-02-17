// material-ui
import Grid from '@mui/material/Grid';

// project imports
import LoginForms from './LoginForms';
import InstantFeedback from './InstantFeedback';
import RadioGroupForms from './RadioGroupForms';
import CheckboxForms from './CheckboxForms';
import SelectForms from './SelectForms';
import AutocompleteForms from './AutocompleteForms';
import { gridSpacing } from 'store/constant';

// ==============================|| FORMS VALIDATION - FORMIK ||============================== //

export default function FormsValidation() {
  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={{ xs: 12, md: 6 }}>
        <LoginForms />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <InstantFeedback />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <RadioGroupForms />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <CheckboxForms />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <SelectForms />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <AutocompleteForms />
      </Grid>
    </Grid>
  );
}
