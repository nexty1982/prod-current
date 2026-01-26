import React, { useState } from 'react';
import {
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  CameraAlt as CameraIcon,
  Download as DownloadIcon,
  Check as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import html2canvas from 'html2canvas';

interface ScreenshotResult {
  filename: string;
  url: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

const ScreenshotCapture: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [taskId, setTaskId] = useState('');
  const [screenshotIndex, setScreenshotIndex] = useState('01');
  const [capturing, setCapturing] = useState(false);
  const [results, setResults] = useState<ScreenshotResult[]>([]);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const generateFilename = () => {
    return `task${taskId}-${screenshotIndex}.png`;
  };

  const captureScreenshot = async () => {
    if (!taskId) {
      alert('Please enter a task ID');
      return;
    }

    setCapturing(true);
    
    try {
      // Get current URL for overlay
      const currentUrl = window.location.href;
      
      // Create URL overlay element
      const overlay = document.createElement('div');
      overlay.id = 'screenshot-url-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 12px;
        z-index: 999999;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.2);
      `;
      overlay.textContent = currentUrl;
      document.body.appendChild(overlay);
      
      // Wait a moment for overlay to render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Capture screenshot
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        scale: 1,
        scrollX: 0,
        scrollY: 0,
        width: window.innerWidth,
        height: Math.max(document.body.scrollHeight, window.innerHeight)
      });
      
      // Remove overlay
      overlay.remove();
      
      // Convert to blob and download
      const filename = generateFilename();
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.click();
          URL.revokeObjectURL(url);
          
          // Add to results
          const result: ScreenshotResult = {
            filename,
            url: currentUrl,
            timestamp: new Date().toISOString(),
            success: true
          };
          
          setResults(prev => [result, ...prev]);
          
          // Auto-increment screenshot index
          const nextIndex = (parseInt(screenshotIndex) + 1).toString().padStart(2, '0');
          setScreenshotIndex(nextIndex);
        }
      }, 'image/png');
      
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      
      const result: ScreenshotResult = {
        filename: generateFilename(),
        url: window.location.href,
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      setResults(prev => [result, ...prev]);
    } finally {
      setCapturing(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <>
      {/* Floating Action Button */}
      <Fab
        color="secondary"
        aria-label="capture screenshot"
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000
        }}
      >
        <CameraIcon />
      </Fab>

      {/* Screenshot Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          📸 Dev Screenshot Capture
        </DialogTitle>
        
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Development-only screenshot capture tool. Screenshots will be downloaded to your browser's download folder.
          </Alert>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="Task ID"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              placeholder="132"
              size="small"
              sx={{ flex: 1 }}
            />
            <TextField
              label="Screenshot Index"
              value={screenshotIndex}
              onChange={(e) => setScreenshotIndex(e.target.value)}
              placeholder="01"
              size="small"
              sx={{ width: 100 }}
            />
          </Box>
          
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Current URL: {window.location.href}
          </Typography>
          
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Filename: {taskId ? generateFilename() : 'task[ID]-[INDEX].png'}
          </Typography>
          
          {results.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">Recent Captures</Typography>
                <Button size="small" onClick={clearResults}>Clear</Button>
              </Box>
              
              <List dense>
                {results.slice(0, 5).map((result, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {result.success ? (
                        <CheckIcon color="success" />
                      ) : (
                        <ErrorIcon color="error" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={result.filename}
                      secondary={result.success ? result.url : result.error}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button
            onClick={captureScreenshot}
            variant="contained"
            disabled={capturing || !taskId}
            startIcon={capturing ? <CircularProgress size={16} /> : <CameraIcon />}
          >
            {capturing ? 'Capturing...' : 'Capture Screenshot'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ScreenshotCapture; 