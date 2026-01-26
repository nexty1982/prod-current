import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Alert, Button } from '@mui/material';
import { useAuth } from '@/context/AuthContext';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class SiteEditorErrorBoundary extends Component<Props & { user: any }, State> {
  constructor(props: Props & { user: any }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🔧 SiteEditor Error Boundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
          <Typography variant="h4" gutterBottom sx={{ mb: 4, textAlign: 'center' }}>
            🛠️ Site Editor Error
          </Typography>
          
          <Alert severity="error" sx={{ mb: 4 }}>
            <Typography variant="body1">
              <strong>Error:</strong> The Site Editor encountered an error while loading.
            </Typography>
          </Alert>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Error Details
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', backgroundColor: '#f5f5f5', p: 2, borderRadius: 1 }}>
              {this.state.error?.message}
            </Typography>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              User Information
            </Typography>
            <Typography variant="body1">
              <strong>User Role:</strong> {this.props.user?.role || 'Not available'}
            </Typography>
            <Typography variant="body1">
              <strong>Is Super Admin:</strong> {this.props.user?.role === 'super_admin' ? 'Yes' : 'No'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button 
              variant="contained" 
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            >
              Try Again
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Wrapper component to inject user context
const SiteEditorErrorBoundaryWrapper: React.FC<Props> = ({ children }) => {
  const { user } = useAuth();
  
  return (
    <SiteEditorErrorBoundary user={user}>
      {children}
    </SiteEditorErrorBoundary>
  );
};

export default SiteEditorErrorBoundaryWrapper; 