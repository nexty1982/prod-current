import { Box, Container, Divider, Grid, IconButton, Stack, Typography, useTheme } from '@mui/material';
import { IconBrandFacebook, IconBrandLinkedin, IconBrandTwitter } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

const footerColumns = [
  {
    title: 'About',
    links: [
      { text: 'Our Mission', to: '/frontend-pages/about' },
      { text: 'How It Works', to: '/tour' },
      { text: 'Security', to: '/frontend-pages/about' },
      { text: 'Careers', to: '/frontend-pages/contact' },
    ],
  },
  {
    title: 'Support',
    links: [
      { text: 'Documentation', to: '/frontend-pages/blog' },
      { text: 'Help Center', to: '/frontend-pages/faq' },
      { text: 'Contact Us', to: '/frontend-pages/contact' },
      { text: 'System Status', to: '/frontend-pages/about' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { text: 'Privacy Policy', to: '/frontend-pages/about' },
      { text: 'Terms of Service', to: '/frontend-pages/about' },
      { text: 'Cookie Policy', to: '/frontend-pages/about' },
      { text: 'GDPR', to: '/frontend-pages/about' },
    ],
  },
];

const Footer = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const bgColor = isDark ? '#0d0519' : '#f5f3f8';
  const textPrimary = isDark ? '#ffffff' : '#1a1a1a';
  const textSecondary = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';
  const linkColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
  const iconColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
  const dividerColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const mutedColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';

  return (
    <Box sx={{ backgroundColor: bgColor, color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }}>
      <Container maxWidth="lg" sx={{ pt: { xs: 5, lg: 8 }, pb: { xs: 3, lg: 4 } }}>
        <Grid container spacing={4}>
          {/* Brand column */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <Box
                component="img"
                src="/images/logos/om-logo.png"
                alt="OrthodoxMetrics"
                sx={{ width: 28, height: 28, borderRadius: '50%' }}
              />
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: textPrimary }}>
                OrthodoxMetrics
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: textSecondary, lineHeight: 1.7, mb: 2, fontSize: '0.85rem' }}>
              Digitizing Orthodox records and empowering the Church with secure, multilingual record-keeping solutions.
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <IconButton size="small" sx={{ color: iconColor, '&:hover': { color: '#D4AF37' } }}>
                <IconBrandTwitter size={18} />
              </IconButton>
              <IconButton size="small" sx={{ color: iconColor, '&:hover': { color: '#D4AF37' } }}>
                <IconBrandFacebook size={18} />
              </IconButton>
              <IconButton size="small" sx={{ color: iconColor, '&:hover': { color: '#D4AF37' } }}>
                <IconBrandLinkedin size={18} />
              </IconButton>
            </Stack>
          </Grid>

          {/* Link columns */}
          {footerColumns.map((col, i) => (
            <Grid key={i} size={{ xs: 6, sm: 4, md: 3 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ color: textPrimary, mb: 2 }}>
                {col.title}
              </Typography>
              {col.links.map((link, j) => (
                <Typography
                  key={j}
                  component={Link}
                  to={link.to}
                  sx={{
                    display: 'block',
                    color: linkColor,
                    fontSize: '0.85rem',
                    py: 0.6,
                    textDecoration: 'none',
                    '&:hover': { color: '#D4AF37' },
                  }}
                >
                  {link.text}
                </Typography>
              ))}
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ borderColor: dividerColor, my: 4 }} />

        <Box display="flex" flexWrap="wrap" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" sx={{ color: mutedColor }}>
            &copy; {new Date().getFullYear()} OrthodoxMetrics. All rights reserved.
          </Typography>
          <Typography variant="caption" sx={{ color: mutedColor }}>
            Made with &hearts; for the Orthodox community
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
