import { Link } from 'react-router-dom';

// material-ui
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Button from '@mui/material/Button';
import CardMedia from '@mui/material/CardMedia';
import Dialog from '@mui/material/Dialog';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Zoom, { ZoomProps } from '@mui/material/Zoom';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';

// third party
import { Chance } from 'chance';
import PerfectScrollbar from 'react-perfect-scrollbar';

// assets
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import completed from 'assets/images/e-commerce/completed.png';

const chance = new Chance();

function Transition(props: ZoomProps) {
  return <Zoom {...props} />;
}

// ==============================|| CHECKOUT CART - DISCOUNT COUPON CODE ||============================== //

export default function OrderComplete({ open }: { open: boolean }) {
  const downMD = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  return (
    <Dialog
      open={open}
      slots={{ transition: Transition }}
      keepMounted
      aria-labelledby="alert-dialog-slide-title"
      aria-describedby="alert-dialog-slide-description"
      maxWidth="md"
      sx={{
        '& .MuiDialog-paper': {
          p: 0
        }
      }}
    >
      {open && (
        <MainCard>
          <PerfectScrollbar style={{ overflowX: 'hidden', height: 'calc(100vh - 100px)' }}>
            <Grid container direction="column" spacing={gridSpacing} sx={{ alignItems: 'center', justifyContent: 'center' }}>
              <Grid size={12}>
                <Typography variant={downMD ? 'h2' : 'h1'} sx={{ textAlign: 'center', mt: 4 }}>
                  Thank you for order!
                </Typography>
              </Grid>
              <Grid size={12}>
                <Stack spacing={2} sx={{ alignItems: 'center' }}>
                  <Typography align="center" variant="h4" sx={{ fontWeight: 400, color: 'grey.500' }}>
                    We will send a process notification, before it delivered.
                  </Typography>
                  <Typography variant="body1" align="center">
                    Your order id:{' '}
                    <Typography variant="subtitle1" component="span" color="primary">
                      {chance.guid()}
                    </Typography>
                  </Typography>
                </Stack>
              </Grid>
              <Grid size={12}>
                <CardMedia component="img" src={completed} alt="Order Complete" sx={{ maxWidth: 780, Width: 1 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 9 }}>
                <Stack spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="caption" align="center">
                    If you have any query or questions regarding purchase items, then fell to get in contact us
                  </Typography>
                  <Typography variant="subtitle1" color="error" sx={{ cursor: 'pointer' }}>
                    {chance.phone()}
                  </Typography>
                </Stack>
              </Grid>
              <Grid size={12}>
                <Grid direction="row" container spacing={3} sx={{ alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                  <Grid>
                    <Button component={Link} to="/apps/e-commerce/products" variant="text" startIcon={<KeyboardBackspaceIcon />}>
                      Continue Shopping
                    </Button>
                  </Grid>
                  <Grid>
                    <Button component={Link} to="/apps/e-commerce/products" variant="contained" fullWidth>
                      Download Invoice
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </PerfectScrollbar>
        </MainCard>
      )}
    </Dialog>
  );
}
