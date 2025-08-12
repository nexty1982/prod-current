import React, { useState } from 'react';
import { Box } from '@mui/material';
import Breadcrumb from '../../../layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '../../../components/container/PageContainer';
import RecordList from '../../../components/apps/records/recordGrid/RecordList';
import RecordSidebar from '../../../components/apps/records/recordGrid/RecordSidebar';
import AppCard from '../../../components/shared/AppCard';
import { RecordProvider } from '../../../context/RecordsContext';

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
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <PageContainer title="Records Management" description="Manage church records">
      <Breadcrumb title="Records Management" items={BCrumb} />
      <RecordProvider>
        <AppCard>
          <RecordSidebar
            isMobileSidebarOpen={isMobileSidebarOpen}
            onSidebarClose={() => setMobileSidebarOpen(false)}
          />
          <Box p={3} flexGrow={1}>
            <RecordList onMobileOpen={() => setMobileSidebarOpen(true)} />
          </Box>
        </AppCard>
      </RecordProvider>
    </PageContainer>
  );
};

export default RecordApp; 