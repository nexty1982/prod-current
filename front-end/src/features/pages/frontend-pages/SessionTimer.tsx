import React, { useState, useEffect } from 'react';
import { Typography, Box } from '@mui/material';
import { useAuth } from '@/context/AuthContext';

const SessionTimer: React.FC = () => {
  const { user, authenticated } = useAuth();
  const [sessionDuration, setSessionDuration] = useState(0);

  // Get session start time from localStorage or use current time
  useEffect(() => {
    if (!authenticated || !user) {
      return;
    }

    // Get or set session start time
    const sessionKey = `session_start_${user.id}`;
    let sessionStart = localStorage.getItem(sessionKey);
    
    if (!sessionStart) {
      // First time logging in this session, set the start time
      sessionStart = new Date().toISOString();
      localStorage.setItem(sessionKey, sessionStart);
    }

    // Update timer every second
    const interval = setInterval(() => {
      const startTime = new Date(sessionStart).getTime();
      const currentTime = new Date().getTime();
      const elapsed = Math.floor((currentTime - startTime) / 1000); // elapsed time in seconds
      setSessionDuration(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [authenticated, user]);

  if (!authenticated || !user) {
    return null;
  }

  // Format time as HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Get user's display name
  const userName = user.nick || 
                   (user.first_name && user.last_name 
                     ? `${user.first_name} ${user.last_name}`.trim()
                     : user.username || user.email || 'User');

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
      <Typography 
        variant="body2" 
        sx={{ 
          color: '#FFFFFF', // Explicit white color for header text
          whiteSpace: 'nowrap',
          fontWeight: 400
        }}
      >
        {userName} / logged on for {formatTime(sessionDuration)}
      </Typography>
    </Box>
  );
};

export default SessionTimer;

