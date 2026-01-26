// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import Grid from '@/components/compat/Grid2';
import PageContainer from '@/components/container/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import ProfileBanner from '@/components/apps/userprofile/profile/ProfileBanner';
import IntroCard from '@/components/apps/userprofile/profile/IntroCard';
import PhotosCard from '@/components/apps/userprofile/profile/PhotosCard';
import Post from '@/components/apps/userprofile/profile/Post';
import { UserDataProvider } from "@/context/UserDataContext/index";

const UserProfile = () => {
  const BCrumb = [
    {
      to: '/',
      title: 'Home',
    },
    {
      title: 'UserProfile',
    },
  ];

  return (
    <UserDataProvider>
      <PageContainer title="User Profile" description="this is User Profile page">
        <Breadcrumb title="User App" items={BCrumb} />
        <Grid container spacing={3}>
          <Grid
            size={{
              sm: 12
            }}>
            <ProfileBanner />
          </Grid>

          {/* intro and Photos Card */}
          <Grid
            size={{
              sm: 12,
              lg: 4,
              xs: 12
            }}>
            <Grid container spacing={3}>
              <Grid
                size={{
                  sm: 12
                }}>
                <IntroCard />
              </Grid>
              <Grid
                size={{
                  sm: 12
                }}>
                <PhotosCard />
              </Grid>
            </Grid>
          </Grid>
          {/* Posts Card */}
          <Grid
            size={{
              sm: 12,
              lg: 8,
              xs: 12
            }}>
            <Post />
          </Grid>
        </Grid>
      </PageContainer>
    </UserDataProvider>
  );
};

export default UserProfile;