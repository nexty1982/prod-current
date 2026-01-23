/**
 * Dev-only Error Boundary for Record Views
 * Provides actionable error diagnostics in development builds
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface Props {
  children: ReactNode;
  recordType?: string;
  viewMode?: 'normal' | 'advanced';
  autoShrinkEnabled?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class RecordsErrorBoundaryClass extends Component<Props & { location: string }, State> {
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

      console.error('🚨 Records View Error Boundary Caught Error:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        location: this.props.location,
        recordType: this.props.recordType || 'unknown',
        viewMode: this.props.viewMode || 'unknown',
        autoShrinkEnabled: this.props.autoShrinkEnabled ?? undefined,
        timestamp: new Date().toISOString(),
      });

      // Log full error details for debugging
      console.group('📋 Full Error Details');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Props:', {
        recordType: this.props.recordType,
        viewMode: this.props.viewMode,
        autoShrinkEnabled: this.props.autoShrinkEnabled,
        location: this.props.location,
      });
      console.groupEnd();
    }
  }

  render() {
    if (this.state.hasError) {
      // In dev, show a minimal error indicator
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
            <h3 style={{ marginTop: 0 }}>⚠️ Records View Error (Dev Only)</h3>
            <p><strong>Error:</strong> {this.state.error?.message || 'Unknown error'}</p>
            <p><strong>Location:</strong> {this.props.location}</p>
            <p><strong>Record Type:</strong> {this.props.recordType || 'unknown'}</p>
            <p><strong>View Mode:</strong> {this.props.viewMode || 'unknown'}</p>
            <details style={{ marginTop: '10px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Stack Trace</summary>
              <pre style={{
                marginTop: '10px',
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
            </details>
            <details style={{ marginTop: '10px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Component Stack</summary>
              <pre style={{
                marginTop: '10px',
                padding: '10px',
                backgroundColor: '#fff',
                border: '1px solid #ccc',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px',
                maxHeight: '300px',
              }}>
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          </div>
        );
      }

      // In prod, return null or a minimal fallback
      return null;
    }

    return this.props.children;
  }
}

// Wrapper component to access useLocation hook
export const RecordsErrorBoundary: React.FC<Props> = (props) => {
  const location = useLocation();
  const locationString = `${location.pathname}${location.search}`;

  return <RecordsErrorBoundaryClass {...props} location={locationString} />;
};
