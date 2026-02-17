import React, { useState } from 'react';
import {
  Checkbox,
  FormControlLabel,
  Grid,
  MenuItem,
  TextField,
} from '@mui/material';

const gridSpacing = 3;

const cities = [
  { value: '1', label: 'Los Angeles' },
  { value: '2', label: 'Chicago' },
  { value: '3', label: 'Phoenix' },
  { value: '4', label: 'San Antonio' },
];

const countries = [
  { value: '1', label: 'India' },
  { value: '2', label: 'France' },
  { value: '3', label: 'USA' },
  { value: '4', label: 'UAE' },
];

export default function BillingTab() {
  const [city, setCity] = useState('1');
  const [country, setCountry] = useState('1');
  const [sameAddress, setSameAddress] = useState(true);

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Block No#" defaultValue="16657" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Apartment Name" defaultValue="Dardan Ranch" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Street Line 1" defaultValue="Nathaniel Ports" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Street Line 2" defaultValue="nr. Oran Walks" />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField fullWidth label="Postcode" defaultValue="395005" />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField
          select
          label="Select City"
          value={city}
          fullWidth
          onChange={(e) => setCity(e.target.value)}
        >
          {cities.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField
          select
          label="Select Country"
          value={country}
          fullWidth
          onChange={(e) => setCountry(e.target.value)}
        >
          {countries.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid size={12}>
        <FormControlLabel
          control={
            <Checkbox
              checked={sameAddress}
              onChange={(e) => setSameAddress(e.target.checked)}
              color="primary"
            />
          }
          label="Same as billing address"
        />
      </Grid>
    </Grid>
  );
}
