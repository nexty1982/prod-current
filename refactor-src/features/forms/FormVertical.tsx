// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Typography } from '@mui/material';
import Grid from '@/components/compat/Grid2';

// components
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import ParentCard from '@/shared/ui/ParentCard';


import BasicLayout from '@/components/forms/form-vertical/BasicLayout';

import BasicIcons from '@/components/forms/form-vertical/BasicIcons';
import FormSeparator from '@/components/forms/form-vertical/FormSeparator';
import CollapsibleForm from '@/components/forms/form-vertical/CollapsibleForm';
import FormTabs from '@/components/forms/form-vertical/FormTabs';

import BasicLayoutCode from '@/components/forms/form-vertical/code/BasicLayoutCode';
import BasicIconsCode from '@/components/forms/form-vertical/code/BasicIconsCode';

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
