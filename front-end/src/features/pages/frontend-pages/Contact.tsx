/**
 * Contact Component
 * 
 * Contact page for OrthodoxMetrics.
 * Composes newer frontend page components.
 * 
 * Route: /frontend-pages/contact
 */

import React from 'react';
import PageContainer from '@/shared/ui/PageContainer';
import HeaderAlert from '@/components/frontend-pages/shared/header/HeaderAlert';
import HpHeader from '@/components/frontend-pages/shared/header/HpHeader';
import Banner from '@/components/frontend-pages/contact/banner';
import Form from '@/components/frontend-pages/contact/form';
import C2a from '@/components/frontend-pages/shared/c2a';
import Footer from '@/components/frontend-pages/shared/footer';
import ScrollToTop from '@/components/frontend-pages/shared/scroll-to-top';

const Contact: React.FC = () => {
  return (
    <PageContainer title="Contact" description="Get in touch with us for support or inquiries">
      <HeaderAlert />
      <HpHeader />
      <Banner />
      <Form />
      <C2a />
      <Footer />
      <ScrollToTop />
    </PageContainer>
  );
};

export default Contact;
