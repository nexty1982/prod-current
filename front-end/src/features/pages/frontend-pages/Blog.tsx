/**
 * Blog Component
 * 
 * Blog page for OrthodoxMetrics.
 * Composes newer frontend page components.
 * 
 * Route: /frontend-pages/blog
 */

import BlogListing from '@/components/apps/blog/BlogListing';
import Banner from '@/components/frontend-pages/blog/banner';
import C2a from '@/components/frontend-pages/shared/c2a';
import Footer from '@/components/frontend-pages/shared/footer';
import HpHeader from '@/components/frontend-pages/shared/header/HpHeader';
import ScrollToTop from '@/components/frontend-pages/shared/scroll-to-top';
import { BlogProvider } from '@/context/BlogContext';
import PageContainer from '@/shared/ui/PageContainer';
import { Container } from '@mui/material';
import React from 'react';

const BlogPage: React.FC = () => {
  return (
    <BlogProvider>
      <PageContainer title="Blog" description="this is Blog page">
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
