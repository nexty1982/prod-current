import React from 'react';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import RecordsUIPage from '@/features/records/apps/records/RecordsUIPage';
import BlankCard from '@/shared/ui/BlankCard';


const ChurchRecordsList: React.FC = () => {
  return (
    <PageContainer title="Church Records" description="Church Records Management">
      <RecordsUIPage />
    </PageContainer>
  );
};

export default ChurchRecordsList; 