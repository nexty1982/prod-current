// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Grid2 from '@/components/compat/Grid2';
import React from 'react';
import Grid from '@/components/compat/Grid2';
import PageContainer from '@/shared/ui/PageContainer';
import ProfileBanner from '@/components/apps/userprofile/profile/ProfileBanner';
import FriendsCard from '@/components/apps/userprofile/friends/FriendsCard';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import { UserDataProvider } from "@/context/UserDataContext/index";

const Friends = () => {
  const BCrumb = [
    {
      to: '/',
      title: 'Home',
    },
    {
      title: 'Friends',
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
          <Grid2
            size={{
              sm: 12
            }}>
            <FriendsCard />
          </Grid2>
        </Grid2>
      </PageContainer>
    </UserDataProvider>
  );
};

export default Friends;