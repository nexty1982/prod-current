// material-ui
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

// project imports
import AnimateButton from 'ui-component/extended/AnimateButton';
import { gridSpacing } from 'store/constant';

// ==============================|| PROFILE 2 - CHANGE PASSWORD ||============================== //

export default function ChangePassword() {
  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField type="password" fullWidth label="Current Password" defaultValue="Selfing Listel" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }} />
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField type="password" fullWidth label="New Password" defaultValue=" 30529399" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField type="password" fullWidth label="Confirm Password" defaultValue="395005" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Stack direction="row">
          <AnimateButton>
            <Button variant="outlined" size="large">
              Change Password
            </Button>
          </AnimateButton>
        </Stack>
      </Grid>
    </Grid>
  );
}
