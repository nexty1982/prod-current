import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ErrorTwoToneIcon from '@mui/icons-material/ErrorTwoTone';

const gridSpacing = 3;

export default function ProfileTab() {
  return (
    <Grid container spacing={gridSpacing}>
      {/* Profile Picture Section */}
      <Grid size={12}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Profile Picture
            </Typography>
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid>
                <Avatar
                  sx={{ width: 80, height: 80, bgcolor: 'primary.main' }}
                >
                  JD
                </Avatar>
              </Grid>
              <Grid size={{ sm: 'grow' }}>
                <Stack spacing={0.5}>
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    <label htmlFor="profile-upload">
                      <input
                        accept="image/*"
                        style={{ display: 'none' }}
                        id="profile-upload"
                        type="file"
                      />
                      <Button variant="contained" component="span" size="small">
                        Upload Avatar
                      </Button>
                    </label>
                  </Stack>
                  <Typography variant="caption">
                    <ErrorTwoToneIcon
                      sx={{ height: 16, width: 16, mr: 1, verticalAlign: 'text-bottom' }}
                    />
                    Image size limit should be 125kb max.
                  </Typography>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Edit Account Details */}
      <Grid size={12}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Edit Account Details
            </Typography>
            <Grid container spacing={gridSpacing}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Name" defaultValue="John Doe" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Email" defaultValue="john.doe@example.com" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Company" defaultValue="Orthodox Metrics" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Country" defaultValue="United States" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Phone Number" defaultValue="+1 (555) 000-0000" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Birthday" defaultValue="January 1, 1990" />
              </Grid>
              <Grid size={12}>
                <Stack direction="row" spacing={2}>
                  <Button variant="contained">Save Changes</Button>
                  <Button variant="outlined">Cancel</Button>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
