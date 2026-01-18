import PageContainer from 'src/components/container/PageContainer';
import Header from './Header';
import Footer from './Footer';
import ScrollToTop from '../../../components/frontend-pages/shared/scroll-to-top';
import OCARecordBookTimeline from '../../devel-tools/recordbook/ocarecord_book_timeline';
import { Box, Container } from '@mui/material';

const OCATimelinePage = () => {
    return (
        <PageContainer title="Church Metrics OCA Timeline" description="Explore the evolution of Orthodox Church record books">
            <Header />
            <Box sx={{ py: { xs: 4, sm: 6, md: 8 } }}>
                <Container maxWidth="lg">
                    <OCARecordBookTimeline />
                </Container>
            </Box>
            <Footer />
            <ScrollToTop />
        </PageContainer>
    );
};

export default OCATimelinePage;

