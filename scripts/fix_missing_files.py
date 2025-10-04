#!/usr/bin/env python3
"""
Script to fix missing files that are causing import errors
"""

import os
import shutil
from pathlib import Path

def fix_missing_files():
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔧 Fixing missing files...')
    
    # 1. Fix config.ts
    config_backup = frontend_path / 'context/config.ts.inputs_backup'
    config_target = frontend_path / 'context/config.ts'
    if config_backup.exists() and not config_target.exists():
        shutil.copy2(config_backup, config_target)
        print('✅ Restored config.ts')
    
    # 2. Create missing Spinner component
    spinner_dir = frontend_path / 'views/spinner'
    spinner_dir.mkdir(parents=True, exist_ok=True)
    
    spinner_content = '''import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const Spinner: React.FC = () => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
    >
      <CircularProgress size={60} />
      <Typography variant="h6" sx={{ mt: 2 }}>
        Loading...
      </Typography>
    </Box>
  );
};

export default Spinner;
'''
    
    spinner_file = spinner_dir / 'Spinner.tsx'
    if not spinner_file.exists():
        with open(spinner_file, 'w') as f:
            f.write(spinner_content)
        print('✅ Created Spinner component')
    
    # 3. Create missing RTL component
    rtl_dir = frontend_path / 'layouts/full/shared/customizer'
    rtl_dir.mkdir(parents=True, exist_ok=True)
    
    rtl_content = '''import React from 'react';

interface RTLProps {
  direction: 'ltr' | 'rtl';
  children: React.ReactNode;
}

const RTL: React.FC<RTLProps> = ({ direction, children }) => {
  return (
    <div dir={direction}>
      {children}
    </div>
  );
};

export default RTL;
'''
    
    rtl_file = rtl_dir / 'RTL.tsx'
    if not rtl_file.exists():
        with open(rtl_file, 'w') as f:
            f.write(rtl_content)
        print('✅ Created RTL component')
    
    # 4. Create missing ErrorBoundary components
    error_boundary_dir = frontend_path / 'components/ErrorBoundary'
    error_boundary_dir.mkdir(parents=True, exist_ok=True)
    
    # Main ErrorBoundary
    error_boundary_content = '''import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="100vh"
          p={3}
        >
          <Typography variant="h4" color="error" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
'''
    
    error_boundary_file = error_boundary_dir / 'ErrorBoundary.tsx'
    if not error_boundary_file.exists():
        with open(error_boundary_file, 'w') as f:
            f.write(error_boundary_content)
        print('✅ Created ErrorBoundary component')
    
    # FilterErrorBoundary
    filter_error_boundary_content = '''import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class FilterErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('FilterErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="200px"
          p={3}
        >
          <Typography variant="h6" color="error" gutterBottom>
            Filter Error
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            {this.state.error?.message || 'An error occurred in the filter component'}
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            size="small"
            onClick={() => this.setState({ hasError: false })}
          >
            Try Again
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default FilterErrorBoundary;
'''
    
    filter_error_boundary_file = error_boundary_dir / 'FilterErrorBoundary.tsx'
    if not filter_error_boundary_file.exists():
        with open(filter_error_boundary_file, 'w') as f:
            f.write(filter_error_boundary_content)
        print('✅ Created FilterErrorBoundary component')
    
    # AdminErrorBoundary
    admin_error_boundary_content = '''import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AdminErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="200px"
          p={3}
        >
          <Typography variant="h6" color="error" gutterBottom>
            Admin Error
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            {this.state.error?.message || 'An error occurred in the admin component'}
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            size="small"
            onClick={() => this.setState({ hasError: false })}
          >
            Try Again
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export { AdminErrorBoundary };
'''
    
    admin_error_boundary_file = error_boundary_dir / 'AdminErrorBoundary.tsx'
    if not admin_error_boundary_file.exists():
        with open(admin_error_boundary_file, 'w') as f:
            f.write(admin_error_boundary_content)
        print('✅ Created AdminErrorBoundary component')
    
    # Create index.ts for ErrorBoundary
    error_boundary_index_content = '''export { ErrorBoundary } from './ErrorBoundary';
export { default as FilterErrorBoundary } from './FilterErrorBoundary';
export { AdminErrorBoundary } from './AdminErrorBoundary';
'''
    
    error_boundary_index_file = error_boundary_dir / 'index.ts'
    if not error_boundary_index_file.exists():
        with open(error_boundary_index_file, 'w') as f:
            f.write(error_boundary_index_content)
        print('✅ Created ErrorBoundary index.ts')
    
    # 5. Create missing i18n file
    i18n_file = frontend_path / 'utils/i18n.ts'
    if not i18n_file.exists():
        i18n_content = '''// i18n configuration
export const i18n = {
  // Placeholder for internationalization
  t: (key: string) => key,
  changeLanguage: (lang: string) => Promise.resolve(),
  language: 'en'
};

export default i18n;
'''
        with open(i18n_file, 'w') as f:
            f.write(i18n_content)
        print('✅ Created i18n.ts')
    
    # 6. Create missing globalErrorHandler
    global_error_handler_file = frontend_path / 'utils/globalErrorHandler.ts'
    if not global_error_handler_file.exists():
        global_error_handler_content = '''// Global error handler setup
export const setupGlobalErrorHandlers = () => {
  // Setup global error handlers for OMAI
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
  });
};
'''
        with open(global_error_handler_file, 'w') as f:
            f.write(global_error_handler_content)
        print('✅ Created globalErrorHandler.ts')
    
    # 7. Create missing debugLogger
    debug_logger_file = frontend_path / 'services/debugLogger.ts'
    debug_logger_file.parent.mkdir(parents=True, exist_ok=True)
    if not debug_logger_file.exists():
        debug_logger_content = '''// Debug logger service
export const debugLogger = {
  log: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  }
};

export default debugLogger;
'''
        with open(debug_logger_file, 'w') as f:
            f.write(debug_logger_content)
        print('✅ Created debugLogger.ts')
    
    print('🎉 All missing files have been created!')

if __name__ == "__main__":
    fix_missing_files()
