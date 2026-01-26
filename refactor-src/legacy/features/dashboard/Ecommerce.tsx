// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import Grid2 from '@mui/material/Grid2';
// @ts-ignore
import React from 'react';
import { Box } from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import PageContainer from '@/shared/ui/PageContainer';

import WeeklyStats from '@/features/misc-legacy/dashboards/modern/WeeklyStats';
import YearlySales from '@/features/misc-legacy/dashboards/ecommerce/YearlySales';
import PaymentGateways from '@/features/misc-legacy/dashboards/ecommerce/PaymentGateways';
import WelcomeCard from '@/features/misc-legacy/dashboards/ecommerce/WelcomeCard';
import Expence from '@/features/misc-legacy/dashboards/ecommerce/Expence';
import Growth from '@/features/misc-legacy/dashboards/ecommerce/Growth';
import RevenueUpdates from '@/features/misc-legacy/dashboards/ecommerce/RevenueUpdates';
import SalesOverview from '@/features/misc-legacy/dashboards/ecommerce/SalesOverview';
import SalesTwo from '@/features/misc-legacy/dashboards/ecommerce/SalesTwo';
import Sales from '@/features/misc-legacy/dashboards/ecommerce/Sales';
import MonthlyEarnings from '@/features/misc-legacy/dashboards/ecommerce/MonthlyEarnings';
import ProductPerformances from '@/features/misc-legacy/dashboards/ecommerce/ProductPerformances';
import RecentTransactions from '@/features/misc-legacy/dashboards/ecommerce/RecentTransactions';

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
