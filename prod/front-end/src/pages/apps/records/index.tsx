import React from 'react';
import { Box } from '@mui/material';
import Breadcrumb from '../../../layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '../../../components/container/PageContainer';
import AppCard from '../../../components/shared/AppCard';
import CardsRecordsPage from '../../../features/records-centralized/components/CardsRecordsPage';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Records Management',
  },
];

const RecordApp: React.FC = () => {
  return (
    <PageContainer title="Records Management" description="Manage church records">
      <Breadcrumb title="Records Management" items={BCrumb} />
      <AppCard>
        <CardsRecordsPage />
      </AppCard>
    </PageContainer>
  );
};

export default RecordApp;