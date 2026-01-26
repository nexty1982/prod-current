/**
 * GreekRecordsViewer Component
 * 
 * Component for viewing Greek baptism records table demo in OrthodoxMetrics.
 * Displays the Greek baptism table demo HTML file.
 * 
 * Route: /greek_baptism_table_demo.html
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';

const GreekRecordsViewer: React.FC = () => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGreekBaptismTable = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Load the Greek baptism table demo HTML file
        const response = await fetch('/greek_baptism_table_demo.html');
        
        if (!response.ok) {
          throw new Error(`Failed to load Greek baptism table: ${response.statusText}`);
        }
        
        const content = await response.text();
        setHtmlContent(content);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load Greek baptism table';
        setError(errorMessage);
        console.error('Error loading Greek baptism table:', err);
      } finally {
        setLoading(false);
      }
    };

    loadGreekBaptismTable();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ width: '100%', minHeight: '100vh' }}>
      <Paper
        sx={{
          width: '100%',
          minHeight: '100vh',
          p: 0,
          '& iframe': {
            width: '100%',
            minHeight: '100vh',
            border: 'none',
          },
        }}
      >
        <Box
          sx={{
            width: '100%',
            minHeight: '100vh',
            '& *': {
              maxWidth: '100%',
            },
          }}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </Paper>
    </Box>
  );
};

export default GreekRecordsViewer;
