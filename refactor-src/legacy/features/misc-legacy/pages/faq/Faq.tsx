import Grid2 from '@mui/material/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import { Grid } from '@mui/material';

import Questions from '@/features/marketing/pages/faq/Questions';
import StillQuestions from '@/features/marketing/pages/faq/StillQuestions';

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
    (<PageContainer title="Faq" description="this is Faq page">
      {/* breadcrumb */}
      <Breadcrumb title="FAQ" items={BCrumb} />
      {/* end breadcrumb */}
      <Grid2 container spacing={3}>
        <Grid2 size={12}>
          <Questions />
          <StillQuestions />
        </Grid2>
      </Grid2>
    </PageContainer>)
  );
};

export default Faq;
