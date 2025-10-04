import Grid2 from '@mui/material/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import ParentCard from '@/shared/ui/ParentCard';
import ChildCard from '@/shared/ui/ChildCard';

import Grid2 from '@mui/material/Grid2';

// custom components
import PositionCheckbox from '@/shared/ui/forms/elements/checkbox/Position";
import SizesCheckbox from '@/shared/ui/forms/elements/checkbox/Sizes";
import DefaultcolorsCheckbox from '@/shared/ui/forms/elements/checkbox/DefaultColors"
import CustomEleCheckbox from '@/shared/ui/forms/elements/checkbox/Custom";
import DefaultCheckbox from '@/shared/ui/forms/elements/checkbox/Default";
import ColorsCheckbox from '@/shared/ui/forms/elements/checkbox/Colors";

// codeModel
import CustomEleCheckboxCode from '@/shared/ui/forms/elements/checkbox/code/CustomEleCheckboxCode';
import ColorsCheckboxCode from '@/shared/ui/forms/elements/checkbox/code/ColorsCheckboxCode';
import DefaultCheckboxCode from '@/shared/ui/forms/elements/checkbox/code/DefaultCheckboxCode';
import DefaultcolorsCheckboxCode from '@/shared/ui/forms/elements/checkbox/code/DefaultcolorsCheckboxCode';
import SizesCheckboxCode from '@/shared/ui/forms/elements/checkbox/code/SizesCheckboxCode';
import PositionCheckboxCode from '@/shared/ui/forms/elements/checkbox/code/PositionCheckboxCode';
const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Checkbox',
  },
];

const MuiCheckbox = () => {

  return (
    (<PageContainer title="Checkbox" description="this is Checkbox page">
      {/* breadcrumb */}
      <Breadcrumb title="Checkbox" items={BCrumb} />
      {/* end breadcrumb */}
      <ParentCard title="Checkbox">
        <Grid2 container spacing={3}>
          {/* ------------------------------------------------------------------- */}
          {/* Custom  */}
          {/* ------------------------------------------------------------------- */}
          <Grid2
            display="flex"
            alignItems="stretch"
            size={{
              xs: 12,
              lg: 6,
              sm: 6
            }}>
            <ChildCard title="Custom" codeModel={<CustomEleCheckboxCode />}>
              <CustomEleCheckbox />
            </ChildCard>
          </Grid2>
          {/* ------------------------------------------------------------------- */}
          {/* Colors  */}
          {/* ------------------------------------------------------------------- */}
          <Grid2
            display="flex"
            alignItems="stretch"
            size={{
              xs: 12,
              lg: 6,
              sm: 6
            }}>
            <ChildCard title="Colors" codeModel={<ColorsCheckboxCode />}>
              <ColorsCheckbox />
            </ChildCard>
          </Grid2>
          {/* ------------------------------------------------------------------- */}
          {/* Default Checkbox */}
          {/* ------------------------------------------------------------------- */}
          <Grid2
            display="flex"
            alignItems="stretch"
            size={{
              xs: 12,
              lg: 6,
              sm: 6
            }}>
            <ChildCard title="Default" codeModel={<DefaultCheckboxCode />}>
              <DefaultCheckbox />
            </ChildCard>
          </Grid2>
          {/* ------------------------------------------------------------------- */}
          {/* Default with colors */}
          {/* ------------------------------------------------------------------- */}
          <Grid2
            display="flex"
            alignItems="stretch"
            size={{
              xs: 12,
              lg: 6,
              sm: 6
            }}>
            <ChildCard title="Default with Colors" codeModel={<DefaultcolorsCheckboxCode />}>
              <DefaultcolorsCheckbox />
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
            <ChildCard title="Sizes & Custom Icon" codeModel={<SizesCheckboxCode />}>
              <SizesCheckbox />
            </ChildCard>
          </Grid2>
          {/* ------------------------------------------------------------------- */}
          {/* Position */}
          {/* ------------------------------------------------------------------- */}
          <Grid2
            display="flex"
            alignItems="stretch"
            size={{
              xs: 12,
              lg: 6,
              sm: 6
            }}>
            <ChildCard title="Position" codeModel={<PositionCheckboxCode />}>
              <PositionCheckbox />
            </ChildCard>
          </Grid2>
        </Grid2>
      </ParentCard>
    </PageContainer>)
  );
};

export default MuiCheckbox;
