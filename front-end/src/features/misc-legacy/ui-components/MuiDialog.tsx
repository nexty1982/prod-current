import Grid2 from '@/components/compat/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Grid } from '@mui/material';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import ParentCard from '@/shared/ui/ParentCard';
import ChildCard from '@/shared/ui/ChildCard';
import SimpleDialog from '@/components/material-ui/dialog/SimpleDialog';
import AlertDialog from '@/components/material-ui/dialog/AlertDialog';
import TransitionDialog from '@/components/material-ui/dialog/TransitionDialog';
import FormDialog from '@/components/material-ui/dialog/FormDialog';
import FullscreenDialog from '@/components/material-ui/dialog/FullscreenDialog';
import MaxWidthDialog from '@/components/material-ui/dialog/MaxWidthDialog';
import ScrollContentDialog from '@/components/material-ui/dialog/ScrollContentDialog';
import ResponsiveDialog from '@/components/material-ui/dialog/ResponsiveDialog';

import SimpleCode from '@/components/material-ui/dialog/code/SimpleCode';
import AlertCode from '@/components/material-ui/dialog/code/AlertCode';
import TransitionCode from '@/components/material-ui/dialog/code/TransitionCode';
import FormCode from '@/components/material-ui/dialog/code/FormCode';
import FullScreenCode from '@/components/material-ui/dialog/code/FullScreenCode';
import MaxWidthCode from '@/components/material-ui/dialog/code/MaxWidthCode';
import ScrollingContentCode from '@/components/material-ui/dialog/code/ScrollingContentCode';
import ResponsiveFullscreenCode from '@/components/material-ui/dialog/code/ResponsiveFullscreenCode';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Dialog',
  },
];

const MuiDialog = () => (
  <PageContainer title="Dialog" description="this is Dialog page">
    {/* breadcrumb */}
    <Breadcrumb title="Dialog" items={BCrumb} />
    {/* end breadcrumb */}

    <ParentCard title="Dialog">
      <Grid2 container spacing={3}>
        <Grid2
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            lg: 4,
            sm: 6
          }}>
          <ChildCard title="Simple" codeModel={<SimpleCode />}>
            <SimpleDialog />
          </ChildCard>
        </Grid2>
        <Grid2
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            lg: 4,
            sm: 6
          }}>
          <ChildCard title="Alert" codeModel={<AlertCode />}>
            <AlertDialog />
          </ChildCard>
        </Grid2>
        <Grid2
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            lg: 4,
            sm: 6
          }}>
          <ChildCard title="Transition" codeModel={<TransitionCode />}>
            <TransitionDialog />
          </ChildCard>
        </Grid2>
        <Grid2
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            lg: 4,
            sm: 6
          }}>
          <ChildCard title="Form" codeModel={<FormCode />}>
            <FormDialog />
          </ChildCard>
        </Grid2>
        <Grid2
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            lg: 4,
            sm: 6
          }}>
          <ChildCard title="Full screen" codeModel={<FullScreenCode />}>
            <FullscreenDialog />
          </ChildCard>
        </Grid2>
        <Grid2
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            lg: 4,
            sm: 6
          }}>
          <ChildCard title="Max width" codeModel={<MaxWidthCode />}>
            <MaxWidthDialog />
          </ChildCard>
        </Grid2>
        <Grid2
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            lg: 4,
            sm: 6
          }}>
          <ChildCard title="Scrolling Content" codeModel={<ScrollingContentCode />}>
            <ScrollContentDialog />
          </ChildCard>
        </Grid2>
        <Grid2
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            lg: 4,
            sm: 6
          }}>
          <ChildCard title="Responsive Fullscreen" codeModel={<ResponsiveFullscreenCode />}>
            <ResponsiveDialog />
          </ChildCard>
        </Grid2>
      </Grid2>
    </ParentCard>
  </PageContainer>
);
export default MuiDialog;
