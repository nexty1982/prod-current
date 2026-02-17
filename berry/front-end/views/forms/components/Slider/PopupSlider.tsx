// material-ui
import Grid from '@mui/material/Grid';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';

// set temperature
function valueText(value: number) {
  return `${value}°C`;
}

// ==============================|| POPUP SLIDER ||============================== //

export default function PopupSlider() {
  return (
    <Grid container spacing={2} sx={{ alignItems: 'center', mt: 2.5 }} size={12}>
      <Grid>
        <Typography variant="h6" color="primary">
          15K
        </Typography>
      </Grid>
      <Grid size="grow">
        <Slider defaultValue={40} getAriaValueText={valueText} valueLabelDisplay="on" min={15} max={60} />
      </Grid>
      <Grid>
        <Typography variant="h6" color="primary">
          60K
        </Typography>
      </Grid>
    </Grid>
  );
}
