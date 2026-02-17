// material-ui
import Grid from '@mui/material/Grid';

// project imports
import CustomMenu from './CustomMenu';
import ColumnMenu from './ColumnMenu';
import DisableMenu from './DisableMenu';
import AddMenuItem from './AddMenuItem';
import HideMenuItem from './HideMenuItem';
import OverrideMenu from './OverrideMenu';
import ReorderingMenu from './ReorderingMenu';
import { gridSpacing } from 'store/constant';

// ==============================|| COLUMN MENU DATA GRID ||============================== //

export default function ColumnMenuDemu() {
  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <ColumnMenu />
      </Grid>
      <Grid size={12}>
        <AddMenuItem />
      </Grid>
      <Grid size={12}>
        <OverrideMenu />
      </Grid>
      <Grid size={12}>
        <HideMenuItem />
      </Grid>
      <Grid size={12}>
        <ReorderingMenu />
      </Grid>
      <Grid size={12}>
        <CustomMenu />
      </Grid>
      <Grid size={12}>
        <DisableMenu />
      </Grid>
    </Grid>
  );
}
