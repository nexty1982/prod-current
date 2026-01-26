import Grid2 from '@/components/compat/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import Grid from '@mui/material/Grid';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import ParentCard from '@/shared/ui/ParentCard';
import ChildCard from '@/shared/ui/ChildCard';
import ClickPopover from '@/components/material-ui/popover/ClickPopover';
import HoverPopover from '@/components/material-ui/popover/HoverPopover';
import ClickPopoverCode from '@/components/material-ui/popover/code/ClickPopoverCode';
import HoverPopoverCode from '@/components/material-ui/popover/code/HoverPopoverCode';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Popover',
  },
];

const MuiPopover = () => {
  return (
    (<PageContainer title="Popover" description="this is Popover page">
      {/* breadcrumb */}
      <Breadcrumb title="Popover" items={BCrumb} />
      {/* end breadcrumb */}
      <ParentCard title="Popover">
        <Grid2 container spacing={3}>
          <Grid2
            display="flex"
            alignItems="stretch"
            size={{
              xs: 12,
              sm: 6
            }}>
            <ChildCard title="Click" codeModel={<ClickPopoverCode />}>
              <ClickPopover />
            </ChildCard>
          </Grid2>
          <Grid2
            display="flex"
            alignItems="stretch"
            size={{
              xs: 12,
              sm: 6
            }}>
            <ChildCard title="Hover" codeModel={<HoverPopoverCode />}>
              <HoverPopover />
            </ChildCard>
          </Grid2>
        </Grid2>
      </ParentCard>
    </PageContainer>)
  );
}
export default MuiPopover;
