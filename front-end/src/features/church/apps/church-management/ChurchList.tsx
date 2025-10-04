/**
 * Orthodox Metrics - Church Management List View
 * Replaces the User Profile module with Church management functionality
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Avatar,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Skeleton,
  Container,
  FormControlLabel,
  Checkbox,
  Stack,
  Divider,
} from '@mui/material';
import {
  IconSearch,
  IconPlus,
  IconEdit,
  IconTrash,
  IconEye,
  IconMapPin,
  IconMail,
  IconCalendar,
  IconFilter,
  IconBuilding,
} from '@tabler/icons-react';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import BlankCard from '@/shared/ui/BlankCard';
import { useAuth } from '@/context/AuthContext';
import { adminAPI } from '@/api/admin.api';
import { logger } from '@/utils/logger';
import type { Church } from '@/types/orthodox-metrics.types';
import OrthodoxChurchIcon from '@/shared/ui/OrthodoxChurchIcon';
import OrthodoxBanner from '@/shared/ui/OrthodoxBanner';

interface ChurchListProps { }

const ChurchList: React.FC<ChurchListProps> = () => {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [shouldDeleteDatabase, setShouldDeleteDatabase] = useState(false);

  const BCrumb = [
    { to: '/', title: 'Home' },
    { title: 'Church Management' },
  ];

  // Fetch churches
  useEffect(() => {
    const fetchChurches = async () => {
      try {
        setLoading(true);
        
        // Log the start of church list loading
        logger.info('Church Management', 'Loading churches list', {
          userAction: 'church_list_load_start'
        });
        
        const response = await adminAPI.churches.getAll();
        setChurches(response.churches || []);
        
        // Log successful load
        logger.info('Church Management', 'Churches list loaded successfully', {
          count: response.churches?.length || 0,
          userAction: 'church_list_load_success'
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch churches';
        setError(errorMessage);
        
        // Log the error to the logging system
        logger.error('Church Management', 'Failed to fetch churches list', {
          error: errorMessage,
          userAction: 'church_list_load'
        });
      } finally {
        setLoading(false);
      }
    };

    if (hasRole(['admin', 'super_admin'])) {
      // Log successful access
      logger.info('Church Management', 'Church list access granted', {
        userAction: 'church_list_access_granted',
        hasRoles: ['admin', 'super_admin']
      });
      
      fetchChurches();
    } else {
      const errorMessage = 'Access denied. Admin privileges required.';
      setError(errorMessage);
      setLoading(false);
      
      // Log the access denied error
      logger.warn('Church Management', 'Access denied - insufficient privileges for church list', {
        userAction: 'church_list_access_denied',
        requiredRoles: ['admin', 'super_admin']
      });
    }
  }, [hasRole]);

  // Refresh data when user returns to the page (e.g., from edit form)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && hasRole(['admin', 'super_admin'])) {
        // Page became visible, refresh the data
        logger.info('Church Management', 'Page became visible, refreshing churches list', {
          userAction: 'church_list_refresh_on_focus'
        });
        
        // Refetch churches without showing loading state
        adminAPI.churches.getAll()
          .then(response => {
            setChurches(response.churches || []);
            logger.info('Church Management', 'Churches list refreshed successfully', {
              count: response.churches?.length || 0,
              userAction: 'church_list_refresh_success'
            });
          })
          .catch(err => {
            const errorMessage = err instanceof Error ? err.message : 'Failed to refresh churches';
            logger.error('Church Management', 'Failed to refresh churches list', {
              error: errorMessage,
              userAction: 'church_list_refresh'
            });
          });
      }
    };

    const handleFocus = () => {
      if (hasRole(['admin', 'super_admin'])) {
        // Window regained focus, refresh the data
        logger.info('Church Management', 'Window regained focus, refreshing churches list', {
          userAction: 'church_list_refresh_on_window_focus'
        });
        
        // Refetch churches without showing loading state
        adminAPI.churches.getAll()
          .then(response => {
            setChurches(response.churches || []);
            logger.info('Church Management', 'Churches list refreshed successfully', {
              count: response.churches?.length || 0,
              userAction: 'church_list_refresh_success'
            });
          })
          .catch(err => {
            const errorMessage = err instanceof Error ? err.message : 'Failed to refresh churches';
            logger.error('Church Management', 'Failed to refresh churches list', {
              error: errorMessage,
              userAction: 'church_list_refresh'
            });
          });
      }
    };

    // Listen for page visibility changes and window focus
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [hasRole]);

  // Handle search query changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Log search action
    logger.info('Church Management', 'Church search performed', {
      query: query.trim(),
      queryLength: query.length,
      userAction: 'church_search'
    });
  };

  // Handle filter status changes
  const handleFilterChange = (status: 'all' | 'active' | 'inactive') => {
    setFilterStatus(status);
    
    // Log filter action
    logger.info('Church Management', 'Church filter applied', {
      filter: status,
      userAction: 'church_filter'
    });
  };

  // Filter churches based on search and status
  const filteredChurches = churches.filter(church => {
    const matchesSearch = church.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      church.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      church.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && church.is_active) ||
      (filterStatus === 'inactive' && !church.is_active);

    return matchesSearch && matchesStatus;
  });

  const handleDeleteChurch = async (church: Church) => {
    try {
      logger.info('Church Management', 'Church deletion initiated', {
        churchId: church.id,
        churchName: church.name,
        deleteDatabase: shouldDeleteDatabase,
        userAction: 'church_delete_attempt'
      });
      
      // Remove all users from the church before deletion
      await adminAPI.churches.removeAllUsers(church.id);
      
      // Delete the church with database option
      await adminAPI.churches.delete(church.id, shouldDeleteDatabase);
      
      setChurches(prev => prev.filter(c => c.id !== church.id));
      setDeleteDialogOpen(false);
      setSelectedChurch(null);
      setShouldDeleteDatabase(false); // Reset the checkbox
      
      logger.info('Church Management', 'Church deleted successfully', {
        churchId: church.id,
        churchName: church.name,
        deletedDatabase: shouldDeleteDatabase,
        userAction: 'church_delete'
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete church';
      setError(errorMessage);
      if (errorMessage.includes('assigned users')) {
        setError('Cannot delete church with assigned users. Please remove all users from this church first.');
      }
      logger.error('Church Management', 'Failed to delete church', {
        error: errorMessage,
        churchId: church.id,
        churchName: church.name,
        userAction: 'church_delete'
      });
    }
  };

  // Handle view church action
  const handleViewChurch = (church: Church) => {
    setSelectedChurch(church);
    setViewDialogOpen(true);
    
    // Log church view action
    logger.info('Church Management', 'Church details viewed', {
      churchId: church.id,
      churchName: church.name,
      userAction: 'church_view'
    });
  };

  // Handle edit church action
  const handleEditChurch = (church: Church) => {
    // Log edit action before navigation
    logger.info('Church Management', 'Church edit initiated', {
      churchId: church.id,
      churchName: church.name,
      userAction: 'church_edit_open'
    });
    
    navigate(`/apps/church-management/edit/${church.id}`);
  };

  // Handle delete dialog open
  const handleDeleteDialogOpen = (church: Church) => {
    setSelectedChurch(church);
    setDeleteDialogOpen(true);
    
    // Log delete dialog open
    logger.info('Church Management', 'Church delete dialog opened', {
      churchId: church.id,
      churchName: church.name,
      userAction: 'church_delete_dialog_open'
    });
  };

  // Handle add new church button click
  const handleAddNewChurch = () => {
    // Log new church creation action
    logger.info('Church Management', 'New church creation initiated', {
      userAction: 'church_create_open'
    });
  };

  const getChurchStatusColor = (isActive: boolean) => {
    return isActive ? 'success' : 'error';
  };

  const getChurchStatusText = (isActive: boolean) => {
    return isActive ? 'Active' : 'Inactive';
  };

  if (!hasRole(['admin', 'super_admin', 'manager'])) {
    // Log the access denied error
    logger.warn('Church Management', 'Access denied. Administrator privileges required to view church management.', {
      userAction: 'church_management_access_denied',
      requiredRoles: ['admin', 'super_admin', 'manager'],
      path: '/apps/church-management'
    });
    
    return (
      <PageContainer title="Church Management" description="Church management system">
        <Alert severity="error">
          Access denied. Administrator privileges required to view church management.
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Church Management" description="Manage churches in the Orthodox Metrics system">
      <Breadcrumb title="Church Management" items={BCrumb} />
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Search & Filter Controls Card */}
        <Grid item xs={12}>
          <BlankCard>
            <CardContent>
              <Typography variant="h5" mb={1}>
                <IconBuilding size={24} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                Church Management
              </Typography>
              <Typography color="textSecondary" mb={3}>
                Search, filter, and manage Orthodox churches
              </Typography>

              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search churches by name, location, or email..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <IconSearch size={20} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status Filter</InputLabel>
                    <Select
                      value={filterStatus}
                      label="Status Filter"
                      onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                      startAdornment={<IconFilter size={16} style={{ marginLeft: 8 }} />}
                    >
                      <MenuItem value="all">All Churches</MenuItem>
                      <MenuItem value="active">Active Only</MenuItem>
                      <MenuItem value="inactive">Inactive Only</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={3}>
                  <Stack direction="row" spacing={2} justifyContent="flex-end">
                    {hasRole(['super_admin']) && (
                      <Button
                        variant="outlined"
                        startIcon={<IconPlus />}
                        onClick={() => navigate('/apps/church-management/wizard')}
                      >
                        Setup Wizard
                      </Button>
                    )}
                    <Button
                      variant="contained"
                      startIcon={<IconPlus />}
                      onClick={() => navigate('/apps/church-management/create')}
                    >
                      Add Church
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </BlankCard>
        </Grid>

        {/* Churches Grid */}
        <Grid item xs={12}>
          <BlankCard>
            <CardContent>
              <Typography variant="h5" mb={1}>
                Churches ({filteredChurches.length})
              </Typography>
              <Typography color="textSecondary" mb={3}>
                {filteredChurches.length === 0 
                  ? 'No churches found matching your criteria'
                  : `Showing ${filteredChurches.length} church${filteredChurches.length !== 1 ? 'es' : ''}`
                }
              </Typography>

              {loading ? (
                <Grid container spacing={3}>
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <Grid item xs={12} sm={6} lg={4} key={item}>
                      <Card>
                        <CardContent>
                          <Stack spacing={2}>
                            <Skeleton variant="circular" width={40} height={40} />
                            <Skeleton variant="text" width="80%" height={28} />
                            <Skeleton variant="text" width="60%" height={20} />
                            <Skeleton variant="text" width="40%" height={20} />
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : filteredChurches.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <IconBuilding size={64} style={{ opacity: 0.3, marginBottom: 16 }} />
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    {searchQuery || filterStatus !== 'all' 
                      ? 'No churches match your search criteria'
                      : 'No churches have been added yet'
                    }
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                    {searchQuery || filterStatus !== 'all'
                      ? 'Try adjusting your search or filter settings'
                      : 'Get started by adding your first church to the system'
                    }
                  </Typography>
                  {!searchQuery && filterStatus === 'all' && (
                    <Button
                      variant="contained"
                      startIcon={<IconPlus />}
                      onClick={() => navigate('/apps/church-management/create')}
                    >
                      Add First Church
                    </Button>
                  )}
                </Box>
              ) : (
                <Grid container spacing={3}>
                  {filteredChurches.map((church) => (
                    <Grid item xs={12} sm={6} lg={4} key={church.id}>
                      <Card 
                        sx={{ 
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: 4,
                          }
                        }}
                      >
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                              <OrthodoxChurchIcon />
                            </Avatar>
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Typography variant="h6" noWrap title={church.name}>
                                {church.name}
                              </Typography>
                              <Chip
                                label={church.is_active ? 'Active' : 'Inactive'}
                                color={church.is_active ? 'success' : 'default'}
                                size="small"
                                sx={{ mt: 0.5 }}
                              />
                            </Box>
                          </Box>

                          <Stack spacing={1}>
                            {church.address && (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <IconMapPin size={16} style={{ marginRight: 8, opacity: 0.7 }} />
                                <Typography variant="body2" color="textSecondary" noWrap>
                                  {church.address}
                                </Typography>
                              </Box>
                            )}
                            
                            {church.email && (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <IconMail size={16} style={{ marginRight: 8, opacity: 0.7 }} />
                                <Typography variant="body2" color="textSecondary" noWrap>
                                  {church.email}
                                </Typography>
                              </Box>
                            )}
                            
                            {church.created_at && (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <IconCalendar size={16} style={{ marginRight: 8, opacity: 0.7 }} />
                                <Typography variant="body2" color="textSecondary">
                                  Added {new Date(church.created_at).toLocaleDateString()}
                                </Typography>
                              </Box>
                            )}
                          </Stack>
                        </CardContent>
                        
                        <Divider />
                        
                        <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1.5 }}>
                          <Button
                            size="small"
                            startIcon={<IconEye />}
                            onClick={() => handleViewChurch(church)}
                          >
                            View
                          </Button>
                          
                          <Stack direction="row" spacing={1}>
                            <IconButton
                              size="small"
                              onClick={() => handleEditChurch(church)}
                              sx={{ color: 'primary.main' }}
                            >
                              <IconEdit size={18} />
                            </IconButton>
                            
                            {hasRole(['super_admin']) && (
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteChurch(church)}
                                sx={{ color: 'error.main' }}
                              >
                                <IconTrash size={18} />
                              </IconButton>
                            )}
                          </Stack>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </BlankCard>
        </Grid>
      </Grid>

      {/* Enhanced Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 4,
            background: 'linear-gradient(145deg, #ffffff 0%, #f8f9ff 100%)',
            border: '1px solid rgba(239, 68, 68, 0.1)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
        }}>
          <IconTrash size={24} style={{ marginRight: 8 }} />
          Delete Church
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography variant="body1">
            Are you sure you want to delete <strong>"{selectedChurch?.name}"</strong>? 
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            This action cannot be undone and will permanently remove the church from the system.
          </Typography>
          
          <FormControlLabel
            control={
              <Checkbox
                checked={shouldDeleteDatabase}
                onChange={(e) => setShouldDeleteDatabase(e.target.checked)}
                sx={{
                  color: '#ef4444',
                  '&.Mui-checked': {
                    color: '#ef4444',
                  },
                }}
              />
            }
            label="Also remove the database and all church records"
            sx={{ mt: 2, mb: 1 }}
          />
          
          {shouldDeleteDatabase && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>⚠️ Warning:</strong> This will permanently delete the church's database including all records, users, and data. This action is irreversible!
              </Typography>
            </Alert>
          )}
          
          {!shouldDeleteDatabase && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>ℹ️ Note:</strong> The church record will be removed from the system, but the database and all church records will be preserved.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            sx={{
              borderRadius: 2,
              px: 3,
              color: '#64748b',
              '&:hover': {
                backgroundColor: 'rgba(100, 116, 139, 0.1)',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => selectedChurch && handleDeleteChurch(selectedChurch)}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              borderRadius: 2,
              px: 3,
              fontWeight: 'bold',
              '&:hover': {
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            Delete Church
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced View Church Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            background: 'linear-gradient(145deg, #ffffff 0%, #f8f9ff 100%)',
            border: '1px solid rgba(102, 126, 234, 0.1)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
        }}>
          <IconEye size={24} style={{ marginRight: 8 }} />
          Church Details
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          {selectedChurch && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{
                  p: 2,
                  backgroundColor: 'rgba(102, 126, 234, 0.05)',
                  borderRadius: 2,
                  border: '1px solid rgba(102, 126, 234, 0.1)',
                }}>
                  <Typography variant="subtitle2" gutterBottom color="primary" fontWeight="bold">
                    Church Name
                  </Typography>
                  <Typography variant="body1" gutterBottom>{selectedChurch.name}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{
                  p: 2,
                  backgroundColor: 'rgba(102, 126, 234, 0.05)',
                  borderRadius: 2,
                  border: '1px solid rgba(102, 126, 234, 0.1)',
                }}>
                  <Typography variant="subtitle2" gutterBottom color="primary" fontWeight="bold">
                    Status
                  </Typography>
                  <Chip
                    label={getChurchStatusText(selectedChurch.is_active)}
                    color={getChurchStatusColor(selectedChurch.is_active)}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{
                  p: 2,
                  backgroundColor: 'rgba(102, 126, 234, 0.05)',
                  borderRadius: 2,
                  border: '1px solid rgba(102, 126, 234, 0.1)',
                }}>
                  <Typography variant="subtitle2" gutterBottom color="primary" fontWeight="bold">
                    Address
                  </Typography>
                  <Typography variant="body1" gutterBottom>{selectedChurch.address || 'Not specified'}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{
                  p: 2,
                  backgroundColor: 'rgba(102, 126, 234, 0.05)',
                  borderRadius: 2,
                  border: '1px solid rgba(102, 126, 234, 0.1)',
                }}>
                  <Typography variant="subtitle2" gutterBottom color="primary" fontWeight="bold">
                    Email
                  </Typography>
                  <Typography variant="body1" gutterBottom>{selectedChurch.email || 'Not specified'}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{
                  p: 2,
                  backgroundColor: 'rgba(102, 126, 234, 0.05)',
                  borderRadius: 2,
                  border: '1px solid rgba(102, 126, 234, 0.1)',
                }}>
                  <Typography variant="subtitle2" gutterBottom color="primary" fontWeight="bold">
                    Language
                  </Typography>
                  <Typography variant="body1" gutterBottom>{selectedChurch.preferred_language?.toUpperCase() || 'EN'}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{
                  p: 2,
                  backgroundColor: 'rgba(102, 126, 234, 0.05)',
                  borderRadius: 2,
                  border: '1px solid rgba(102, 126, 234, 0.1)',
                }}>
                  <Typography variant="subtitle2" gutterBottom color="primary" fontWeight="bold">
                    Created
                  </Typography>
                  <Typography variant="body1" gutterBottom>{new Date(selectedChurch.created_at).toLocaleDateString()}</Typography>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button 
            onClick={() => setViewDialogOpen(false)}
            sx={{
              borderRadius: 2,
              px: 3,
              color: '#64748b',
              '&:hover': {
                backgroundColor: 'rgba(100, 116, 139, 0.1)',
              },
            }}
          >
            Close
          </Button>
          <Button
            variant="contained"
            href={`/apps/church-management/edit/${selectedChurch?.id}`}
            startIcon={<IconEdit />}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 2,
              px: 3,
              fontWeight: 'bold',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            Edit Church
          </Button>
        </DialogActions>
              </Dialog>
      </PageContainer>
  );
};

export default ChurchList;
