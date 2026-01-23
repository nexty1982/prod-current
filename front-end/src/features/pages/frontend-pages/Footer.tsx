import React from 'react';
import { Box, Container, Typography, Button, Stack } from '@mui/material';
import { styled } from '@mui/material/styles';

// Styled components for the footer
const FooterBanner = styled(Box)(({ theme }) => ({
  position: 'relative',
  overflow: 'visible',
  width: '100%',
  display: 'block',
  backgroundImage: 'url(/images/incode/page-bg.png)',
  backgroundRepeat: 'repeat',
  backgroundPosition: 'top left',
  backgroundSize: 'auto',
  backgroundColor: '#2D1B69', // Fallback color
  minHeight: { xs: 90, sm: 100, md: 115, lg: 125 },
  padding: { xs: theme.spacing(1, 2), sm: theme.spacing(1.5, 3), md: theme.spacing(2, 4) },
}));

// ============================================================================
// FOOTER COMPONENT
// ============================================================================
const Footer: React.FC = () => {
  return (
    <FooterBanner
      sx={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Golden circles for decoration */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '5%',
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #F5B800 0%, transparent 70%)',
          opacity: 0.3,
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '20%',
          right: '10%',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(177, 133, 2, 0.94) 0%, transparent 70%)',
          opacity: 0.2,
          zIndex: 0,
        }}
      />

      <Container 
        maxWidth="lg" 
        sx={{ 
          position: 'relative', 
          zIndex: 1,
          minHeight: '100%',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: { xs: 1.5, md: 2 },
          py: { xs: 1, sm: 1.5, md: 2 },
        }}
      >
        {/* Left: Globe Image */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {/* Globe Image */}
          <Box
            component="img"
            src="/images/incode/globe-footer.png"
            alt="Globe"
            sx={{
              width: { xs: '120px', sm: '150px', md: '180px', lg: '200px' },
              height: 'auto',
              objectFit: 'contain',
              display: { xs: 'block', sm: 'block' },
            }}
          />
        </Box>

        {/* Center: CTA Content */}
        <Box 
          sx={{ 
            flex: 1,
            textAlign: 'center',
            width: { xs: '100%', md: 'auto' },
          }}
        >
          <Typography
            variant="h2"
            fontWeight={700}
            gutterBottom
            fontFamily='"Inter", sans-serif'
            sx={{ 
              mb: { xs: 0.5, md: 1 }, 
              color: '#FFFFFF', // White text
              fontWeight: 700, // Bold
              fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem', lg: '1.75rem' },
              lineHeight: 1.2,
            }}
          >
            Start today with your{' '}
            <span style={{ color: '#F5B800', fontWeight: 700 }}>parish</span>.
            <br />
            We'll handle the{' '}
            <span style={{ color: '#F5B800', fontWeight: 700 }}>records</span>.
          </Typography>

          <Typography
            variant="h6"
            sx={{ 
              mb: { xs: 1.5, md: 2 }, 
              maxWidth: { xs: '100%', md: 600 }, 
              mx: 'auto', 
              opacity: 0.95, 
              color: '#FFFFFF', // White text
              fontWeight: 600, // Bold
              fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.9rem' },
              px: { xs: 2, md: 0 },
              lineHeight: 1.3,
            }}
          >
            Join hundreds of Orthodox parishes who trust OrthodoxMetrics to preserve
            their sacred history for future generations.
          </Typography>

          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={1} 
            justifyContent="center" 
            flexWrap="wrap"
            sx={{ width: '100%' }}
          >
            <Button
              variant="contained"
              size="small"
              sx={{
                backgroundColor: '#F5B800',
                color: '#1a1a1a',
                textTransform: 'none',
                fontWeight: 600,
                padding: { xs: '0.5rem 1rem', md: '0.6rem 1.25rem' },
                borderRadius: '8px',
                fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.9rem' },
                width: { xs: '100%', sm: 'auto' },
                '&:hover': {
                  backgroundColor: '#E6A600',
                },
              }}
            >
              Get Started Now
            </Button>
            <Button
              variant="outlined"
              size="small"
              sx={{
                borderColor: '#F5B800',
                color: '#F5B800',
                textTransform: 'none',
                fontWeight: 600,
                padding: { xs: '0.5rem 1rem', md: '0.6rem 1.25rem' },
                borderRadius: '8px',
                fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.9rem' },
                width: { xs: '100%', sm: 'auto' },
                '&:hover': {
                  borderColor: '#E6A600',
                  backgroundColor: 'rgba(245, 184, 0, 0.1)',
                },
              }}
            >
              Schedule a Demo
            </Button>
          </Stack>
        </Box>
      </Container>
    </FooterBanner>
  );
};

export default Footer;
