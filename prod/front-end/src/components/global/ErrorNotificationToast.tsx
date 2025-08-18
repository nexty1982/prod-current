import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Chip,
  Box,
  IconButton,
  Typography,
  Collapse
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  BugReport as BugIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Task as TaskIcon
} from '@mui/icons-material';
import { GlobalError } from '../../hooks/useGlobalErrorStore';

interface ErrorNotificationToastProps {
  onTaskCreate?: (error: GlobalError) => void;
}

const ErrorNotificationToast: React.FC<ErrorNotificationToastProps> = ({ onTaskCreate }) => {
  const [notifications, setNotifications] = useState<GlobalError[]>([]);
  const [currentError, setCurrentError] = useState<GlobalError | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoHide, setAutoHide] = useState(true);

  useEffect(() => {
    const handleGlobalError = (event: CustomEvent<GlobalError>) => {
      const error = event.detail;
      
      // Add to notifications queue
      setNotifications(prev => [error, ...prev.slice(0, 4)]); // Keep only last 5
      
      // Show current error
      setCurrentError(error);
      
      // Auto-hide for low severity errors, keep visible for critical ones
      setAutoHide(error.severity === 'low' || error.severity === 'medium');
    };

    window.addEventListener('omai-error', handleGlobalError as EventListener);
    
    return () => {
      window.removeEventListener('omai-error', handleGlobalError as EventListener);
    };
  }, []);

  const handleClose = () => {
    setCurrentError(null);
    setIsExpanded(false);
  };

  const getSeverityIcon = (severity: GlobalError['severity']) => {
    switch (severity) {
      case 'critical': return <ErrorIcon sx={{ color: '#d32f2f' }} />;
      case 'high': return <WarningIcon sx={{ color: '#f57c00' }} />;
      case 'medium': return <InfoIcon sx={{ color: '#1976d2' }} />;
      case 'low': return <BugIcon sx={{ color: '#388e3c' }} />;
      default: return <InfoIcon sx={{ color: '#757575' }} />;
    }
  };

  const getSeverityColor = (severity: GlobalError['severity']): 'error' | 'warning' | 'info' | 'success' => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'info';
    }
  };

  const formatMessage = (message: string): string => {
    // Truncate very long messages
    if (message.length > 120) {
      return message.substring(0, 117) + '...';
    }
    return message;
  };

  if (!currentError) return null;

  return (
    <Snackbar
      open={!!currentError}
      autoHideDuration={autoHide ? 6000 : null}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{
        '& .MuiSnackbar-root': {
          position: 'fixed',
          top: 80,
          right: 24,
          zIndex: 10000
        }
      }}
    >
      <Alert
        severity={getSeverityColor(currentError.severity)}
        variant="filled"
        sx={{
          minWidth: 320,
          maxWidth: 500,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
        }}
        action={
          <Box display="flex" alignItems="center" gap={0.5}>
            {onTaskCreate && (
              <IconButton
                size="small"
                onClick={() => onTaskCreate(currentError)}
                sx={{ color: 'inherit' }}
                title="Create Task"
              >
                <TaskIcon sx={{ fontSize: 18 }} />
              </IconButton>
            )}
            <IconButton
              size="small"
              onClick={() => setIsExpanded(!isExpanded)}
              sx={{ color: 'inherit' }}
            >
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        }
      >
        <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {getSeverityIcon(currentError.severity)}
          <Typography variant="subtitle2" fontWeight="bold">
            Frontend Error Detected
          </Typography>
          <Chip
            label={currentError.severity.toUpperCase()}
            size="small"
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              color: 'inherit',
              fontWeight: 'bold',
              fontSize: '0.7rem',
              height: 20
            }}
          />
        </AlertTitle>
        
        <Typography variant="body2" sx={{ mb: 1 }}>
          {formatMessage(currentError.message)}
        </Typography>
        
        <Box display="flex" gap={0.5} mb={1}>
          <Chip
            label={currentError.component || 'Unknown Component'}
            size="small"
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.15)',
              color: 'inherit',
              fontSize: '0.7rem',
              height: 18
            }}
          />
          <Chip
            label={currentError.route}
            size="small"
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.15)',
              color: 'inherit',
              fontSize: '0.7rem',
              height: 18
            }}
          />
        </Box>

        <Collapse in={isExpanded}>
          <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mb: 1 }}>
              <strong>Type:</strong> {currentError.type}
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mb: 1 }}>
              <strong>Time:</strong> {new Date(currentError.timestamp).toLocaleTimeString()}
            </Typography>
            {currentError.filename && (
              <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mb: 1 }}>
                <strong>File:</strong> {currentError.filename}:{currentError.lineno}:{currentError.colno}
              </Typography>
            )}
            {currentError.stack && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mb: 0.5 }}>
                  <strong>Stack:</strong>
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontFamily: 'monospace', 
                    display: 'block',
                    whiteSpace: 'pre-wrap',
                    maxHeight: 100,
                    overflow: 'auto',
                    bgcolor: 'rgba(0, 0, 0, 0.1)',
                    p: 0.5,
                    borderRadius: 0.5
                  }}
                >
                  {currentError.stack.substring(0, 300)}...
                </Typography>
              </Box>
            )}
          </Box>
        </Collapse>
        
        <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.8 }}>
          Open OMAI Assistant to manage errors and create tasks.
        </Typography>
      </Alert>
    </Snackbar>
  );
};

export default ErrorNotificationToast;