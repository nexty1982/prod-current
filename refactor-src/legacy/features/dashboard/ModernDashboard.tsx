// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Box } from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import PageContainer from '@/shared/ui/PageContainer';

import TopCards from '@/features/misc-legacy/dashboards/modern/TopCards';
import RevenueUpdates from '@/features/admin/dashboards/modern/RevenueUpdates';
import YearlyBreakup from '@/features/misc-legacy/dashboards/modern/YearlyBreakup';
import MonthlyEarnings from '@/features/admin/dashboards/modern/MonthlyEarnings';
import EmployeeSalary from '@/features/admin/dashboards/modern/EmployeeSalary';
import Customers from '@/features/misc-legacy/dashboards/modern/Customers';
import Projects from '@/features/misc-legacy/dashboards/modern/Projects';
import Social from '@/features/admin/dashboards/modern/Social';
import SellingProducts from '@/features/admin/dashboards/modern/SellingProducts';
import WeeklyStats from '@/features/misc-legacy/dashboards/modern/WeeklyStats';
import TopPerformers from '@/features/admin/dashboards/modern/TopPerformers';
import Welcome from '@/layouts/full/shared/welcome/Welcome';

const Modern = () => {
  return (
    (<PageContainer title="Modern Dashboard" description="this is Modern Dashboard page">
      <Box>
        <Grid2 container spacing={3}>
          {/* column */}
          <Grid2
            size={{
              xs: 12,
              lg: 12
            }}>
            <TopCards />
          </Grid2>
          {/* column */}
          <Grid2
            size={{
              xs: 12,
              lg: 8
            }}>
            <RevenueUpdates />
          </Grid2>
          {/* column */}
          <Grid2
            size={{
              xs: 12,
              lg: 4
            }}>
            <Grid2 container spacing={3}>
              <Grid2
                size={{
                  xs: 12,
                  sm: 6,
                  lg: 12
                }}>
                <YearlyBreakup />
              </Grid2>
              <Grid2
                size={{
                  xs: 12,
                  sm: 6,
                  lg: 12
                }}>
                <MonthlyEarnings />
              </Grid2>
            </Grid2>
          </Grid2>
          {/* column */}
          <Grid2
            size={{
              xs: 12,
              lg: 4
            }}>
            <EmployeeSalary />
          </Grid2>
          {/* column */}
          <Grid2
            size={{
              xs: 12,
              lg: 4
            }}>
            <Grid2 container spacing={3}>
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
              <Grid2 size={12}>
                <Social />
              </Grid2>
            </Grid2>
          </Grid2>
          {/* column */}
          <Grid2
            size={{
              xs: 12,
              lg: 4
            }}>
            <SellingProducts />
          </Grid2>
          {/* column */}
          <Grid2
            size={{
              xs: 12,
              lg: 4
            }}>
            <WeeklyStats />
          </Grid2>
          {/* column */}
          <Grid2
            size={{
              xs: 12,
              lg: 8
            }}>
            <TopPerformers />
          </Grid2>
        </Grid2>
        {/* column */}
        <Welcome />
      </Box>
    </PageContainer>)
  );
};

export default Modern;
