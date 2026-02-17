import { useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

// ==============================|| VIEWS DATETIME ||============================== //

export default function ViewsDateTimePicker() {
  const [value1, setValue1] = useState<Date | null>(new Date());
  const [value2, setValue2] = useState<Date | null>(new Date());
  const [value3, setValue3] = useState<Date | null>(new Date());

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Grid container spacing={3}>
        <Grid size={12}>
          <DateTimePicker
            label='"year", "month", "day", "hours", "minutes", and "seconds"'
            slotProps={{ textField: { fullWidth: true } }}
            views={['year', 'month', 'day', 'hours', 'minutes', 'seconds']}
            value={value1}
            onChange={(newValue) => setValue1(newValue as Date | null)}
          />
        </Grid>
        <Grid size={12}>
          <DateTimePicker
            label='"day", "hours"'
            views={['day', 'hours']}
            slotProps={{ textField: { fullWidth: true } }}
            value={value2}
            onChange={(newValue) => setValue2(newValue as Date | null)}
          />
        </Grid>
        <Grid size={12}>
          <DateTimePicker
            views={['year', 'day', 'hours', 'minutes', 'seconds']}
            label='"year", "day", "hours", "minutes", "seconds"'
            slotProps={{ textField: { fullWidth: true } }}
            value={value3}
            onChange={(newValue) => setValue3(newValue as Date | null)}
          />
        </Grid>
      </Grid>
    </LocalizationProvider>
  );
}
