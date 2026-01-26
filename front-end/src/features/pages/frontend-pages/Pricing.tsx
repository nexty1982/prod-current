/**
 * Pricing Component
 * 
 * Pricing page for OrthodoxMetrics.
 * Composes newer frontend page components.
 * 
 * Route: /frontend-pages/pricing
 */

import React from 'react';
import PageContainer from '@/shared/ui/PageContainer';
import HeaderAlert from '@/components/frontend-pages/shared/header/HeaderAlert';
import HpHeader from '@/components/frontend-pages/shared/header/HpHeader';
import Banner from '@/components/frontend-pages/pricing/Banner';
import PricingSection from '@/components/frontend-pages/shared/pricing';
import C2a from '@/components/frontend-pages/shared/c2a';
import Footer from '@/components/frontend-pages/shared/footer';
import ScrollToTop from '@/components/frontend-pages/shared/scroll-to-top';

const PricingPage: React.FC = () => {
  return (
    <PageContainer title="Pricing" description="Choose the plan that's right for your church">
      <HeaderAlert />
      <HpHeader />
      <Banner />
      <PricingSection />
      <C2a />
      <Footer />
      <ScrollToTop />
    </PageContainer>
  );
};

export default PricingPage;
