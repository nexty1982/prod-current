// material-ui
import { useTheme } from '@mui/material/styles';
import CardMedia from '@mui/material/CardMedia';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import { ThemeMode } from 'config';
import { gridSpacing } from 'store/constant';

// assets
import imageEmpty from 'assets/images/e-commerce/empty.svg';
import imageDarkEmpty from 'assets/images/e-commerce/empty-dark.svg';

// ==============================|| NO/EMPTY Product ||============================== //

export default function ProductEmpty() {
  const theme = useTheme();

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <Box sx={{ maxWidth: 720, m: '0 auto', textAlign: 'center' }}>
          <Grid container spacing={gridSpacing} sx={{ justifyContent: 'center' }}>
            <Grid size={12}>
              <CardMedia
                component="img"
                image={theme.palette.mode === ThemeMode.DARK ? imageDarkEmpty : imageEmpty}
                title="Slider5 image"
              />
            </Grid>
            <Grid size={12}>
              <Grid container spacing={gridSpacing}>
                <Grid size={12}>
                  <Typography variant="h1" color="inherit">
                    There is no Product
                  </Typography>
                </Grid>
                <Grid size={12}>
                  <Typography variant="body2">Try checking your spelling or use more general terms</Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Box>
      </Grid>
    </Grid>
  );
}
