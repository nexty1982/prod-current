import Grid2 from '@mui/material/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Grid, Typography } from '@mui/material';

// components
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import ParentCard from '@/shared/ui/ParentCard';
import BasicLayout from '@/shared/ui/forms/form-horizontal/BasicLayout';
import BasicIcons from '@/shared/ui/forms/form-horizontal/BasicIcons';
import FormSeparator from '@/shared/ui/forms/form-horizontal/FormSeparator';
import FormLabelAlignment from '@/shared/ui/forms/form-horizontal/FormLabelAlignment';
import CollapsibleForm from '@/shared/ui/forms/form-horizontal/CollapsibleForm';
import FormTabs from '@/shared/ui/forms/form-horizontal/FormTabs';

import BasicLayoutCode from '@/shared/ui/forms/form-horizontal/code/BasicIconsCode';
import BasicIconsCode from '@/shared/ui/forms/form-horizontal/code/BasicIconsCode';
import FormSeparatorCode from '@/shared/ui/forms/form-horizontal/code/FormSeparatorCode';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Horizontal Form',
  },
];

const FormHorizontal = () => {
  return (
    (<PageContainer title="Horizontal Form" description="this is Horizontal Form">
      {/* breadcrumb */}
      <Breadcrumb title="Horizontal Form" items={BCrumb} />
      {/* end breadcrumb */}
      <Grid2 container spacing={3}>
        <Grid2 size={12}>
          <ParentCard title="Basic Layout" codeModel={<BasicLayoutCode />}>
            <BasicLayout />
          </ParentCard>
        </Grid2>
        <Grid2 size={12}>
          <ParentCard title="Basic with Icons" codeModel={<BasicIconsCode />}>
            <BasicIcons />
          </ParentCard>
        </Grid2>
        <Grid2 size={12}>
          <ParentCard title="Form Separator" codeModel={<FormSeparatorCode />}>
            <FormSeparator />
          </ParentCard>
        </Grid2>
        <Grid2 size={12}>
          <ParentCard title="Form Label Alignment">
            <FormLabelAlignment />
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

export default FormHorizontal;
