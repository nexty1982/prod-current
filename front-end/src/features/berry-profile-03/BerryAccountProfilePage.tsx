import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import ProfileTab from './components/ProfileTab';
import BillingTab from './components/BillingTab';
import SecurityTab from './components/SecurityTab';
import NotificationsTab from './components/NotificationsTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const BCrumb = [
  { to: '/', title: 'Home' },
  { title: 'Berry Components' },
  { title: 'Account Profile' },
];

export default function BerryAccountProfilePage() {
  const [tabValue, setTabValue] = useState(0);

  return (
    <PageContainer title="Account Profile" description="Berry Profile 03 - Account profile with horizontal tabs">
      <Breadcrumb title="Account Profile" items={BCrumb} />
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Account
          </Typography>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label="Profile" />
            <Tab label="Billing" />
            <Tab label="Security" />
            <Tab label="Notifications" />
          </Tabs>
          <TabPanel value={tabValue} index={0}>
            <ProfileTab />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <BillingTab />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <SecurityTab />
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            <NotificationsTab />
          </TabPanel>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
