import React from 'react';
import Breadcrumb from '../../../layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '../../../components/container/PageContainer';
import ChurchRecordTableList from '../../../components/apps/records-ui/ChurchRecordTableList/ChurchRecordTableList';
import BlankCard from '../../../components/shared/BlankCard';
import { ChurchRecordsProvider } from '../../../context/ChurchRecordsContext';

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
      <ChurchRecordsProvider>
        <BlankCard>
          <ChurchRecordTableList />
        </BlankCard>
      </ChurchRecordsProvider>
    </PageContainer>
  );
};

export default ChurchRecordsList; 