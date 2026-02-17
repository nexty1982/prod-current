import React, { useState } from 'react';

// material-ui
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// third party
import { PatternFormat } from 'react-number-format';
import { usePatternFormat, NumberFormatBase } from 'react-number-format';

// project imports
import { gridSpacing } from 'store/constant';
import AnimateButton from 'ui-component/extended/AnimateButton';

// assets
import LockTwoToneIcon from '@mui/icons-material/LockTwoTone';
import CreditCardTwoToneIcon from '@mui/icons-material/CreditCardTwoTone';

function CardExpiry(props: any) {
  const { format, ...rest } = usePatternFormat({ ...props, format: '##/##' });

  const _format = (val: any) => {
    let month = val.substring(0, 2);
    const year = val.substring(2, 4);

    if (month.length === 1 && month[0] > 1) {
      month = `0${month[0]}`;
    } else if (month.length === 2) {
      // set the lower and upper boundary
      if (Number(month) === 0) {
        month = `01`;
      } else if (Number(month) > 12) {
        month = '12';
      }
    }
    // @ts-ignore
    return format(`${month}${year}`);
  };

  return <NumberFormatBase format={_format} {...rest} />;
}

// ==============================|| PROFILE 2 - PAYMENT ||============================== //

export default function Payment() {
  const [cvv, setCvv] = React.useState<string | undefined>('123');
  const handleChangeCVV = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCvv(event?.target.value);
  };

  const [value1, setValue1] = React.useState<string | undefined>('visa');
  const handleChange1 = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue1(event.target.value);
  };

  const [valuesObj, setValuesObj] = useState({});

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <RadioGroup aria-label="gender" name="gender1" value={value1} onChange={handleChange1}>
          <Grid container spacing={0}>
            <Grid>
              <FormControlLabel value="visa" control={<Radio />} label="Visa Credit/Debit Card" />
            </Grid>
            <Grid>
              <FormControlLabel value="paypal" control={<Radio />} label="PayPal" />
            </Grid>
          </Grid>
        </RadioGroup>
      </Grid>
      {value1 === 'visa' && (
        <Grid size={12}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Name on Card" defaultValue="Selena Litten" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <PatternFormat
                defaultValue={4012888888881881}
                format="#### #### #### ####"
                prefix=""
                fullWidth
                customInput={TextField}
                label="Card Number"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CardExpiry
                key={valuesObj}
                defaultValue={1022}
                customInput={TextField}
                allowEmptyFormatting
                onValueChange={(values: any) => {
                  setValuesObj(values);
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField id="standard-select-ccv" label="CCV Code" value={cvv} fullWidth onChange={handleChangeCVV} />
            </Grid>
            <Grid size={12}>
              <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                <Grid>
                  <LockTwoToneIcon sx={{ width: 50, height: 50, color: 'primary.main' }} />
                </Grid>
                <Grid size={{ sm: 'grow' }}>
                  <Typography variant="h5">Secure Checkout</Typography>
                  <Typography variant="caption">Secure by Google.</Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid size={12}>
              <Stack direction="row" sx={{ justifyContent: 'flex-start' }}>
                <AnimateButton>
                  <Button variant="outlined" size="large" startIcon={<CreditCardTwoToneIcon />}>
                    Add New card
                  </Button>
                </AnimateButton>
              </Stack>
            </Grid>
          </Grid>
        </Grid>
      )}
      {value1 === 'paypal' && (
        <Grid size={12}>
          <Grid container spacing={3}>
            <Grid size={12}>
              <TextField fullWidth label="Paypal Mail" defaultValue="demo@company.paypal.com" />
            </Grid>
          </Grid>
        </Grid>
      )}
    </Grid>
  );
}
