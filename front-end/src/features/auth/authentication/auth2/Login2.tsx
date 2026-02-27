// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Card, Container, Grid, Stack, Typography, useTheme } from '@mui/material';

import PageContainer from '@/shared/ui/PageContainer';
import AuthLogin from '@/features/auth/authentication/authForms/AuthLogin';
import HpHeader from '@/components/frontend-pages/shared/header/HpHeader';
import SharedFooter from '@/components/frontend-pages/shared/footer';
import ScrollToTop from '@/components/frontend-pages/shared/scroll-to-top';

const Login2 = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const features = [
    { title: 'Digital Records Management', desc: 'Comprehensive digitization of baptisms, marriages, funerals, and other sacred records' },
    { title: 'Multilingual OCR Recognition', desc: 'Advanced text recognition for Greek, Russian, Romanian, and English documents' },
    { title: 'Multi-language Support', desc: 'Full support for Greek, Russian, Romanian, Georgian, and English interfaces' },
    { title: 'Secure Cloud Storage', desc: 'Enterprise-grade security for your most precious parish documents' },
  ];

  return (
    <PageContainer title="Login" description="this is Login page">
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <HpHeader />

        {/* Hero Login Section */}
        <Box
          sx={{
            flex: 1,
            background: isDark
              ? 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 30%, #1a0a2e 70%, #0d0519 100%)'
              : 'linear-gradient(135deg, #f3edf9 0%, #ece3f6 30%, #f3edf9 70%, #faf7fd 100%)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            py: { xs: 6, md: 8 },
          }}
        >
          {/* Decorative gold orbs */}
          <Box sx={{ position: 'absolute', top: 30, left: 40, width: 18, height: 18, borderRadius: '50%', background: 'radial-gradient(circle, #D4AF37 0%, rgba(212,175,55,0.3) 100%)', opacity: isDark ? 0.8 : 0.5 }} />
          <Box sx={{ position: 'absolute', top: 80, left: 100, width: 12, height: 12, borderRadius: '50%', background: 'radial-gradient(circle, #D4AF37 0%, rgba(212,175,55,0.3) 100%)', opacity: isDark ? 0.5 : 0.3 }} />
          <Box sx={{ position: 'absolute', top: 60, right: 80, width: 80, height: 80, borderRadius: '50%', border: `2px solid ${isDark ? 'rgba(138,43,226,0.25)' : 'rgba(123,79,158,0.15)'}`, opacity: 0.4 }} />
          <Box sx={{ position: 'absolute', bottom: 40, right: 60, width: 14, height: 14, borderRadius: '50%', background: 'radial-gradient(circle, #9B59B6 0%, rgba(155,89,182,0.2) 100%)', opacity: isDark ? 0.6 : 0.35 }} />
          <Box sx={{ position: 'absolute', bottom: 100, left: 200, width: 10, height: 10, borderRadius: '50%', background: 'radial-gradient(circle, #D4AF37 0%, rgba(212,175,55,0.3) 100%)', opacity: isDark ? 0.4 : 0.25 }} />

          <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
            <Grid container spacing={6} alignItems="center">
              {/* Left: Branding + Features */}
              <Grid item xs={12} md={6}>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#D4AF37',
                    fontWeight: 600,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    mb: 1.5,
                    display: 'block',
                    fontSize: '0.75rem',
                  }}
                >
                  Sacred Records Management
                </Typography>

                <Typography
                  variant="h3"
                  sx={{
                    fontFamily: '"Cormorant Garamond", Georgia, serif',
                    fontWeight: 600,
                    color: isDark ? '#ffffff' : '#1a0a2e',
                    lineHeight: 1.3,
                    mb: 2,
                    fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.75rem' },
                  }}
                >
                  Welcome to{' '}
                  <Box component="span" sx={{ color: '#D4AF37' }}>Orthodox Metrics</Box>
                </Typography>

                <Typography
                  variant="body1"
                  sx={{
                    color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(26,10,46,0.6)',
                    mb: 4,
                    lineHeight: 1.7,
                    fontSize: { xs: '0.95rem', md: '1.05rem' },
                    maxWidth: 500,
                  }}
                >
                  Digitize, preserve, and manage your parish records with reverence and precision. Supporting the canonical traditions of the Orthodox Church worldwide.
                </Typography>

                {/* Feature bullets */}
                <Stack spacing={1.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
                  {features.map((f, i) => (
                    <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#D4AF37', mt: 0.8, flexShrink: 0 }} />
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ color: isDark ? '#ffffff' : '#1a0a2e' }}>
                          {f.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(26,10,46,0.5)' }}>
                          {f.desc}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </Grid>

              {/* Right: Login Card */}
              <Grid item xs={12} md={6} display="flex" justifyContent="center">
                <Card
                  elevation={isDark ? 12 : 9}
                  sx={{
                    p: 4,
                    width: '100%',
                    maxWidth: '450px',
                    borderRadius: '16px',
                    backgroundColor: isDark ? 'rgba(30, 15, 50, 0.9)' : theme.palette.background.paper,
                    border: `1px solid ${isDark ? 'rgba(212,175,55,0.15)' : 'rgba(0,0,0,0.06)'}`,
                    boxShadow: isDark
                      ? '0 8px 40px rgba(0,0,0,0.4)'
                      : '0 8px 40px rgba(0,0,0,0.08)',
                  }}
                >
                  <Typography
                    variant="h5"
                    sx={{
                      fontFamily: '"Cormorant Garamond", Georgia, serif',
                      fontWeight: 600,
                      color: isDark ? '#ffffff' : '#1a0a2e',
                      textAlign: 'center',
                      mb: 0.5,
                    }}
                  >
                    Sign In
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(26,10,46,0.5)',
                      textAlign: 'center',
                      mb: 2,
                    }}
                  >
                    Access your parish dashboard
                  </Typography>

                  <AuthLogin
                    subtitle={
                      <Stack direction="row" spacing={1} justifyContent="center" mt={3}>
                        <Typography color="textSecondary" variant="h6" fontWeight="500">
                          New to Orthodox Metrics?
                        </Typography>
                        <Typography
                          component={Link}
                          to="/auth/register"
                          fontWeight="500"
                          sx={{
                            textDecoration: 'none',
                            color: 'primary.main',
                          }}
                        >
                          Create an account
                        </Typography>
                      </Stack>
                    }
                  />
                </Card>
              </Grid>
            </Grid>
          </Container>
        </Box>

        <SharedFooter />
        <ScrollToTop />
      </Box>
    </PageContainer>
  );
};

export default Login2;
