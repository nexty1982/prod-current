import { Link as RouterLink } from 'react-router-dom';

// material-ui
import { useTheme, styled } from '@mui/material/styles';
import CardMedia from '@mui/material/CardMedia';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Link from '@mui/material/Link';
import Box from '@mui/material/Box';

// project imports
import { frameworks } from './FrameworkSection';
import { ThemeMode } from 'config';

// assets
import LogoDark from 'assets/images/logo-dark.svg';
import { IconBrandDiscord } from '@tabler/icons-react';

import GitHubIcon from '@mui/icons-material/GitHub';
import InstagramIcon from '@mui/icons-material/Instagram';
import PublicIcon from '@mui/icons-material/Public';
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
import XIcon from '@mui/icons-material/X';
import YouTubeIcon from '@mui/icons-material/YouTube';

// Link - custom style
const FooterLink = styled(Link)(({ theme }) => ({
  color: theme.palette.mode === ThemeMode.DARK ? theme.palette.text.secondary : theme.palette.text.hint,
  '&:hover': {
    color: theme.palette.primary.main
  },
  '&:active': {
    color: theme.palette.primary.main
  }
}));

// =============================|| LANDING - FOOTER SECTION ||============================= //

export default function FooterSection() {
  const theme = useTheme();
  const textColor = theme.palette.mode === ThemeMode.DARK ? 'text.secondary' : 'text.hint';

  return (
    <>
      <Container sx={{ mb: 15 }}>
        <Grid container spacing={6}>
          <Grid size={12}>
            <Grid container spacing={8}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Stack spacing={{ xs: 2, md: 5 }}>
                  <Typography component={RouterLink} to="/" aria-label="theme-logo">
                    <CardMedia component="img" src={LogoDark} alt="defaultLayout" sx={{ width: 'auto' }} />
                  </Typography>
                  <Typography variant="body2" color={textColor}>
                    Berry React is a dashboard template that utilizes the Material-UI framework and the React JavaScript library. It offers
                    a range of features and customization options to help you create a powerful and user-friendly admin panel.
                  </Typography>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <Grid container spacing={{ xs: 5, md: 2 }}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Stack spacing={{ xs: 3, md: 5 }}>
                      <Typography variant="h4" color={textColor} sx={{ fontWeight: 500 }}>
                        Help
                      </Typography>
                      <Stack spacing={{ xs: 1.5, md: 2.5 }}>
                        <FooterLink href="https://links.codedthemes.com/HTIBc" target="_blank" underline="none">
                          Blog
                        </FooterLink>
                        <FooterLink href="https://codedthemes.gitbook.io/berry/" target="_blank" underline="none">
                          Documentation
                        </FooterLink>
                        <FooterLink href="https://codedthemes.gitbook.io/berry/support/changelog" target="_blank" underline="none">
                          Change Log
                        </FooterLink>
                        <FooterLink href="https://codedthemes.support-hub.io/" target="_blank" underline="none">
                          Support
                        </FooterLink>
                        <FooterLink href="https://discord.com/invite/p2E2WhCb6s" target="_blank" underline="none">
                          Discord
                        </FooterLink>
                      </Stack>
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Stack spacing={{ xs: 3, md: 5 }}>
                      <Typography variant="h4" color={textColor} sx={{ fontWeight: 500 }}>
                        Store Help
                      </Typography>
                      <Stack spacing={{ xs: 1.5, md: 2.5 }}>
                        <FooterLink href="https://mui.com/store/license/" target="_blank" underline="none">
                          License
                        </FooterLink>
                        <FooterLink href="https://mui.com/store/customer-refund-policy/" target="_blank" underline="none">
                          Refund Policy
                        </FooterLink>
                        <FooterLink
                          href="https://support.mui.com/hc/en-us/sections/360002564979-For-customers"
                          target="_blank"
                          underline="none"
                        >
                          Submit a Request
                        </FooterLink>
                      </Stack>
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Stack spacing={{ xs: 3, md: 5 }}>
                      <Typography variant="h4" color={textColor} sx={{ fontWeight: 500 }}>
                        Berry Eco-System
                      </Typography>
                      <Stack spacing={{ xs: 1.5, md: 2.5 }}>
                        {frameworks.map((item, index) => (
                          <FooterLink href={item.link} target="_blank" underline="none" key={index}>
                            {item.title}
                            {item.isUpcoming && <Chip variant="outlined" size="small" label="Upcoming" sx={{ ml: 0.5, lineHeight: 1.5 }} />}
                          </FooterLink>
                        ))}
                        <FooterLink href="https://links.codedthemes.com/rjvya" target="_blank" underline="none">
                          Pro Figma UI Kit
                        </FooterLink>
                      </Stack>
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Stack spacing={{ xs: 3, md: 5 }}>
                      <Typography variant="h4" color={textColor} sx={{ fontWeight: 500 }}>
                        Free Versions
                      </Typography>
                      <Stack spacing={{ xs: 1.5, md: 2.5 }}>
                        <FooterLink href="https://links.codedthemes.com/rhhGb" target="_blank" underline="none">
                          Free Figma UI Kit
                        </FooterLink>
                        <FooterLink href="https://links.codedthemes.com/Yfkxg" target="_blank" underline="none">
                          Free React MUI
                        </FooterLink>
                        <FooterLink href="https://links.codedthemes.com/epTmN" target="_blank" underline="none">
                          Free Bootstrap 5
                        </FooterLink>
                        <FooterLink href="https://links.codedthemes.com/seQKN" target="_blank" underline="none">
                          Free Angular
                        </FooterLink>
                        <FooterLink href="https://links.codedthemes.com/zQLHX" target="_blank" underline="none">
                          Free Vue
                        </FooterLink>
                        <FooterLink href="https://links.codedthemes.com/Wfbiy" target="_blank" underline="none">
                          Free Django
                        </FooterLink>
                      </Stack>
                    </Stack>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Container>
      <Box sx={{ bgcolor: 'dark.dark', py: { xs: 3, sm: 1.5 } }}>
        <Container>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems="center"
            justifyContent="space-between"
            spacing={{ xs: 1.5, sm: 1, md: 3 }}
          >
            <Typography color="text.secondary">
              © Berry is managed by{' '}
              <Link href="https://codedthemes.com/" target="_blank" underline="hover">
                CodedThemes
              </Link>
            </Typography>
            <Stack direction="row" alignItems="center" spacing={{ xs: 2, sm: 1.5, md: 2 }}>
              <IconButton
                size="small"
                aria-label="codedTheme Github"
                component={Link}
                href="https://github.com/codedthemes"
                target="_blank"
              >
                <GitHubIcon sx={{ color: 'text.secondary', '&:hover': { color: 'success.main' } }} />
              </IconButton>
              <IconButton
                size="small"
                aria-label="codedTheme Instagram"
                component={Link}
                href="https://www.instagram.com/codedthemes"
                target="_blank"
              >
                <InstagramIcon sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }} />
              </IconButton>
              <IconButton
                size="small"
                aria-label="codedTheme Discord"
                component={Link}
                href="https://discord.com/invite/p2E2WhCb6s"
                target="_blank"
                sx={{ color: 'text.secondary', '&:hover': { color: 'info.main' } }}
              >
                <IconBrandDiscord size={30} />
              </IconButton>
              <IconButton
                size="small"
                aria-label="codedTheme Youtube"
                component={Link}
                href="https://www.youtube.com/channel/UCiZG__BaRkT1OuZl5ifzO6A"
                target="_blank"
              >
                <YouTubeIcon sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }} />
              </IconButton>
              <IconButton size="small" aria-label="Berry Blog" component={Link} href="https://links.codedthemes.com/HTIBc" target="_blank">
                <PublicIcon sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }} />
              </IconButton>
              <IconButton size="small" aria-label="codedTheme Twitter" component={Link} href="https://x.com/codedthemes" target="_blank">
                <XIcon sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }} />
              </IconButton>
              <IconButton
                size="small"
                aria-label="codedTheme Dribble"
                component={Link}
                href="https://dribbble.com/codedthemes"
                target="_blank"
              >
                <SportsBasketballIcon sx={{ color: 'text.secondary', '&:hover': { color: 'warning.main' } }} />
              </IconButton>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
