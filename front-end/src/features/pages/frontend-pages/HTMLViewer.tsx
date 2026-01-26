/**
 * HTMLViewer Component
 * 
 * Component for viewing HTML files in OrthodoxMetrics.
 * Loads and displays HTML content from a file path.
 * 
 * Routes:
 * - /russian_wedding_table_demo.html
 * - /romanian_funeral_table_demo.html
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';

interface HTMLViewerProps {
  htmlFile: string;
}

const HTMLViewer: React.FC<HTMLViewerProps> = ({ htmlFile }) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHTMLFile = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Try to fetch the HTML file from the public directory
        const response = await fetch(htmlFile);
        
        if (!response.ok) {
          throw new Error(`Failed to load HTML file: ${response.statusText}`);
        }
        
        const content = await response.text();
        setHtmlContent(content);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load HTML file';
        setError(errorMessage);
        console.error('Error loading HTML file:', err);
      } finally {
        setLoading(false);
      }
    };

    if (htmlFile) {
      loadHTMLFile();
    } else {
      setError('No HTML file specified');
      setLoading(false);
    }
  }, [htmlFile]);

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

export default HTMLViewer;
