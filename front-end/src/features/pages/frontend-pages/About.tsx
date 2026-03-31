import Banner from '@/components/frontend-pages/about/banner';

import KeyMetric from '@/components/frontend-pages/about/key-metric';

import Process from '@/components/frontend-pages/about/process';

import C2a from '@/components/frontend-pages/shared/c2a';

import Leadership from '@/components/frontend-pages/shared/leadership';

import Pricing from '@/components/frontend-pages/shared/pricing';

import Reviews from '@/components/frontend-pages/shared/reviews';

import ScrollToTop from '@/components/frontend-pages/shared/scroll-to-top';

import PageContainer from '@/shared/ui/PageContainer';



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

      <ScrollToTop />

    </PageContainer>

  );

};



export default About;

