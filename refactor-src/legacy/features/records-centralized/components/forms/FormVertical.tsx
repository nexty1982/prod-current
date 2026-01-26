import Grid2 from '@mui/material/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Grid, Typography } from '@mui/material';

// components
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import ParentCard from '@/shared/ui/ParentCard';


import BasicLayout from '@/shared/ui/forms/form-vertical/BasicLayout';

import BasicIcons from '@/shared/ui/forms/form-vertical/BasicIcons';
import FormSeparator from '@/shared/ui/forms/form-vertical/FormSeparator';
import CollapsibleForm from '@/shared/ui/forms/form-vertical/CollapsibleForm';
import FormTabs from '@/shared/ui/forms/form-vertical/FormTabs';

import BasicLayoutCode from '@/shared/ui/forms/form-vertical/code/BasicLayoutCode';
import BasicIconsCode from '@/shared/ui/forms/form-vertical/code/BasicIconsCode';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Vertical Form',
  },
];

const FormVertical = () => {
  return (
    (<PageContainer title="Vertical Form" description="this is Vertical Form page">
      {/* breadcrumb */}
      <Breadcrumb title="Vertical Form" items={BCrumb} />
      {/* end breadcrumb */}
      <Grid2 container spacing={3}>
        <Grid2
          size={{
            xs: 12,
            lg: 6
          }}>
          <ParentCard title="Basic Layout" codeModel={<BasicLayoutCode />}>
            <BasicLayout />
          </ParentCard>
        </Grid2>
        <Grid2
          size={{
            xs: 12,
            lg: 6
          }}>
          <ParentCard title="Basic with Icons" codeModel={<BasicIconsCode />}>
            <BasicIcons />
          </ParentCard>
        </Grid2>
        <Grid2 size={12}>
          <ParentCard title="Multi Column with Form Separator">
            <FormSeparator />
          </ParentCard>
        </Grid2>
        <Grid2 size={12}>
          <Typography variant="h5" mb={3}>Collapsible Section</Typography>
          <CollapsibleForm />
        </Grid2>
        <Grid2 size={12}>
          <Typography variant="h5" mb={3}>Form with Tabs</Typography>
          <FormTabs />
        </Grid2>
      </Grid2>
    </PageContainer>)
  );
};

export default FormVertical;
