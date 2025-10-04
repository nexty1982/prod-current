import Grid2 from '@mui/material/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Grid } from '@mui/material';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import ParentCard from '@/shared/ui/ParentCard';
import ChildCard from '@/shared/ui/ChildCard';
import SimpleDialog from '@/shared/ui/mui/dialog/SimpleDialog';
import AlertDialog from '@/shared/ui/mui/dialog/AlertDialog';
import TransitionDialog from '@/shared/ui/mui/dialog/TransitionDialog';
import FormDialog from '@/shared/ui/mui/dialog/FormDialog';
import FullscreenDialog from '@/shared/ui/mui/dialog/FullscreenDialog';
import MaxWidthDialog from '@/shared/ui/mui/dialog/MaxWidthDialog';
import ScrollContentDialog from '@/features/cms/material-ui/dialog/ScrollContentDialog';
import ResponsiveDialog from '@/shared/ui/mui/dialog/ResponsiveDialog';

import SimpleCode from '@/shared/ui/mui/dialog/code/SimpleCode';
import AlertCode from '@/shared/ui/mui/dialog/code/AlertCode';
import TransitionCode from '@/shared/ui/mui/dialog/code/TransitionCode';
import FormCode from '@/shared/ui/mui/dialog/code/FormCode';
import FullScreenCode from '@/shared/ui/mui/dialog/code/FullScreenCode';
import MaxWidthCode from '@/shared/ui/mui/dialog/code/MaxWidthCode';
import ScrollingContentCode from '@/features/cms/material-ui/dialog/code/ScrollingContentCode';
import ResponsiveFullscreenCode from '@/shared/ui/mui/dialog/code/ResponsiveFullscreenCode';

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
