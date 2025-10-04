import Grid2 from '@/components/compat/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import Grid from '@mui/material/Grid';
import ParentCard from '@/shared/ui/ParentCard';
import ChildCard from '@/shared/ui/ChildCard';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import ColorLabelRadio from "@/components/forms/form-elements/radio/ColorLabel";
import DefaultRadio from "@/components/forms/form-elements/radio/Default";
import ColorsRadio from "@/components/forms/form-elements/radio/Colors";
import SizesRadio from "@/components/forms/form-elements/radio/Sizes";
import CustomExRadio from "@/components/forms/form-elements/radio/Custom";
import PositionRadio from "@/components/forms/form-elements/radio/Position";

// codeModel
import CustomExRadioCode from '@/components/forms/form-elements/radio/code/CustomExRadioCode';
import ColorLabelRadioCode from '@/components/forms/form-elements/radio/code/ColorLabelRadioCode';
import DefaultRadioCode from '@/components/forms/form-elements/radio/code/DefaultRadioCode';
import ColorsRadioCode from '@/components/forms/form-elements/radio/code/ColorsRadioCode';
import SizesRadioCode from '@/components/forms/form-elements/radio/code/SizesRadioCode';
import PositionRadioCode from '@/components/forms/form-elements/radio/code/PositionRadioCode';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Radio',
  },
];

const ExRadio = () => {

  return (
    (<PageContainer title="Radio" description="this is Radio page">
      {/* breadcrumb */}
      <Breadcrumb title="Radio" items={BCrumb} />
      {/* end breadcrumb */}
      <ParentCard title="Radio">
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
            <ChildCard title="Custom" codeModel={<CustomExRadioCode />}>
              <CustomExRadio />
            </ChildCard>
          </Grid2>
          {/* ------------------------------------------------------------------- */}
          {/* Color with label */}
          {/* ------------------------------------------------------------------- */}
          <Grid2
            display="flex"
            alignItems="stretch"
            size={{
              xs: 12,
              lg: 6,
              sm: 6
            }}>
            <ChildCard title="Color with Label" codeModel={<ColorLabelRadioCode />}>
              <ColorLabelRadio />
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
            <ChildCard title="Default" codeModel={<DefaultRadioCode />}>
              <DefaultRadio />
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
            <ChildCard title="Default Colors" codeModel={<ColorsRadioCode />}>
              <ColorsRadio />
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
            <ChildCard title="Sizes" codeModel={<SizesRadioCode />}>
              <SizesRadio />
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
            <ChildCard title="Position" codeModel={<PositionRadioCode />}>
              <PositionRadio />
            </ChildCard>
          </Grid2>
        </Grid2>
      </ParentCard>
    </PageContainer>)
  );
};

export default ExRadio;
