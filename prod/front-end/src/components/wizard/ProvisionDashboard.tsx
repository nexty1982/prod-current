import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stack,
  Tabs,
  Tab,
  CircularProgress,
  Badge
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  Dashboard as DashboardIcon,
  Church as ChurchIcon,
  Pending as PendingIcon,
  Error as ErrorIcon,
  CheckCircle,
  Cancel
} from '@mui/icons-material';
import { useProvisionStore } from '../../store/provision';

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
      id={`provision-tabpanel-${index}`}
      aria-labelledby={`provision-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ProvisionDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { getSummary, getPendingProvisions, getApprovedChurches, approveProvision } = useProvisionStore();
  
  const [tabValue, setTabValue] = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [pendingProvisions, setPendingProvisions] = useState<any[]>([]);
  const [approvedChurches, setApprovedChurches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvision, setSelectedProvision] = useState<any>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [summaryData, pendingData, approvedData] = await Promise.all([
        getSummary(),
        getPendingProvisions(),
        getApprovedChurches()
      ]);
      
      setSummary(summaryData);
      setPendingProvisions(pendingData);
      setApprovedChurches(approvedData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (provisionId: number) => {
    try {
      setApproving(true);
      await approveProvision(provisionId);
      setApproveDialogOpen(false);
      setSelectedProvision(null);
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error approving provision:', error);
    } finally {
      setApproving(false);
    }
  };

  const handleViewProvision = (provision: any) => {
    setSelectedProvision(provision);
    setApproveDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <PendingIcon />;
      case 'approved': return <CheckCircle />;
      case 'rejected': return <Cancel />;
      case 'failed': return <ErrorIcon />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Church Provision Dashboard
      </Typography>
      
      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
        Manage church setup requests and approvals
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PendingIcon color="warning" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {summary?.pending || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircle color="success" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {summary?.approved || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Approved
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Cancel color="error" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {summary?.rejected || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rejected
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ErrorIcon color="error" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {summary?.failed || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Failed
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          aria-label="provision tabs"
        >
          <Tab 
            label={
              <Badge badgeContent={pendingProvisions.length} color="warning">
                Pending Requests
              </Badge>
            } 
            icon={<PendingIcon />} 
          />
          <Tab 
            label={
              <Badge badgeContent={approvedChurches.length} color="success">
                Approved Churches
              </Badge>
            } 
            icon={<ChurchIcon />} 
          />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Pending Church Provisions</Typography>
            <Button
              startIcon={<RefreshIcon />}
              onClick={loadDashboardData}
            >
              Refresh
            </Button>
          </Box>

          {pendingProvisions.length === 0 ? (
            <Alert severity="info">No pending provisions found.</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Church Name</TableCell>
                    <TableCell>Contact Email</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Modules</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingProvisions.map((provision) => {
                    const basic = JSON.parse(provision.basic_json || '{}');
                    const modules = JSON.parse(provision.modules_json || '[]');
                    
                    return (
                      <TableRow key={provision.id}>
                        <TableCell>{basic.churchName}</TableCell>
                        <TableCell>{basic.email}</TableCell>
                        <TableCell>{basic.city}, {basic.country}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {modules.map((module: string) => (
                              <Chip
                                key={module}
                                label={module.replace('_', ' ')}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {new Date(provision.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            color="primary"
                            onClick={() => handleViewProvision(provision)}
                            title="View Details"
                          >
                            <ViewIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Approved Churches</Typography>
            <Button
              startIcon={<RefreshIcon />}
              onClick={loadDashboardData}
            >
              Refresh
            </Button>
          </Box>

          {approvedChurches.length === 0 ? (
            <Alert severity="info">No approved churches found.</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Church Name</TableCell>
                    <TableCell>Database</TableCell>
                    <TableCell>Contact Email</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Approved Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {approvedChurches.map((church) => (
                    <TableRow key={church.id}>
                      <TableCell>{church.name}</TableCell>
                      <TableCell>
                        <Chip label={church.db_name} size="small" color="success" />
                      </TableCell>
                      <TableCell>{church.email}</TableCell>
                      <TableCell>{church.city}, {church.country}</TableCell>
                      <TableCell>
                        {new Date(church.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </Paper>

      {/* Provision Detail Dialog */}
      <Dialog
        open={approveDialogOpen}
        onClose={() => setApproveDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Church Provision Details
          {selectedProvision && (
            <Chip
              label={selectedProvision.status}
              color={getStatusColor(selectedProvision.status) as any}
              sx={{ ml: 2 }}
            />
          )}
        </DialogTitle>
        
        <DialogContent>
          {selectedProvision && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Basic Information</Typography>
                {(() => {
                  const basic = JSON.parse(selectedProvision.basic_json || '{}');
                  return (
                    <Stack spacing={1}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">Church Name</Typography>
                        <Typography variant="body1">{basic.churchName}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">Contact Email</Typography>
                        <Typography variant="body1">{basic.email}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">Location</Typography>
                        <Typography variant="body1">
                          {basic.city}, {basic.state && `${basic.state}, `}{basic.country}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">Jurisdiction</Typography>
                        <Typography variant="body1">{basic.jurisdiction}</Typography>
                      </Box>
                    </Stack>
                  );
                })()}
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Selected Modules</Typography>
                {(() => {
                  const modules = JSON.parse(selectedProvision.modules_json || '[]');
                  return (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {modules.map((module: string) => (
                        <Chip
                          key={module}
                          label={module.replace('_', ' ')}
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  );
                })()}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)}>Close</Button>
          {selectedProvision?.status === 'pending' && (
            <Button
              variant="contained"
              color="success"
              startIcon={<ApproveIcon />}
              onClick={() => handleApprove(selectedProvision.id)}
              disabled={approving}
            >
              {approving ? 'Approving...' : 'Approve'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProvisionDashboard;
