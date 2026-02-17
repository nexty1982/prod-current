import { useState, ReactElement } from 'react';

// material-ui
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// project imports
import AddAddress from './AddAddress';
import OrderSummary from './OrderSummary';
import AddressCard from './AddressCard';
import SubCard from 'ui-component/cards/SubCard';
import { gridSpacing } from 'store/constant';

// assets
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import AddIcon from '@mui/icons-material/Add';
import PersonOutlineTwoToneIcon from '@mui/icons-material/PersonOutlineTwoTone';
import { Address } from 'types/e-commerce';
import { CartCheckoutStateProps } from 'types/cart';

// ==============================|| CHECKOUT BILLING ADDRESS - MAIN ||============================== //

interface BillingAddressProps {
  address: Address[];
  checkout: CartCheckoutStateProps;
  onBack: () => void;
  addAddress: (address: Address) => void;
  editAddress: (address: Address) => void;
  billingAddressHandler: (billingAddress: Address | null) => void;
}

export default function BillingAddress({ checkout, onBack, billingAddressHandler, address, addAddress, editAddress }: BillingAddressProps) {
  const [select, setSelect] = useState<Address | null>(null);

  const [open, setOpen] = useState(false);
  const handleClickOpen = (billingAddress: Address | null) => {
    setOpen(true);
    billingAddress && setSelect(billingAddress!);
  };

  const handleClose = () => {
    setOpen(false);
    setSelect(null);
  };

  let shippingAddress: ReactElement | ReactElement[] = <></>;
  let addressResult: ReactElement | ReactElement[] = <></>;
  if (address) {
    addressResult = address.map((data: Address, index: number) => {
      if (data.isDefault) {
        shippingAddress = <AddressCard address={data} single />;
      }
      return (
        <Grid key={index} size={{ xs: 12, lg: 6 }}>
          <AddressCard address={data} handleClickOpen={handleClickOpen} billingAddressHandler={billingAddressHandler} />
        </Grid>
      );
    });
  }

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={{ xs: 12, md: 8 }}>
        <Grid container spacing={gridSpacing}>
          <Grid size={12}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1">Billing Address</Typography>
              <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => handleClickOpen(null)}>
                Add Address
              </Button>
            </Stack>
          </Grid>
          {addressResult}
          <Grid size={12}>
            <OrderSummary checkout={checkout} />
          </Grid>
          <Grid size={12}>
            <Grid container spacing={3} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Grid>
                <Button variant="text" startIcon={<KeyboardBackspaceIcon />} onClick={onBack}>
                  Back
                </Button>
              </Grid>
              <Grid>
                <Button variant="contained" onClick={() => billingAddressHandler(null)}>
                  Place Order
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <SubCard sx={{ mb: gridSpacing }}>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <PersonOutlineTwoToneIcon color="primary" />
                <Typography variant="h3">Delia Pope</Typography>
              </Stack>
            </Grid>
            <Grid size={12}>
              <Stack spacing={0.25}>
                <Typography variant="caption">Email</Typography>
                <Typography variant="subtitle1">deliaturewpo@company.com</Typography>
              </Stack>
            </Grid>
            <Grid size={12}>
              <Stack spacing={0.25}>
                <Typography variant="caption">Contact</Typography>
                <Typography variant="subtitle1">(980) 473-2942</Typography>
              </Stack>
            </Grid>
            <Grid size={12}>
              <Stack spacing={0.25}>
                <Typography variant="caption">No. of order</Typography>
                <Typography variant="subtitle1">19</Typography>
              </Stack>
            </Grid>
          </Grid>
        </SubCard>
        {shippingAddress}
      </Grid>
      <AddAddress open={open} handleClose={handleClose} address={select!} addAddress={addAddress} editAddress={editAddress} />
    </Grid>
  );
}
