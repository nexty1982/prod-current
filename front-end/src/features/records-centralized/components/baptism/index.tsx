import React from 'react';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import BaptismRecordsPage from './BaptismRecordsPage';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Baptism Records',
  },
];

const BaptismRecordsWrapper: React.FC = () => {
  return (
    <PageContainer title="Baptism Records" description="Baptism Records Management">
      <Breadcrumb title="Baptism Records" items={BCrumb} />
      <BaptismRecordsPage />
    </PageContainer>
  );
};

export default BaptismRecordsWrapper;