import React, { useState } from 'react';
import {
  Button,
  FormControlLabel,
  Grid,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LockTwoToneIcon from '@mui/icons-material/LockTwoTone';
import CreditCardTwoToneIcon from '@mui/icons-material/CreditCardTwoTone';

const gridSpacing = 3;

export default function PaymentTab() {
  const [paymentMethod, setPaymentMethod] = useState('visa');
  const [cvv, setCvv] = useState('123');

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <RadioGroup
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <Grid container spacing={0}>
            <Grid>
              <FormControlLabel
                value="visa"
                control={<Radio />}
                label="Visa Credit/Debit Card"
              />
            </Grid>
            <Grid>
              <FormControlLabel
                value="paypal"
                control={<Radio />}
                label="PayPal"
              />
            </Grid>
          </Grid>
        </RadioGroup>
      </Grid>

      {paymentMethod === 'visa' && (
        <Grid size={12}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Name on Card" defaultValue="Selena Litten" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Card Number"
                defaultValue="4012 8888 8888 1881"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Expiry Date" defaultValue="10/26" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="CCV Code"
                value={cvv}
                fullWidth
                onChange={(e) => setCvv(e.target.value)}
              />
            </Grid>
            <Grid size={12}>
              <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                <Grid>
                  <LockTwoToneIcon
                    sx={{ width: 50, height: 50, color: 'primary.main' }}
                  />
                </Grid>
                <Grid size={{ sm: 'grow' }}>
                  <Typography variant="h5">Secure Checkout</Typography>
                  <Typography variant="caption">Secure by Google.</Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid size={12}>
              <Stack direction="row" sx={{ justifyContent: 'flex-start' }}>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<CreditCardTwoToneIcon />}
                >
                  Add New Card
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Grid>
      )}

      {paymentMethod === 'paypal' && (
        <Grid size={12}>
          <Grid container spacing={3}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="PayPal Mail"
                defaultValue="demo@company.paypal.com"
              />
            </Grid>
          </Grid>
        </Grid>
      )}
    </Grid>
  );
}
