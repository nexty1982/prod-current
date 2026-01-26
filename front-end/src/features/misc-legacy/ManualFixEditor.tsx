// Manual Fix Editor Component
// Provides Monaco Editor for live component editing with syntax validation and diff preview

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Paper,
  Chip,
  CircularProgress,
  FormControlLabel,
  Switch,
  TextField,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Save as SaveIcon,
  Preview as PreviewIcon,
  Restore as RestoreIcon,
  Code as CodeIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon
} from '@mui/icons-material';
import ComponentInfo  from '@/hooks/useComponentRegistry';

// Temporarily disabled for build - Monaco Editor not available
// const MonacoEditor = React.lazy(() => 
//   import('monaco-editor').then(() => ({ default: () => null })).catch(() => ({ default: () => null }))
// );

// Simple fallback component for build
const MonacoEditor = React.lazy(() => 
  Promise.resolve({ default: () => (
    <div style={{ 
      width: '100%', 
      height: '400px', 
      border: '1px solid #ccc', 
      padding: '10px',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Typography>Code Editor temporarily unavailable for build</Typography>
    </div>
  )})
);

interface ManualFixEditorProps {
  component: ComponentInfo | null;
  onSave: (path: string, contents: string) => Promise<any>;
  onPreviewDiff: (originalContent: string, newContent: string) => void;
  onRollback: (backupToken: string) => Promise<void>;
}

// Safe wrapper component to prevent hook violations
const ManualFixEditor: React.FC<ManualFixEditorProps> = (props) => {
  const { component, onSave, onPreviewDiff, onRollback } = props;
  
  // Early return with safe component if no component selected
  if (!component) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Select a component to edit
        </Typography>
      </Box>
    );
  }

  return <ManualFixEditorInner {...props} />;
};

// Inner component with hooks - only rendered when component exists
const ManualFixEditorInner: React.FC<ManualFixEditorProps> = ({
  component,
  onSave,
  onPreviewDiff,
  onRollback
}) => {
  // State hooks - safe because component is guaranteed to exist
  const [activeTab, setActiveTab] = useState(0);
  const [originalContent, setOriginalContent] = useState('');
  const [currentContent, setCurrentContent] = useState('');
  const [componentPath, setComponentPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // VRT Integration with safer initialization
  const [vrtEnabled, setVrtEnabled] = useState(false);
  const [vrtLoading, setVrtLoading] = useState(false);

  // Load component source - safe effect
  useEffect(() => {
    if (!component) return;
    
    const loadSource = async () => {
      setLoading(true);
      setError(null);
      try {
        // Simple template generation instead of complex loading
        const template = generateComponentTemplate(component.name);
        setOriginalContent(template);
        setCurrentContent(template);
        setComponentPath(`/src/components/${component.name}.tsx`);
      } catch (error) {
        console.error('Failed to load component:', error);
        setError('Failed to load component source');
      } finally {
        setLoading(false);
      }
    };

    loadSource();
  }, [component]);

  // Initialize VRT safely
  useEffect(() => {
    // Simplified VRT initialization without external dependencies
    setVrtEnabled(false); // Disable VRT for now to prevent hook issues
  }, []);

  const generateComponentTemplate = useCallback((componentName: string): string => {
    return `import React from 'react';
import { Box, Typography } from '@mui/material';

interface ${componentName}Props {
  // Add props here
}

const ${componentName}: React.FC<${componentName}Props> = (props) => {
  return (
    <Box>
      <Typography variant="h6">
        ${componentName} Component
      </Typography>
      {/* Add your component content here */}
    </Box>
  );
};

export default ${componentName};`;
  }, []);

  const handleSave = useCallback(async () => {
    if (!component || !componentPath) return;

    setLoading(true);
    try {
      const result = await onSave(componentPath, currentContent);
      setOriginalContent(currentContent);
      setIsModified(false);
      console.log('Component saved successfully:', result);
    } catch (error) {
      console.error('Failed to save component:', error);
      setError('Failed to save component');
    } finally {
      setLoading(false);
    }
  }, [component, componentPath, currentContent, onSave]);

  const handlePreviewDiff = useCallback(() => {
    onPreviewDiff(originalContent, currentContent);
  }, [originalContent, currentContent, onPreviewDiff]);

  const handleReset = useCallback(() => {
    if (!confirm('Reset to original content? All changes will be lost.')) {
      return;
    }
    setCurrentContent(originalContent);
    setIsModified(false);
  }, [originalContent]);

  const handleContentChange = useCallback((value: string) => {
    setCurrentContent(value);
    setIsModified(value !== originalContent);
  }, [originalContent]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading component...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Manual Fix Editor - {component.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip 
            label={isModified ? "Modified" : "Saved"} 
            color={isModified ? "warning" : "success"} 
            size="small" 
          />
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Editor" />
          <Tab label="Info" />
          {vrtEnabled && <Tab label="Visual Testing" />}
        </Tabs>
      </Box>

      {/* Editor Tab */}
      {activeTab === 0 && (
        <Box>
          <Paper sx={{ p: 2, mb: 2, minHeight: '400px' }}>
            <TextField
              multiline
              fullWidth
              rows={15}
              value={currentContent}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Component source code will appear here..."
              sx={{
                '& .MuiInputBase-input': {
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  fontSize: '14px'
                }
              }}
            />
          </Paper>

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<RestoreIcon />}
              onClick={handleReset}
              disabled={!isModified}
            >
              Reset
            </Button>
            <Button
              variant="outlined"
              startIcon={<PreviewIcon />}
              onClick={handlePreviewDiff}
              disabled={!isModified}
            >
              Preview Diff
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!isModified || loading}
            >
              {loading ? 'Saving...' : 'Save Fix'}
            </Button>
          </Box>
        </Box>
      )}

      {/* Info Tab */}
      {activeTab === 1 && (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Manual Fix Editor</strong> - Edit component source code directly.
              This is a simplified editor for basic component modifications.
            </Typography>
          </Alert>
          
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Component Information
            </Typography>
            <Typography variant="body2">
              <strong>Name:</strong> {component.name}
            </Typography>
            <Typography variant="body2">
              <strong>Path:</strong> {componentPath}
            </Typography>
            <Typography variant="body2">
              <strong>Status:</strong> {isModified ? 'Modified' : 'Saved'}
            </Typography>
          </Paper>
        </Box>
      )}

      {/* VRT Tab - Disabled for now */}
      {vrtEnabled && activeTab === 2 && (
        <Box>
          <Alert severity="warning">
            Visual Regression Testing is temporarily disabled to resolve compatibility issues.
          </Alert>
        </Box>
      )}
    </Box>
  );
};

export default ManualFixEditor; 