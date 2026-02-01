import React from 'react';
import { Box, Tooltip } from '@mui/material';
import { Activity } from 'lucide-react';

/**
 * ActiveSessionIndicator - Shows a small green pulse indicator when user has an active session
 * Displayed in the header profile area
 */
const ActiveSessionIndicator: React.FC = () => {
  return (
    <Tooltip title="Active Session" arrow>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          borderRadius: '50%',
          bgcolor: 'rgba(76, 175, 80, 0.15)',
          ml: 1,
        }}
      >
        <Activity 
          size={14} 
          style={{ 
            color: '#4caf50',
            animation: 'pulse 2s ease-in-out infinite'
          }} 
        />
      </Box>
    </Tooltip>
  );
};

export default ActiveSessionIndicator;
