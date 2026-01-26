import React from 'react';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import RecordsUIPage from '@/features/../features/records/records/apps/../features/records/records/RecordsUIPage';
import BlankCard from '@/shared/ui/BlankCard';


const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Church Records',
  },
];

const ChurchRecordsList: React.FC = () => {
  return (
    <PageContainer title="Church Records" description="Church Records Management">
      <Breadcrumb title="Church Records" items={BCrumb} />
      <RecordsUIPage />
    </PageContainer>
  );
};

export default ChurchRecordsList; 