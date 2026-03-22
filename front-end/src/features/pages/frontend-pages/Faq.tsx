// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import FAQ from '@/components/frontend-pages/homepage/faq';
import C2a from '@/components/frontend-pages/shared/c2a';
import Footer from '@/components/frontend-pages/shared/footer/SiteFooter';
import HpHeader from '@/components/frontend-pages/shared/header/HpHeader';
import ScrollToTop from '@/components/frontend-pages/shared/scroll-to-top';
import PageContainer from '@/shared/ui/PageContainer';
import { Box, Container, Typography } from '@mui/material';
import { useLanguage } from '@/context/LanguageContext';

const Faq = () => {
  const { t } = useLanguage();

  return (
    <PageContainer title="Faq" description="this is Faq page">
      <HpHeader />

      {/* Banner */}
      <Box sx={{ backgroundColor: 'primary.light', py: { xs: 4, lg: 6 }, textAlign: 'center' }}>
        <Container maxWidth="lg">
          <Typography variant="h2" fontWeight={700} mb={1}>
            {t('faq.page_title')}
          </Typography>
          <Typography variant="body1" color="text.secondary" fontSize="16px">
            {t('faq.page_subtitle')}
          </Typography>
        </Container>
      </Box>

      <FAQ />

      <C2a />
      <Footer />
      <ScrollToTop />
    </PageContainer>
  );
};

export default Faq;
