import { useState } from 'react';

// material-ui
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import InputBase from '@mui/material/InputBase';
import FormHelperText from '@mui/material/FormHelperText';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// third party
import { useFormik } from 'formik';
import * as yup from 'yup';

// project imports
import CouponCode from './CouponCode';
import { openSnackbar } from 'store/slices/snackbar';
import { useDispatch, useSelector } from 'store';
import { setDiscount } from 'store/slices/cart';

const validationSchema = yup.object({
  code: yup.string().oneOf(['BERRY50', 'FLAT05', 'SUB150', 'UPTO200'], 'Coupon expired').required('Coupon code is required')
});

// ==============================|| CHECKOUT CART - CART DISCOUNT ||============================== //

export default function CartDiscount() {
  const dispatch = useDispatch();

  const [open, setOpen] = useState(false);
  const [coupon, setCoupon] = useState<string>('');
  const cart = useSelector((state) => state.cart);
  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      code: coupon
    },
    validationSchema,
    onSubmit: (values) => {
      dispatch(setDiscount(values.code, cart.checkout.total));
      dispatch(
        openSnackbar({
          open: true,
          message: 'Coupon Add Success',
          variant: 'alert',
          alert: {
            color: 'success'
          },
          close: false
        })
      );
    }
  });

  return (
    <Stack sx={{ justifyContent: 'flex-end' }}>
      <Typography variant="caption" color="error" sx={{ cursor: 'pointer', textAlign: 'right' }} onClick={handleClickOpen}>
        Have a coupon code?
      </Typography>
      <form onSubmit={formik.handleSubmit}>
        <Paper
          sx={{
            px: 0.25,
            py: 0.5,
            display: 'flex',
            alignItems: 'center',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <InputBase
            sx={{ ml: 1, flex: 1, fontWeight: 500 }}
            fullWidth
            placeholder="Discount Coupon"
            slotProps={{ input: { 'aria-label': 'search google maps' } }}
            id="code"
            name="code"
            value={formik.values.code}
            onChange={formik.handleChange}
            error={Boolean(formik.errors.code)}
          />
          <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
          <Button type="submit" color="primary" aria-label="directions">
            Apply
          </Button>
        </Paper>
        {formik.errors.code && (
          <FormHelperText error id="standard-code">
            {formik.errors.code}
          </FormHelperText>
        )}
      </form>
      <CouponCode open={open} handleClose={handleClose} setCoupon={setCoupon} />
    </Stack>
  );
}
