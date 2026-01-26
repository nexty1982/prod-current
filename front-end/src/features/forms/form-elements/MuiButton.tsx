// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import Grid from '@/components/compat/Grid2';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import ParentCard from '@/shared/ui/ParentCard';
import ChildCard from '@/shared/ui/ChildCard';

import DefaultButtons from '@/components/forms/form-elements/button/DefaultButtons';
import ColorButtons from '@/components/forms/form-elements/button/ColorButtons';
import IconLoadingButtons from '@/components/forms/form-elements/button/IconLoadingButtons';
import SizeButton from '@/components/forms/form-elements/button/SizeButton';

import OutlinedIconButtons from '@/components/forms/form-elements/button/OutlinedIconButtons';
import OutlinedSizeButton from '@/components/forms/form-elements/button/OutlinedSizeButton';

import TextDefaultButtons from '@/components/forms/form-elements/button/TextDefaultButtons';
import TextColorButtons from '@/components/forms/form-elements/button/TextColorButtons';
import TextIconButtons from '@/components/forms/form-elements/button/TextIconButtons';
import TextSizeButton from '@/components/forms/form-elements/button/TextSizeButton';

import IconColorButtons from '@/components/forms/form-elements/button/IconColorButtons';
import IconSizeButtons from '@/components/forms/form-elements/button/IconSizeButtons';

import FabDefaultButton from '@/components/forms/form-elements/button/FabDefaultButton';
import FabColorButtons from '@/components/forms/form-elements/button/FabColorButtons';
import FabSizeButtons from '@/components/forms/form-elements/button/FabSizeButtons';

import DefaultButtonGroup from '@/components/forms/form-elements/button/DefaultButtonGroup';
import SizeButtonGroup from '@/components/forms/form-elements/button/SizeButtonGroup';
import VerticalButtonGroup from '@/components/forms/form-elements/button/VerticalButtonGroup';
import ColorButtonGroup from '@/components/forms/form-elements/button/ColorButtonGroup';
import TextButtonGroup from '@/components/forms/form-elements/button/TextButtonGroup';
import OutlinedColorButtons from '@/components/forms/form-elements/button/OutlinedColorButtons';

// codeModel
import DefaultCode from '@/components/forms/form-elements/button/code/DefaultCode';
import ColorsCode from '@/components/forms/form-elements/button/code/ColorsCode';
import LoadingButtonsCode from '@/components/forms/form-elements/button/code/LoadingButtonsCode';
import SizesCode from '@/components/forms/form-elements/button/code/SizesCode';
import OutlinedCode from '@/components/forms/form-elements/button/code/OutlinedCode';
import OutlinedIconCode from '@/components/forms/form-elements/button/code/OutlinedIconCode';
import OutlineSizeCode from '@/components/forms/form-elements/button/code/OutlineSizeCode';
import TextCode from '@/components/forms/form-elements/button/code/TextCode';
import TextColorCode from '@/components/forms/form-elements/button/code/TextColorCode';
import TextIconColor from '@/components/forms/form-elements/button/code/TextIconColor';
import TextSizesCode from '@/components/forms/form-elements/button/code/TextSizesCode';
import IconColorCode from '@/components/forms/form-elements/button/code/IconColorCode';
import IconSizesCode from '@/components/forms/form-elements/button/code/IconSizesCode';
import FABCode from '@/components/forms/form-elements/button/code/FABCode';
import FABColorCode from '@/components/forms/form-elements/button/code/FABColorCode';
import FABSizeCode from '@/components/forms/form-elements/button/code/FABSizeCode';
import DefaultButtonGroupCode from '@/components/forms/form-elements/button/code/DefaultButtonGroupCode';
import SizeButtonGroupCode from '@/components/forms/form-elements/button/code/SizeButtonGroupCode';
import VerticalButtonGroupCode from '@/components/forms/form-elements/button/code/VerticalButtonGroupCode';
import TextButtonGroupCode from '@/components/forms/form-elements/button/code/TextButtonGroupCode';
import ColorButtonGroupCode from '@/components/forms/form-elements/button/code/ColorButtonGroupCode';

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
