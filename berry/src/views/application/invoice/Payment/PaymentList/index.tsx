import { useEffect, useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';

// project imports
import Overview from './Overview';
import PaymentFilter from './PaymentFilter';
import PaymentTable from './PaymentTable';
import MainCard from 'ui-component/cards/MainCard';

import { dispatch, useSelector } from 'store';
import { gridSpacing } from 'store/constant';
import { getOrders } from 'store/slices/customer';

// types
import { Order } from 'types/customer';

// ==============================|| PAYMENT LIST ||============================== //

export default function PaymentList() {
  const { orders } = useSelector((state) => state.customer);

  const [rows, setRows] = useState<Order[]>([]);

  useEffect(() => {
    dispatch(getOrders());
  }, []);

  useEffect(() => {
    setRows(orders);
  }, [orders]);

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <Overview />
      </Grid>
      <Grid size={12}>
        <MainCard content={false}>
          <PaymentFilter {...{ row: orders, setRows }} />
          <PaymentTable {...{ rows }} />
        </MainCard>
      </Grid>
    </Grid>
  );
}
