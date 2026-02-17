import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Divider,
  Grid,
  Tab,
  Tabs,
  Typography,
  useTheme,
} from '@mui/material';
import PersonOutlineTwoToneIcon from '@mui/icons-material/PersonOutlineTwoTone';
import DescriptionTwoToneIcon from '@mui/icons-material/DescriptionTwoTone';
import CreditCardTwoToneIcon from '@mui/icons-material/CreditCardTwoTone';
import VpnKeyTwoToneIcon from '@mui/icons-material/VpnKeyTwoTone';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import UserProfileTab from './components/UserProfileTab';
import BillingTab from './components/BillingTab';
import PaymentTab from './components/PaymentTab';
import ChangePasswordTab from './components/ChangePasswordTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

const tabLabels = [
  { label: 'User Profile', icon: <PersonOutlineTwoToneIcon />, caption: 'Profile Settings' },
  { label: 'Billing', icon: <DescriptionTwoToneIcon />, caption: 'Billing Information' },
  { label: 'Payment', icon: <CreditCardTwoToneIcon />, caption: 'Add & Update Card' },
  { label: 'Change Password', icon: <VpnKeyTwoToneIcon />, caption: 'Update Profile Security' },
];

const BCrumb = [
  { to: '/', title: 'Home' },
  { title: 'Berry Components' },
  { title: 'Account Settings' },
];

export default function BerryAccountSettingsPage() {
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();

  const handleBack = () => {
    if (tabValue > 0) setTabValue(tabValue - 1);
  };

  const handleNext = () => {
    if (tabValue < tabLabels.length - 1) setTabValue(tabValue + 1);
  };

  return (
    <PageContainer title="Account Settings" description="Berry Profile 02 - Account settings with vertical tabs">
      <Breadcrumb title="Account Settings" items={BCrumb} />
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Account Settings
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Grid container spacing={3}>
            {/* Left side: Vertical tabs */}
            <Grid size={{ xs: 12, md: 4, lg: 3 }}>
              <Tabs
                value={tabValue}
                onChange={(_, newValue) => setTabValue(newValue)}
                orientation="vertical"
                variant="scrollable"
                sx={{
                  '& .MuiTab-root': {
                    minHeight: 'auto',
                    py: 1.5,
                    px: 2,
                    mr: 2,
                    mb: 1,
                    borderRadius: 1.5,
                    alignItems: 'flex-start',
                    textAlign: 'left',
                    justifyContent: 'flex-start',
                  },
                  '& .Mui-selected': {
                    bgcolor:
                      theme.palette.mode === 'dark'
                        ? 'primary.dark'
                        : 'primary.light',
                    color: 'primary.main',
                  },
                  '& .MuiTabs-indicator': {
                    display: 'none',
                  },
                }}
              >
                {tabLabels.map((tab, idx) => (
                  <Tab
                    key={idx}
                    icon={tab.icon}
                    iconPosition="start"
                    label={
                      <Box sx={{ ml: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: tabValue === idx ? 600 : 400 }}>
                          {tab.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {tab.caption}
                        </Typography>
                      </Box>
                    }
                    sx={{
                      textTransform: 'none',
                    }}
                  />
                ))}
              </Tabs>
            </Grid>

            {/* Right side: Tab content */}
            <Grid size={{ xs: 12, md: 8, lg: 9 }}>
              <TabPanel value={tabValue} index={0}>
                <UserProfileTab />
              </TabPanel>
              <TabPanel value={tabValue} index={1}>
                <BillingTab />
              </TabPanel>
              <TabPanel value={tabValue} index={2}>
                <PaymentTab />
              </TabPanel>
              <TabPanel value={tabValue} index={3}>
                <ChangePasswordTab />
              </TabPanel>
            </Grid>
          </Grid>
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
          <Button
            variant="outlined"
            disabled={tabValue === 0}
            onClick={handleBack}
          >
            Back
          </Button>
          <Button
            variant="contained"
            disabled={tabValue === tabLabels.length - 1}
            onClick={handleNext}
          >
            Continue
          </Button>
        </CardActions>
      </Card>
    </PageContainer>
  );
}
