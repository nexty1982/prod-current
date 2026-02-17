import React from 'react';
import {
  Button,
  Grid,
  Stack,
  TextField,
} from '@mui/material';

const gridSpacing = 3;

export default function SecurityTab() {
  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField type="password" fullWidth label="Current Password" defaultValue="currentpass" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }} />
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField type="password" fullWidth label="New Password" defaultValue="newpassword" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField type="password" fullWidth label="Confirm Password" defaultValue="newpassword" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Stack direction="row">
          <Button variant="outlined" size="large">
            Change Password
          </Button>
        </Stack>
      </Grid>
    </Grid>
  );
}
