/**
 * Centralized notification configuration
 * All notifications should use these settings for consistency
 */

import { SnackbarOrigin } from '@mui/material/Snackbar';

export const NOTIFICATION_CONFIG = {
  // Position all notifications at center-top of screen
  anchorOrigin: { 
    vertical: 'top' as const, 
    horizontal: 'center' as const 
  } as SnackbarOrigin,
  
  // Default auto-hide duration
  autoHideDuration: 6000,
  
  // Default auto-hide duration for success messages (shorter)
  successDuration: 4000,
  
  // Default auto-hide duration for error messages (longer)
  errorDuration: 8000,
} as const;

/**
 * Helper function to get notification props with consistent positioning
 */
export const getNotificationProps = (
  severity: 'success' | 'error' | 'info' | 'warning' = 'info'
) => ({
  anchorOrigin: NOTIFICATION_CONFIG.anchorOrigin,
  autoHideDuration: severity === 'success' 
    ? NOTIFICATION_CONFIG.successDuration 
    : severity === 'error' 
    ? NOTIFICATION_CONFIG.errorDuration 
    : NOTIFICATION_CONFIG.autoHideDuration
});
