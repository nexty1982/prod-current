// material-ui
import Grid from '@mui/material/Grid';

// project imports
import SubCard from 'ui-component/cards/SubCard';
import MainCard from 'ui-component/cards/MainCard';
import SecondaryAction from 'ui-component/cards/CardSecondaryAction';
import SkeletonEarningCard from 'ui-component/cards/Skeleton/EarningCard';
import SkeletonTotalIncomeCard from 'ui-component/cards/Skeleton/TotalIncomeCard';
import SkeletonChartCard from 'ui-component/cards/Skeleton/TotalGrowthBarChart';
import SkeletonPopularCard from 'ui-component/cards/Skeleton/PopularCard';
import { gridSpacing } from 'store/constant';

// ==============================|| UI SKELETON ||============================== //

export default function UISkeleton() {
  return (
    <MainCard title="Skeleton" secondary={<SecondaryAction link="https://next.material-ui.com/components/skeleton/" />}>
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SubCard title="Example  1">
            <SkeletonEarningCard />
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SubCard title="Example 2">
            <Grid container spacing={gridSpacing}>
              <Grid size={12}>
                <SkeletonTotalIncomeCard />
              </Grid>
              <Grid size={12}>
                <SkeletonTotalIncomeCard />
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 12, md: 8 }}>
          <SubCard title="Example 3">
            <SkeletonChartCard />
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 12, md: 4 }}>
          <SubCard title="Example 4">
            <SkeletonPopularCard />
          </SubCard>
        </Grid>
      </Grid>
    </MainCard>
  );
}
