import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Paper,
  Alert,
  CircularProgress
} from '@mui/material';
import RecordsPage from '@/features/records/RecordsPage';

interface Church {
  id: number;
  name: string;  // The API returns "name" not "church_name"
  is_active: number; // API returns 1/0 not boolean
}

/**
 * Dynamic Records Page Wrapper
 * Allows selecting a church and viewing its records
 */
const DynamicRecordsPageWrapper: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [churches, setChurches] = useState<Church[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize from URL params
  useEffect(() => {
    const churchParam = searchParams.get('church');
    if (churchParam) {
      const churchId = parseInt(churchParam);
      if (!isNaN(churchId)) {
        setSelectedChurchId(churchId);
      }
    }
  }, [searchParams]);

  // Load churches list
  useEffect(() => {
    const loadChurches = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/admin/churches', {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`Failed to load churches: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Handle different response structures
        let churchList: Church[] = [];
        if (data.success && Array.isArray(data.churches)) {
          // Response has success + churches array structure
          churchList = data.churches;
        } else if (Array.isArray(data)) {
          // Response is direct array
          churchList = data;
        } else if (data.data && Array.isArray(data.data)) {
          // Response has data array structure
          churchList = data.data;
        }
        
        setChurches(churchList.filter((church: Church) => church.is_active === 1));
        
        // Auto-select first church if none selected
        if (!selectedChurchId && churchList.length > 0) {
          setSelectedChurchId(churchList[0].id);
        }
      } catch (err) {
        console.error('Error loading churches:', err);
        setError(err instanceof Error ? err.message : 'Failed to load churches');
      } finally {
        setLoading(false);
      }
    };

    loadChurches();
  }, [selectedChurchId]);

  // Update URL when church changes
  useEffect(() => {
    if (selectedChurchId) {
      const params = new URLSearchParams(searchParams);
      params.set('church', selectedChurchId.toString());
      setSearchParams(params, { replace: true });
    }
  }, [selectedChurchId, searchParams, setSearchParams]);

  const handleChurchChange = (churchId: number) => {
    setSelectedChurchId(churchId);
  };

  const getTableParam = (): string | undefined => {
    return searchParams.get('table') || undefined;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading churches...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (churches.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">No active churches found.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, space: 2 }}>
      {/* Church Selection Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Dynamic Records Explorer
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Select a church to view and manage its records
        </Typography>
        
        <FormControl sx={{ minWidth: 300, mt: 2 }}>
          <InputLabel>Select Church</InputLabel>
          <Select
            value={selectedChurchId || ''}
            onChange={(e) => handleChurchChange(Number(e.target.value))}
            label="Select Church"
          >
            {churches.map((church) => (
              <MenuItem key={church.id} value={church.id}>
                {church.name} (ID: {church.id})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {/* Records Page */}
      {selectedChurchId && (
        <RecordsPage 
          churchId={selectedChurchId} 
          initialTable={getTableParam()}
        />
      )}
    </Box>
  );
};

export default DynamicRecordsPageWrapper;
