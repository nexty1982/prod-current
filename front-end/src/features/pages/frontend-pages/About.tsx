import PageContainer from '@/shared/ui/PageContainer';
import Leadership from '@/components/frontend-pages/shared/leadership';
import Reviews from '@/components/frontend-pages/shared/reviews';
import Pricing from '@/components/frontend-pages/shared/pricing';
import C2a from '@/components/frontend-pages/shared/c2a';
import Footer from '@/components/frontend-pages/shared/footer';
import Banner from '@/components/frontend-pages/about/banner';
import Process from '@/components/frontend-pages/about/process';
import KeyMetric from '@/components/frontend-pages/about/key-metric';
import ScrollToTop from '@/components/frontend-pages/shared/scroll-to-top';

const About = () => {
  return (
    <PageContainer title="About Us" description="this is About Us page">
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
