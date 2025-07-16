import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Container,
  useTheme,
  alpha,
} from '@mui/material';
import {
  IconBabyCarriage,
  IconHeart,
  IconCross,
} from '@tabler/icons-react';
import BaptismRecordsPage from './BaptismRecordsPage';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

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
      id={`records-tabpanel-${index}`}
      aria-labelledby={`records-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

const UnifiedRecordsPage: React.FC = () => {
  const theme = useTheme();
  const { churchName } = useParams<{ churchName: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract record type from URL query params or default to baptism
  const getInitialTab = () => {
    const searchParams = new URLSearchParams(location.search);
    const type = searchParams.get('type');
    switch (type) {
      case 'marriage':
        return 1;
      case 'funeral':
        return 2;
      default:
        return 0; // baptism
    }
  };

  const [tabValue, setTabValue] = useState(getInitialTab);

  // Update URL when tab changes
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    const recordTypes = ['baptism', 'marriage', 'funeral'];
    const recordType = recordTypes[newValue];
    
    // Update URL with query parameter
    const searchParams = new URLSearchParams();
    if (recordType !== 'baptism') { // Don't add query param for default
      searchParams.set('type', recordType);
    }
    
    const queryString = searchParams.toString();
    const newPath = queryString ? `?${queryString}` : '';
    navigate(`${location.pathname}${newPath}`, { replace: true });
  };

  // Format church name for display
  const formatChurchName = (name: string) => {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const displayChurchName = churchName ? formatChurchName(churchName) : 'Church';

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {displayChurchName} - Records Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage baptism, marriage, and funeral records for your church
        </Typography>
      </Box>

      <Paper 
        elevation={3} 
        sx={{ 
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'background.paper'
        }}
      >
        <Box
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            px: 2,
          }}
        >
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="records management tabs"
            sx={{
              '& .MuiTab-root': {
                minHeight: 64,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 500,
              }
            }}
          >
            <Tab
              icon={<IconBabyCarriage size={20} />}
              iconPosition="start"
              label="SSPPOC Records"
              id="records-tab-0"
              aria-controls="records-tabpanel-0"
            />
            <Tab
              icon={<IconHeart size={20} />}
              iconPosition="start"
              label="Record Analysis"
              id="records-tab-1"
              aria-controls="records-tabpanel-1"
            />
            <Tab
              icon={<IconCross size={20} />}
              iconPosition="start"
              label="Upload Additional Records"
              id="records-tab-2"
              aria-controls="records-tabpanel-2"
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <BaptismRecordsPage />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <IconHeart size={48} color={theme.palette.text.secondary} />
            <Typography variant="h5" sx={{ mt: 2, mb: 1 }}>
              Marriage Records
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Marriage records management will be available soon.
              This will include ceremony details, couple information, and witnesses.
            </Typography>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <IconCross size={48} color={theme.palette.text.secondary} />
            <Typography variant="h5" sx={{ mt: 2, mb: 1 }}>
              Funeral Records
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Funeral records management will be available soon.
              This will include service details, deceased information, and memorial data.
            </Typography>
          </Box>
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default UnifiedRecordsPage;
