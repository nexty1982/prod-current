import { Link } from 'react-router-dom';

// material-ui
import { styled, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import IconButton from '@mui/material/IconButton';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// third party
import { Carousel } from 'react-responsive-carousel';

// project imports
import { ThemeMode } from 'config';

// assets
import { IconChevronRight, IconChevronLeft, IconLink } from '@tabler/icons-react';

import SliderLight1 from 'assets/images/landing/pre-apps/slider-light-1.png';
import SliderDark1 from 'assets/images/landing/pre-apps/slider-dark-1.png';
import SliderLight2 from 'assets/images/landing/pre-apps/slider-light-2.png';
import SliderDark2 from 'assets/images/landing/pre-apps/slider-dark-2.png';
import SliderLight3 from 'assets/images/landing/pre-apps/slider-light-3.png';
import SliderDark3 from 'assets/images/landing/pre-apps/slider-dark-3.png';
import SliderLight4 from 'assets/images/landing/pre-apps/slider-light-4.png';
import SliderDark4 from 'assets/images/landing/pre-apps/slider-dark-4.png';
import SliderLight5 from 'assets/images/landing/pre-apps/slider-light-5.png';
import SliderDark5 from 'assets/images/landing/pre-apps/slider-dark-5.png';
import SliderLight6 from 'assets/images/landing/pre-apps/slider-light-6.png';
import SliderDark6 from 'assets/images/landing/pre-apps/slider-dark-6.png';
import SliderLight7 from 'assets/images/landing/pre-apps/slider-light-7.png';
import SliderDark7 from 'assets/images/landing/pre-apps/slider-dark-7.png';
import SliderLight8 from 'assets/images/landing/pre-apps/slider-light-8.png';
import SliderDark8 from 'assets/images/landing/pre-apps/slider-dark-8.png';
import SliderLight9 from 'assets/images/landing/pre-apps/slider-light-9.png';
import SliderDark9 from 'assets/images/landing/pre-apps/slider-dark-9.png';
import SliderLight10 from 'assets/images/landing/pre-apps/slider-light-10.png';
import SliderDark10 from 'assets/images/landing/pre-apps/slider-dark-10.png';
import SliderLight11 from 'assets/images/landing/pre-apps/slider-light-11.png';
import SliderDark11 from 'assets/images/landing/pre-apps/slider-dark-11.png';

// styles
const Images = styled('img')({
  width: '100%',
  height: 'auto',
  marginBottom: 32,
  backgroundSize: 'cover',
  objectFit: 'cover'
});

function SampleNextArrow(props: any) {
  const theme = useTheme();
  const { onClickHandler } = props;

  return (
    <IconButton
      onClick={onClickHandler}
      sx={{
        position: 'absolute',
        zIndex: 2,
        top: 'calc(50% - 70px)',
        cursor: 'pointer',
        bgcolor: `${theme.palette.background.paper} !important`,
        width: { xs: '40px !important', xl: '65px !important' },
        height: { xs: '40px !important', xl: '65px !important' },
        boxShadow: '0px 24px 38px rgba(9, 15, 37, 0.07)',
        '&:after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          transform: 'scale(9)'
        },
        svg: {
          height: { md: 20, lg: 40, xl: '40px' },
          width: { md: 20, lg: 40, xl: '40px' }
        },
        right: { xs: '50px', md: '80px', lg: '120px', xl: '220px' }
      }}
      aria-label="button"
    >
      <IconChevronRight fontSize={25} color={theme.palette.grey[900]} />
    </IconButton>
  );
}

function SamplePrevArrow(props: any) {
  const theme = useTheme();
  const { onClickHandler } = props;

  return (
    <IconButton
      onClick={onClickHandler}
      sx={{
        position: 'absolute',
        zIndex: 2,
        top: 'calc(50% - 70px)',
        cursor: 'pointer',
        bgcolor: `${theme.palette.background.paper} !important`,
        width: { xs: '40px !important', xl: '65px !important' },
        height: { xs: '40px !important', xl: '65px !important' },
        boxShadow: '0px 24px 38px rgba(9, 15, 37, 0.07)',
        '&:after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          transform: 'scale(9)'
        },
        svg: {
          height: { md: 20, lg: 40, xl: '40px' },
          width: { md: 20, lg: 40, xl: '40px' }
        },
        left: { xs: '50px', md: '80px', lg: '120px', xl: '220px' }
      }}
      aria-label="button"
    >
      <IconChevronLeft fontSize={25} color={theme.palette.grey[900]} />
    </IconButton>
  );
}

interface ItemProps {
  title: string;
  caption?: string;
  image: string;
  link: string;
}

function Items({ title, caption, image, link }: ItemProps) {
  return (
    <>
      <Images
        src={image}
        alt="dashboard"
        sx={{
          width: { xs: '100%', xl: 743 },
          objectFit: 'contain',
          direction: 'initial'
        }}
      />
      <Stack spacing={1} sx={{ pt: 1 }}>
        <Stack
          direction="row"
          spacing={1}
          component={Link}
          to={link}
          target="_blank"
          sx={{ alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
        >
          <Typography variant="h3" sx={{ fontWeight: 500 }}>
            {title}
          </Typography>
          <IconButton size="small" sx={{ color: 'text.primary' }}>
            <IconLink aria-label="link button" size={18} />
          </IconButton>
        </Stack>
        <Typography variant="subtitle2" sx={{ color: 'text.primary', fontSize: { xs: '1rem', xl: '1.125rem' } }}>
          {caption}
        </Typography>
      </Stack>
    </>
  );
}

export default function PreBuildDashBoard() {
  const theme = useTheme();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <>
      <Grid container sx={{ justifyContent: 'center', px: 1.25, gap: 7.5 }}>
        <Grid sx={{ textAlign: 'center' }} size={{ xs: 12, md: 6 }}>
          <Grid container spacing={1.5}>
            <Grid size={12}>
              <Typography variant="h2" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                Explore Conceptual Apps
              </Typography>
            </Grid>
            <Grid size={12}>
              <Typography variant="h4" sx={{ fontWeight: 400 }} align="center">
                Berry has conceptual working apps like Chat, Inbox, E-commerce, Invoice, Kanban, and Calendar.
              </Typography>
            </Grid>
          </Grid>
        </Grid>
        <Grid size={12}>
          <Box
            className="preBuildDashBoard-slider"
            sx={{
              direction: 'initial',
              '.slider': { height: { xs: 'auto' }, '& .slide:not(.selected)': { transformOrigin: 'center !important' } }
            }}
          >
            <Carousel
              showArrows={true}
              showThumbs={false}
              showIndicators={false}
              centerMode={downMD ? false : true}
              centerSlidePercentage={50}
              infiniteLoop={true}
              autoFocus={true}
              emulateTouch={true}
              swipeable={true}
              autoPlay={true}
              interval={2000}
              renderArrowPrev={(onClickHandler, hasPrev, label) =>
                hasPrev && <SamplePrevArrow onClickHandler={onClickHandler} hasPrev={hasPrev} label={label} />
              }
              renderArrowNext={(onClickHandler, hasNext, label) =>
                hasNext && <SampleNextArrow onClickHandler={onClickHandler} hasNext={hasNext} label={label} />
              }
            >
              <Items
                title="Blog Dashboard"
                image={theme.palette.mode === ThemeMode.DARK ? SliderDark1 : SliderLight1}
                link="/dashboard/blog"
              />
              <Items title="Calender" image={theme.palette.mode === ThemeMode.DARK ? SliderDark2 : SliderLight2} link="/apps/calendar" />
              <Items title="Chat App" image={theme.palette.mode === ThemeMode.DARK ? SliderDark3 : SliderLight3} link="/apps/chat" />
              <Items
                title="User Contacts"
                image={theme.palette.mode === ThemeMode.DARK ? SliderDark4 : SliderLight4}
                link="/apps/contact/c-card"
              />
              <Items
                title="CRM Dashboard"
                image={theme.palette.mode === ThemeMode.DARK ? SliderDark5 : SliderLight5}
                link="/dashboard/crm"
              />
              <Items
                title="Customers"
                image={theme.palette.mode === ThemeMode.DARK ? SliderDark6 : SliderLight6}
                link="/apps/customer/customer-list"
              />
              <Items
                title="E-commerce"
                image={theme.palette.mode === ThemeMode.DARK ? SliderDark7 : SliderLight7}
                link="/apps/e-commerce/products"
              />
              <Items
                title="Invoice Management"
                image={theme.palette.mode === ThemeMode.DARK ? SliderDark8 : SliderLight8}
                link="/dashboard/invoice"
              />
              <Items
                title="Kanban"
                image={theme.palette.mode === ThemeMode.DARK ? SliderDark9 : SliderLight9}
                link="/apps/crm/lead-management/lm-overview"
              />
              <Items title="Mailbox" image={theme.palette.mode === ThemeMode.DARK ? SliderDark10 : SliderLight10} link="/apps/mail" />
              <Items
                title="Social Profile"
                image={theme.palette.mode === ThemeMode.DARK ? SliderDark11 : SliderLight11}
                link="/apps/user/social-profile/posts"
              />
            </Carousel>
          </Box>
        </Grid>
      </Grid>
    </>
  );
}
