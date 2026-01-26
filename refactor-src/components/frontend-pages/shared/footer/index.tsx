import React from 'react';
import { Box, Grid, Typography, Container, Divider, Stack, Tooltip } from '@mui/material';
import { Link, NavLink } from 'react-router-dom';

import IconFacebook from '@/assets/images/frontend-pages/icons/icon-facebook.svg';
import IconTwitter from '@/assets/images/frontend-pages/icons/icon-twitter.svg';
import IconInstagram from '@/assets/images/frontend-pages/icons/icon-instagram.svg';

import LogoIcon from '@/assets/images/logos/logoIcon.svg';

const footerLinks = [
  {
    id: 1,
    children: [
      {
        title: true,
        titleText: 'Baptism',
      },
      {
        title: false,
        titleText: 'View Baptism Templates',
        link: '/apps/church-management',
      },
      {
        title: false,
        titleText: 'Features',
        link: '/apps/notes',
      },
      {
        title: false,
        titleText: 'Record display features',
        link: '/apps/calendar',
      },
      {
        title: false,
        titleText: 'iUpdating Records',
        link: '/apps/contacts',
      },
      {
        title: false,
        titleText: 'Historical Data',
        link: '/dashboards/modern',
      },
      {
        title: false,
        titleText: 'Trends and Forecasts',
        link: '/support',
      },
    ],
  },
  {
    id: 2,
    children: [
      {
        title: true,
        titleText: 'Marriage',
      },
      {
        title: false,
        titleText: 'Certificate Availability',
        link: '/forms/settings',
      },
      {
        title: false,
        titleText: 'Growth in the Parish',
        link: '/forms/user-profile',
      },
      {
        title: false,
        titleText: 'Demographics',
        link: '/forms/church-setup',
      },
      {
        title: false,
        titleText: 'Parish timelines',
        link: '/forms/member-forms',
      },
      {
        title: false,
        titleText: 'Orthodox themes',
        link: '/forms/event-forms',
      },
    ],
  },
  {
    id: 3,
    children: [
      {
        title: true,
        titleText: 'Other Record Types',
      },
      {
        title: false,
        titleText: 'Funeral Records',
        link: '/tables/members',
      },
      {
        title: false,
        titleText: 'Church Records',
        link: '/tables/events',
      },
      {
        title: false,
        titleText: 'Parish Community',
        link: '/tables/donations',
      },
      {
        title: false,
        titleText: 'Charts and Data',
        link: '/tables/reports',
      },
      {
        title: false,
        titleText: 'Analytics',
        link: '/tables/analytics',
      },
      {
        title: false,
        titleText: 'Activity Log',
        link: '/tables/activity-log',
      },
    ],
  },
];

const Footer = () => {
  return (<>
    <Container
      maxWidth="lg"
      sx={{
        pt: {
          xs: '30px',
          lg: '60px',
        },
      }}
    >
      <Grid container spacing={3} justifyContent="space-between" mb={7}>
        {footerLinks.map((footerlink, i) => (
          <Grid
            key={i}
            size={{
              xs: 6,
              sm: 4,
              lg: 2
            }}>
            {footerlink.children.map((child, i) => (
              <React.Fragment key={i}>
                {child.title ? (
                  <Typography fontSize="17px" fontWeight="600" mb="22px">
                    {child.titleText}
                  </Typography>
                ) : (
                  <Link to={`${child.link}`}>
                    <Typography
                      sx={{
                        display: 'block',
                        padding: '10px 0',
                        fontSize: '15px',
                        color: (theme) => theme.palette.text.primary,
                        '&:hover': {
                          color: (theme) => theme.palette.primary.main,
                        },
                      }}
                      component="span"
                    >
                      {child.titleText}
                    </Typography>
                  </Link>
                )}
              </React.Fragment>
            ))}
          </Grid>
        ))}
        <Grid
          size={{
            xs: 6,
            sm: 6,
            lg: 2
          }}>
          <Typography fontSize="17px" fontWeight="600" mb="22px">
            Follow us
          </Typography>

          <Stack direction="row" gap="20px">
            <Tooltip title="Facebook">
              <NavLink to="#">
                <img src={IconFacebook} alt="facebook" width={22} height={22} />
              </NavLink>
            </Tooltip>
            <Tooltip title="Twitter">
              <NavLink to="#">
                <img src={IconTwitter} alt="twitter" width={22} height={22} />
              </NavLink>
            </Tooltip>
            <Tooltip title="Instagram">
              <NavLink to="#">
                <img src={IconInstagram} alt="instagram" width={22} height={22} />
              </NavLink>
            </Tooltip>
          </Stack>
        </Grid>
      </Grid>

      <Divider />

      <Box
        py="40px"
        flexWrap="wrap"
        display="flex"
        justifyContent="space-between"
      >
        <Stack direction="row" gap={1} alignItems="center">
          <img src={LogoIcon} width={20} height={20} alt="logo" />
          <Typography variant="body1" fontSize="15px">
            All rights reserved by Orthodox Metrics.{' '}
          </Typography>
        </Stack>
        <Typography variant="body1" fontSize="15px">
          Powered by{' '}
          <Typography component={Link} color="primary.main" to="/">
            Orthodox Metrics
          </Typography>
          .
        </Typography>
      </Box>
    </Container>
  </>);
};

export default Footer;
