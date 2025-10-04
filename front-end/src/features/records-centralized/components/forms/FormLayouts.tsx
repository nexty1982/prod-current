import Grid2 from '@/components/compat/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Grid } from '@mui/material';
import {
  FbOrdinaryForm,
  FbDefaultForm,
  FbBasicHeaderForm,
  FbReadonlyForm,
  FbDisabledForm,
  FbLeftIconForm,
  FbRightIconForm,
  FbInputVariants,
} from '@/components/forms/form-layouts/index';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Form Layouts',
  },
];

const FormLayouts = () => (
  <PageContainer title="Form Layouts" description="this is innerpage">
    {/* breadcrumb */}
    <Breadcrumb title="Form Layouts" items={BCrumb} />
    {/* end breadcrumb */}

    <Grid2 container spacing={3}>
      <Grid2
        size={{
          lg: 12,
          md: 12,
          xs: 12
        }}>
        <FbOrdinaryForm />
      </Grid2>
      <Grid2
        size={{
          lg: 12,
          md: 12,
          xs: 12
        }}>
        <FbInputVariants />
      </Grid2>
      <Grid2
        size={{
          lg: 12,
          md: 12,
          xs: 12
        }}>
        <FbDefaultForm />
      </Grid2>
      <Grid2
        size={{
          lg: 12,
          md: 12,
          xs: 12
        }}>
        <FbBasicHeaderForm />
      </Grid2>
      <Grid2
        size={{
          lg: 12,
          md: 12,
          xs: 12
        }}>
        <FbReadonlyForm />
      </Grid2>
      <Grid2
        size={{
          lg: 12,
          md: 12,
          xs: 12
        }}>
        <FbDisabledForm />
      </Grid2>
      <Grid2
        size={{
          lg: 6,
          md: 12,
          xs: 12
        }}>
        <FbLeftIconForm />
      </Grid2>
      <Grid2
        size={{
          lg: 6,
          md: 12,
          xs: 12
        }}>
        <FbRightIconForm />
      </Grid2>
    </Grid2>
  </PageContainer>
);

export default FormLayouts;
