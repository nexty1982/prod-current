import React from 'react';
import Breadcrumb from '../../../layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '../../../components/container/PageContainer';
import BlankCard from '../../../components/shared/BlankCard';
import ModernRecordsPage from '../../../features/records-centralized/components/ModernRecordsPage';

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
      <BlankCard>
        <ModernRecordsPage />
      </BlankCard>
    </PageContainer>
  );
};

export default ChurchRecordsList;