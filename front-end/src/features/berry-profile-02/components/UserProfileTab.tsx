import React from 'react';
import {
  Avatar,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ErrorTwoToneIcon from '@mui/icons-material/ErrorTwoTone';

const gridSpacing = 3;

export default function UserProfileTab() {
  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid>
            <Avatar sx={{ height: 80, width: 80, bgcolor: 'primary.main' }}>
              DS
            </Avatar>
          </Grid>
          <Grid size={{ sm: 'grow' }}>
            <Grid container spacing={1}>
              <Grid size={12}>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  <label htmlFor="upload-avatar">
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="upload-avatar"
                      type="file"
                    />
                  </label>
                </Stack>
              </Grid>
              <Grid size={12}>
                <Typography variant="caption">
                  <ErrorTwoToneIcon
                    sx={{ height: 16, width: 16, mr: 1, verticalAlign: 'text-bottom' }}
                  />
                  Image size limit should be 125kb max.
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
