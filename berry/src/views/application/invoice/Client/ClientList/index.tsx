import * as React from 'react';

// material-ui
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';

// project imports
import ClientFilter from './ClientFilter';
import ClientDrawer from './ClientDrawer';
import ClientTable from './ClientTable';
import MainCard from 'ui-component/cards/MainCard';

import { dispatch, useSelector } from 'store';
import { getDetailCards } from 'store/slices/user';

// types
import { UserProfile } from 'types/user-profile';

// ==============================|| CLIENT LIST ||============================== //

export default function ClientList() {
  const [open, setOpen] = React.useState<boolean>(false);
  const [users, setUsers] = React.useState<UserProfile[]>([]);

  const { detailCards } = useSelector((state) => state.user);
  const [rowValue, setRowValue] = React.useState<UserProfile | null>(null);

  React.useEffect(() => {
    setUsers(detailCards);
  }, [detailCards]);

  React.useEffect(() => {
    dispatch(getDetailCards());
  }, []);

  return (
    <MainCard content={false}>
      {/* filter section */}
      <CardContent>
        <ClientFilter {...{ users: detailCards, setUsers }} />
      </CardContent>
      {/* table */}
      <Box sx={{ display: open ? 'flex' : 'block' }}>
        <Grid container sx={{ position: 'relative' }}>
          <Grid size={{ sm: open ? 5 : 12, xs: 12 }}>
            <ClientTable open={open} setOpen={setOpen} users={users} setRowValue={setRowValue} />
          </Grid>
          <Grid sx={{ borderLeft: '1px solid', borderLeftColor: 'divider' }} size={{ sm: open ? 7 : 12, xs: 12 }}>
            <ClientDrawer open={open} setOpen={setOpen} rowValue={rowValue!} />
          </Grid>
        </Grid>
      </Box>
    </MainCard>
  );
}
