import Grid2 from '@mui/material/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Grid } from '@mui/material';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import ParentCard from '@/shared/ui/ParentCard';
import ChildCard from '@/shared/ui/ChildCard';
import SimpleList from '@/shared/ui/mui/lists/SimpleList';
import NestedList from '@/shared/ui/mui/lists/NestedList';
import FolderList from '@/shared/ui/mui/lists/FolderList';
import SelectedList from '@/shared/ui/mui/lists/SelectedList';
import ControlsList from '@/shared/ui/mui/lists/ControlsList';
import SwitchList from '@/shared/ui/mui/lists/SwitchList';

import SimpleListCode from '@/shared/ui/mui/lists/code/SimpleListCode';
import NestedListCode from '@/shared/ui/mui/lists/code/NestedListCode';
import FolderListCode from '@/shared/ui/mui/lists/code/FolderListCode';
import SelectedListCode from '@/shared/ui/mui/lists/code/SelectedListCode';
import ControlsListCode from '@/shared/ui/mui/lists/code/ControlsListCode';
import SwitchListCode from '@/shared/ui/mui/lists/code/SwitchListCode';

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
