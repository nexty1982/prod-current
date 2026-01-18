import React from 'react';
import {
  Box,
  Container,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import Header from './Header';
import Footer from './Footer';

const PageContainer = styled(Box)({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#fafafa',
});

const ContentWrapper = styled(Box)({
  flex: 1,
  paddingTop: '2rem',
  paddingBottom: '4rem',
});

const SectionHeaderBox = styled(Box)(({ theme }) => ({
  width: '100%',
  height: 90,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  padding: '0 24px',
  borderRadius: '20px',
  position: 'relative',
  overflow: 'hidden',
  background: 'linear-gradient(135deg, #f8f4e8 0%, #f0e8d8 50%, #e8dcc8 100%)',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  marginBottom: '2rem',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect x='17' y='4' width='6' height='32' fill='%23C8A24B' fill-opacity='0.2'/%3E%3Crect x='8' y='12' width='24' height='6' fill='%23C8A24B' fill-opacity='0.2'/%3E%3C/svg%3E")`,
    backgroundSize: '40px 40px',
    backgroundRepeat: 'repeat',
    zIndex: 0,
  },
  '& > *': {
    position: 'relative',
    zIndex: 1,
  },
  [theme.breakpoints.down('md')]: {
    height: 80,
  },
  [theme.breakpoints.down('sm')]: {
    height: 70,
  },
}));

const SectionHeaderTitle = styled(Typography)({
  fontSize: '28px',
  fontWeight: 700,
  color: '#2E0F46',
  fontFamily: 'Georgia, serif',
  letterSpacing: '-0.5px',
  lineHeight: 1.2,
  '@media (max-width: 900px)': {
    fontSize: '24px',
  },
  '@media (max-width: 600px)': {
    fontSize: '20px',
  },
});

const SampleData: React.FC = () => {
  return (
    <PageContainer>
      <Header />
      
      <ContentWrapper>
        <Container maxWidth="lg">
          <SectionHeaderBox>
            <SectionHeaderTitle component="h1">
              Sample Data
            </SectionHeaderTitle>
          </SectionHeaderBox>
          
          <Box sx={{ mt: 4 }}>
            <Typography variant="body1" color="#666666" sx={{ mb: 4 }}>
              Explore sample parish records in multiple languages. Each record type is carefully 
              translated to preserve clarity and tradition.
            </Typography>
            
            {/* Add your sample data content here */}
            
          </Box>
        </Container>
      </ContentWrapper>
      
      <Footer />
    </PageContainer>
  );
};

export default SampleData;

