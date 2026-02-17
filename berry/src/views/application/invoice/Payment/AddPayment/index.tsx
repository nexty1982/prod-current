import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import CardActions from '@mui/material/CardActions';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';

import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

// third party
import { random } from 'lodash-es';
import * as yup from 'yup';
import { useFormik } from 'formik';

// project imports
import PaymentTable from './PaymentTable';
import AddClient from '../../Client/AddClient/index';
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';

import { ThemeMode } from 'config';
import { dispatch, useSelector } from 'store';
import { gridSpacing } from 'store/constant';
import { getDetailCards } from 'store/slices/user';
import { openSnackbar } from 'store/slices/snackbar';
import { getInvoice } from 'store/slices/customer';

// assets
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';

// types
import { UserProfile } from 'types/user-profile';
import { Invoice } from 'types/invoice';

const validationSchema = yup.object({
  receiptID: yup.string().required('Receipt ID is Required'),
  amount: yup.string().required('Received Amount is Required')
});

function getRandomRow(arr: Invoice[], num: number) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());

  return shuffled.slice(0, num);
}

// ==============================|| ADD PAYMENT ||============================== //

export default function AddPayment() {
  const theme = useTheme();
  const navigate = useNavigate();

  const { detailCards } = useSelector((state) => state.user);
  const { invoices } = useSelector((state) => state.customer);

  const [value, setValue] = useState<Date | null>(new Date('2022-04-17'));
  const [client, setClient] = useState<UserProfile[]>([]);
  const [data, setData] = useState<string>('');
  const [row, setRow] = useState<Invoice[]>([]);
  const [select, setSelect] = useState<string>('');

  // open dialog to edit review
  const [open, setOpen] = useState(false);

  const handleDialogToggler = () => {
    setOpen(!open);
  };

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      receiptID: '',
      amount: ''
    },
    validationSchema,
    onSubmit: (values) => {
      if (values) {
        dispatch(
          openSnackbar({
            open: true,
            message: 'Submit Success',
            variant: 'alert',
            alert: {
              color: 'success'
            },
            close: false
          })
        );
        navigate('/apps/invoice/payment/payment-list');
      }
    }
  });

  const handleChangeClient = (e: SelectChangeEvent) => {
    setData(e.target.value);
    setRow(e.target.value ? getRandomRow(invoices, random(1, 5)) : []);
  };

  useEffect(() => {
    setClient(detailCards);
  }, [detailCards]);

  useEffect(() => {
    dispatch(getInvoice());
    dispatch(getDetailCards());
  }, []);

  const handleChangeMethod = (event: SelectChangeEvent) => {
    setSelect(event.target.value);
  };

  return (
    <MainCard
      title="Add New Payment Received"
      sx={{
        '& .MuiOutlinedInput-input': { borderRadius: 1.5 },
        '& .MuiCardContent-root': { p: 0 },
        '.MuiCardContent-root:last-child': { paddingBottom: '0px' }
      }}
    >
      <form onSubmit={formik.handleSubmit}>
        {/* add payment header */}
        <Box sx={{ p: 2.5, bgcolor: theme.palette.mode === ThemeMode.DARK ? 'background.default' : 'primary.light' }}>
          <Grid container spacing={gridSpacing}>
            <Grid size={{ xs: 12, sm: 8, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel id="demo-simple-select-label">Select Client</InputLabel>
                <Select
                  endAdornment={
                    <InputAdornment position="end">
                      <Button onClick={handleDialogToggler} startIcon={<AddIcon />}>
                        New client
                      </Button>
                    </InputAdornment>
                  }
                  sx={{ '& .MuiSelect-icon': { right: 120 } }}
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  label="Select Client"
                  onChange={handleChangeClient}
                  value={data}
                >
                  <MenuItem value="">Select Client</MenuItem>
                  {client.map((item, index) => (
                    <MenuItem value={index} key={index}>
                      {item.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
        <Box sx={{ p: 2.5 }}>
          <Grid container spacing={gridSpacing}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                label="Payment Receipt ID"
                id="receiptID"
                name="receiptID"
                value={formik.values.receiptID}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.receiptID && Boolean(formik.errors.receiptID)}
                helperText={formik.touched.receiptID && formik.errors.receiptID}
              />
            </Grid>
            <Grid sx={{ display: { xs: 'none', sm: 'flex' } }} size={{ xs: 12, sm: 6, md: 8 }}></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel id="demo-simple-select-label">Payment Method</InputLabel>
                <Select
                  labelId="demo-simple-select-label"
                  label="Payment Method"
                  value={select}
                  onChange={handleChangeMethod}
                  slotProps={{
                    input: {
                      placeholder: 'Enter Amount'
                    }
                  }}
                >
                  <MenuItem value="">Select Payment Method</MenuItem>
                  <MenuItem value={1}>Cash</MenuItem>
                  <MenuItem value={2}>Credit Card</MenuItem>
                  <MenuItem value={3}>Master Card</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                sx={{ border: 'none' }}
                label="Received Amount"
                fullWidth
                id="amount"
                name="amount"
                value={formik.values.amount}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.amount && Boolean(formik.errors.amount)}
                helperText={formik.touched.amount && formik.errors.amount}
                placeholder="Enter Amount"
              />
            </Grid>
            <Grid sx={{ display: { xs: 'none', sm: 'none', md: 'flex' } }} size={{ xs: 12, sm: 12, md: 4 }}></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth label="Reference" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  slotProps={{ textField: { fullWidth: true } }}
                  label="Create Date"
                  value={value}
                  onChange={(newValue) => setValue(newValue as Date | null)}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
        </Box>
        <Divider />

        {/* payment drawer */}
        <Dialog open={open} onClose={handleDialogToggler} sx={{ '& .MuiDialog-paper': { maxWidth: '100%', width: 980 } }}>
          {open && <AddClient isOpen handleDialogToggler={handleDialogToggler} />}
        </Dialog>

        {/* add payment table */}
        <PaymentTable {...{ formik, row }} />
        <Divider />
        <Box sx={{ p: 2.5 }}>
          <TextField fullWidth multiline rows={2} label="Add Note" />
        </Box>
        <Divider />
        <CardActions sx={{ justifyContent: 'flex-end' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between' }}>
            <Stack sx={{ justifyContent: 'flex-start' }}>
              <AnimateButton>
                <Button
                  variant="contained"
                  startIcon={<CheckIcon />}
                  size="large"
                  sx={{
                    ml: 2,
                    textDecoration: 'none'
                  }}
                  type="submit"
                >
                  Save & View Receipt
                </Button>
              </AnimateButton>
            </Stack>
            <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
              <AnimateButton>
                <Button variant="contained" size="large" type="submit">
                  Save
                </Button>
              </AnimateButton>
              <AnimateButton>
                <Button variant="outlined" component={Link} to={'/apps/invoice/payment/payment-list'} size="large">
                  Cancel
                </Button>
              </AnimateButton>
            </Stack>
          </Stack>
        </CardActions>
      </form>
    </MainCard>
  );
}
