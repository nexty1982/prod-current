import PageContainer from '@/shared/ui/PageContainer';
import HeaderAlert from '@/features/misc-legacy/frontend-pages/shared/header/HeaderAlert';
import HpHeader from '@/features/misc-legacy/frontend-pages/shared/header/HpHeader';
import C2a from '@/features/misc-legacy/frontend-pages/shared/c2a';
import Footer from '@/features/misc-legacy/frontend-pages/shared/footer';
import Banner from '@/features/misc-legacy/frontend-pages/blog/banner';
import ScrollToTop from '@/features/misc-legacy/frontend-pages/shared/scroll-to-top';
import BlogListing from '@/features/misc-legacy/apps/blog/BlogListing';
import { Container } from '@mui/system';
import { BlogProvider } from '@/context/BlogContext';

const BlogPage = () => {
  return (
    <>
      <BlogProvider>
        <PageContainer title="Blog" description="this is Blog">
          <HeaderAlert />
          <HpHeader />
          <Banner />
          <Container maxWidth="lg" sx={{ mt: 5 }}>
            <BlogListing />
          </Container>
          <C2a />
          <Footer />
          <ScrollToTop />
        </PageContainer>
      </BlogProvider>
    </>
  );
};

export default BlogPage;
