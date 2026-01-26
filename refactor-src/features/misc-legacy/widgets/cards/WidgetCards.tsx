import Grid2 from '@/components/compat/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Grid } from '@mui/material';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';

import PaymentGateways from '@/components/dashboards/ecommerce/PaymentGateways';
import RecentTransactions from '@/components/dashboards/ecommerce/RecentTransactions';
import TopCards from '@//components/dashboards/modern/TopCards';
import UpcomingAcitivity from '@/components/widgets/cards/UpcomingActivity';
import ComplexCard from '@/components/widgets/cards/ComplexCard';
import MusicCard from '@/components/widgets/cards/MusicCard';
import EcommerceCard from '@/components/widgets/cards/EcommerceCard';
import FollowerCard from '@/components/widgets/cards/FollowerCard';
import FriendCard from '@/components/widgets/cards/FriendCard';
import ProfileCard from '@/components/widgets/cards/ProfileCard';

import Settings from '@/components/widgets/cards/Settings';
import GiftCard from '@/components/widgets/cards/GiftCard';


const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Cards',
  },
];

const WidgetCards = () => {
  return (
    (<PageContainer title="Cards" description="this is Cards page">
      {/* breadcrumb */}
      <Breadcrumb title="Cards" items={BCrumb} />
      {/* end breadcrumb */}
      <Grid2 container spacing={3}>
        <Grid2 size={12}>
          <TopCards />
        </Grid2>
        <Grid2 size={12}>
          <ComplexCard />
        </Grid2>
        <Grid2 size={12}>
          <EcommerceCard />
        </Grid2>
        <Grid2 size={12}>
          <MusicCard />
        </Grid2>
        <Grid2 size={12}>
          <FollowerCard />
        </Grid2>
        <Grid2 size={12}>
          <FriendCard />
        </Grid2>
        <Grid2 size={12}>
          <ProfileCard />
        </Grid2>
        <Grid2
          size={{
            xs: 12,
            sm: 6,
            lg: 4
          }}>
          <Settings />
        </Grid2>
        <Grid2
          size={{
            xs: 12,
            lg: 8
          }}>
          <GiftCard />
        </Grid2>
        <Grid2
          size={{
            xs: 12,
            sm: 6,
            lg: 4
          }}>
          <PaymentGateways />
        </Grid2>
        <Grid2
          size={{
            xs: 12,
            sm: 6,
            lg: 4
          }}>
          <UpcomingAcitivity />
        </Grid2>
        <Grid2
          size={{
            xs: 12,
            sm: 6,
            lg: 4
          }}>
          <RecentTransactions />
        </Grid2>
      </Grid2>
    </PageContainer>)
  );
};

export default WidgetCards;
