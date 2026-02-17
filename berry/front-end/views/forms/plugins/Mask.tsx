import { useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { MobileDateTimePicker } from '@mui/x-date-pickers/MobileDateTimePicker';

import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

// third party
import { PatternFormat } from 'react-number-format';

// project imports
import SubCard from 'ui-component/cards/SubCard';
import MainCard from 'ui-component/cards/MainCard';
import SecondaryAction from 'ui-component/cards/CardSecondaryAction';
import { gridSpacing } from 'store/constant';

// assets
import LinkIcon from '@mui/icons-material/Link';

// ==============================|| PLUGIN - MASK INPUT ||============================== //

export default function MaskPage() {
  const [date1, setDate1] = useState<Date | null>(new Date());
  const [date2, setDate2] = useState<Date | null>(new Date());

  const [time, setTime] = useState<Date | null>(new Date());
  const [datetime, setDatetime] = useState<Date | null>(new Date());

  return (
    <MainCard
      title="Mask"
      secondary={
        <SecondaryAction icon={<LinkIcon sx={{ fontSize: 'small' }} />} link="https://www.npmjs.com/package/react-number-format" />
      }
    >
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Grid container spacing={gridSpacing}>
          <Grid size={{ xs: 12, md: 6 }}>
            <SubCard title="Date">
              <Grid container spacing={3} sx={{ alignItems: 'center' }}>
                <Grid size={12}>
                  <DatePicker
                    label="Insert Date 1"
                    value={date1}
                    onChange={(newValue) => setDate1(newValue as Date | null)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid size={12}>
                  <DatePicker
                    label="Insert Date 2"
                    value={date2}
                    onChange={(newValue) => setDate2(newValue as Date | null)}
                    slotProps={{ textField: { fullWidth: true } }}
                    format="mm-dd-yyyy"
                  />
                </Grid>
              </Grid>
            </SubCard>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <SubCard title="Time">
              <Grid container spacing={3} sx={{ alignItems: 'center' }}>
                <Grid size={12}>
                  <TimePicker
                    ampm={false}
                    openTo="hours"
                    views={['hours', 'minutes', 'seconds']}
                    format="HH:mm:ss"
                    label="Time"
                    value={time}
                    onChange={(newValue) => {
                      setTime(newValue as Date | null);
                    }}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid size={12}>
                  <MobileDateTimePicker
                    value={datetime}
                    onChange={(newValue) => {
                      setDatetime(newValue as Date | null);
                    }}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
              </Grid>
            </SubCard>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <SubCard title="Phone no.">
              <Grid container spacing={3} sx={{ alignItems: 'center' }}>
                <Grid size={12}>
                  <PatternFormat format="+1 (###) ###-####" mask="_" fullWidth customInput={TextField} label="Phone Number" />
                </Grid>
                <Grid size={12}>
                  <PatternFormat format="+91 #### ###-####" mask="_" fullWidth customInput={TextField} label="Contact Number" />
                </Grid>
                <Grid size={12}>
                  <PatternFormat format="(##) ####-#####" mask="_" fullWidth customInput={TextField} label="Tel. with Code Area" />
                </Grid>
                <Grid size={12}>
                  <PatternFormat format="(###) ### #####" mask="_" fullWidth customInput={TextField} label="US Telephone" />
                </Grid>
              </Grid>
            </SubCard>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <SubCard title="Network">
              <Grid container spacing={3} sx={{ alignItems: 'center' }}>
                <Grid size={12}>
                  <PatternFormat format="###.###.###.###" mask="_" fullWidth customInput={TextField} label="IP Address" />
                </Grid>
                <Grid size={12}>
                  <PatternFormat format="####.####.####.####" mask="_" fullWidth customInput={TextField} label="IPV4" />
                </Grid>
                <Grid size={12}>
                  <PatternFormat format="####:####:####:#:###:####:####:####" mask="_" fullWidth customInput={TextField} label="IPV6" />
                </Grid>
              </Grid>
            </SubCard>
          </Grid>
        </Grid>
      </LocalizationProvider>
    </MainCard>
  );
}
