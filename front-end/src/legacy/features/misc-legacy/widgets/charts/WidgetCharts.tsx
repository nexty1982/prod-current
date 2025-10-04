import Grid2 from '@mui/material/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Grid } from '@mui/material';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import YearlyBreakup from '@/features/misc-legacy/dashboards/modern/YearlyBreakup';
import Projects from '@/features/misc-legacy/dashboards/modern/Projects';
import Customers from '@/features/misc-legacy/dashboards/modern/Customers';
import SalesTwo from '@/features/misc-legacy/dashboards/ecommerce/SalesTwo';
import MonthlyEarnings from '@/features/misc-legacy/dashboards/ecommerce/MonthlyEarnings';
import SalesOverview from '@/features/misc-legacy/dashboards/ecommerce/SalesOverview';
import RevenueUpdates from '@/features/misc-legacy/dashboards/ecommerce/RevenueUpdates';
import YearlySales from '@/features/misc-legacy/dashboards/ecommerce/YearlySales';
import MostVisited from '@/features/misc-legacy/@/shared/ui/widgets/charts/MostVisited';
import PageImpressions from '@/features/misc-legacy/@/shared/ui/widgets/charts/PageImpressions';
import Followers from '@/features/misc-legacy/@/shared/ui/widgets/charts/Followers';
import Views from '@/features/misc-legacy/@/shared/ui/widgets/charts/Views';
import Earned from '@/features/misc-legacy/@/shared/ui/widgets/charts/Earned';
import CurrentValue from '@/features/misc-legacy/@/shared/ui/widgets/charts/CurrentValue';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Charts',
  },
];

const WidgetCharts = () => {
  return (
    (<PageContainer title="Charts" description="this is Charts page">
      {/* breadcrumb */}
      <Breadcrumb title="Charts" items={BCrumb} />
      {/* end breadcrumb */}
      <Grid2 container spacing={3}>
        <Grid2
          size={{
            xs: 12,
            sm: 3
          }}>
          <Followers />
        </Grid2>
        <Grid2
          size={{
            xs: 12,
            sm: 3
          }}>
          <Views />
        </Grid2>
        <Grid2
          size={{
            xs: 12,
            sm: 3
          }}>
          <Earned />
        </Grid2>
        <Grid2
          size={{
            xs: 12,
            sm: 3
          }}>
          <SalesTwo />
        </Grid2>
        <Grid2 size={12}>
          <CurrentValue />
        </Grid2>
        <Grid2
          size={{
            xs: 12,
            lg: 4
          }}>
          <Grid2 container spacing={3}>
            <Grid2 size={12}>
              <YearlyBreakup />
            </Grid2>
            <Grid2 size={12}>
              <MonthlyEarnings />
            </Grid2>
            <Grid2 size={12}>
              <MostVisited />
            </Grid2>
          </Grid2>
        </Grid2>
        <Grid2
          size={{
            xs: 12,
            lg: 4
          }}>
          <Grid2 container spacing={3}>
            <Grid2 size={12}>
              <YearlySales />
            </Grid2>
            <Grid2 size={12}>
              <PageImpressions />
            </Grid2>
            <Grid2
              size={{
                xs: 12,
                sm: 6
              }}>
              <Customers />
            </Grid2>
            <Grid2
              size={{
                xs: 12,
                sm: 6
              }}>
              <Projects />
            </Grid2>
          </Grid2>
        </Grid2>
        <Grid2
          size={{
            xs: 12,
            lg: 4
          }}>
          <Grid2 container spacing={3}>
            <Grid2 size={12}>
              <RevenueUpdates />
            </Grid2>
            <Grid2 size={12}>
              <SalesOverview />
            </Grid2>
          </Grid2>
        </Grid2>
      </Grid2>
    </PageContainer>)
  );
};

export default WidgetCharts;
