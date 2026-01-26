import Grid2 from '@/components/compat/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as React from 'react';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import Grid2 from '@/mui/Grid2';
import { Tabs, Tab, Box, CardContent, Divider, Alert, CircularProgress } from '@mui/material';
const Grid = Grid2;

// components
import AccountTab from '@/components/apps/account-settings/AccountTab';
import { IconArticle, IconBell, IconLock, IconUserCircle } from '@tabler/icons-react';
import BlankCard from '@/shared/ui/BlankCard';
import NotificationTab from '@/components/apps/account-settings/NotificationTab';
import BillsTab from '@/components/pages/account-setting/BillsTab';
import SecurityTab from '@/components/apps/account-settings/SecurityTab';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Account Setting',
  },
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const AccountSetting = () => {
  const [value, setValue] = React.useState(0);
  const [profile, setProfile] = React.useState(null);
  const [settings, setSettings] = React.useState(null);
  const [notificationSettings, setNotificationSettings] = React.useState(null);
  const [securitySettings, setSecuritySettings] = React.useState(null);
  const [userActivity, setUserActivity] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadProfile(),
        loadAccountSettings(),
        loadUserActivity()
      ]);
    } catch (error) {
      setError('Failed to load account data');
      console.error('Error loading account data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/user/profile/profile', {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setProfile(data.profile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadAccountSettings = async () => {
    try {
      const response = await fetch('/api/account/settings', {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings.general);
        setNotificationSettings(data.settings.notifications);
        setSecuritySettings(data.settings.security);
      }
    } catch (error) {
      console.error('Error loading account settings:', error);
    }
  };

  const loadUserActivity = async () => {
    try {
      const response = await fetch('/api/account/activity', {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUserActivity(data.activities);
      }
    } catch (error) {
      console.error('Error loading user activity:', error);
    }
  };

  const handleProfileUpdate = async (updatedData: any) => {
    try {
      const response = await fetch('/api/user/profile/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedData)
      });

      const data = await response.json();

      if (data.success) {
        await loadProfile();
      } else {
        throw new Error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const handleSettingsUpdate = async (updatedSettings: any) => {
    try {
      const response = await fetch('/api/account/settings/general', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedSettings)
      });

      const data = await response.json();

      if (data.success) {
        await loadAccountSettings();
      } else {
        throw new Error(data.message || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };

  const handleNotificationUpdate = async (notificationData: any) => {
    try {
      const response = await fetch('/api/account/settings/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(notificationData)
      });

      const data = await response.json();

      if (data.success) {
        await loadAccountSettings();
      } else {
        throw new Error(data.message || 'Failed to update notification settings');
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  };

  const handleSecurityUpdate = async (securityData: any) => {
    try {
      const response = await fetch('/api/account/settings/security', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(securityData)
      });

      const data = await response.json();

      if (data.success) {
        await loadAccountSettings();
      } else {
        throw new Error(data.message || 'Failed to update security settings');
      }
    } catch (error) {
      console.error('Error updating security settings:', error);
      throw error;
    }
  };

  const handlePasswordChange = async (passwordData: any) => {
    try {
      const response = await fetch('/api/account/settings/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(passwordData)
      });

      const data = await response.json();

      if (data.success) {
        // Password change successful
      } else {
        throw new Error(data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  };

  const handleImageUpload = async (type: string, imageUrl: string) => {
    // Update the local profile state immediately for better UX
    setProfile((prev: any) => ({
      ...prev,
      [type === 'profile' ? 'profile_image_url' : 'cover_image_url']: imageUrl
    }));
    
    // Reload profile to ensure data consistency
    await loadProfile();
  };

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    (<PageContainer title="Account Setting" description="this is Account Setting page">
      {/* breadcrumb */}
      <Breadcrumb title="Account Setting" items={BCrumb} />
      {/* end breadcrumb */}
      <Grid2 container spacing={3}>
        <Grid2 size={12}>
          <BlankCard>
            <Box sx={{ maxWidth: { xs: 320, sm: 480 } }}>
              <Tabs
                value={value}
                onChange={handleChange}
                variant="scrollable"
                scrollButtons="auto"
                aria-label="basic tabs example"
              >
                <Tab
                  iconPosition="start"
                  icon={<IconUserCircle size="22" />}
                  label="Account"
                  {...a11yProps(0)}
                />

                <Tab
                  iconPosition="start"
                  icon={<IconBell size="22" />}
                  label="Notifications"
                  {...a11yProps(1)}
                />
                <Tab
                  iconPosition="start"
                  icon={<IconArticle size="22" />}
                  label="Bills"
                  {...a11yProps(2)}
                />
                <Tab
                  iconPosition="start"
                  icon={<IconLock size="22" />}
                  label="Security"
                  {...a11yProps(3)}
                />
              </Tabs>
            </Box>
            <Divider />
            <CardContent>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Alert severity="error">{error}</Alert>
              ) : (
                <>
                  <TabPanel value={value} index={0}>
                    <AccountTab
                      profile={profile}
                      settings={settings}
                      onProfileUpdate={handleProfileUpdate}
                      onSettingsUpdate={handleSettingsUpdate}
                      onPasswordChange={handlePasswordChange}
                      onImageUpload={handleImageUpload}
                    />
                  </TabPanel>
                  <TabPanel value={value} index={1}>
                    <NotificationTab
                      notificationSettings={notificationSettings}
                      onNotificationUpdate={handleNotificationUpdate}
                    />
                  </TabPanel>
                  <TabPanel value={value} index={2}>
                    <BillsTab />
                  </TabPanel>
                  <TabPanel value={value} index={3}>
                    <SecurityTab
                      securitySettings={securitySettings}
                      onSecurityUpdate={handleSecurityUpdate}
                      onPasswordChange={handlePasswordChange}
                      userActivity={userActivity}
                    />
                  </TabPanel>
                </>
              )}
            </CardContent>
          </BlankCard>
        </Grid2>
      </Grid2>
    </PageContainer>)
  );
};

export default AccountSetting;
