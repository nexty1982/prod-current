// material-ui
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';

// project imports
import { gridSpacing } from 'store/constant';

// ==============================|| PERSONAL INFORMATION ||============================== //

export default function PersonalInformation() {
  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormControl fullWidth>
          <InputLabel id="demo-simple-select-label">Business Name</InputLabel>
          <Select labelId="demo-simple-select-label" id="demo-simple-select" label="Business Name" value={1}>
            <MenuItem value={1}>Select One</MenuItem>
            <MenuItem value={2}>Select Two</MenuItem>
            <MenuItem value={3}>Select Three</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormControl fullWidth>
          <InputLabel id="demo-simple-select-label">Industry</InputLabel>
          <Select labelId="demo-simple-select-label" id="demo-simple-select" label="Industry" value={1}>
            <MenuItem value={1}>company.com</MenuItem>
            <MenuItem value={2}>company.com</MenuItem>
            <MenuItem value={3}>company.com</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Phone no." defaultValue="000-00-00000" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Email ID" defaultValue="demo@company.com" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Website" defaultValue="company.ltd" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormControl fullWidth>
          <InputLabel id="demo-simple-select-label">Currency</InputLabel>
          <Select labelId="demo-simple-select-label" id="demo-simple-select" label="Currency" value={1}>
            <MenuItem value={1}>Indian(Rs)</MenuItem>
            <MenuItem value={2}>company.com</MenuItem>
            <MenuItem value={3}>company.com</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid size={12}>
        <FormControlLabel control={<Checkbox defaultChecked name="checkedA" color="primary" />} label="Same as billing address" />
      </Grid>
    </Grid>
  );
}
