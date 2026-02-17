import React from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';

// project imports
import { ThemeMode } from 'config';

// ================================|| UI LIST - RADIO ||================================ //

export default function RadioList() {
  const theme = useTheme();
  const [sdm, setSdm] = React.useState(true);
  const [notification, setNotification] = React.useState(false);

  return (
    <Card sx={{ bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.800' : 'primary.light', mb: 2, mt: 2 }}>
      <CardContent>
        <Grid container spacing={3} direction="column">
          <Grid>
            <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Grid>
                <Typography variant="subtitle1">Start DND Mode</Typography>
              </Grid>
              <Grid>
                <Switch size="small" color="primary" checked={sdm} onChange={(e) => setSdm(e.target.checked)} name="sdm" />
              </Grid>
            </Grid>
          </Grid>
          <Grid>
            <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Grid>
                <Typography variant="subtitle1">Allow Notifications</Typography>
              </Grid>
              <Grid>
                <Switch size="small" checked={notification} onChange={(e) => setNotification(e.target.checked)} name="sdm" />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
