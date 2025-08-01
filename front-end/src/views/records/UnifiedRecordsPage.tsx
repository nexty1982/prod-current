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
  IconButton,
} from '@mui/material';
import {
  IconBabyCarriage,
  IconHeart,
  IconCross,
} from '@tabler/icons-react';
import SSPPOCRecordsPage from './SSPPOCRecordsPage';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import AnalyticsDashboard from '../../pages/AnalyticsDashboard';

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
      case 'analysis':
        return 1;
      default:
        return 0; // baptism
    }
  };

  const [tabValue, setTabValue] = useState(getInitialTab);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Update URL when tab changes
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // Handle Upload Additional Records tab - open OCR page in a new tab
    if (newValue === 2) {
      const churchId = churchName; // assuming churchName is the ID
      window.open(`https://orthodmetrics.com/admin/church/${churchId}/ocr`, '_blank');
      return;
    }
    
    setTabValue(newValue);
    
    const recordTypes = ['baptism', 'analysis'];
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
            {displayChurchName} - SSPPOC Records
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="SSPPOC records management tabs"
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
           <Box>
             <IconButton
               onClick={() => setIsCollapsed(!isCollapsed)}
               sx={{ ml: 2 }}
               aria-label={isCollapsed ? 'Expand content' : 'Collapse content'}
             >
               {isCollapsed ? <IconBabyCarriage style={{ transform: 'rotate(180deg)' }} /> : <IconBabyCarriage />}
             </IconButton>
           </Box>
          </Box>

          {!isCollapsed && (
            <>
              <TabPanel value={tabValue} index={0}>
                <SSPPOCRecordsPage />
              </TabPanel>
              <TabPanel value={tabValue} index={1}>
                <AnalyticsDashboard />
              </TabPanel>
              {/* Tab 2 (Upload Additional Records) navigates away, so no TabPanel content needed */}
            </>
          )}
        </Paper>
      </Container>
  );
};

export default UnifiedRecordsPage;
