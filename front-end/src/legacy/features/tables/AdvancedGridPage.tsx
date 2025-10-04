import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdvancedGridDialog } from './AdvancedGridDialog';
import { listRecords, type TableKey } from '@/shared/lib/recordsApi';
import { Box, CircularProgress, Alert } from '@mui/material';

// Enhanced wrapper to render AdvancedGridDialog as a standalone page with proper data fetching
const AdvancedGridPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get parameters from URL
  const recordType = (searchParams.get('table') || 'baptism') as TableKey;
  const churchId = parseInt(searchParams.get('church_id') || '46', 10);

  // Fetch records on mount and when parameters change
  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch all records (no pagination limit for grid view)
        const result = await listRecords({
          table: recordType,
          churchId,
          page: 1,
          limit: 1000, // Large limit for grid view
          sortField: recordType === 'baptism' ? 'dateOfBaptism' : 
                    recordType === 'marriage' ? 'marriageDate' : 'funeralDate',
          sortDirection: 'desc'
        });

        console.log(`[AdvancedGridPage] Loaded ${result.rows.length} ${recordType} records for grid`);
        setRecords(result.rows);
      } catch (err: any) {
        console.error(`[AdvancedGridPage] Error loading ${recordType} records:`, err);
        setError(err.message || 'Failed to load records');
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [recordType, churchId]);

  // Handle refresh
  const handleRefresh = () => {
    setRecords([]);
    // Re-trigger useEffect by changing loading state
    setLoading(true);
  };

  // Show loading state
  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" onClose={() => window.history.back()}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <AdvancedGridDialog
      open={true}
      onClose={() => window.history.back()}
      records={records}
      recordType={recordType}
      onRefresh={handleRefresh}
    />
  );
};

export default AdvancedGridPage;
