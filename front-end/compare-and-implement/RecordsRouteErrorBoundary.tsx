/**
 * DEV-only Error Boundary for Records Routes
 * Provides comprehensive error logging for React error #300 and other issues
 * Only runs in development builds
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class RecordsRouteErrorBoundaryClass extends Component<Props & { location: string }, State> {
  constructor(props: Props & { location: string }) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Only log in dev builds
    if (import.meta.env.DEV) {
      this.setState({
        error,
        errorInfo,
      });

      // Extract route info
      const location = this.props.location;
      const pathMatch = location.match(/\/apps\/records\/(baptism|marriage|funeral)/);
      const recordType = pathMatch ? pathMatch[1] : 'unknown';
      const searchParams = new URLSearchParams(location.split('?')[1] || '');
      const churchId = searchParams.get('church') || 'unknown';
      const viewMode = searchParams.get('view') || 'normal';

      console.group('🚨 DEV: Records Route Error Boundary');
      console.error('Error Message:', error.message);
      console.error('Error Stack:', error.stack);
      console.error('Component Stack:', errorInfo.componentStack);
      console.error('Location:', {
        pathname: location.split('?')[0],
        search: location.split('?')[1] || '',
        fullPath: location,
      });
      console.error('Route Context:', {
        recordType,
        churchId,
        viewMode,
        timestamp: new Date().toISOString(),
      });
      
      // Check for common React error patterns
      const errorMessage = error.message || '';
      const errorStack = error.stack || '';
      
      if (errorMessage.includes('Objects are not valid as a React child') || 
          errorMessage.includes('Cannot read property') ||
          errorMessage.includes('undefined') ||
          errorMessage.includes('null')) {
        console.warn('⚠️ Possible cause: Rendering non-renderable value (object/array/undefined)');
        console.warn('Check for: {value} where value is object/array, or undefined component imports');
      }
      
      if (errorMessage.includes('Invalid element type') || 
          errorMessage.includes('Element type is invalid')) {
        console.warn('⚠️ Possible cause: Component import/export mismatch (default vs named)');
        console.warn('Check for: import/export mismatches, undefined components');
      }
      
      if (errorStack.includes('useState') || errorStack.includes('useEffect') || errorStack.includes('useCallback')) {
        console.warn('⚠️ Possible cause: Hook order violation (conditional hooks, hooks in loops)');
        console.warn('Check for: Hooks inside if statements, loops, or conditional rendering');
      }
      
      console.groupEnd();
    }
  }

  render() {
    if (this.state.hasError) {
      // In dev, show minimal error indicator
      if (import.meta.env.DEV) {
        return (
          <div style={{
            padding: '20px',
            margin: '20px',
            border: '2px solid #f44336',
            borderRadius: '4px',
            backgroundColor: '#ffebee',
            color: '#c62828',
          }}>
            <h3 style={{ marginTop: 0 }}>⚠️ Records Route Error (Dev Only)</h3>
            <p><strong>Error:</strong> {this.state.error?.message || 'Unknown error'}</p>
            <p><strong>Location:</strong> {this.props.location}</p>
            <details style={{ marginTop: '10px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Full Error Details</summary>
              <div style={{ marginTop: '10px' }}>
                <strong>Stack Trace:</strong>
                <pre style={{
                  marginTop: '5px',
                  padding: '10px',
                  backgroundColor: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '12px',
                  maxHeight: '300px',
                }}>
                  {this.state.error?.stack}
                </pre>
              </div>
              <div style={{ marginTop: '10px' }}>
                <strong>Component Stack:</strong>
                <pre style={{
                  marginTop: '5px',
                  padding: '10px',
                  backgroundColor: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '12px',
                  maxHeight: '300px',
                  whiteSpace: 'pre-wrap',
                }}>
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            </details>
          </div>
        );
      }

      // In prod, return null (let parent error boundary handle it)
      return null;
    }

    return this.props.children;
  }
}

// Wrapper component to access useLocation hook
export const RecordsRouteErrorBoundary: React.FC<Props> = (props) => {
  // Only wrap in dev builds - in prod, just pass through
  if (!import.meta.env.DEV) {
    return <>{props.children}</>;
  }

  const location = useLocation();
  const locationString = `${location.pathname}${location.search}`;

  return <RecordsRouteErrorBoundaryClass {...props} location={locationString} />;
};
