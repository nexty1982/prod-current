import PageContainer from '@/shared/ui/PageContainer';
import HeaderAlert from '@/features/misc-legacy/frontend-pages/shared/header/HeaderAlert';
import HpHeader from '@/features/misc-legacy/frontend-pages/shared/header/HpHeader';
import Leadership from '@/features/misc-legacy/frontend-pages/shared/leadership';
import Reviews from '@/features/misc-legacy/frontend-pages/shared/reviews';
import Pricing from '@/features/misc-legacy/frontend-pages/shared/pricing';
import C2a from '@/features/misc-legacy/frontend-pages/shared/c2a';
import Footer from '@/features/misc-legacy/frontend-pages/shared/footer';
import Banner from '@/features/misc-legacy/frontend-pages/about/banner';
import Process from '@/features/misc-legacy/frontend-pages/about/process';
import KeyMetric from '@/features/misc-legacy/frontend-pages/about/key-metric';
import ScrollToTop from '@/features/misc-legacy/frontend-pages/shared/scroll-to-top';

const About = () => {
  return (
    <PageContainer title="About" description="this is About">
      <HeaderAlert />
      <HpHeader />
      <Banner />
      <Process />
      <KeyMetric />
      <Leadership />
      <Reviews />
      <Pricing />
      <C2a />
      <Footer />
      <ScrollToTop />
    </PageContainer>
  );
};

export default About;
