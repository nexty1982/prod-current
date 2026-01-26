// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Grid2 from '@/components/compat/Grid2';
import React from 'react';
import Grid from '@/components/compat/Grid2';
import PageContainer from '@/shared/ui/PageContainer';
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
  ]
  return (
    <UserDataProvider>
      <PageContainer title="User Profile" description="this is User Profile page">
        <Breadcrumb title="User App" items={BCrumb} />
        <Grid2 container spacing={3}>
          <Grid2
            size={{
              sm: 12
            }}>
            <ProfileBanner />
          </Grid2>

          {/* intro and Photos Card */}
          <Grid2
            size={{
              sm: 12,
              lg: 4,
              xs: 12
            }}>
            <Grid2 container spacing={3}>
              <Grid2
                size={{
                  sm: 12
                }}>
                <IntroCard />
              </Grid2>
              <Grid2
                size={{
                  sm: 12
                }}>
                <PhotosCard />
              </Grid2>
            </Grid2>
          </Grid2>
          {/* Posts Card */}
          <Grid2
            size={{
              sm: 12,
              lg: 8,
              xs: 12
            }}>
            <Post />
          </Grid2>
        </Grid2>
      </PageContainer>
    </UserDataProvider>
  );
};

export default UserProfile;