import Grid2 from '@mui/material/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import Grid2 from '@mui/material/Grid2';
import ParentCard from '@/shared/ui/ParentCard';
import ChildCard from '@/shared/ui/ChildCard';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import CustomExSwitch from '@/shared/ui/forms/elements/switch/Custom';
import DefaultSwitch from '@/shared/ui/forms/elements/switch/Default';
import DefaultLabelSwitch from '@/shared/ui/forms/elements/switch/DefaultLabel';
import SizesSwitch from '@/shared/ui/forms/elements/switch/Sizes';
import ColorsSwitch from '@/shared/ui/forms/elements/switch/Colors';
import PositionSwitch from '@/shared/ui/forms/elements/switch/Position';

import CustomSwitchCode from '@/shared/ui/forms/elements/switch/code/ColorsSwitchCode';
import DefaultSwitchCode from '@/shared/ui/forms/elements/switch/code/DefaultSwitchCode';
import DefaultLabelSwitchCode from '@/shared/ui/forms/elements/switch/code/DefaultLabelSwitchCode';
import SizesSwitchCode from '@/shared/ui/forms/elements/switch/code/SizesSwitchCode';
import ColorsSwitchCode from '@/shared/ui/forms/elements/switch/code/ColorsSwitchCode';
import PositionSwitchCode from '@/shared/ui/forms/elements/switch/code/PositionSwitchCode';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Switch',
  },
];

const MuiSwitch = () => (
  <PageContainer title="Switch" description="this is Switch page">
    {/* breadcrumb */}
    <Breadcrumb title="Switch" items={BCrumb} />
    {/* end breadcrumb */}
    <ParentCard title="Switch">
      <Grid2 container spacing={3}>
        {/* ------------------------------------------------------------------- */}
        {/* Custom */}
        {/* ------------------------------------------------------------------- */}
        <Grid2
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            lg: 6,
            sm: 6
          }}>
          <ChildCard title="Custom" codeModel={<CustomSwitchCode />}>
            <CustomExSwitch />
          </ChildCard>
        </Grid2>
        {/* ------------------------------------------------------------------- */}
        {/* Default */}
        {/* ------------------------------------------------------------------- */}
        <Grid2
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            lg: 6,
            sm: 6
          }}>
          <ChildCard title="Default" codeModel={<DefaultSwitchCode />}>
            <DefaultSwitch />
          </ChildCard>
        </Grid2>
        {/* ------------------------------------------------------------------- */}
        {/* Default with label */}
        {/* ------------------------------------------------------------------- */}
        <Grid2
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            lg: 6,
            sm: 6
          }}>
          <ChildCard title="Default with Label" codeModel={<DefaultLabelSwitchCode />}>
            <DefaultLabelSwitch />
          </ChildCard>
        </Grid2>
        {/* ------------------------------------------------------------------- */}
        {/* Sizes */}
        {/* ------------------------------------------------------------------- */}
        <Grid2
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            lg: 6,
            sm: 6
          }}>
          <ChildCard title="Sizes" codeModel={<SizesSwitchCode />}>
            <SizesSwitch />
          </ChildCard>
        </Grid2>
        {/* ------------------------------------------------------------------- */}
        {/* Default Colors */}
        {/* ------------------------------------------------------------------- */}
        <Grid2
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            lg: 6,
            sm: 6
          }}>
          <ChildCard title="Default Colors" codeModel={<ColorsSwitchCode />}>
            <ColorsSwitch />
          </ChildCard>
        </Grid2>
        {/* ------------------------------------------------------------------- */}
        {/* Placement */}
        {/* ------------------------------------------------------------------- */}
        <Grid2
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            lg: 6,
            sm: 6
          }}>
          <ChildCard title="Placement" codeModel={<PositionSwitchCode />}>
            <PositionSwitch />
          </ChildCard>
        </Grid2>
      </Grid2>
    </ParentCard>
  </PageContainer>
);
export default MuiSwitch;
