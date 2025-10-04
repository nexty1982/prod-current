import Grid2 from '@mui/material/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Box, Grid } from '@mui/material';
import PageContainer from '@/shared/ui/PageContainer';

import WeeklyStats from '@/features/admin/dashboards/modern/WeeklyStats';
import YearlySales from '@/features/admin/dashboards/ecommerce/YearlySales';
import PaymentGateways from '@/features/admin/dashboards/ecommerce/PaymentGateways';
import WelcomeCard from '@/features/admin/dashboards/ecommerce/WelcomeCard';
import Expence from '@/features/admin/dashboards/ecommerce/Expence';
import Growth from '@/features/admin/dashboards/ecommerce/Growth';
import RevenueUpdates from '@/features/admin/dashboards/ecommerce/RevenueUpdates';
import SalesOverview from '@/features/admin/dashboards/ecommerce/SalesOverview';
import SalesTwo from '@/features/admin/dashboards/ecommerce/SalesTwo';
import Sales from '@/features/admin/dashboards/ecommerce/Sales';
import MonthlyEarnings from '@/features/admin/dashboards/ecommerce/MonthlyEarnings';
import ProductPerformances from '@/features/admin/dashboards/ecommerce/ProductPerformances';
import RecentTransactions from '@/features/admin/dashboards/ecommerce/RecentTransactions';

const Ecommerce = () => {
  return (
    (<PageContainer title="eCommerce Dashboard" description="this is eCommerce Dashboard page">
      <Box mt={3}>
        <Grid2 container spacing={3}>
          {/* column */}
          <Grid2
            size={{
              xs: 12,
              lg: 8
            }}>
            <WelcomeCard />
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
                <Expence />
              </Grid2>
              <Grid2
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <Sales />
              </Grid2>
            </Grid2>
          </Grid2>
          <Grid2
            size={{
              xs: 12,
              sm: 6,
              lg: 4
            }}>
            <RevenueUpdates />
          </Grid2>
          <Grid2
            size={{
              xs: 12,
              sm: 6,
              lg: 4
            }}>
            <SalesOverview />
          </Grid2>
          <Grid2
            size={{
              xs: 12,
              sm: 6,
              lg: 4
            }}>
            <Grid2 container spacing={3}>
              <Grid2
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <SalesTwo />
              </Grid2>
              <Grid2
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <Growth />
              </Grid2>
              <Grid2 size={12}>
                <MonthlyEarnings />
              </Grid2>
            </Grid2>
          </Grid2>
          {/* column */}
          <Grid2
            size={{
              xs: 12,
              sm: 6,
              lg: 4
            }}>
            <WeeklyStats />
          </Grid2>
          {/* column */}
          <Grid2
            size={{
              xs: 12,
              lg: 4
            }}>
            <YearlySales />
          </Grid2>
          {/* column */}
          <Grid2
            size={{
              xs: 12,
              lg: 4
            }}>
            <PaymentGateways />
          </Grid2>
          {/* column */}

          <Grid2
            size={{
              xs: 12,
              lg: 4
            }}>
            <RecentTransactions />
          </Grid2>
          {/* column */}

          <Grid2
            size={{
              xs: 12,
              lg: 8
            }}>
            <ProductPerformances />
          </Grid2>
        </Grid2>
      </Box>
    </PageContainer>)
  );
};

export default Ecommerce;
