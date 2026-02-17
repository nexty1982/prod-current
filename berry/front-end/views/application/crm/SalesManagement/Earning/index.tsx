import { useEffect, useState } from 'react';

// mui
import Grid from '@mui/material/Grid';

// project imports
import EarningTable from './EarningTable';
import Filter from './Filter';
import Overview from './Overview';
import MainCard from 'ui-component/cards/MainCard';

import { dispatch, useSelector } from 'store';
import { gridSpacing } from 'store/constant';
import { getOrders } from 'store/slices/customer';

// types
import { Order } from 'types/customer';

// ==============================|| EARNING ||============================== //

export default function Earning() {
  const [rows, setRows] = useState<Order[]>([]);
  const [isLoading, setLoading] = useState(true);

  const { orders } = useSelector((state) => state.customer);

  useEffect(() => {
    dispatch(getOrders()).then(() => setLoading(false));
  }, []);

  useEffect(() => {
    setRows(orders);
  }, [orders]);

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <Overview isLoading={isLoading} />
      </Grid>
      <Grid size={12}>
        <MainCard content={false}>
          <Filter {...{ rows: orders, setRows }} />
          <EarningTable {...{ rows }} />
        </MainCard>
      </Grid>
    </Grid>
  );
}
