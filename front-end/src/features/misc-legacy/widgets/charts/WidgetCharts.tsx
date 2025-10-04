import Grid2 from '@/components/compat/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Grid } from '@mui/material';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import YearlyBreakup from '@/components/dashboards/modern/YearlyBreakup';
import Projects from '@/components/dashboards/modern/Projects';
import Customers from '@/components/dashboards/modern/Customers';
import SalesTwo from '@/components/dashboards/ecommerce/SalesTwo';
import MonthlyEarnings from '@/components/dashboards/ecommerce/MonthlyEarnings';
import SalesOverview from '@/components/dashboards/ecommerce/SalesOverview';
import RevenueUpdates from '@/components/dashboards/ecommerce/RevenueUpdates';
import YearlySales from '@/components/dashboards/ecommerce/YearlySales';
import MostVisited from '@/components/widgets/charts/MostVisited';
import PageImpressions from '@/components/widgets/charts/PageImpressions';
import Followers from '@/components/widgets/charts/Followers';
import Views from '@/components/widgets/charts/Views';
import Earned from '@/components/widgets/charts/Earned';
import CurrentValue from '@/components/widgets/charts/CurrentValue';

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
