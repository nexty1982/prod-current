// material-ui
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// assets
import WbSunnyTwoToneIcon from '@mui/icons-material/WbSunnyTwoTone';

// ===========================|| WIDGET STATISTICS - WEATHER CARD ||=========================== //

export default function WeatherCard() {
  return (
    <Card>
      <CardContent
        sx={{
          padding: '0px !important',
          '& svg': {
            width: 40,
            height: 40
          }
        }}
      >
        <Grid container spacing={0} sx={{ alignItems: 'center' }}>
          <Grid sx={{ p: 3 }} size={6}>
            <Typography variant="h2" align="center">
              19<sup>°</sup>
            </Typography>
            <Typography variant="subtitle2" align="center">
              Sunny
            </Typography>
          </Grid>
          <Grid sx={{ bgcolor: 'primary.dark', p: 3 }} size={6}>
            <Typography variant="subtitle2" align="center">
              <WbSunnyTwoToneIcon sx={{ color: '#fff' }} />
            </Typography>
            <Typography variant="subtitle2" align="center" sx={{ color: '#fff' }}>
              New York , NY
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
