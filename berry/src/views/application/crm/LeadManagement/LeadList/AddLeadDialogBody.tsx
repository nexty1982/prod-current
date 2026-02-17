import { useState } from 'react';

// material-ui
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

//  third party
import { Chance } from 'chance';

// types
import { Order } from 'types/customer';

const chance = new Chance();

// ==============================|| ADD LEAD BODY ||============================== //

export default function AddLeadDialogBody({ row }: { row?: Order }) {
  const [value, setValue] = useState<Date | null>(new Date());
  const [value2, setValue2] = useState<Date | null>(new Date());

  return (
    <CardContent sx={{ px: 2, py: 3 }}>
      <Grid container spacing={3}>
        <Grid size={6}>
          <Stack spacing={2}>
            <TextField fullWidth label="Id" placeholder="Enter id" defaultValue={row && `#${row.id}`} />
            <FormControl fullWidth>
              <InputLabel id="demo-simple-select-label">Lead manage</InputLabel>
              <Select labelId="demo-simple-select-label" id="demo-simple-select" value={1} label="Lead manage">
                <MenuItem value={1}>Message</MenuItem>
                <MenuItem value={2}>Mail</MenuItem>
                <MenuItem value={3}>Call</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="demo-simple-select-label2">Status</InputLabel>
              <Select labelId="demo-simple-select-label2" id="demo-simple-select" value={1} label="Status">
                <MenuItem value={1}>Connected</MenuItem>
                <MenuItem value={2}>Disconnected</MenuItem>
              </Select>
            </FormControl>
            <TextField fullWidth label="Phone no" defaultValue={row && chance.phone()} />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DesktopDatePicker label="From" value={value} onChange={(newValue) => setValue(newValue as Date | null)} />
            </LocalizationProvider>
            <FormControl fullWidth>
              <InputLabel id="demo-simple-select-label2">Country</InputLabel>
              <Select labelId="demo-simple-select-label2" id="demo-simple-select" value={1} label="Country">
                <MenuItem value={1}>India</MenuItem>
                <MenuItem value={2}>Bangladesh</MenuItem>
                <MenuItem value={2}>United Kingdom</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="demo-simple-select-label2">City</InputLabel>
              <Select labelId="demo-simple-select-label2" id="demo-simple-select" value={1} label="City">
                <MenuItem value={1}>Surat</MenuItem>
                <MenuItem value={2}>Delhi</MenuItem>
                <MenuItem value={2}>Mumbai</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Grid>
        <Grid size={6}>
          <Stack spacing={2}>
            <TextField fullWidth label="Name" placeholder="Enter Name" defaultValue={row && row.name.slice(0, -2)} />
            <FormControl fullWidth>
              <InputLabel id="demo-simple-select-label">Source</InputLabel>
              <Select labelId="demo-simple-select-label" id="demo-simple-select" value={1} label="Source">
                <MenuItem value={1}>Facebook</MenuItem>
                <MenuItem value={2}>Linkedin</MenuItem>
                <MenuItem value={3}>Call</MenuItem>
              </Select>
            </FormControl>
            <TextField fullWidth label="Company Name" defaultValue={row && chance.company()} />
            <FormControl fullWidth>
              <InputLabel id="demo-simple-select-label2">Next Follow up</InputLabel>
              <Select labelId="demo-simple-select-label2" id="demo-simple-select" value={1} label="Next Follow up">
                <MenuItem value={1}>Yes</MenuItem>
                <MenuItem value={2}>No</MenuItem>
              </Select>
            </FormControl>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DesktopDatePicker label="To" value={value2} onChange={(newValue) => setValue2(newValue as Date | null)} />
            </LocalizationProvider>
            <FormControl fullWidth>
              <InputLabel id="demo-simple-select-label2">State</InputLabel>
              <Select labelId="demo-simple-select-label2" id="demo-simple-select" value={1} label="State">
                <MenuItem value={1}>Gujarat</MenuItem>
                <MenuItem value={2}>Bihar</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Grid>
        <Grid size={12}>
          <TextField
            fullWidth
            id="outlined-multiline-flexible"
            label="Address"
            placeholder="type a message"
            multiline
            defaultValue={row && chance.address()}
            rows={3}
          />
        </Grid>
      </Grid>
    </CardContent>
  );
}
