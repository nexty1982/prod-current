import * as React from 'react';

// material-ui
import Grid from '@mui/material/Grid';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';

// project imports
import Item from './GridItem';

// ===============================|| GRID - SPACING ||=============================== //

export default function SpacingGrid() {
  const [spacing, setSpacing] = React.useState<number>(2);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSpacing(Number(event.target?.value));
  };

  return (
    <Grid sx={{ flexGrow: 1 }} container spacing={2}>
      <Grid size={12}>
        <Grid container spacing={spacing} sx={{ justifyContent: 'center' }}>
          {[0, 1, 2].map((value) => (
            <Grid key={value} size={2} sx={{ minWidth: 25 }}>
              <Item>{value}</Item>
            </Grid>
          ))}
        </Grid>
      </Grid>
      <Grid size={12}>
        <Paper sx={{ p: 2 }}>
          <Grid container>
            <Grid>
              <FormControl component="fieldset">
                <FormLabel component="legend">spacing</FormLabel>
                <RadioGroup name="spacing" aria-label="spacing" value={spacing.toString()} onChange={handleChange} row>
                  {[0, 0.5, 1, 2, 3, 4, 8, 12].map((value) => (
                    <FormControlLabel key={value} value={value.toString()} control={<Radio />} label={value.toString()} />
                  ))}
                </RadioGroup>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );
}
