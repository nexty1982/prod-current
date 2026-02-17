// material-ui
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import CardMedia from '@mui/material/CardMedia';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// project imports
import { ThemeMode } from 'config';
import { gridSpacing } from 'store/constant';

// assets
import imageEmpty from 'assets/images/e-commerce/empty.svg';
import imageDarkEmpty from 'assets/images/e-commerce/empty-dark.svg';

// ==============================|| CHECKOUT CART - NO/EMPTY CART ITEMS ||============================== //

export default function CartEmpty() {
  const theme = useTheme();
  const downLG = useMediaQuery(theme.breakpoints.down('lg'));

  return (
    <Grid container spacing={gridSpacing} sx={{ justifyContent: 'center', my: 3 }}>
      <Grid size={{ xs: 12, sm: 8, md: 6 }}>
        <CardMedia component="img" image={theme.palette.mode === ThemeMode.DARK ? imageDarkEmpty : imageEmpty} title="Slider5 image" />
      </Grid>
      <Grid size={{ xs: 12, sm: 8 }}>
        <Grid container direction="column" spacing={1} sx={{ alignItems: 'center' }}>
          <Grid>
            <Typography variant={downLG ? 'h3' : 'h1'} color="inherit">
              Cart is Empty
            </Typography>
          </Grid>
          <Grid>
            <Typography variant="body2" align="center">
              Look like you have no items in your shopping cart.
            </Typography>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}
