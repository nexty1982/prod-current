import { Typography, Box, useTheme } from '@mui/material';
import { useAuth } from '@/context/AuthContext';

const LastLoggedIn = () => {
  const { user } = useAuth();
  const theme = useTheme();

  if (!user?.last_login) {
    return null;
  }

  // Parse the last_login timestamp
  const lastLoginDate = new Date(user.last_login);
  
  // Format: MM/DD/YYYY
  const month = String(lastLoginDate.getMonth() + 1).padStart(2, '0');
  const day = String(lastLoginDate.getDate()).padStart(2, '0');
  const year = lastLoginDate.getFullYear();
  const dateStr = `${month}/${day}/${year}`;
  
  // Format: hh:mm (24-hour format)
  const hours = String(lastLoginDate.getHours()).padStart(2, '0');
  const minutes = String(lastLoginDate.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  // Use explicit white color for header text to ensure visibility on dark backgrounds
  // This overrides any inherited theme colors
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
        Last logged in: {dateStr} time: {timeStr}
      </Typography>
    </Box>
  );
};

export default LastLoggedIn;

