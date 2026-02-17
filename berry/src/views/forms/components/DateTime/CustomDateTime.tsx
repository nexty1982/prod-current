import * as React from 'react';

// material-ui
import InputAdornment from '@mui/material/InputAdornment';
import { LocalizationProvider, MobileDateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// assets
import DateRangeIcon from '@mui/icons-material/DateRange';

// ==============================|| CUSTOM DATETIME ||============================== //

export default function CustomDateTime() {
  const [value, setValue] = React.useState<Date | null>(new Date('2019-01-01T18:54'));

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <MobileDateTimePicker
        value={value}
        onChange={(newValue) => {
          setValue(newValue! as Date | null);
        }}
        label="Basic Datetime Picker"
        onError={console.log}
        minDate={new Date('2018-01-01T00:00')}
        format="yyyy/MM/dd hh:mm a"
        slotProps={{
          textField: {
            margin: 'normal',
            fullWidth: true,
            InputProps: {
              endAdornment: (
                <InputAdornment position="end" sx={{ cursor: 'pointer' }}>
                  <DateRangeIcon />
                </InputAdornment>
              )
            }
          }
        }}
      />
    </LocalizationProvider>
  );
}
