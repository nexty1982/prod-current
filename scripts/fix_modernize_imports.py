#!/usr/bin/env python3
"""
Fix missing imports and create necessary files for modernize template
"""

import os
import re
from pathlib import Path

def fix_modernize_imports():
    modernize_path = Path('/var/www/orthodoxmetrics/prod/UI/modernize/frontend')
    
    print('🔧 Fixing missing imports and creating necessary files...')
    
    # 1. Create missing context files
    print('📁 Creating missing context files...')
    
    # MenuVisibilityContext
    menu_visibility_content = '''import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MenuVisibilityContextType {
  isMenuVisible: boolean;
  toggleMenu: () => void;
  setMenuVisible: (visible: boolean) => void;
}

const MenuVisibilityContext = createContext<MenuVisibilityContextType | undefined>(undefined);

interface MenuVisibilityProviderProps {
  children: ReactNode;
}

export const MenuVisibilityProvider: React.FC<MenuVisibilityProviderProps> = ({ children }) => {
  const [isMenuVisible, setIsMenuVisible] = useState(true);

  const toggleMenu = () => {
    setIsMenuVisible(prev => !prev);
  };

  const setMenuVisible = (visible: boolean) => {
    setIsMenuVisible(visible);
  };

  const value: MenuVisibilityContextType = {
    isMenuVisible,
    toggleMenu,
    setMenuVisible,
  };

  return (
    <MenuVisibilityContext.Provider value={value}>
      {children}
    </MenuVisibilityContext.Provider>
  );
};

export const useMenuVisibility = (): MenuVisibilityContextType => {
  const context = useContext(MenuVisibilityContext);
  if (context === undefined) {
    throw new Error('useMenuVisibility must be used within a MenuVisibilityProvider');
  }
  return context;
};

export default MenuVisibilityContext;
'''
    
    with open(modernize_path / 'src' / 'context' / 'MenuVisibilityContext.tsx', 'w') as f:
        f.write(menu_visibility_content)
    print('✅ Created MenuVisibilityContext.tsx')
    
    # NotificationContext
    notification_content = '''import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };

    setNotifications(prev => [...prev, newNotification]);

    if (notification.duration !== 0) {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, notification.duration || 5000);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const value: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
'''
    
    with open(modernize_path / 'src' / 'context' / 'NotificationContext.tsx', 'w') as f:
        f.write(notification_content)
    print('✅ Created NotificationContext.tsx')
    
    # 2. Create missing component files
    print('🧩 Creating missing component files...')
    
    # ErrorBoundary
    error_boundary_content = '''import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h4" color="error" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            Try again
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
export default ErrorBoundary;
'''
    
    error_boundary_dir = modernize_path / 'src' / 'components' / 'ErrorBoundary'
    error_boundary_dir.mkdir(parents=True, exist_ok=True)
    
    with open(error_boundary_dir / 'index.tsx', 'w') as f:
        f.write(error_boundary_content)
    print('✅ Created ErrorBoundary/index.tsx')
    
    # FilterErrorBoundary
    filter_error_boundary_content = '''import React from 'react';
import { ErrorBoundary } from './index';

interface FilterErrorBoundaryProps {
  children: React.ReactNode;
}

const FilterErrorBoundary: React.FC<FilterErrorBoundaryProps> = ({ children }) => {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
};

export default FilterErrorBoundary;
'''
    
    with open(error_boundary_dir / 'FilterErrorBoundary.tsx', 'w') as f:
        f.write(filter_error_boundary_content)
    print('✅ Created ErrorBoundary/FilterErrorBoundary.tsx')
    
    # 3. Create missing utility files
    print('🛠️  Creating missing utility files...')
    
    # axiosInterceptor
    axios_interceptor_content = '''import axios from 'axios';

export const setupAxiosInterceptors = () => {
  // Request interceptor
  axios.interceptors.request.use(
    (config) => {
      // Add auth token if available
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor
  axios.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      if (error.response?.status === 401) {
        // Handle 401 errors
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
};
'''
    
    utils_dir = modernize_path / 'src' / 'utils'
    utils_dir.mkdir(parents=True, exist_ok=True)
    
    with open(utils_dir / 'axiosInterceptor.ts', 'w') as f:
        f.write(axios_interceptor_content)
    print('✅ Created utils/axiosInterceptor.ts')
    
    # 4. Create missing theme files
    print('🎨 Creating missing theme files...')
    
    theme_content = '''import { createTheme } from '@mui/material/styles';

export const ThemeSettings = () => {
  return createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#6B21A8', // Orthodox purple
      },
      secondary: {
        main: '#FFD700', // Orthodox gold
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
  });
};
'''
    
    theme_dir = modernize_path / 'src' / 'theme'
    theme_dir.mkdir(parents=True, exist_ok=True)
    
    with open(theme_dir / 'Theme.ts', 'w') as f:
        f.write(theme_content)
    print('✅ Created theme/Theme.ts')
    
    # 5. Create missing layout files
    print('🏗️  Creating missing layout files...')
    
    # RTL component
    rtl_content = '''import React from 'react';
import { Direction } from '@mui/material';

interface RTLProps {
  direction: Direction;
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
    
    rtl_dir = modernize_path / 'src' / 'layouts' / 'full' / 'shared' / 'customizer'
    rtl_dir.mkdir(parents=True, exist_ok=True)
    
    with open(rtl_dir / 'RTL.tsx', 'w') as f:
        f.write(rtl_content)
    print('✅ Created layouts/full/shared/customizer/RTL.tsx')
    
    # 6. Create missing route files
    print('🛣️  Creating missing route files...')
    
    router_content = '''import { createBrowserRouter } from 'react-router-dom';
import { lazy } from 'react';

// Lazy load components
const HomePage = lazy(() => import('../pages/HomePage'));
const RecordsPage = lazy(() => import('../pages/RecordsPage'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/records',
    element: <RecordsPage />,
  },
]);

export default router;
'''
    
    with open(modernize_path / 'src' / 'routes' / 'Router.tsx', 'w') as f:
        f.write(router_content)
    print('✅ Created routes/Router.tsx')
    
    # 7. Create basic page components
    print('📄 Creating basic page components...')
    
    home_page_content = '''import React from 'react';
import { Box, Typography, Container } from '@mui/material';

const HomePage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Orthodox Metrics
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Welcome to the modernized Orthodox Metrics application
        </Typography>
      </Box>
    </Container>
  );
};

export default HomePage;
'''
    
    with open(modernize_path / 'src' / 'pages' / 'HomePage.tsx', 'w') as f:
        f.write(home_page_content)
    print('✅ Created pages/HomePage.tsx')
    
    records_page_content = '''import React from 'react';
import { Box, Typography, Container } from '@mui/material';

const RecordsPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Records Management
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Manage church records and data
        </Typography>
      </Box>
    </Container>
  );
};

export default RecordsPage;
'''
    
    with open(modernize_path / 'src' / 'pages' / 'RecordsPage.tsx', 'w') as f:
        f.write(records_page_content)
    print('✅ Created pages/RecordsPage.tsx')
    
    print(f'\n🎉 Modernize template import fixes complete!')
    print(f'📁 Fixed path: {modernize_path}')
    
    return modernize_path

if __name__ == "__main__":
    result = fix_modernize_imports()
    print(f'\n📊 FIX SUMMARY:')
    print(f'  Fixed path: {result}')
    print(f'  Created: Context files, components, utilities, themes, layouts, routes')
    print(f'  Next step: npm run dev should work now')
