/**
 * About Component
 * 
 * About page for OrthodoxMetrics.
 * Composes newer frontend page components.
 * 
 * Route: /frontend-pages/about
 */

import React from 'react';
import PageContainer from '@/shared/ui/PageContainer';
import HeaderAlert from '@/components/frontend-pages/shared/header/HeaderAlert';
import HpHeader from '@/components/frontend-pages/shared/header/HpHeader';
import Banner from '@/components/frontend-pages/about/banner';
import Process from '@/components/frontend-pages/about/process';
import KeyMetric from '@/components/frontend-pages/about/key-metric';
import Leadership from '@/components/frontend-pages/shared/leadership';
import Reviews from '@/components/frontend-pages/shared/reviews';
import PricingSection from '@/components/frontend-pages/shared/pricing';
import C2a from '@/components/frontend-pages/shared/c2a';
import Footer from '@/components/frontend-pages/shared/footer';
import ScrollToTop from '@/components/frontend-pages/shared/scroll-to-top';

const About: React.FC = () => {
  return (
    <PageContainer title="About" description="Learn about OrthodoxMetrics and our mission">
      <HeaderAlert />
      <HpHeader />
      <Banner />
      <Process />
      <KeyMetric />
      <Leadership />
      <Reviews />
      <PricingSection />
      <C2a />
      <Footer />
      <ScrollToTop />
    </PageContainer>
  );
};

export default About;
