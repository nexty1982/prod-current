import React, { useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

interface HTMLViewerProps {
  htmlFile: string;
}

const HTMLViewer: React.FC<HTMLViewerProps> = ({ htmlFile }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleError = () => {
    setLoading(false);
    setError(`Failed to load ${htmlFile}. Please ensure the file exists in the public directory.`);
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            zIndex: 1,
          }}
        >
          <CircularProgress />
          <Typography>Loading {htmlFile}...</Typography>
        </Box>
      )}
      {error && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            padding: 3,
            zIndex: 1,
          }}
        >
          <Typography color="error" variant="h6">
            {error}
          </Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Expected file location: public{htmlFile}
          </Typography>
        </Box>
      )}
      <iframe
        src={htmlFile}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: error ? 'none' : 'block',
        }}
        title={htmlFile}
      />
    </Box>
  );
};

export default HTMLViewer;

