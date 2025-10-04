import Grid2 from '@/components/compat/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Grid } from '@mui/material';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import ParentCard from '@/shared/ui/ParentCard';
import ChildCard from '@/shared/ui/ChildCard';
import SimpleList from '@/components/material-ui/lists/SimpleList';
import NestedList from '@/components/material-ui/lists/NestedList';
import FolderList from '@/components/material-ui/lists/FolderList';
import SelectedList from '@/components/material-ui/lists/SelectedList';
import ControlsList from '@/components/material-ui/lists/ControlsList';
import SwitchList from '@/components/material-ui/lists/SwitchList';

import SimpleListCode from '@/components/material-ui/lists/code/SimpleListCode';
import NestedListCode from '@/components/material-ui/lists/code/NestedListCode';
import FolderListCode from '@/components/material-ui/lists/code/FolderListCode';
import SelectedListCode from '@/components/material-ui/lists/code/SelectedListCode';
import ControlsListCode from '@/components/material-ui/lists/code/ControlsListCode';
import SwitchListCode from '@/components/material-ui/lists/code/SwitchListCode';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'List',
  },
];

const MuiList = () => (
  <PageContainer title="List" description="this is List page">
    {/* breadcrumb */}
    <Breadcrumb title="List" items={BCrumb} />
    {/* end breadcrumb */}

    <ParentCard title="List">
      <Grid2 container spacing={3}>
        <Grid2
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            sm: 6
          }}>
          <ChildCard title="Simple" codeModel={<SimpleListCode />}>
            <SimpleList />
          </ChildCard>
        </Grid2>
        <Grid2
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            sm: 6
          }}>
          <ChildCard title="Nested" codeModel={<NestedListCode />}>
            <NestedList />
          </ChildCard>
        </Grid2>
        <Grid2
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            sm: 6
          }}>
          <ChildCard title="Folder" codeModel={<FolderListCode />}>
            <FolderList />
          </ChildCard>
        </Grid2>
        <Grid2
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            sm: 6
          }}>
          <ChildCard title="Selected" codeModel={<SelectedListCode />}>
            <SelectedList />
          </ChildCard>
        </Grid2>
        <Grid2
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            sm: 6
          }}>
          <ChildCard title="Controls" codeModel={<ControlsListCode />}>
            <ControlsList />
          </ChildCard>
        </Grid2>
        <Grid2
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            sm: 6
          }}>
          <ChildCard title="Switch" codeModel={<SwitchListCode />}>
            <SwitchList />
          </ChildCard>
        </Grid2>
      </Grid2>
    </ParentCard>
  </PageContainer>
);
export default MuiList;
