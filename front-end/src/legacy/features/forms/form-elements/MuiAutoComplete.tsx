// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import Grid2 from '@mui/material/Grid2';

import ComboBoxAutocomplete from '@/shared/ui/forms/elements/autoComplete/ComboBoxAutocomplete';
import CountrySelectAutocomplete from '@/shared/ui/forms/elements/autoComplete/CountrySelectAutocomplete';
import ControlledStateAutocomplete from '@/shared/ui/forms/elements/autoComplete/ControlledStateAutocomplete';
import FreeSoloAutocomplete from '@/shared/ui/forms/elements/autoComplete/FreeSoloAutocomplete';
import MultipleValuesAutocomplete from '@/shared/ui/forms/elements/autoComplete/MultipleValuesAutocomplete';
import CheckboxesAutocomplete from '@/shared/ui/forms/elements/autoComplete/CheckboxesAutocomplete';
import SizesAutocomplete from '@/shared/ui/forms/elements/autoComplete/SizesAutocomplete';

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import ParentCard from '@/shared/ui/ParentCard';
import ChildCard from '@/shared/ui/ChildCard';

// codeModel
import ComboBoxCode from '@/shared/ui/forms/elements/autoComplete/code/ComboBoxCode';
import CountrySelectCode from '@/shared/ui/forms/elements/autoComplete/code/CountrySelectCode';
import ControlledStateCode from '@/shared/ui/forms/elements/autoComplete/code/ControlledStateCode';
import FreeSoloCode from '@/shared/ui/forms/elements/autoComplete/code/FreeSoloCode';
import MultipleValuesCode from '@/shared/ui/forms/elements/autoComplete/code/MultipleValuesCode';
import CheckboxesCode from '@/shared/ui/forms/elements/autoComplete/code/CheckboxesCode';
import SizesCode from '@/shared/ui/forms/elements/autoComplete/code/SizesCode';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'AutoComplete',
  },
];

const MuiAutoComplete = () => (
  <PageContainer title="Autocomplete" description="this is Autocomplete page">
    {/* breadcrumb */}
    <Breadcrumb title="AutoComplete" items={BCrumb} />
    {/* end breadcrumb */}

    <ParentCard title="Autocomplete">
      <Grid2 container spacing={3}>
        <Grid2
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            lg: 4,
            sm: 6
          }}>
          <ChildCard title="Combo Box" codeModel={<ComboBoxCode />}>
            <ComboBoxAutocomplete />
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
          <ChildCard title="Country Select" codeModel={<CountrySelectCode />}>
            <CountrySelectAutocomplete />
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
          <ChildCard title="Controlled State" codeModel={<ControlledStateCode />}>
            <ControlledStateAutocomplete />
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
          <ChildCard title="Free Solo" codeModel={<FreeSoloCode />}>
            <FreeSoloAutocomplete />
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
          <ChildCard title="Multiple Values" codeModel={<MultipleValuesCode />}>
            <MultipleValuesAutocomplete />
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
          <ChildCard title="Checkboxes" codeModel={<CheckboxesCode />}>
            <CheckboxesAutocomplete />
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
          <ChildCard title="Sizes" codeModel={<SizesCode />}>
            <SizesAutocomplete />
          </ChildCard>
        </Grid2>
      </Grid2>
    </ParentCard>
  </PageContainer>
);
export default MuiAutoComplete;
