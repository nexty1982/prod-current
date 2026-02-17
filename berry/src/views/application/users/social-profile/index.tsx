import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import CardMedia from '@mui/material/CardMedia';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import Profile from './Profile';
import Followers from './Followers';
import Friends from './Friends';
import Gallery from './Gallery';
import FriendRequest from './FriendRequest';

import { ThemeMode, DASHBOARD_PATH } from 'config';
import useAuth from 'hooks/useAuth';
import useConfig from 'hooks/useConfig';
import Avatar from 'ui-component/extended/Avatar';
import MainCard from 'ui-component/cards/MainCard';
import Breadcrumbs from 'ui-component/extended/Breadcrumbs';
import ImagePlaceholder from 'ui-component/cards/Skeleton/ImagePlaceholder';
import { gridSpacing } from 'store/constant';

// assets
import { IconFriends, IconInbox, IconPhoto, IconUserPlus, IconUsers } from '@tabler/icons-react';
import PersonAddTwoToneIcon from '@mui/icons-material/PersonAddTwoTone';

import User1 from 'assets/images/users/img-user.png';
import Cover from 'assets/images/profile/img-profile-bg.png';

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`
  };
}

const tabOptions = [
  {
    to: '/apps/user/social-profile/posts',
    icon: <IconInbox stroke={1.5} size="17px" />,
    label: 'Profile',
    value: 'posts'
  },
  {
    to: '/apps/user/social-profile/follower',
    icon: <IconUsers stroke={1.5} size="17px" />,
    label: 'Followers',
    value: 'follower'
  },
  {
    to: '/apps/user/social-profile/friends',
    icon: <IconFriends stroke={1.5} size="17px" />,
    label: (
      <>
        friends <Chip label="100" size="small" color="secondary" sx={{ ml: 1.5 }} />
      </>
    ),
    value: 'friends'
  },
  {
    to: '/apps/user/social-profile/gallery',
    icon: <IconPhoto stroke={1.5} size="17px" />,
    label: 'Gallery',
    value: 'gallery'
  },
  {
    to: '/apps/user/social-profile/friend-request',
    icon: <IconUserPlus stroke={1.5} size="17px" />,
    label: 'Friend Request',
    value: 'friend-request'
  }
];

// ==============================|| SOCIAL PROFILE ||============================== //

export default function SocialProfile() {
  const theme = useTheme();

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { borderRadius } = useConfig();

  let tab = 'posts';
  let breadcrumbTitle = '';
  let breadcrumbHeading = '';

  switch (pathname) {
    case '/apps/user/social-profile/follower':
      tab = 'follower';
      breadcrumbTitle = 'follower';
      breadcrumbHeading = 'follower';
      break;
    case '/apps/user/social-profile/friends':
      tab = 'friends';
      breadcrumbTitle = 'friends';
      breadcrumbHeading = 'friends';
      break;
    case '/apps/user/social-profile/gallery':
      tab = 'gallery';
      breadcrumbTitle = 'gallery';
      breadcrumbHeading = 'gallery';
      break;
    case '/apps/user/social-profile/friend-request':
      tab = 'friend-request';
      breadcrumbTitle = 'friend-request';
      breadcrumbHeading = 'friend-request';
      break;
    case '/apps/user/social-profile/posts':
    default:
      tab = 'posts';
      breadcrumbTitle = 'posts';
      breadcrumbHeading = 'posts';
  }
  const [value, setValue] = React.useState(tab);
  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    setValue(newValue);
    navigate(`apps/user/social-profile/${newValue}`);
  };

  useEffect(() => {
    setValue(tab);
  }, [tab]);

  let breadcrumbLinks = [
    { title: 'home', to: DASHBOARD_PATH },
    { title: 'social-profile', to: '/apps/user/social-profile/posts' },
    { title: breadcrumbTitle }
  ];
  if (tab === 'posts') {
    breadcrumbLinks = [{ title: 'home', to: DASHBOARD_PATH }, { title: 'user' }, { title: 'social-profile' }];
  }

  const [isLoading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <>
      <Breadcrumbs custom heading={breadcrumbHeading} links={breadcrumbLinks} />
      <Grid container spacing={gridSpacing}>
        <Grid size={12}>
          <MainCard
            contentSX={{
              p: 1.5,
              paddingBottom: '0px !important',
              [theme.breakpoints.down('lg')]: {
                textAlign: 'center'
              }
            }}
          >
            {isLoading ? (
              <ImagePlaceholder
                sx={{
                  borderRadius: `${borderRadius}px`,
                  overflow: 'hidden',
                  mb: 3,
                  height: { xs: 85, sm: 150, md: 260 }
                }}
              />
            ) : (
              <CardMedia
                component="img"
                image={Cover}
                sx={{ borderRadius: `${borderRadius}px`, overflow: 'hidden', mb: 3 }}
                alt="profile-background"
              />
            )}
            <Grid container spacing={gridSpacing}>
              <Grid size={{ xs: 12, md: 3 }}>
                {isLoading ? (
                  <ImagePlaceholder
                    sx={{
                      margin: '-70px 0 0 auto',
                      borderRadius: '16px',
                      [theme.breakpoints.down('lg')]: {
                        margin: '-70px auto 0'
                      },
                      [theme.breakpoints.down('md')]: {
                        margin: '-60px auto 0'
                      },
                      width: { xs: 72, sm: 100, md: 140 },
                      height: { xs: 72, sm: 100, md: 140 }
                    }}
                  />
                ) : (
                  <Avatar
                    alt="User 1"
                    src={User1}
                    sx={{
                      margin: '-70px 0 0 auto',
                      borderRadius: '16px',
                      [theme.breakpoints.down('lg')]: {
                        margin: '-70px auto 0'
                      },
                      [theme.breakpoints.down('md')]: {
                        margin: '-60px auto 0'
                      },
                      width: { xs: 72, sm: 100, md: 140 },
                      height: { xs: 72, sm: 100, md: 140 }
                    }}
                  />
                )}
              </Grid>
              <Grid size={{ xs: 12, md: 9 }}>
                <Grid container spacing={gridSpacing}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="h5">{user?.name}</Typography>
                    <Typography variant="subtitle2">Android Developer</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <Grid
                      container
                      spacing={1}
                      sx={{
                        justifyContent: 'flex-end',
                        [theme.breakpoints.down('lg')]: {
                          justifyContent: 'center'
                        }
                      }}
                    >
                      <Grid>
                        <Button variant="outlined">Message</Button>
                      </Grid>
                      <Grid>
                        <Button variant="contained" startIcon={<PersonAddTwoToneIcon />}>
                          Send Request
                        </Button>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid container sx={{ justifyContent: 'flex-end' }}>
                  <Tabs
                    value={value}
                    variant="scrollable"
                    onChange={handleChange}
                    sx={{
                      marginTop: 2.5,
                      '& .MuiTabs-flexContainer': {
                        border: 'none'
                      },
                      '& a': {
                        minHeight: 'auto',
                        minWidth: 10,
                        py: 1.5,
                        px: 1,
                        mr: 2.25,
                        color: theme.palette.mode === ThemeMode.DARK ? 'grey.600' : 'grey.900',
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        '&:hover': {
                          color: 'primary.main'
                        }
                      },
                      '& a.Mui-selected': {
                        color: 'primary.main'
                      },
                      '& a > svg': {
                        marginBottom: '4px !important',
                        mr: 1.25
                      }
                    }}
                  >
                    {tabOptions.map((option, index) => (
                      <Tab
                        key={index}
                        component={Link}
                        to={option?.to}
                        value={option.value}
                        icon={option.icon}
                        label={option.label}
                        {...a11yProps(index)}
                      />
                    ))}
                  </Tabs>
                </Grid>
              </Grid>
            </Grid>
          </MainCard>
        </Grid>
        <Grid size={12}>
          <Box sx={{ p: 0 }}>
            {tab === 'posts' && <Profile />}
            {tab === 'follower' && <Followers />}
            {tab === 'friends' && <Friends />}
            {tab === 'gallery' && <Gallery />}
            {tab === 'friend-request' && <FriendRequest />}
          </Box>
        </Grid>
      </Grid>
    </>
  );
}
