// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import { Grid } from '@mui/material';
import FAQ from '@/components/frontend-pages/homepage/faq';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'FAQ',
  },
];

const Faq = () => {
  return (
    <PageContainer title="Faq" description="this is Faq page">
      <Breadcrumb title="FAQ" items={BCrumb} />
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FAQ />
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default Faq;
