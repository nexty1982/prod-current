// material-ui
import { useTheme } from '@mui/material/styles';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// project imports
import { ThemeMode } from 'config';
import SubCard from 'ui-component/cards/SubCard';

// types
import { InvoiceAmount } from 'types/invoice';

// ==============================|| INVOICE EDIT - AMOUNT CARD ||============================== //

export default function AmountCard({ allAmounts }: { allAmounts: InvoiceAmount }) {
  const theme = useTheme();

  return (
    <SubCard sx={{ bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'primary.light' }}>
      <Grid container spacing={2} sx={{ justifyContent: 'flex-end' }}>
        <Grid size={{ sm: 6, md: 4 }}>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Grid container spacing={1}>
                <Grid size={6}>
                  <Typography variant="subtitle1" sx={{ textAlign: 'right' }}>
                    Sub Total :
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" sx={{ textAlign: 'right' }}>
                    ${Math.round(allAmounts.subTotal * 100) / 100}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="subtitle1" sx={{ textAlign: 'right' }}>
                    Tax (10%) :
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" sx={{ textAlign: 'right' }}>
                    ${Math.round(allAmounts.taxesAmount * 100) / 100}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="subtitle1" sx={{ textAlign: 'right' }}>
                    Discount (5%) :
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" sx={{ textAlign: 'right' }}>
                    ${Math.round(allAmounts.discountAmount * 100) / 100}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid size={12}>
              <Divider />
            </Grid>
            <Grid size={12}>
              <Grid container spacing={1}>
                <Grid size={6}>
                  <Typography color="primary" variant="subtitle1" sx={{ textAlign: 'right' }}>
                    Total :
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography color="primary" variant="subtitle1" sx={{ textAlign: 'right' }}>
                    ${Math.round(allAmounts.totalAmount * 100) / 100}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </SubCard>
  );
}
