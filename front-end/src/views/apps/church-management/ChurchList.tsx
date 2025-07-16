/**
 * Orthodox Metrics - Church Management List View
 * Replaces the User Profile module with Church management functionality
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
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
} from '@tabler/icons-react';
import PageContainer from 'src/components/container/PageContainer';
import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import { useAuth } from 'src/context/AuthContext';
import { orthodoxMetricsAPI } from 'src/api/orthodox-metrics.api';
import { logger } from 'src/utils/logger';
import type { Church } from 'src/types/orthodox-metrics.types';
import OrthodoxChurchIcon from 'src/components/shared/OrthodoxChurchIcon';

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
        
        const response = await orthodoxMetricsAPI.churches.getAll();
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
      // Log the delete attempt
      logger.info('Church Management', 'Church deletion initiated', {
        churchId: church.id,
        churchName: church.name,
        userAction: 'church_delete_attempt'
      });
      
      await orthodoxMetricsAPI.churches.delete(church.id);
      setChurches(prev => prev.filter(c => c.id !== church.id));
      setDeleteDialogOpen(false);
      setSelectedChurch(null);
      
      // Log successful deletion
      logger.info('Church Management', 'Church deleted successfully', {
        churchId: church.id,
        churchName: church.name,
        userAction: 'church_delete'
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete church';
      setError(errorMessage);
      
      // Log the delete error
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

  if (!hasRole(['admin', 'super_admin', 'supervisor'])) {
    // Log the access denied error
    logger.warn('Church Management', 'Access denied. Administrator privileges required to view church management.', {
      userAction: 'church_management_access_denied',
      requiredRoles: ['admin', 'super_admin', 'supervisor'],
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
    <PageContainer title="Church Management" description="Manage Orthodox churches in the system">
      <Breadcrumb title="Church Management" items={BCrumb} />

      <Grid container spacing={3}>
        {/* Header Section with gradient background */}
        <Grid size={{ xs: 12 }}>
          <Box 
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 3,
              p: 4,
              mb: 3,
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="7" cy="7" r="1"/%3E%3Ccircle cx="27" cy="7" r="1"/%3E%3Ccircle cx="47" cy="7" r="1"/%3E%3Ccircle cx="7" cy="27" r="1"/%3E%3Ccircle cx="27" cy="27" r="1"/%3E%3Ccircle cx="47" cy="27" r="1"/%3E%3Ccircle cx="7" cy="47" r="1"/%3E%3Ccircle cx="27" cy="47" r="1"/%3E%3Ccircle cx="47" cy="47" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              },
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" position="relative" zIndex={1}>
              <Box>
                <Typography variant="h3" fontWeight="bold" gutterBottom>
                  Church Management
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9 }}>
                  Manage and oversee Orthodox church communities
                </Typography>
                <Box display="flex" alignItems="center" mt={2}>
                  <Box sx={{ 
                    backgroundColor: 'rgba(255,255,255,0.2)', 
                    borderRadius: 2, 
                    px: 2, 
                    py: 0.5,
                    mr: 2 
                  }}>
                    <Typography variant="body2" fontWeight="bold">
                      {churches.length} Total Churches
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    backgroundColor: 'rgba(255,255,255,0.2)', 
                    borderRadius: 2, 
                    px: 2, 
                    py: 0.5 
                  }}>
                    <Typography variant="body2" fontWeight="bold">
                      {churches.filter(c => c.is_active).length} Active
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Button
                variant="contained"
                startIcon={<IconPlus />}
                href="/apps/church-management/create"
                onClick={handleAddNewChurch}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  fontWeight: 'bold',
                  textTransform: 'none',
                  fontSize: '1rem',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.3)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Add New Church
              </Button>
            </Box>
          </Box>
        </Grid>

        {/* Search and Filter Section with modern glass morphism design */}
        <Grid size={{ xs: 12 }}>
          <Paper 
            sx={{ 
              p: 3, 
              mb: 3,
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Grid container spacing={3} alignItems="center">
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Search churches..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'white',
                        boxShadow: '0 4px 20px rgba(102, 126, 234, 0.25)',
                      },
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconSearch size={20} color="#667eea" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Status Filter</InputLabel>
                  <Select
                    value={filterStatus}
                    onChange={(e) => handleFilterChange(e.target.value as any)}
                    label="Status Filter"
                    sx={{
                      borderRadius: 2,
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'white',
                      },
                    }}
                  >
                    <MenuItem value="all">All Churches</MenuItem>
                    <MenuItem value="active">Active Only</MenuItem>
                    <MenuItem value="inactive">Inactive Only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Box sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  borderRadius: 2,
                  p: 2,
                  textAlign: 'center',
                }}>
                  <Typography variant="h6" fontWeight="bold">
                    {filteredChurches.length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Churches Found
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Error Display with modern styling */}
        {error && (
          <Grid size={{ xs: 12 }}>
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2,
                borderRadius: 3,
                border: '1px solid rgba(211, 47, 47, 0.2)',
                backgroundColor: 'rgba(255, 235, 238, 0.8)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 20px rgba(211, 47, 47, 0.1)',
              }}
            >
              {error}
            </Alert>
          </Grid>
        )}

        {/* Churches Grid */}
        <Grid size={{ xs: 12 }}>
          {loading ? (
            <Grid container spacing={3}>
              {[...Array(6)].map((_, index) => (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={index}>
                  <Card sx={{ 
                    borderRadius: 4,
                    background: 'linear-gradient(145deg, #ffffff 0%, #f8f9ff 100%)',
                    border: '1px solid rgba(102, 126, 234, 0.1)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box display="flex" alignItems="center" mb={3}>
                        <Skeleton 
                          variant="rounded" 
                          width={60} 
                          height={60} 
                          sx={{ borderRadius: 3 }}
                        />
                        <Box ml={2} flex={1}>
                          <Skeleton variant="text" width="70%" height={28} sx={{ mb: 1 }} />
                          <Skeleton variant="text" width="40%" height={24} />
                        </Box>
                      </Box>
                      <Skeleton variant="text" width="100%" height={20} sx={{ mb: 2 }} />
                      <Skeleton variant="text" width="85%" height={20} sx={{ mb: 2 }} />
                      <Skeleton variant="text" width="75%" height={20} sx={{ mb: 2 }} />
                      <Skeleton variant="rectangular" width="100%" height={40} sx={{ borderRadius: 2 }} />
                    </CardContent>
                    <CardActions sx={{ px: 3, pb: 3 }}>
                      <Skeleton variant="circular" width={40} height={40} />
                      <Skeleton variant="circular" width={40} height={40} />
                      <Skeleton variant="circular" width={40} height={40} />
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Grid container spacing={3}>
              {filteredChurches.map((church) => (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={church.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: 4,
                      background: 'linear-gradient(145deg, #ffffff 0%, #f8f9ff 100%)',
                      border: '1px solid rgba(102, 126, 234, 0.1)',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        background: church.is_active 
                          ? 'linear-gradient(90deg, #4ade80 0%, #22c55e 100%)'
                          : 'linear-gradient(90deg, #f87171 0%, #ef4444 100%)',
                        transition: 'all 0.3s ease',
                      },
                      '&:hover': {
                        transform: 'translateY(-8px) scale(1.02)',
                        boxShadow: '0 20px 40px rgba(102, 126, 234, 0.15)',
                        '&::before': {
                          height: 6,
                        },
                      },
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, p: 3 }}>
                      {/* Church Header */}
                      <Box display="flex" alignItems="center" mb={3}>
                        <Box
                          sx={{
                            width: 60,
                            height: 60,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 3,
                            background: church.is_active
                              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                              : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                            position: 'relative',
                            '&::after': {
                              content: '""',
                              position: 'absolute',
                              inset: 1,
                              borderRadius: 'inherit',
                              background: 'rgba(255, 255, 255, 0.1)',
                            },
                          }}
                        >
                          <OrthodoxChurchIcon
                            isActive={church.is_active}
                            uniqueId={church.id}
                            sx={{ width: 32, height: 32, color: 'white', zIndex: 1 }}
                          />
                        </Box>
                        <Box ml={2} flex={1}>
                          <Typography 
                            variant="h6" 
                            component="h2" 
                            noWrap
                            sx={{
                              fontWeight: 700,
                              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                              backgroundClip: 'text',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              mb: 1,
                            }}
                          >
                            {church.name}
                          </Typography>
                          <Chip
                            label={getChurchStatusText(church.is_active)}
                            color={getChurchStatusColor(church.is_active)}
                            size="small"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              borderRadius: 2,
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                            }}
                          />
                        </Box>
                      </Box>

                      {/* Church Details */}
                      <Box space={2}>
                        <Box display="flex" alignItems="center" mb={2} sx={{ 
                          p: 1.5, 
                          backgroundColor: 'rgba(102, 126, 234, 0.05)', 
                          borderRadius: 2,
                          border: '1px solid rgba(102, 126, 234, 0.1)',
                        }}>
                          <IconMapPin size={18} color="#667eea" />
                          <Typography variant="body2" color="text.secondary" ml={1.5} noWrap>
                            {church.address || 'Address not specified'}
                          </Typography>
                        </Box>

                        <Box display="flex" alignItems="center" mb={2} sx={{ 
                          p: 1.5, 
                          backgroundColor: 'rgba(102, 126, 234, 0.05)', 
                          borderRadius: 2,
                          border: '1px solid rgba(102, 126, 234, 0.1)',
                        }}>
                          <IconMail size={18} color="#667eea" />
                          <Typography variant="body2" color="text.secondary" ml={1.5} noWrap>
                            {church.email || 'Email not specified'}
                          </Typography>
                        </Box>

                        <Box display="flex" alignItems="center" mb={2} sx={{ 
                          p: 1.5, 
                          backgroundColor: 'rgba(102, 126, 234, 0.05)', 
                          borderRadius: 2,
                          border: '1px solid rgba(102, 126, 234, 0.1)',
                        }}>
                          <IconCalendar size={18} color="#667eea" />
                          <Typography variant="body2" color="text.secondary" ml={1.5}>
                            Created: {new Date(church.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>

                        <Box sx={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          borderRadius: 2,
                          p: 1.5,
                          textAlign: 'center',
                        }}>
                          <Typography variant="body2" fontWeight="bold">
                            Language: {church.preferred_language?.toUpperCase() || 'EN'}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>

                    {/* Enhanced Action Buttons */}
                    <CardActions sx={{ 
                      justifyContent: 'center', 
                      px: 3, 
                      pb: 3,
                      gap: 1,
                    }}>
                      <IconButton
                        size="medium"
                        onClick={() => handleViewChurch(church)}
                        sx={{
                          backgroundColor: 'rgba(102, 126, 234, 0.1)',
                          color: '#667eea',
                          borderRadius: 2,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            backgroundColor: '#667eea',
                            color: 'white',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                          },
                        }}
                      >
                        <IconEye size={20} />
                      </IconButton>
                      <IconButton
                        size="medium"
                        onClick={() => handleEditChurch(church)}
                        sx={{
                          backgroundColor: 'rgba(34, 197, 94, 0.1)',
                          color: '#22c55e',
                          borderRadius: 2,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            backgroundColor: '#22c55e',
                            color: 'white',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)',
                          },
                        }}
                      >
                        <IconEdit size={20} />
                      </IconButton>
                      <IconButton
                        size="medium"
                        onClick={() => handleDeleteDialogOpen(church)}
                        sx={{
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                          borderRadius: 2,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            backgroundColor: '#ef4444',
                            color: 'white',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                          },
                        }}
                      >
                        <IconTrash size={20} />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Grid>

        {/* Enhanced Empty State */}
        {!loading && filteredChurches.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ 
              p: 6, 
              textAlign: 'center',
              borderRadius: 4,
              background: 'linear-gradient(145deg, #ffffff 0%, #f8f9ff 100%)',
              border: '1px solid rgba(102, 126, 234, 0.1)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            }}>
              <Box sx={{
                width: 120,
                height: 120,
                mx: 'auto',
                mb: 3,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 30px rgba(102, 126, 234, 0.3)',
              }}>
                <OrthodoxChurchIcon 
                  sx={{ width: 60, height: 60, color: 'white' }}
                  isActive={true}
                  uniqueId={0}
                />
              </Box>
              <Typography variant="h5" fontWeight="bold" gutterBottom sx={{
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {searchQuery ? 'No churches match your search' : 'No churches found'}
              </Typography>
              <Typography variant="body1" color="text.secondary" mb={4} sx={{ maxWidth: 400, mx: 'auto' }}>
                {searchQuery 
                  ? 'Try adjusting your search criteria or filters to find what you\'re looking for.'
                  : 'Get started by adding your first Orthodox church to the system.'
                }
              </Typography>
              <Button
                variant="contained"
                startIcon={<IconPlus />}
                href="/apps/church-management/create"
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 3,
                  px: 4,
                  py: 1.5,
                  fontWeight: 'bold',
                  textTransform: 'none',
                  fontSize: '1rem',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                {searchQuery ? 'Add New Church' : 'Add First Church'}
              </Button>
            </Paper>
          </Grid>
        )}
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
            This action cannot be undone and will permanently remove all church data.
          </Typography>
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
              <Grid size={{ xs: 12, md: 6 }}>
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
              <Grid size={{ xs: 12, md: 6 }}>
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
              <Grid size={{ xs: 12, md: 6 }}>
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
              <Grid size={{ xs: 12, md: 6 }}>
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
              <Grid size={{ xs: 12, md: 6 }}>
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
              <Grid size={{ xs: 12, md: 6 }}>
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
