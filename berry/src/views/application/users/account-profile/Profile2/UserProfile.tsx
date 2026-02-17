// material-ui
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// project imports
import Avatar from 'ui-component/extended/Avatar';
import { gridSpacing } from 'store/constant';

// assets
import Avatar1 from 'assets/images/users/avatar-1.png';
import ErrorTwoToneIcon from '@mui/icons-material/ErrorTwoTone';

// ==============================|| PROFILE 2 - USER PROFILE ||============================== //

export default function UserProfile() {
  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid>
            <Avatar alt="User 1" src={Avatar1} sx={{ height: 80, width: 80 }} />
          </Grid>
          <Grid size={{ sm: 'grow' }}>
            <Grid container spacing={1}>
              <Grid size={12}>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  <input accept="image/*" style={{ display: 'none' }} id="contained-button-file" multiple type="file" />
                </Stack>
              </Grid>
              <Grid size={12}>
                <Typography variant="caption">
                  <ErrorTwoToneIcon sx={{ height: 16, width: 16, mr: 1, verticalAlign: 'text-bottom' }} />
                  Image size Limit should be 125kb Max.
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Last Name" defaultValue="Schorl" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="First Name" defaultValue="Delaney" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Email Address" defaultValue="demo@company.com" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Phone Number" defaultValue="000-00-00000" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Company Name" defaultValue="company.ltd" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Site Information" defaultValue="www.company.com" />
      </Grid>
    </Grid>
  );
}
