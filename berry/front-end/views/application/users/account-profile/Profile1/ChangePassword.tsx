// material-ui
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';

// project imports
import SubCard from 'ui-component/cards/SubCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import { gridSpacing } from 'store/constant';

// ==============================|| PROFILE 1 - CHANGE PASSWORD ||============================== //

export default function ChangePassword() {
  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <Alert severity="warning" variant="outlined" sx={{ borderColor: 'warning.dark' }}>
          <AlertTitle>Alert!</AlertTitle>
          Your Password will expire in every 3 months. So change it periodically.
          <strong> Do not share your password</strong>
        </Alert>
      </Grid>
      <Grid size={12}>
        <SubCard title="Change Password">
          <form noValidate autoComplete="off">
            <Grid container spacing={gridSpacing} sx={{ mb: 1.75 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField type="password" id="outlined-basic7" fullWidth label="Current Password" />
              </Grid>
            </Grid>
            <Grid container spacing={gridSpacing} sx={{ mb: 1.75 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField type="password" id="outlined-basic8" fullWidth label="New Password" />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField type="password" id="outlined-basic9" fullWidth label="Confirm Password" />
              </Grid>
            </Grid>
          </form>
          <Grid spacing={2} container sx={{ justifyContent: 'flex-end', mt: 3 }}>
            <Grid>
              <AnimateButton>
                <Button variant="contained">Change Password</Button>
              </AnimateButton>
            </Grid>
            <Grid>
              <Button sx={{ color: 'error.main' }}>Clear</Button>
            </Grid>
          </Grid>
        </SubCard>
      </Grid>
    </Grid>
  );
}
