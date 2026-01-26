import PageContainer from '@/shared/ui/PageContainer';
import HeaderAlert from '@/features/misc-legacy/frontend-pages/shared/header/HeaderAlert';
import HpHeader from '@/features/misc-legacy/frontend-pages/shared/header/HpHeader';
import C2a from '@/features/misc-legacy/frontend-pages/shared/c2a';
import Footer from '@/features/misc-legacy/frontend-pages/shared/footer';
import Banner from '@/features/misc-legacy/frontend-pages/portfolio/Banner';
import ScrollToTop from '@/features/misc-legacy/frontend-pages/shared/scroll-to-top';
import GalleryCard from '@/features/misc-legacy/apps/userprofile/gallery/GalleryCard';
import { Box, Container } from '@mui/material';
import { UserDataProvider } from "@/context/UserDataContext/index";

const PricingPage = () => {
  return (
    <UserDataProvider>
      <PageContainer title="Portfolio" description="this is Portfolio">
        <HeaderAlert />
        <HpHeader />
        <Banner />
        <Box my={3}>
          <Container maxWidth="lg">
            <GalleryCard />
          </Container>
        </Box>
        <C2a />
        <Footer />
        <ScrollToTop />
      </PageContainer>
    </UserDataProvider>
  );
};

export default PricingPage;
