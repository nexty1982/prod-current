import PageContainer from '@/shared/ui/PageContainer';
import HeaderAlert from '@/features/misc-legacy/frontend-pages/shared/header/HeaderAlert';
import HpHeader from '@/features/misc-legacy/frontend-pages/shared/header/HpHeader';
import Pricing from '@/features/misc-legacy/frontend-pages/shared/pricing';
import C2a from '@/features/misc-legacy/frontend-pages/shared/c2a';
import Footer from '@/features/misc-legacy/frontend-pages/shared/footer';
import Banner from '@/features/misc-legacy/frontend-pages/pricing/Banner';
import ScrollToTop from '@/features/misc-legacy/frontend-pages/shared/scroll-to-top';

const PricingPage = () => {
    return (
        <PageContainer title="Pricing" description="this is Pricing">

            <HeaderAlert />
            <HpHeader />
            <Banner />
            <Pricing />
            <C2a />
            <Footer />
            <ScrollToTop />
        </PageContainer>
    );
};

export default PricingPage;
