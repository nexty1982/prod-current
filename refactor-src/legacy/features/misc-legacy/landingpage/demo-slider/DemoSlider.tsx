import Grid2 from '@mui/material/Grid2';
import {
  Box,
  Container,
  Button,
  styled,
  Typography,
  Grid,
  Avatar,
  Chip,
  useTheme,
} from '@mui/material';

// images
import mainDemo from '@/assets/images/landingpage/demos/demo-main.jpg';
import darkDemo from '@/assets/images/landingpage/demos/demo-dark.jpg';
import horizontalDemo from '@/assets/images/landingpage/demos/demo-horizontal.jpg';
import nextauthDemo from '@/assets/images/landingpage/demos/demo-firebase.jpg';
import rtlDemo from '@/assets/images/landingpage/demos/demo-rtl.jpg';
import minisidebarDemo from '@/assets/images/landingpage/demos/demo-minisidebar.jpg'

import app1 from '@/assets/images/landingpage/apps/app-calendar.jpg';
import app2 from '@/assets/images/landingpage/apps/app-chat.jpg';
import app3 from '@/assets/images/landingpage/apps/app-contact.jpg';
import app4 from '@/assets/images/landingpage/apps/app-email.jpg';
import app5 from '@/assets/images/landingpage/apps/app-note.jpg';
import app6 from '@/assets/images/landingpage/apps/app-user-profile.jpg';
import app7 from '@/assets/images/landingpage/apps/app-blog.jpg';
import app8 from '@/assets/images/landingpage/apps/app-ticket.jpg';
import app9 from '@/assets/images/landingpage/apps/app-ecommerce-shop.jpg';
import app10 from '@/assets/images/landingpage/apps/app-ecommerce-detail.jpg';
import app11 from '@/assets/images/landingpage/apps/app-ecommerce-checkout.jpg';
import app12 from '@/assets/images/landingpage/apps/app-ecommerce-list.jpg';
import app13 from '@/assets/images/landingpage/apps/app-blog-detail.jpg';
import app14 from '@/assets/images/landingpage/apps/app-kanban.jpg';
import app15 from '@/assets/images/landingpage/apps/app-invoice.jpg';

import Page1 from '@/assets/images/landingpage/f-pages/page-homepage.jpg';
import Page2 from '@/assets/images/landingpage/f-pages/page-about.jpg';
import Page3 from '@/assets/images/landingpage/f-pages/page-portfolio.jpg';
import Page4 from '@/assets/images/landingpage/f-pages/page-pricing.jpg';

import DemoTitle from './DemoTitle';

interface DemoTypes {
  link: string;
  img: string;
  title: string;
  hot?: boolean;
}

const demos: DemoTypes[] = [
  {
    link: '/dashboards/modern',
    img: mainDemo,
    title: 'Main',
  },
  {
    link: '/dashboards/ecommerce',
    img: darkDemo,
    title: 'Dark',
  },
  {
    link: '/dashboards/modern',
    img: horizontalDemo,
    title: 'Horizontal',
  },
  {
    link: '/auth/login',
    img: nextauthDemo,
    title: 'Firebase',
  },
  {
    link: '/dashboards/modern',
    img: rtlDemo,
    title: 'RTL',
  },
  {
    link: '/dashboards/modern',
    img: minisidebarDemo,
    title: 'Minisidebar',
  },



];

const pages: DemoTypes[] = [
  {
    link: '/frontend-pages/homepage',
    img: Page1,
    title: 'Homepage',
  },
  {
    link: '/frontend-pages/about',
    img: Page2,
    title: 'About us',
  },
  {
    link: '/frontend-pages/portfolio',
    img: Page3,
    title: 'Portfolio',
  },
  {
    link: '/frontend-pages/pricing',
    img: Page4,
    title: 'Pricing',
  },
];

const apps: DemoTypes[] = [
  {
    link: '/apps/church-management',
    img: app14,
    hot: true,
    title: 'Church Management',
  },
  {
    link: '/apps/notes',
    img: app15,
    hot: true,
    title: 'Notes App',
  },
  {
    link: '/apps/liturgical-calendar',
    img: app1,
    title: 'Orthodox Calendar App',
  },
  {
    link: '/apps/chats',
    img: app2,
    title: 'Chat App',
  },
  {
    link: 'apps/contacts',
    img: app3,
    title: 'Contact App',
  },
  {
    link: 'apps/email',
    img: app4,
    title: 'Email App',
  },
  {
    link: '/apps/notes',
    img: app5,
    title: 'Note App',
  },
  {
    link: '/apps/user-profile',
    img: app6,
    title: 'User Profile App',
  },
  {
    link: '/apps/blog/posts',
    img: app7,
    title: 'Blog App',
  },
  {
    link: '/apps/blog/detail/streaming-video-way-before-it-was-cool-go-dark-tomorrow',
    img: app13,
    title: 'Blog Detail App',
  },
  {
    link: '/apps/tickets',
    img: app8,
    title: 'Ticket App',
  },
  {
    link: '/apps/ecommerce/shop',
    img: app9,
    title: 'eCommerce Shop App',
  },
  {
    link: '/apps/ecommerce/detail/1',
    img: app10,
    title: 'eCommerce Detail App',
  },
  {
    link: '/apps/ecommerce/eco-checkout',
    img: app11,
    title: 'eCommerce Checkout App',
  },
  {
    link: '/apps/ecommerce/eco-product-list',
    img: app12,
    title: 'eCommerce List App',
  },
];

const DemoSlider = () => {
  const theme = useTheme();

  const StyledBox = styled(Box)(() => ({
    overflow: 'auto',
    position: 'relative',
    border: `1px solid ${theme.palette.divider}`,
    '.MuiButton-root': {
      display: 'none',
    },
    '&:hover': {
      '.MuiButton-root': {
        display: 'block',
        transform: 'translate(-50%,-50%)',
        position: 'absolute',
        left: '50%',
        right: '50%',
        top: '50%',
        minWidth: '100px',
        zIndex: '9',
      },
      '&:before': {
        content: '""',
        position: 'absolute',
        top: '0',
        left: ' 0',
        width: '100%',
        height: '100%',
        zIndex: '8',
        backgroundColor: 'rgba(55,114,255,.2)',
      },
    },
  }));

  return (
    (<Box
      pb="140px"
      overflow="hidden"
      sx={{
        pt: {
          sm: '60px',
          lg: '0',
        },
      }}
    >
      <Container maxWidth="lg">
        {/* Title */}
        <DemoTitle />

        {/* slider */}
        <Box mt={9}>
          <Grid2 container spacing={3} justifyContent="center">
            {demos.map((demo, index) => (
              <Grid2
                key={index}
                size={{
                  xs: 12,
                  lg: 3
                }}>
                <Box>
                  {/* <Link href={demo.link}> */}
                  <StyledBox>
                    <Avatar
                      src={demo.img}
                      sx={{
                        borderRadius: '8px',
                        width: '100%',
                        height: '100%',
                      }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      href={demo.link}
                      target="_blank"
                    >
                      Live Preview
                    </Button>
                  </StyledBox>
                  {/* </Link> */}
                  <Typography
                    variant="body1"
                    color="textPrimary"
                    textAlign="center"
                    fontWeight={500}
                    mt={2}
                  >
                    {demo.title}
                  </Typography>
                </Box>
              </Grid2>
            ))}
          </Grid2>

          <Box mb={2} mt={5} textAlign="center">
            <Chip label="Frontend Pages" color="primary" />
          </Box>
          {/* apps */}
          <Box>
            <Grid2 container mt={2} spacing={3}>
              {pages.map((page, index) => (
                <Grid2
                  key={index}
                  size={{
                    xs: 12,
                    lg: 3
                  }}>
                  <Box>
                    <StyledBox>
                      <Avatar
                        src={page.img}
                        sx={{
                          borderRadius: '8px',
                          width: '100%',
                          height: '100%',
                        }}
                      />
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        href={page.link}
                        target="_blank"
                      >
                        Live Preview
                      </Button>
                    </StyledBox>
                    <Typography
                      variant="h6"
                      color="textPrimary"
                      textAlign="center"
                      fontWeight={500}
                      mt={2}
                    >
                      {page.title}{' '}
                      {page.hot ? <Chip label="New" color="error" size="small" /> : null}
                    </Typography>
                  </Box>
                </Grid2>
              ))}
            </Grid2>
          </Box>

          <Box mb={2} mt={5} textAlign="center">
            <Chip label="Apps" color="primary" />
          </Box>
          <Grid2 container spacing={3} justifyContent="center">
            {apps.map((demo, index) => (
              <Grid2
                key={index}
                size={{
                  xs: 12,
                  lg: 3
                }}>
                <Box>
                  {/* <Link href={demo.link}> */}
                  <StyledBox>
                    <Avatar
                      src={demo.img}
                      sx={{
                        borderRadius: '8px',
                        width: '100%',
                        height: '100%',
                      }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      href={demo.link}
                      target="_blank"
                    >
                      Live Preview
                    </Button>
                  </StyledBox>
                  {/* </Link> */}
                  <Typography
                    variant="body1"
                    color="textPrimary"
                    textAlign="center"
                    fontWeight={500}
                    mt={2}
                  >
                    {demo.title} {demo.hot ? <Chip label="New" color="error" size="small" /> : null}
                  </Typography>
                </Box>
              </Grid2>
            ))}
          </Grid2>
        </Box>
      </Container>
    </Box>)
  );
};

export default DemoSlider;
