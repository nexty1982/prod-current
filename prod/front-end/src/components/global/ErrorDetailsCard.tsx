import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Collapse,
  Divider,
  Tooltip,
  Button,
  Stack,
  Alert,
  Badge
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ContentCopy as CopyIcon,
  Task as TaskIcon,
  Visibility as VisibilityOffIcon,
  VisibilityOff as DismissIcon,
  Delete as DeleteIcon,
  CheckCircle as ResolvedIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  BugReport as BugIcon,
  Schedule as TimeIcon,
  LocationOn as LocationIcon,
  Code as CodeIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { GlobalError } from '../../hooks/useGlobalErrorStore';

interface ErrorDetailsCardProps {
  error: GlobalError;
  onToggleExpansion: (errorId: string) => void;
  onCreateTask: (error: GlobalError) => void;
  onDismiss: (errorId: string) => void;
  onUndismiss: (errorId: string) => void;
  onDelete: (errorId: string) => void;
  showTrackButton?: boolean;
}

const ErrorDetailsCard: React.FC<ErrorDetailsCardProps> = ({
  error,
  onToggleExpansion,
  onCreateTask,
  onDismiss,
  onUndismiss,
  onDelete,
  showTrackButton = true
}) => {
  const [copySuccess, setCopySuccess] = useState<string>('');

  const getSeverityIcon = (severity: GlobalError['severity']) => {
    switch (severity) {
      case 'critical': return <ErrorIcon sx={{ color: '#d32f2f' }} />;
      case 'high': return <WarningIcon sx={{ color: '#f57c00' }} />;
      case 'medium': return <InfoIcon sx={{ color: '#1976d2' }} />;
      case 'low': return <BugIcon sx={{ color: '#388e3c' }} />;
      default: return <InfoIcon sx={{ color: '#757575' }} />;
    }
  };

  const getSeverityColor = (severity: GlobalError['severity']): string => {
    switch (severity) {
      case 'critical': return '#d32f2f';
      case 'high': return '#f57c00';
      case 'medium': return '#1976d2';
      case 'low': return '#388e3c';
      default: return '#757575';
    }
  };

  const getOccurrenceColor = (count: number): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    if (count === 1) return 'success';
    if (count <= 5) return 'info';
    if (count <= 10) return 'warning';
    return 'error';
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(`${type} copied!`);
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopySuccess('Copy failed');
      setTimeout(() => setCopySuccess(''), 2000);
    }
  };

  const generateFullErrorReport = (): string => {
    return `🐛 ERROR REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 SUMMARY
Error Hash: ${error.hash}
Severity: ${error.severity.toUpperCase()}
Type: ${error.type}
Occurrences: ${error.occurrenceCount}
Status: ${error.resolved ? 'RESOLVED' : error.dismissed ? 'DISMISSED' : 'ACTIVE'}

⏰ TIMELINE
First Occurrence: ${new Date(error.firstOccurrence).toLocaleString()}
Last Occurrence: ${new Date(error.lastOccurrence).toLocaleString()}
Frequency: ${error.occurrenceCount > 1 ? `${error.occurrenceCount} times` : 'Once'}

📍 LOCATION
Component: ${error.component || 'Unknown'}
Route: ${error.route}
File: ${error.filename || 'N/A'}${error.lineno ? `:${error.lineno}` : ''}${error.colno ? `:${error.colno}` : ''}

💬 ERROR MESSAGE
${error.message}

🔍 STACK TRACE
${error.stack || 'No stack trace available'}

🌐 CONTEXT
URL: ${error.context?.url || 'N/A'}
User Agent: ${error.context?.userAgent || 'N/A'}
Viewport: ${error.context?.viewport || 'N/A'}
User Role: ${error.userRole || 'N/A'}
Church ID: ${error.churchId || 'N/A'}

🏷️ TAGS
${error.tags?.length ? error.tags.join(', ') : 'None'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated: ${new Date().toLocaleString()}
OMAI Error Console v2.0`;
  };

  const generateBugTaskDescription = (): string => {
    return `## 🐛 Bug Report

**Error Hash:** \`${error.hash}\`
**Severity:** ${error.severity.toUpperCase()}
**Occurrences:** ${error.occurrenceCount}

### 📍 Location
- **Component:** ${error.component || 'Unknown'}
- **Route:** \`${error.route}\`
- **File:** \`${error.filename || 'N/A'}\`${error.lineno ? `:${error.lineno}` : ''}

### 💬 Error Message
\`\`\`
${error.message}
\`\`\`

### 🔍 Stack Trace
\`\`\`
${error.stack || 'No stack trace available'}
\`\`\`

### ⏰ Timeline
- **First:** ${new Date(error.firstOccurrence).toLocaleString()}
- **Last:** ${new Date(error.lastOccurrence).toLocaleString()}

### 🎯 Action Items
- [ ] Investigate root cause
- [ ] Reproduce error in dev environment
- [ ] Implement fix
- [ ] Test fix thoroughly
- [ ] Deploy and monitor

### 🏷️ Tags
${error.tags?.join(', ') || 'None'}`;
  };

  return (
    <Card 
      sx={{ 
        mb: 1,
        border: error.resolved ? '1px solid #4caf50' : error.dismissed ? '1px solid #bdbdbd' : `1px solid ${getSeverityColor(error.severity)}`,
        opacity: error.dismissed ? 0.6 : 1,
        position: 'relative'
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header Row */}
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1}>
          <Box display="flex" alignItems="center" gap={1} flex={1}>
            {getSeverityIcon(error.severity)}
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 500, 
                color: error.dismissed ? '#666' : '#424242',
                flex: 1,
                textDecoration: error.resolved ? 'line-through' : 'none'
              }}
            >
              {error.message.length > 80 ? `${error.message.substring(0, 77)}...` : error.message}
            </Typography>
            
            {/* Occurrence Counter Badge */}
            {error.occurrenceCount > 1 && (
              <Badge
                badgeContent={`×${error.occurrenceCount}`}
                color={getOccurrenceColor(error.occurrenceCount)}
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    minWidth: 'auto',
                    height: 18,
                    padding: '0 4px'
                  }
                }}
              >
                <RefreshIcon sx={{ fontSize: 16, color: '#666' }} />
              </Badge>
            )}
          </Box>

          {/* Action Buttons */}
          <Box display="flex" alignItems="center" gap={0.5}>
            <Tooltip title="Expand Details">
              <IconButton
                size="small"
                onClick={() => onToggleExpansion(error.id)}
              >
                {error.isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Chips Row */}
        <Box display="flex" gap={0.5} mb={1} flexWrap="wrap" alignItems="center">
          <Chip
            label={error.severity.toUpperCase()}
            size="small"
            sx={{
              bgcolor: getSeverityColor(error.severity),
              color: 'white',
              fontSize: '0.7rem',
              height: 20,
              fontWeight: 'bold'
            }}
          />
          <Chip
            label={error.type}
            size="small"
            sx={{
              bgcolor: '#e0e0e0',
              color: '#424242',
              fontSize: '0.7rem',
              height: 20
            }}
          />
          <Chip
            icon={<TimeIcon sx={{ fontSize: 12 }} />}
            label={formatTimestamp(error.lastOccurrence)}
            size="small"
            sx={{
              bgcolor: '#f5f5f5',
              color: '#666',
              fontSize: '0.7rem',
              height: 20
            }}
          />
          <Chip
            icon={<LocationIcon sx={{ fontSize: 12 }} />}
            label={error.component || 'Unknown'}
            size="small"
            sx={{
              bgcolor: '#e8f4fd',
              color: '#1976d2',
              fontSize: '0.7rem',
              height: 20
            }}
          />
          {error.tags?.map((tag, index) => (
            <Chip
              key={index}
              label={tag}
              size="small"
              sx={{
                bgcolor: '#fff3e0',
                color: '#f57c00',
                fontSize: '0.7rem',
                height: 20
              }}
            />
          ))}
          {error.resolved && (
            <Chip
              icon={<ResolvedIcon sx={{ fontSize: 12 }} />}
              label="RESOLVED"
              size="small"
              sx={{
                bgcolor: '#e8f5e8',
                color: '#2e7d32',
                fontSize: '0.7rem',
                height: 20,
                fontWeight: 'bold'
              }}
            />
          )}
          {error.dismissed && (
            <Chip
              label="DISMISSED"
              size="small"
              sx={{
                bgcolor: '#f5f5f5',
                color: '#666',
                fontSize: '0.7rem',
                height: 20
              }}
            />
          )}
        </Box>

        {/* Copy Success Alert */}
        {copySuccess && (
          <Alert 
            severity="success" 
            sx={{ mb: 1, py: 0 }}
            onClose={() => setCopySuccess('')}
          >
            {copySuccess}
          </Alert>
        )}

        {/* Expanded Details */}
        <Collapse in={error.isExpanded}>
          <Divider sx={{ my: 1 }} />
          
          {/* File Location */}
          {error.filename && (
            <Box mb={2}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666' }}>
                📁 FILE LOCATION
              </Typography>
              <Box 
                sx={{ 
                  bgcolor: '#f8f9fa', 
                  p: 1, 
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {error.filename}
                    {error.lineno && `:${error.lineno}`}
                    {error.colno && `:${error.colno}`}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#666' }}>
                    Route: {error.route}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => copyToClipboard(
                    `${error.filename}${error.lineno ? `:${error.lineno}` : ''}`,
                    'File location'
                  )}
                >
                  <CopyIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            </Box>
          )}

          {/* Error Timeline */}
          <Box mb={2}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666' }}>
              ⏰ TIMELINE ({error.occurrenceCount} occurrence{error.occurrenceCount !== 1 ? 's' : ''})
            </Typography>
            <Box sx={{ bgcolor: '#f8f9fa', p: 1, borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                <strong>First:</strong> {new Date(error.firstOccurrence).toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                <strong>Last:</strong> {new Date(error.lastOccurrence).toLocaleString()}
              </Typography>
              {error.occurrenceCount > 1 && (
                <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#f57c00', fontWeight: 'bold' }}>
                  ⚠️ This error has occurred {error.occurrenceCount} times
                </Typography>
              )}
            </Box>
          </Box>

          {/* Full Error Message */}
          <Box mb={2}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666' }}>
                💬 FULL ERROR MESSAGE
              </Typography>
              <IconButton
                size="small"
                onClick={() => copyToClipboard(error.message, 'Error message')}
              >
                <CopyIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
            <Box 
              sx={{ 
                bgcolor: '#fff5f5', 
                p: 1, 
                borderRadius: 1,
                border: '1px solid #ffebee',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                whiteSpace: 'pre-wrap',
                maxHeight: 100,
                overflow: 'auto'
              }}
            >
              {error.message}
            </Box>
          </Box>

          {/* Stack Trace */}
          {error.stack && (
            <Box mb={2}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666' }}>
                  🔍 STACK TRACE
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => copyToClipboard(error.stack || '', 'Stack trace')}
                >
                  <CopyIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
              <Box 
                sx={{ 
                  bgcolor: '#f8f9fa', 
                  p: 1, 
                  borderRadius: 1,
                  border: '1px solid #e9ecef',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  whiteSpace: 'pre-wrap',
                  maxHeight: 200,
                  overflow: 'auto'
                }}
              >
                {error.stack}
              </Box>
            </Box>
          )}

          {/* Context Information */}
          {error.context && (
            <Box mb={2}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666' }}>
                🌐 CONTEXT
              </Typography>
              <Box sx={{ bgcolor: '#f8f9fa', p: 1, borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  <strong>URL:</strong> {error.context.url}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  <strong>Viewport:</strong> {error.context.viewport}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  <strong>User Role:</strong> {error.userRole || 'N/A'}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Action Buttons */}
          <Stack direction="row" spacing={1} mt={2}>
            {showTrackButton && !error.resolved && (
              <Button
                size="small"
                variant="contained"
                startIcon={<TaskIcon />}
                onClick={() => onCreateTask(error)}
                sx={{ 
                  bgcolor: '#1976d2', 
                  '&:hover': { bgcolor: '#1565c0' },
                  textTransform: 'none',
                  fontWeight: 'bold'
                }}
              >
                📌 Track
              </Button>
            )}
            
            <Button
              size="small"
              variant="outlined"
              startIcon={<CopyIcon />}
              onClick={() => copyToClipboard(generateFullErrorReport(), 'Full error report')}
              sx={{ textTransform: 'none' }}
            >
              Copy Report
            </Button>

            <Button
              size="small"
              variant="outlined"
              startIcon={<CodeIcon />}
              onClick={() => copyToClipboard(generateBugTaskDescription(), 'Bug task description')}
              sx={{ textTransform: 'none' }}
            >
              Copy Task
            </Button>

            {!error.dismissed ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={<DismissIcon />}
                onClick={() => onDismiss(error.id)}
                sx={{ textTransform: 'none', color: '#666', borderColor: '#666' }}
              >
                Dismiss
              </Button>
            ) : (
              <Button
                size="small"
                variant="outlined"
                startIcon={<VisibilityOffIcon />}
                onClick={() => onUndismiss(error.id)}
                sx={{ textTransform: 'none', color: '#1976d2', borderColor: '#1976d2' }}
              >
                Undismiss
              </Button>
            )}

            <Button
              size="small"
              variant="outlined"
              startIcon={<DeleteIcon />}
              onClick={() => onDelete(error.id)}
              sx={{ textTransform: 'none', color: '#d32f2f', borderColor: '#d32f2f' }}
            >
              Delete
            </Button>
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default ErrorDetailsCard;