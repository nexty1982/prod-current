// material-ui
import Grid from '@mui/material/Grid';

// project imports
import FileSystemNavigator from './FileSystemNavigator';
import MultiSelectTreeView from './MultiSelectTreeView';
import ControlledTreeView from './ControlledTreeView';
import RecursiveTreeView from './RecursiveTreeView';
import CustomizedTreeView from './CustomizedTreeView';
import GmailTreeView from './GmailTreeView';

import SubCard from 'ui-component/cards/SubCard';
import MainCard from 'ui-component/cards/MainCard';
import SecondaryAction from 'ui-component/cards/CardSecondaryAction';
import { gridSpacing } from 'store/constant';

// ==============================|| UI TREEVIEW ||============================== //

export default function UITreeview() {
  return (
    <MainCard title="Treeview" secondary={<SecondaryAction link="https://next.material-ui.com/components/tree-view/" />}>
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <SubCard title="Basic">
            <FileSystemNavigator />
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <SubCard title="Multi Selection">
            <MultiSelectTreeView />
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <SubCard title="Controlled">
            <ControlledTreeView />
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <SubCard title="Recursive">
            <RecursiveTreeView />
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <SubCard title="Customized">
            <CustomizedTreeView />
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <SubCard title="Gmail Clone">
            <GmailTreeView />
          </SubCard>
        </Grid>
      </Grid>
    </MainCard>
  );
}
