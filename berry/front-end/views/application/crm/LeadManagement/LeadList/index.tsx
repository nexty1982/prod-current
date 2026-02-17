import { useEffect, useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';

// project imports
import LeadDrawer from './LeadDrawer';
import LeadTable from './LeadTable';
import Filter from './Filter';
import MainCard from 'ui-component/cards/MainCard';

import { dispatch, useSelector } from 'store';
import { getOrders } from 'store/slices/customer';

// types
import { Order } from 'types/customer';

// ==============================|| LEAD LIST ||============================== //

export default function LeadList() {
  const [rows, setRows] = useState<Order[]>([]);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  const { orders } = useSelector((state) => state.customer);

  const handleToggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  useEffect(() => {
    dispatch(getOrders());
  }, []);

  useEffect(() => {
    setRows(orders);
  }, [orders]);

  return (
    <MainCard content={false}>
      {/* table */}
      <Box sx={{ display: drawerOpen ? 'flex' : 'block' }}>
        <Grid container sx={{ position: 'relative', display: drawerOpen ? 'flex' : 'block' }}>
          <Grid size={{ xs: 12, sm: drawerOpen && 8 }}>
            <Filter {...{ handleToggleDrawer, rows: orders, setRows }} />
            <LeadTable {...{ rows }} />
          </Grid>
          <Grid sx={{ borderLeft: '1px solid', borderColor: 'divider' }} size={{ xs: 12, sm: drawerOpen && 4 }}>
            <LeadDrawer {...{ open: drawerOpen, handleToggleDrawer }} />
          </Grid>
        </Grid>
      </Box>
    </MainCard>
  );
}
