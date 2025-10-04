import Grid2 from '@/components/compat/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Box, Grid } from '@mui/material';

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import ParentCard from '@/shared/ui/ParentCard';
import Table2 from '@/components/tables/Table2';
import Table3 from '@/components/tables/Table3';
import Table1 from '@/components/tables/Table1';
import Table4 from '@/components/tables/Table4';
import Table5 from '@/components/tables/Table5';

import BasicTableCode from '@/components/tables/code/BasicTableCode';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Basic Table',
  },
];

const BasicTable = () => (
  <PageContainer title="Basic Table" description="this is Basic Table page">
    {/* breadcrumb */}
    <Breadcrumb title="Basic Table" items={BCrumb} />
    {/* end breadcrumb */}
    <ParentCard title="Basic Table" codeModel={<BasicTableCode />}>
      <Grid2 container spacing={3}>
        <Grid2 size={12}>
          <Box>
            <Table5 />
          </Box>
        </Grid2>
        <Grid2 size={12}>
          <Box>
            <Table2 />
          </Box>
        </Grid2>
        <Grid2 size={12}>
          <Box>
            <Table3 />
          </Box>
        </Grid2>
        <Grid2 size={12}>
          <Box>
            <Table1 />
          </Box>
        </Grid2>
        <Grid2 size={12}>
          <Box>
            <Table4 />
          </Box>
        </Grid2>
      </Grid2>
    </ParentCard>
  </PageContainer>
);

export default BasicTable;
