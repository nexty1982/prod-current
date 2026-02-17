// material-ui
import Grid from '@mui/material/Grid';

// project imports
import SimpleRating from './SimpleRating';
import CustomizedRatings from './CustomizedRatings';
import SizeRating from './SizeRating';
import HalfRating from './HalfRating';
import HoverRating from './HoverRating';

import SubCard from 'ui-component/cards/SubCard';
import MainCard from 'ui-component/cards/MainCard';
import SecondaryAction from 'ui-component/cards/CardSecondaryAction';
import { gridSpacing } from 'store/constant';

// ===============================|| UI RATING ||=============================== //

export default function UIRating() {
  return (
    <MainCard title="Rating" secondary={<SecondaryAction link="https://next.material-ui.com/components/rating/" />}>
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SubCard title="Basic">
            <SimpleRating />
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SubCard title="Customized Icon">
            <CustomizedRatings />
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SubCard title="Size">
            <SizeRating />
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SubCard title="Half">
            <HalfRating />
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SubCard title="Hover">
            <HoverRating />
          </SubCard>
        </Grid>
      </Grid>
    </MainCard>
  );
}
