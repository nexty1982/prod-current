// material-ui
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';

// ==============================|| FORM WIZARD - BASIC ||============================== //

export default function AddressForm() {
  return (
    <>
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        Shipping address
      </Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField required id="firstNameBasic" name="firstName" label="First name" fullWidth autoComplete="given-name" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField required id="lastNameBasic" name="lastName" label="Last name" fullWidth autoComplete="family-name" />
        </Grid>
        <Grid size={12}>
          <TextField required id="address1Basic" name="address1" label="Address line 1" fullWidth autoComplete="shipping address-line1" />
        </Grid>
        <Grid size={12}>
          <TextField id="address2Basic" name="address2" label="Address line 2" fullWidth autoComplete="shipping address-line2" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField required id="cityBasic" name="city" label="City" fullWidth autoComplete="shipping address-level2" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField id="stateBasic" name="state" label="State/Province/Region" fullWidth />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField required id="zipBasic" name="zip" label="Zip / Postal code" fullWidth autoComplete="shipping postal-code" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField required id="countryBasic" name="country" label="Country" fullWidth autoComplete="shipping country" />
        </Grid>
        <Grid size={12}>
          <FormControlLabel
            control={<Checkbox color="secondary" name="saveAddress" value="yes" />}
            label="Use this address for payment details"
          />
        </Grid>
      </Grid>
    </>
  );
}
