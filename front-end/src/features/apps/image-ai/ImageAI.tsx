import { Box } from '@mui/material';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import AppCard from '@/shared/ui/AppCard';
import { ImageAiProvider } from '@/app/context/ImageAiContext';
import ImageAiApp from '@/components/apps/image-ai';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'AI Image Generator',
  },
];

const ImageAI = () => {
  return (
    <ImageAiProvider>
      <PageContainer title="AI Image Generator" description="Generate images using AI">
        <Breadcrumb title="AI Image Generator" items={BCrumb} />
        <AppCard>
          <Box sx={{ p: 3 }}>
            <ImageAiApp />
          </Box>
        </AppCard>
      </PageContainer>
    </ImageAiProvider>
  );
};

export default ImageAI;

