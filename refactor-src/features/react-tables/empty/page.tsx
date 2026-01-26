import PageContainer from '@/shared/ui/PageContainer';
import Banner from '@/features/misc-legacy/frontend-pages/homepage/banner/Banner';
import HeaderAlert from '@/features/misc-legacy/frontend-pages/shared/header/HeaderAlert';
import HpHeader from '@/features/misc-legacy/frontend-pages/shared/header/HpHeader';
import Features from '@/features/misc-legacy/frontend-pages/homepage/features/Features';
import DefendFocus from '@/features/misc-legacy/frontend-pages/homepage/defend-focus';
import Leadership from '@/features/misc-legacy/frontend-pages/shared/leadership';
import PowerfulDozens from '@/features/misc-legacy/frontend-pages/homepage/powerful-dozens';
import Reviews from '@/features/misc-legacy/frontend-pages/shared/reviews';
import ExceptionalFeature from '@/features/misc-legacy/frontend-pages/homepage/exceptional-feature';
import Pricing from '@/features/misc-legacy/frontend-pages/shared/pricing';
import FAQ from '@/features/misc-legacy/frontend-pages/homepage/faq';
import C2a from '@/features/misc-legacy/frontend-pages/shared/c2a';
import Footer from '@/features/misc-legacy/frontend-pages/shared/footer';
import ScrollToTop from '@/features/misc-legacy/frontend-pages/shared/scroll-to-top';

const HomePage = () => {
  return (
    <PageContainer title="Homepage" description="this is Homepage">
      <HeaderAlert />
      <HpHeader />
      <Banner />
      <Features />
      <DefendFocus />
      <Leadership />
      <PowerfulDozens />
      <Reviews />
      <ExceptionalFeature />
      <Pricing />
      <FAQ />
      <C2a />
      <Footer />
      <ScrollToTop />
    </PageContainer>
  );
};

export default HomePage;
