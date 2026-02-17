import { useEffect, useState } from 'react';

// material-ui
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// third party
import { random } from 'lodash-es';

// project imports
import PaymentTable from './PaymentTable';
import Avatar from 'ui-component/extended/Avatar';
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';

import { dispatch, useSelector } from 'store';
import { gridSpacing } from 'store/constant';
import { getInvoice } from 'store/slices/customer';

// assets
import avatar from 'assets/images/users/avatar-2.png';
import TimelapseIcon from '@mui/icons-material/Timelapse';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import PrintTwoToneIcon from '@mui/icons-material/PrintTwoTone';

// types
import { Invoice } from 'types/invoice';

function getRandomRow(arr: Invoice[], num: number) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());

  return shuffled.slice(0, num);
}

// ==============================|| PAYMENT DETAILS ||============================== //

export default function PaymentDetails() {
  const randomAmount = random(0, 500);
  const { invoices } = useSelector((state) => state.customer);

  const [rows, setRows] = useState<Invoice[]>([]);

  useEffect(() => {
    dispatch(getInvoice());
  }, []);

  useEffect(() => {
    setRows(getRandomRow(invoices, random(1, 5)));
  }, [invoices]);

  let initialValue = 0;
  const newDate = new Date(new Date().getTime() - random(0, 28) * 24 * 60 * 60 * 1000);
  const headerData = [
    { header: 'No. of Invoice', value: rows.length },
    { header: 'Method', value: ['Case', 'Cheque', 'UPI', 'Card'][random(0, 3)] },
    {
      header: 'Amount',
      value: `$${rows.reduce((accumulator, currentValue) => accumulator + currentValue?.quantity, initialValue) - randomAmount}`
    },
    { header: 'Reference', value: `#000${random(10000, 99999)}` },
    { header: 'Bank charges', value: `$${random(10, 120)}` },
    { header: 'Create Date', value: newDate.getDate() + '/' + (newDate.getMonth() + 1) + '/' + newDate.getFullYear() }
  ];

  return (
    <MainCard
      title={
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.5}>
          <Typography variant="h3">Payment Receipt Deatails </Typography>
          <Typography variant="h3" sx={{ color: 'grey.400' }}>
            ({`#000${random(10000, 99999)}`})
          </Typography>
        </Stack>
      }
      secondary={
        <AnimateButton>
          <Button variant="contained" startIcon={<PrintTwoToneIcon />} size="large">
            Print
          </Button>
        </AnimateButton>
      }
      content={false}
    >
      {/* payment details header */}
      <Box sx={{ p: 2.5 }}>
        <Grid container spacing={gridSpacing}>
          <Grid size={{ xs: 12, md: 4, lg: 3 }}>
            <Grid container spacing={1.25}>
              <Grid>
                <Avatar alt="User 1" src={avatar} />
              </Grid>
              <Grid size="grow">
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                  <Typography variant="h4">Material Ui-SAAS</Typography>
                  <TimelapseIcon color="warning" fontSize="small" />
                </Stack>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="subtitle2" noWrap>
                    CT-205
                  </Typography>
                  <Button size="small" endIcon={<InsertLinkIcon />}>
                    Get Link
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={{ xs: 12, md: 8, lg: 9 }}>
            <Grid container spacing={2} sx={{ justifyContent: 'space-between' }}>
              {headerData.map((data, index) => (
                <Grid key={index} size={{ xs: 6, sm: 'auto' }}>
                  <Stack spacing={0.5} sx={{ alignItems: { xs: 'center', sm: 'flex-end' } }}>
                    <Typography variant="subtitle2">{data.header}</Typography>
                    <Typography variant="h5">{data.value}</Typography>
                  </Stack>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Box>
      <Divider />
      <Box sx={{ p: 2.5 }}>
        <Grid container spacing={2}>
          <Grid container direction="column" size={{ xs: 12, md: 6 }}>
            <Typography variant="h4" sx={{ fontWeight: 500, py: 1, px: 0 }}>
              Bill To
            </Typography>
            <Stack direction="row" spacing={1.5}>
              <Stack sx={{ justifyContent: 'space-around' }}>
                <Typography variant="subtitle2">Address</Typography>
                <Typography variant="subtitle2">Email</Typography>
                <Typography variant="subtitle2">SIREN</Typography>
                <Typography variant="subtitle2">VAT</Typography>
              </Stack>
              <Stack sx={{ justifyContent: 'space-between' }}>
                <Typography variant="h5">128 Rue La Boétie, Paris, Île-de-France 75008, FR</Typography>
                <Typography variant="h5">accounts@material-ui.com</Typography>
                <Typography variant="h5">852357748</Typography>
                <Typography variant="h5">FR93852357748</Typography>
              </Stack>
            </Stack>
          </Grid>
          <Grid container direction="column" sx={{ alignContent: 'flex-end' }} size={{ xs: 12, md: 6 }}>
            <Typography variant="h4" sx={{ fontWeight: 500, py: 1, px: 0 }}>
              Ship To
            </Typography>
            <Typography variant="h5">128 Rue La Boétie, Paris, Île-de-France 75008, FR</Typography>
          </Grid>
        </Grid>
      </Box>
      <Divider />
      {/* payment details table */}
      <PaymentTable {...{ rows, randomAmount }} />
    </MainCard>
  );
}
