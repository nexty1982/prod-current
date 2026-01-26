/**
 * RecordsPageWrapper Component
 * 
 * Wrapper component for church management records pages.
 * This component provides a consistent interface for displaying records
 * within the church management context.
 * 
 * Route: /apps/church-management/:id/records
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Paper } from '@mui/material';

/**
 * RecordsPageWrapper for church management
 * Displays records for a specific church
 */
const RecordsPageWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Church Records
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Church ID: {id}
        </Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Records management interface for church management.
          This component can be enhanced to display church-specific records.
        </Typography>
      </Paper>
    </Box>
  );
};

export default RecordsPageWrapper;
