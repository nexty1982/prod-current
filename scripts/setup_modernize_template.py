#!/usr/bin/env python3
"""
Set up modernize template for migration from front-end/src
"""

import os
import json
from pathlib import Path

def setup_modernize_template():
    """Set up the modernize template with proper structure and dependencies"""
    modernize_path = Path('/var/www/orthodoxmetrics/prod/UI/modernize/frontend')
    
    print('🚀 Setting up modernize template for migration...')
    
    # 1. Create proper directory structure
    print('📁 Creating directory structure...')
    
    directories = [
        'src/components/base',
        'src/components/ui',
        'src/components/forms',
        'src/components/layout',
        'src/components/data',
        'src/pages/auth',
        'src/pages/dashboard',
        'src/pages/records',
        'src/pages/church',
        'src/pages/admin',
        'src/context',
        'src/hooks',
        'src/utils',
        'src/services',
        'src/types',
        'src/constants',
        'src/styles',
        'src/assets',
        'src/layouts',
        'src/routes',
        'src/shared/components',
        'src/shared/hooks',
        'src/shared/utils',
        'src/shared/types',
        'src/shared/constants',
        'src/shared/services',
        'src/shared/context'
    ]
    
    for directory in directories:
        dir_path = modernize_path / directory
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f'✅ Created: {directory}')
    
    # 2. Create base component files
    print('🧩 Creating base component files...')
    
    # Base Button component
    button_component = '''import React from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps } from '@mui/material';

export interface ButtonProps extends MuiButtonProps {
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'contained', 
  size = 'medium', 
  children, 
  ...props 
}) => {
  return (
    <MuiButton 
      variant={variant} 
      size={size} 
      {...props}
    >
      {children}
    </MuiButton>
  );
};

export default Button;
'''
    
    with open(modernize_path / 'src' / 'components' / 'base' / 'Button.tsx', 'w') as f:
        f.write(button_component)
    print('✅ Created: components/base/Button.tsx')
    
    # Base Input component
    input_component = '''import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';

export interface InputProps extends TextFieldProps {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  ...props 
}) => {
  return (
    <TextField
      label={label}
      error={!!error}
      helperText={error}
      fullWidth
      {...props}
    />
  );
};

export default Input;
'''
    
    with open(modernize_path / 'src' / 'components' / 'base' / 'Input.tsx', 'w') as f:
        f.write(input_component)
    print('✅ Created: components/base/Input.tsx')
    
    # 3. Create context files
    print('🔧 Creating context files...')
    
    # Auth Context
    auth_context = '''import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // TODO: Implement actual login logic
      console.log('Login:', email, password);
      // Mock user for now
      setUser({
        id: '1',
        email,
        name: 'User',
        role: 'admin'
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
'''
    
    with open(modernize_path / 'src' / 'context' / 'AuthContext.tsx', 'w') as f:
        f.write(auth_context)
    print('✅ Created: context/AuthContext.tsx')
    
    # 4. Create utility files
    print('🛠️  Creating utility files...')
    
    # API utility
    api_utility = '''import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
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
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
'''
    
    with open(modernize_path / 'src' / 'utils' / 'apiClient.ts', 'w') as f:
        f.write(api_utility)
    print('✅ Created: utils/apiClient.ts')
    
    # 5. Create type definitions
    print('📝 Creating type definitions...')
    
    types_file = '''// Common types for the application

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  churchId?: string;
}

export interface Church {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
}

export interface Record {
  id: string;
  type: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'textarea' | 'date';
  required?: boolean;
  options?: { value: string; label: string }[];
}

export interface FormData {
  [key: string]: any;
}

// Component props
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingProps {
  loading: boolean;
  children: React.ReactNode;
}

export interface ErrorProps {
  error: string | null;
  onRetry?: () => void;
}
'''
    
    with open(modernize_path / 'src' / 'types' / 'index.ts', 'w') as f:
        f.write(types_file)
    print('✅ Created: types/index.ts')
    
    # 6. Create constants
    print('📋 Creating constants...')
    
    constants_file = '''// Application constants

export const APP_CONFIG = {
  name: 'Orthodox Metrics',
  version: '1.0.0',
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  environment: process.env.NODE_ENV || 'development',
};

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  RECORDS: '/records',
  CHURCH: '/church',
  ADMIN: '/admin',
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile',
  },
  RECORDS: {
    LIST: '/records',
    CREATE: '/records',
    UPDATE: '/records/:id',
    DELETE: '/records/:id',
  },
  CHURCH: {
    LIST: '/churches',
    CREATE: '/churches',
    UPDATE: '/churches/:id',
    DELETE: '/churches/:id',
  },
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'userData',
  THEME: 'theme',
  LANGUAGE: 'language',
};

export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  PASSWORD_MIN_LENGTH: 8,
};

export const UI_CONSTANTS = {
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 5000,
  PAGINATION_DEFAULT_PAGE_SIZE: 20,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
};
'''
    
    with open(modernize_path / 'src' / 'constants' / 'index.ts', 'w') as f:
        f.write(constants_file)
    print('✅ Created: constants/index.ts')
    
    # 7. Create main App component
    print('🏗️  Creating main App component...')
    
    app_component = '''import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { AuthProvider } from './context/AuthContext';
import { theme } from './theme/theme';
import AppRoutes from './routes/AppRoutes';
import './App.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Router>
            <div className="App">
              <AppRoutes />
            </div>
          </Router>
          <ReactQueryDevtools initialIsOpen={false} />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
'''
    
    with open(modernize_path / 'src' / 'App.tsx', 'w') as f:
        f.write(app_component)
    print('✅ Created: App.tsx')
    
    # 8. Create theme file
    print('🎨 Creating theme configuration...')
    
    theme_file = '''import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6B21A8', // Orthodox purple
      light: '#9F7AEA',
      dark: '#4C1D95',
    },
    secondary: {
      main: '#FFD700', // Orthodox gold
      light: '#FFF59D',
      dark: '#F57F17',
    },
    error: {
      main: '#DC2626', // Orthodox red
    },
    warning: {
      main: '#F59E0B',
    },
    info: {
      main: '#2563EB', // Orthodox blue
    },
    success: {
      main: '#059669', // Orthodox green
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        },
      },
    },
  },
});
'''
    
    with open(modernize_path / 'src' / 'theme' / 'theme.ts', 'w') as f:
        f.write(theme_file)
    print('✅ Created: theme/theme.ts')
    
    # 9. Create routes
    print('🛣️  Creating routes...')
    
    routes_file = '''import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

// Lazy load components
const HomePage = lazy(() => import('../pages/HomePage'));
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const RecordsPage = lazy(() => import('../pages/records/RecordsPage'));
const ChurchPage = lazy(() => import('../pages/church/ChurchPage'));

// Loading component
const LoadingSpinner = () => (
  <Box 
    display="flex" 
    justifyContent="center" 
    alignItems="center" 
    minHeight="200px"
  >
    <CircularProgress />
  </Box>
);

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/records" element={<RecordsPage />} />
        <Route path="/church" element={<ChurchPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
'''
    
    with open(modernize_path / 'src' / 'routes' / 'AppRoutes.tsx', 'w') as f:
        f.write(routes_file)
    print('✅ Created: routes/AppRoutes.tsx')
    
    # 10. Create basic pages
    print('📄 Creating basic pages...')
    
    # Home page
    home_page = '''import React from 'react';
import { Container, Typography, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h2" component="h1" gutterBottom>
          Orthodox Metrics
        </Typography>
        <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
          Modernized Church Management System
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button 
            variant="contained" 
            size="large"
            onClick={() => navigate('/login')}
          >
            Login
          </Button>
          <Button 
            variant="outlined" 
            size="large"
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default HomePage;
'''
    
    with open(modernize_path / 'src' / 'pages' / 'HomePage.tsx', 'w') as f:
        f.write(home_page)
    print('✅ Created: pages/HomePage.tsx')
    
    # Login page
    login_page = '''import React, { useState } from 'react';
import { Container, Paper, Typography, Box, TextField, Button, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Login failed. Please try again.');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Login
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3 }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;
'''
    
    with open(modernize_path / 'src' / 'pages' / 'auth' / 'LoginPage.tsx', 'w') as f:
        f.write(login_page)
    print('✅ Created: pages/auth/LoginPage.tsx')
    
    # Dashboard page
    dashboard_page = '''import React from 'react';
import { Container, Typography, Box, Grid, Card, CardContent } from '@mui/material';
import { useAuth } from '../../context/AuthContext';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Welcome back, {user?.name || 'User'}!
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Records
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage church records
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Church
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Church management
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Reports
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Generate reports
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Settings
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Application settings
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default DashboardPage;
'''
    
    with open(modernize_path / 'src' / 'pages' / 'dashboard' / 'DashboardPage.tsx', 'w') as f:
        f.write(dashboard_page)
    print('✅ Created: pages/dashboard/DashboardPage.tsx')
    
    # Records page
    records_page = '''import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const RecordsPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Records Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This page will contain the records management functionality.
        </Typography>
      </Box>
    </Container>
  );
};

export default RecordsPage;
'''
    
    with open(modernize_path / 'src' / 'pages' / 'records' / 'RecordsPage.tsx', 'w') as f:
        f.write(records_page)
    print('✅ Created: pages/records/RecordsPage.tsx')
    
    # Church page
    church_page = '''import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const ChurchPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Church Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This page will contain the church management functionality.
        </Typography>
      </Box>
    </Container>
  );
};

export default ChurchPage;
'''
    
    with open(modernize_path / 'src' / 'pages' / 'church' / 'ChurchPage.tsx', 'w') as f:
        f.write(church_page)
    print('✅ Created: pages/church/ChurchPage.tsx')
    
    # 11. Create index files
    print('📦 Creating index files...')
    
    # Components index
    components_index = '''// Base components
export { Button } from './base/Button';
export { Input } from './base/Input';

// Re-export types
export type { ButtonProps } from './base/Button';
export type { InputProps } from './base/Input';
'''
    
    with open(modernize_path / 'src' / 'components' / 'index.ts', 'w') as f:
        f.write(components_index)
    print('✅ Created: components/index.ts')
    
    # 12. Update main.tsx
    print('🔄 Updating main.tsx...')
    
    main_tsx = '''import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
'''
    
    with open(modernize_path / 'src' / 'main.tsx', 'w') as f:
        f.write(main_tsx)
    print('✅ Created: main.tsx')
    
    print(f'\n�� Modernize template setup complete!')
    print(f'📁 Template path: {modernize_path}')
    print(f'📋 Next steps:')
    print(f'  1. Test the template: npm run dev')
    print(f'  2. Start Phase 1 migration: Core infrastructure')
    print(f'  3. Follow the migration strategy')
    
    return modernize_path

if __name__ == "__main__":
    result = setup_modernize_template()
    print(f'\n📊 SETUP SUMMARY:')
    print(f'  Template path: {result}')
    print(f'  Structure: Complete directory structure created')
    print(f'  Components: Base components created')
    print(f'  Context: Auth context created')
    print(f'  Routes: Basic routing setup')
    print(f'  Pages: Home, Login, Dashboard, Records, Church')
    print(f'  Ready for migration!')
