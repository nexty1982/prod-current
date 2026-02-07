/**
 * Portfolio Component
 * 
 * Portfolio/showcase page for OrthodoxMetrics.
 * Composes newer frontend page components.
 * 
 * Route: /frontend-pages/portfolio
 */

import React from 'react';
import PageContainer from '@/shared/ui/PageContainer';
import Banner from '@/components/frontend-pages/portfolio/Banner';
import C2a from '@/components/frontend-pages/shared/c2a';
import Footer from '@/components/frontend-pages/shared/footer';
import ScrollToTop from '@/components/frontend-pages/shared/scroll-to-top';

const Portfolio: React.FC = () => {
  return (
    <PageContainer title="Portfolio" description="this is Portfolio page">
      <Banner />
      {/* Portfolio content can be added here */}
      <C2a />
      <Footer />
      <ScrollToTop />
    </PageContainer>
  );
};

export default Portfolio;
