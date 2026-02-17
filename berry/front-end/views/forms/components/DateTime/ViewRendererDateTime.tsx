import { useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
import Box from '@mui/material/Box';

// ==============================|| VIEW RENDERER DATETIME ||============================== //

export default function ViewRendererDateTime() {
  const [timeClockValue, setTimeClockValue] = useState<Date | null>(new Date());
  const [rendererValue, setrendererValue] = useState<Date | null>(new Date());

  return (
    <Box
      sx={{
        '&.MuiTypography-root-MuiClock-meridiemText': {
          color: 'inherit'
        }
      }}
    >
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Grid container spacing={3}>
          <Grid size={12}>
            <DateTimePicker
              label="With Time Clock"
              slotProps={{ textField: { fullWidth: true } }}
              value={timeClockValue}
              onChange={(newValue) => setTimeClockValue(newValue as Date | null)}
              viewRenderers={{
                hours: renderTimeViewClock,
                minutes: renderTimeViewClock,
                seconds: renderTimeViewClock
              }}
            />
          </Grid>
          <Grid size={12}>
            <DateTimePicker
              label="Without View Renderers"
              slotProps={{ textField: { fullWidth: true } }}
              value={rendererValue}
              onChange={(newValue) => setrendererValue(newValue as Date | null)}
              viewRenderers={{
                hours: null,
                minutes: null,
                seconds: null
              }}
            />
          </Grid>
        </Grid>
      </LocalizationProvider>
    </Box>
  );
}
