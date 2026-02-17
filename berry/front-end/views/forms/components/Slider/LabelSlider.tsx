import React from 'react';
import Grid from '@mui/material/Grid';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';

// ==============================|| LABEL SLIDER ||============================== //

export default function LabelSlider() {
  const [value, setValue] = React.useState<number | number[]>(50);
  const handleChange = (even: Event, newValue: number | number[]) => {
    setValue(newValue);
  };

  const [valueSecondary, setValueSecondary] = React.useState<number | number[]>(78);
  const handleChangeSecondary = (event: Event, newValue: number | number[]) => {
    setValueSecondary(newValue);
  };

  return (
    <Grid container direction="column">
      <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }} size={12}>
        <Grid>
          <Typography variant="caption">Progress</Typography>
        </Grid>
        <Grid size="grow">
          <Slider value={value} onChange={handleChange} aria-labelledby="continuous-slider" />
        </Grid>
        <Grid>
          <Typography variant="h6">{value}%</Typography>
        </Grid>
      </Grid>
      <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }} size={12}>
        <Grid>
          <Typography variant="caption">Progress</Typography>
        </Grid>
        <Grid size="grow">
          <Slider value={valueSecondary} color="secondary" onChange={handleChangeSecondary} aria-labelledby="continuous-slider" />
        </Grid>
        <Grid>
          <Typography variant="h6">{valueSecondary}%</Typography>
        </Grid>
      </Grid>
    </Grid>
  );
}
