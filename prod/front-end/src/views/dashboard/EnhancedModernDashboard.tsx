// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import OrthodoxBanner from 'src/components/shared/OrthodoxBanner';

import TopCards from 'src/components/dashboards/modern/TopCards';
import RevenueUpdates from 'src/components/dashboards/modern/RevenueUpdates';
import YearlyBreakup from 'src/components/dashboards/modern/YearlyBreakup';
import MonthlyEarnings from 'src/components/dashboards/modern/MonthlyEarnings';
import EmployeeSalary from 'src/components/dashboards/modern/EmployeeSalary';
import Customers from 'src/components/dashboards/modern/Customers';
import Projects from 'src/components/dashboards/modern/Projects';
import Social from 'src/components/dashboards/modern/Social';
import SellingProducts from 'src/components/dashboards/modern/SellingProducts';
import WeeklyStats from 'src/components/dashboards/modern/WeeklyStats';
import TopPerformers from 'src/components/dashboards/modern/TopPerformers';
import Welcome from 'src/layouts/full/shared/welcome/Welcome';

// New Interactive Components
import WhatsNewEditor from 'src/components/dashboards/modern/WhatsNewEditor';
import MiniControlPanel from 'src/components/dashboards/modern/MiniControlPanel';
import SocialToolbar from 'src/components/dashboards/modern/SocialToolbar';
import TodaysSummary from 'src/components/dashboards/modern/TodaysSummary';
import { useAuth } from 'src/context/AuthContext';

const EnhancedModernDashboard = () => {
  const { user } = useAuth();

  return (
    <PageContainer title="Modern Dashboard" description="Enhanced Orthodox Metrics Dashboard with Interactive Components">
      <Box sx={{ position: 'relative' }}>
        {/* Social Toolbar - Top Right */}
        <SocialToolbar position="top-right" />

        {/* Orthodox Banner */}
        <Box sx={{ mb: 4 }}>
          <OrthodoxBanner />
        </Box>

        <Box display="flex" flexDirection="column" gap={3}>
          {/* What's New Section - Full Width */}
          <WhatsNewEditor
            editable={user?.role === 'church_admin' || user?.role === 'admin' || user?.role === 'super_admin'}
          />

          {/* Mini Control Panel and Today's Summary */}
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', lg: '2fr 1fr' }} gap={3}>
            <MiniControlPanel />
            <TodaysSummary />
          </Box>

          {/* Original Dashboard Components */}
          <TopCards />

          <Box display="grid" gridTemplateColumns={{ xs: '1fr', lg: '2fr 1fr' }} gap={3}>
            <RevenueUpdates />
            <Box display="flex" flexDirection="column" gap={3}>
              <YearlyBreakup />
              <MonthlyEarnings />
            </Box>
          </Box>

          <Box display="grid" gridTemplateColumns={{ xs: '1fr', lg: 'repeat(3, 1fr)' }} gap={3}>
            <EmployeeSalary />
            <Box display="flex" flexDirection="column" gap={3}>
              <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={3}>
                <Customers />
                <Projects />
              </Box>
              <Social />
            </Box>
            <SellingProducts />
          </Box>

          <Box display="grid" gridTemplateColumns={{ xs: '1fr', lg: '1fr 2fr' }} gap={3}>
            <WeeklyStats />
            <TopPerformers />
          </Box>
        </Box>

        <Welcome />
      </Box>
    </PageContainer>
  );
};

export default EnhancedModernDashboard;
