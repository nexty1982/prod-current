import Grid2 from '@/components/compat/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Grid } from '@mui/material';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import ParentCard from '@/shared/ui/ParentCard';
import ChildCard from '@/shared/ui/ChildCard';
import BasicTransferList from '@/components/material-ui/transfer-list/BasicTransferList';
import EnhancedTransferList from '@/components/material-ui/transfer-list/EnhancedTransferList';

import BasicTransferListCode from '@/components/material-ui/transfer-list/code/BasicTransferListCode';
import EnhancedTransferListCode from '@/components/material-ui/transfer-list/code/EnhancedTransferListCode';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Transfer List',
  },
];

const MuiTransferList = () => (
  <PageContainer title="Transfer List" description="this is Transfer List page">
    {/* breadcrumb */}
    <Breadcrumb title="Transfer List" items={BCrumb} />
    {/* end breadcrumb */}

    <ParentCard title="Transfer List">
      <Grid2 container spacing={3}>
        <Grid2 display="flex" alignItems="stretch" size={12}>
          <ChildCard title="Basic" codeModel={<BasicTransferListCode />}>
            <BasicTransferList />
          </ChildCard>
        </Grid2>
        <Grid2 display="flex" alignItems="stretch" size={12}>
          <ChildCard title="Enhanced" codeModel={<EnhancedTransferListCode />}>
            <EnhancedTransferList />
          </ChildCard>
        </Grid2>
      </Grid2>
    </ParentCard>
  </PageContainer>
);
export default MuiTransferList;
