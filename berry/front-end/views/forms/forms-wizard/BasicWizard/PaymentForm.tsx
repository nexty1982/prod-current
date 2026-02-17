// material-ui
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// ==============================|| FORM WIZARD - BASIC ||============================== //

export default function PaymentForm() {
  return (
    <>
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        Payment method
      </Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField required id="cardName" label="Name on card" fullWidth autoComplete="cc-name" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField required id="cardNumber" label="Card number" fullWidth autoComplete="cc-number" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField required id="expDate" label="Expiry date" fullWidth autoComplete="cc-exp" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField required id="cvv" label="CVV" helperText="Last three digits on signature strip" fullWidth autoComplete="cc-csc" />
        </Grid>
        <Grid size={12}>
          <FormControlLabel
            control={<Checkbox color="secondary" name="saveCard" value="yes" />}
            label="Remember credit card details for next time"
          />
        </Grid>
      </Grid>
    </>
  );
}
