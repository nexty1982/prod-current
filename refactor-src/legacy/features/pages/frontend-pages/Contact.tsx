import PageContainer from '@/shared/ui/PageContainer';
import HeaderAlert from '@/features/misc-legacy/frontend-pages/shared/header/HeaderAlert';
import HpHeader from '@/features/misc-legacy/frontend-pages/shared/header/HpHeader';

import C2a from '@/features/misc-legacy/frontend-pages/shared/c2a';
import Footer from '@/features/misc-legacy/frontend-pages/shared/footer';
import Banner from '@/features/misc-legacy/frontend-pages/contact/banner';
import Form from '@/features/misc-legacy/frontend-pages/contact/form';
import ScrollToTop from '@/features/misc-legacy/frontend-pages/shared/scroll-to-top';

const Contact = () => {
    return (
        <PageContainer title="Contact" description="this is Contact">

            <HeaderAlert />
            <HpHeader />
            <Banner />
            <Form />
            <C2a />
            <Footer />
            <ScrollToTop />
        </PageContainer>
    );
};

export default Contact;
