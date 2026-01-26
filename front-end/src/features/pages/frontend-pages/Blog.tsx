/**
 * Blog Component
 * 
 * Blog page for OrthodoxMetrics.
 * Composes newer frontend page components.
 * 
 * Route: /frontend-pages/blog
 */

import React from 'react';
import { Container } from '@mui/material';
import PageContainer from '@/shared/ui/PageContainer';
import HeaderAlert from '@/components/frontend-pages/shared/header/HeaderAlert';
import HpHeader from '@/components/frontend-pages/shared/header/HpHeader';
import Banner from '@/components/frontend-pages/blog/banner';
import C2a from '@/components/frontend-pages/shared/c2a';
import Footer from '@/components/frontend-pages/shared/footer';
import ScrollToTop from '@/components/frontend-pages/shared/scroll-to-top';
import BlogListing from '@/components/apps/blog/BlogListing';
import { BlogProvider } from '@/context/BlogContext';

const BlogPage: React.FC = () => {
  return (
    <BlogProvider>
      <PageContainer title="Blog" description="Latest news, updates, and guides">
        <HeaderAlert />
        <HpHeader />
        <Banner />
        <Container maxWidth="lg" sx={{ mt: 5 }}>
          <BlogListing />
        </Container>
        <C2a />
        <Footer />
        <ScrollToTop />
      </PageContainer>
    </BlogProvider>
  );
};

export default BlogPage;
