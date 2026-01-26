import Grid2 from '@/components/compat/Grid2';
import React, { useEffect } from 'react';
import {
  Box,
  Grid,
  Stack,
  useMediaQuery,
  Typography,
  Fab,
  Button,
  Theme,
  Skeleton,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  ViewModule as GridViewIcon,
  ViewList as ListViewIcon
} from '@mui/icons-material';
import { useRecords } from '@/../context/RecordsContext';
import RecordCard from './RecordCard';
import RecordSearch from './RecordSearch';
import emptyRecords from '@/../assets/images/products/empty-shopping-cart.svg';

interface Props {
  onClick: (event: React.SyntheticEvent | Event) => void;
}

const RecordList: React.FC<Props> = ({ onClick }) => {
  const {
    filteredRecordTypes,
    loading,
    error,
    refreshRecords,
    clearFilters,
    selectedChurch
  } = useRecords();

  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');

  // Skeleton loading state
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={refreshRecords}>
          Try Again
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* ------------------------------------------- */}
      {/* Header Section */}
      {/* ------------------------------------------- */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" pb={3}>
        {lgUp ? (
          <Box>
            <Typography variant="h5">
              Records Management
              {selectedChurch && (
                <Typography variant="subtitle1" color="text.secondary">
                  {selectedChurch.name}
                </Typography>
              )}
            </Typography>
          </Box>
        ) : (
          <Fab onClick={onClick} color="primary" size="small">
            <MenuIcon width="16" />
          </Fab>
        )}
        
        <Box display="flex" alignItems="center" gap={1}>
          <RecordSearch />
          
          <Tooltip title="Refresh Records">
            <IconButton onClick={refreshRecords} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={viewMode === 'grid' ? 'List View' : 'Grid View'}>
            <IconButton
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              color="primary"
            >
              {viewMode === 'grid' ? <ListViewIcon /> : <GridViewIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Stack>

      {/* ------------------------------------------- */}
      {/* Records Grid */}
      {/* ------------------------------------------- */}
      <Grid2 container spacing={3}>
        {filteredRecordTypes.length > 0 ? (
          <>
            {filteredRecordTypes.map((record) => (
              <Grid2
                display="flex"
                alignItems="stretch"
                key={record.id}
                size={{
                  xs: 12,
                  lg: viewMode === 'grid' ? 4 : 12,
                  md: viewMode === 'grid' ? 6 : 12,
                  sm: viewMode === 'grid' ? 6 : 12
                }}
              >
                {/* ------------------------------------------- */}
                {/* Record Card */}
                {/* ------------------------------------------- */}
                {isLoading || loading ? (
                  <Skeleton
                    variant="rectangular"
                    width="100%"
                    height={viewMode === 'grid' ? 400 : 200}
                    sx={{ borderRadius: (theme) => theme.shape.borderRadius / 5 }}
                  />
                ) : (
                  <RecordCard record={record} />
                )}
              </Grid2>
            ))}
          </>
        ) : (
          <>
            <Grid2
              size={{
                xs: 12,
                lg: 12,
                md: 12,
                sm: 12
              }}
            >
              <Box textAlign="center" mt={6}>
                <img src={emptyRecords} alt="no records" width="200px" />
                <Typography variant="h4" sx={{ mt: 3 }}>
                  No Records Found
                </Typography>
                <Typography variant="h6" mb={3} color="text.secondary">
                  {selectedChurch 
                    ? `No record types match your current filters for ${selectedChurch.name}.`
                    : 'No church selected or no record types available.'
                  }
                </Typography>
                <Stack direction="row" spacing={2} justifyContent="center">
                  <Button variant="contained" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={refreshRecords}
                  >
                    Refresh
                  </Button>
                </Stack>
              </Box>
            </Grid2>
          </>
        )}
      </Grid2>

      {/* ------------------------------------------- */}
      {/* Quick Add Section */}
      {/* ------------------------------------------- */}
      {!loading && !isLoading && filteredRecordTypes.length > 0 && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000
          }}
        >
          <Tooltip title="Quick Add Record">
            <Fab
              color="primary"
              size="large"
              onClick={() => {
                // Open quick add dialog or navigate to add page
                console.log('Quick add record');
              }}
            >
              <AddIcon />
            </Fab>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
};

export default RecordList; 