import Grid2 from '@mui/material/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import Grid2 from '@mui/material/Grid2';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import ParentCard from '@/shared/ui/ParentCard';
import ChildCard from '@/shared/ui/ChildCard';

import DefaultButtons from '@/shared/ui/forms/elements/button/DefaultButtons';
import ColorButtons from '@/shared/ui/forms/elements/button/ColorButtons';
import IconLoadingButtons from '@/shared/ui/forms/elements/button/IconLoadingButtons';
import SizeButton from '@/shared/ui/forms/elements/button/SizeButton';

import OutlinedIconButtons from '@/shared/ui/forms/elements/button/OutlinedIconButtons';
import OutlinedSizeButton from '@/shared/ui/forms/elements/button/OutlinedSizeButton';

import TextDefaultButtons from '@/shared/ui/forms/elements/button/TextDefaultButtons';
import TextColorButtons from '@/shared/ui/forms/elements/button/TextColorButtons';
import TextIconButtons from '@/shared/ui/forms/elements/button/TextIconButtons';
import TextSizeButton from '@/shared/ui/forms/elements/button/TextSizeButton';

import IconColorButtons from '@/shared/ui/forms/elements/button/IconColorButtons';
import IconSizeButtons from '@/shared/ui/forms/elements/button/IconSizeButtons';

import FabDefaultButton from '@/shared/ui/forms/elements/button/FabDefaultButton';
import FabColorButtons from '@/shared/ui/forms/elements/button/FabColorButtons';
import FabSizeButtons from '@/shared/ui/forms/elements/button/FabSizeButtons';

import DefaultButtonGroup from '@/shared/ui/forms/elements/button/DefaultButtonGroup';
import SizeButtonGroup from '@/shared/ui/forms/elements/button/SizeButtonGroup';
import VerticalButtonGroup from '@/shared/ui/forms/elements/button/VerticalButtonGroup';
import ColorButtonGroup from '@/shared/ui/forms/elements/button/ColorButtonGroup';
import TextButtonGroup from '@/shared/ui/forms/elements/button/TextButtonGroup';
import OutlinedColorButtons from '@/shared/ui/forms/elements/button/OutlinedColorButtons';

// codeModel
import DefaultCode from '@/shared/ui/forms/elements/button/code/DefaultCode';
import ColorsCode from '@/shared/ui/forms/elements/button/code/ColorsCode';
import LoadingButtonsCode from '@/shared/ui/forms/elements/button/code/LoadingButtonsCode';
import SizesCode from '@/shared/ui/forms/elements/button/code/SizesCode';
import OutlinedCode from '@/shared/ui/forms/elements/button/code/OutlinedCode';
import OutlinedIconCode from '@/shared/ui/forms/elements/button/code/OutlinedIconCode';
import OutlineSizeCode from '@/shared/ui/forms/elements/button/code/OutlineSizeCode';
import TextCode from '@/shared/ui/forms/elements/button/code/TextCode';
import TextColorCode from '@/shared/ui/forms/elements/button/code/TextColorCode';
import TextIconColor from '@/shared/ui/forms/elements/button/code/TextIconColor';
import TextSizesCode from '@/shared/ui/forms/elements/button/code/TextSizesCode';
import IconColorCode from '@/shared/ui/forms/elements/button/code/IconColorCode';
import IconSizesCode from '@/shared/ui/forms/elements/button/code/IconSizesCode';
import FABCode from '@/shared/ui/forms/elements/button/code/FABCode';
import FABColorCode from '@/shared/ui/forms/elements/button/code/FABColorCode';
import FABSizeCode from '@/shared/ui/forms/elements/button/code/FABSizeCode';
import DefaultButtonGroupCode from '@/shared/ui/forms/elements/button/code/DefaultButtonGroupCode';
import SizeButtonGroupCode from '@/shared/ui/forms/elements/button/code/SizeButtonGroupCode';
import VerticalButtonGroupCode from '@/shared/ui/forms/elements/button/code/VerticalButtonGroupCode';
import TextButtonGroupCode from '@/shared/ui/forms/elements/button/code/TextButtonGroupCode';
import ColorButtonGroupCode from '@/shared/ui/forms/elements/button/code/ColorButtonGroupCode';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Button',
  },
];

const MuiButton = () => (
  <PageContainer title="Buttons" description="this is Buttons page">
    {/* breadcrumb */}
    <Breadcrumb title="Button" items={BCrumb} />
    {/* end breadcrumb */}
    <Grid2 container spacing={3}>
      <Grid2 size={12}>
        <ParentCard title='Buttons'>
          <Grid2 container spacing={3}>
            {/* ------------------------- row 1 ------------------------- */}
            <Grid2
              display="flex"
              alignItems="stretch"
              size={{
                xs: 12,
                lg: 6
              }}>
              <ChildCard title="Default" codeModel={<DefaultCode />}>
                <DefaultButtons />
              </ChildCard>
            </Grid2>
            {/* ------------------------- row 1 ------------------------- */}
            <Grid2
              display="flex"
              alignItems="stretch"
              size={{
                xs: 12,
                lg: 6
              }}>
              <ChildCard title="Colors" codeModel={<ColorsCode />}>
                <ColorButtons />
              </ChildCard>
            </Grid2>
            {/* ------------------------- row 1 ------------------------- */}
            <Grid2
              display="flex"
              alignItems="stretch"
              size={{
                xs: 12,
                lg: 6
              }}>
              <ChildCard title="Loading Buttons" codeModel={<LoadingButtonsCode />}>
                <IconLoadingButtons />
              </ChildCard>
            </Grid2>
            {/* ------------------------- row 1 ------------------------- */}
            <Grid2
              display="flex"
              alignItems="stretch"
              size={{
                xs: 12,
                lg: 6
              }}>
              <ChildCard title="Sizes" codeModel={<SizesCode />}>
                <SizeButton />
              </ChildCard>
            </Grid2>
            {/* ------------------------- row 1 ------------------------- */}
            <Grid2
              display="flex"
              alignItems="stretch"
              size={{
                xs: 12,
                lg: 6
              }}>
              <ChildCard title="Outlined" codeModel={<OutlinedCode />}>
                <OutlinedColorButtons />
              </ChildCard>
            </Grid2>
            {/* ------------------------- row 1 ------------------------- */}
            <Grid2
              display="flex"
              alignItems="stretch"
              size={{
                xs: 12,
                lg: 6
              }}>
              <ChildCard title="Outlined Icon" codeModel={<OutlinedIconCode />}>
                <OutlinedIconButtons />
              </ChildCard>
            </Grid2>
            {/* ------------------------- row 1 ------------------------- */}
            <Grid2
              display="flex"
              alignItems="stretch"
              size={{
                xs: 12,
                lg: 6
              }}>
              <ChildCard title="Outline Size" codeModel={<OutlineSizeCode />}>
                <OutlinedSizeButton />
              </ChildCard>
            </Grid2>
            {/* ------------------------- row 1 ------------------------- */}
            <Grid2
              display="flex"
              alignItems="stretch"
              size={{
                xs: 12,
                lg: 6
              }}>
              <ChildCard title="Text" codeModel={<TextCode />}>
                <TextDefaultButtons />
              </ChildCard>
            </Grid2>
            {/* ------------------------- row 1 ------------------------- */}
            <Grid2
              display="flex"
              alignItems="stretch"
              size={{
                xs: 12,
                lg: 6
              }}>
              <ChildCard title="Text Color" codeModel={<TextColorCode />}>
                <TextColorButtons />
              </ChildCard>
            </Grid2>
            {/* ------------------------- row 1 ------------------------- */}
            <Grid2
              display="flex"
              alignItems="stretch"
              size={{
                xs: 12,
                lg: 6
              }}>
              <ChildCard title="Text Icon" codeModel={<TextIconColor />}>
                <TextIconButtons />
              </ChildCard>
            </Grid2>
            {/* ------------------------- row 1 ------------------------- */}
            <Grid2
              display="flex"
              alignItems="stretch"
              size={{
                xs: 12,
                lg: 6
              }}>
              <ChildCard title="Text Sizes" codeModel={<TextSizesCode />}>
                <TextSizeButton />
              </ChildCard>
            </Grid2>
            {/* ------------------------- row 1 ------------------------- */}
            <Grid2
              display="flex"
              alignItems="stretch"
              size={{
                xs: 12,
                lg: 6
              }}>
              <ChildCard title="Icon Color" codeModel={<IconColorCode />}>
                <IconColorButtons />
              </ChildCard>
            </Grid2>
            {/* ------------------------- row 1 ------------------------- */}
            <Grid2
              display="flex"
              alignItems="stretch"
              size={{
                xs: 12,
                lg: 6
              }}>
              <ChildCard title="Icon Sizes" codeModel={<IconSizesCode />}>
                <IconSizeButtons />
              </ChildCard>
            </Grid2>
            {/* ------------------------- row 1 ------------------------- */}
            <Grid2
              display="flex"
              alignItems="stretch"
              size={{
                xs: 12,
                lg: 6
              }}>
              <ChildCard title="FAB" codeModel={<FABCode />}>
                <FabDefaultButton />
              </ChildCard>
            </Grid2>
            {/* ------------------------- row 1 ------------------------- */}
            <Grid2
              display="flex"
              alignItems="stretch"
              size={{
                xs: 12,
                lg: 6
              }}>
              <ChildCard title="FAB Color" codeModel={<FABColorCode />}>
                <FabColorButtons />
              </ChildCard>
            </Grid2>
            {/* ------------------------- row 1 ------------------------- */}
            <Grid2
              display="flex"
              alignItems="stretch"
              size={{
                xs: 12,
                lg: 6
              }}>
              <ChildCard title="FAB Size" codeModel={<FABSizeCode />}>
                <FabSizeButtons />
              </ChildCard>
            </Grid2>
          </Grid2>
        </ParentCard>
      </Grid2>
      <Grid2 size={12}>
        <ParentCard title='Button Group'>
          <Grid2 container spacing={3}>
            {/* ------------------------- row 1 ------------------------- */}
            <Grid2
              display="flex"
              alignItems="stretch"
              size={{
                xs: 12,
                lg: 6
              }}>
              <ChildCard title="Default" codeModel={<DefaultButtonGroupCode />}>
                <DefaultButtonGroup />
              </ChildCard>
            </Grid2>
            {/* ------------------------- row 1 ------------------------- */}
            <Grid2
              display="flex"
              alignItems="stretch"
              size={{
                xs: 12,
                lg: 6
              }}>
              <ChildCard title="Sizes" codeModel={<SizeButtonGroupCode />}>
                <SizeButtonGroup />
              </ChildCard>
            </Grid2>
            {/* ------------------------- row 1 ------------------------- */}
            <Grid2
              display="flex"
              alignItems="stretch"
              size={{
                xs: 12,
                lg: 6
              }}>
              <ChildCard title="Verical" codeModel={<VerticalButtonGroupCode />}>
                <VerticalButtonGroup />
              </ChildCard>
            </Grid2>
            {/* ------------------------- row 1 ------------------------- */}
            <Grid2
              display="flex"
              alignItems="stretch"
              size={{
                xs: 12,
                lg: 6
              }}>
              <ChildCard title="Text" codeModel={<TextButtonGroupCode />}>
                <TextButtonGroup />
              </ChildCard>
            </Grid2>
            {/* ------------------------- row 1 ------------------------- */}
            <Grid2 display="flex" alignItems="stretch" size={12}>
              <ChildCard title="Color" codeModel={<ColorButtonGroupCode />}>
                <ColorButtonGroup />
              </ChildCard>
            </Grid2>
          </Grid2>
        </ParentCard>
      </Grid2>
    </Grid2>
  </PageContainer >
);
export default MuiButton;
