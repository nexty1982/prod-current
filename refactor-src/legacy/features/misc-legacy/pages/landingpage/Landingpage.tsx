// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import PageContainer from '@/shared/ui/PageContainer';

// components
import Banner from '@/features/misc-legacy/landingpage/banner/Banner';
import C2a from '@/features/misc-legacy/landingpage/c2a/C2a';
import C2a2 from '@/features/misc-legacy/landingpage/c2a/C2a2';
import DemoSlider from '@/features/misc-legacy/landingpage/demo-slider/DemoSlider';
import Features from '@/features/misc-legacy/landingpage/features/Features';
import Footer from '@/features/misc-legacy/landingpage/footer/Footer';
import Frameworks from '@/features/misc-legacy/landingpage/frameworks/Frameworks';
import LpHeader from '@/features/misc-legacy/landingpage/header/Header';
import Testimonial from '@/features/misc-legacy/landingpage/testimonial/Testimonial';

const Landingpage = () => {
  return (
    <PageContainer title="Landingpage" description="this is Landingpage">
      <LpHeader />
      <Banner />
      <DemoSlider />
      <Frameworks />
      <Testimonial />
      <Features />
      <C2a />
      <C2a2 />
      <Footer />
    </PageContainer>
  );
};

export default Landingpage;
