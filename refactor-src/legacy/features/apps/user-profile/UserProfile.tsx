import React from 'react';
import Grid2 from '@mui/material/Grid2';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import ProfileBanner from '@/features/misc-legacy/apps/userprofile/profile/ProfileBanner';
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
          
          {/* 
            Clean Orthodox Profile Layout:
            - Removed: IntroCard (duplicated profile info)
            - Removed: PhotosCard (social media style photos section)  
            - Removed: Post component (social media style posts)
            - Kept: Only ProfileBanner with Orthodox character avatars and editable fields
          */}
        </Grid2>
      </PageContainer>
    </UserDataProvider>
  );
};

export default UserProfile;
