import React from 'react';
import { useLoaderData } from 'react-router-dom';

// material-ui
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';

// project imports
import ItemTable from './ItemTable';
import ItemDrawer from './ItemDrawer';
import ItemFilter from './ItemFilter';

// assets
import MainCard from 'ui-component/cards/MainCard';

// types
import { Products } from 'types/e-commerce';

// ==============================|| ITEM LIST ||============================== //

export default function ItemList() {
  const [open, setOpen] = React.useState<boolean>(false);
  const [rowValue, setRowValue] = React.useState<Products | null>(null);
  const [rows, setRows] = React.useState<Products[]>([]);

  const products = useLoaderData() as Products[];

  React.useEffect(() => {
    setRows(products);
  }, [products]);

  return (
    <MainCard content={false}>
      {/* filter section */}
      <CardContent>
        <ItemFilter {...{ products, setRows }} />
      </CardContent>
      {/* table */}
      <Box sx={{ display: open ? 'flex' : 'block' }}>
        <Grid container sx={{ position: 'relative' }}>
          <Grid size={{ sm: open ? 5 : 12, xs: 12 }}>
            <ItemTable open={open} setOpen={setOpen} setRowValue={setRowValue} rows={rows} />
          </Grid>
          <Grid sx={{ borderLeft: '1px solid', borderColor: 'divider' }} size={{ sm: open ? 7 : 12, xs: 12 }}>
            <ItemDrawer open={open} setOpen={setOpen} rowValue={rowValue!} />
          </Grid>
        </Grid>
      </Box>
    </MainCard>
  );
}
