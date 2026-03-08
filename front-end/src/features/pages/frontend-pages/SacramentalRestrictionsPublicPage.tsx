/**
 * SacramentalRestrictionsPublicPage.tsx
 *
 * Public-facing page for the sacramental date restrictions viewer.
 * No authentication required.
 */

import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import HpHeader from '@/components/frontend-pages/shared/header/HpHeader';
import Footer from '@/components/frontend-pages/shared/footer';
import ScrollToTop from '@/components/frontend-pages/shared/scroll-to-top';
import PageContainer from '@/shared/ui/PageContainer';
import SacramentalRestrictionsViewer from '@/shared/components/SacramentalRestrictionsViewer';

const SacramentalRestrictionsPublicPage: React.FC = () => {
  return (
    <PageContainer title="Sacramental Date Restrictions" description="Eastern Orthodox sacramental date restrictions reference">
      <HpHeader />
      <Container maxWidth="lg" sx={{ pt: 4, pb: 6 }}>
        <Typography variant="h3" sx={{ mb: 1 }}>
          Sacramental Date Restrictions
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Reference for Eastern Orthodox sacramental date restrictions — periods when baptisms,
          marriages, and funerals are restricted or require special consideration.
        </Typography>
        <SacramentalRestrictionsViewer />
      </Container>
      <Footer />
      <ScrollToTop />
    </PageContainer>
  );
};

export default SacramentalRestrictionsPublicPage;
