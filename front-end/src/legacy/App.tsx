import { CssBaseline, ThemeProvider } from '@mui/material';
import { ThemeSettings } from './theme/Theme';
import RTL from './layouts/full/shared/customizer/RTL';
import { RouterProvider } from 'react-router-dom';
import router from './routes/Router';
import { CustomizerContext } from './context/CustomizerContext';
import { ChurchRecordsProvider } from './context/ChurchRecordsContext';
import { AuthProvider } from './context/AuthContext';
import { MenuVisibilityProvider } from './context/MenuVisibilityContext';
import { NotificationProvider } from './context/NotificationContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useContext, useEffect } from 'react';
import { ErrorBoundary } from './shared/ui/legacy/ErrorBoundary';
import FilterErrorBoundary from './shared/ui/legacy/ErrorBoundary/FilterErrorBoundary';
import { setupAxiosInterceptors } from '@shared/lib/axiosInterceptor';
import './App.css'; // Import Tailwind CSS

// Import Orthodox Theme System
//import { ThemeProvider as OrthodoxThemeProvider } from './context/ThemeContext';
//import './styles/themes/orthodox-traditional.css';
//import './styles/themes/lent-season.css';
//import './styles/themes/pascha-theme.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes (previously cacheTime)
    },
  },
});



function App() {

  const theme = ThemeSettings();
  const { activeDir, activeMode } = useContext(CustomizerContext);

  // Set up global axios interceptors for 401 error handling
  useEffect(() => {
    console.log('🚀 Setting up global axios interceptors...');
    setupAxiosInterceptors();
  }, []);


  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebSocketProvider>
          <ChurchRecordsProvider>
            <MenuVisibilityProvider>
              <NotificationProvider>
                <ThemeProvider theme={theme}>
                  <RTL direction={activeDir}>
                    <CssBaseline />
                    <div 
                      className="orthodox-app" 
                      data-theme={activeMode}
                      style={{ minHeight: '100vh' }}
                    >
                      <ErrorBoundary>
                        <FilterErrorBoundary>
                          <RouterProvider router={router} />
                        </FilterErrorBoundary>
                      </ErrorBoundary>
                    </div>
                    <ReactQueryDevtools initialIsOpen={false} />
                  </RTL>
                </ThemeProvider>
              </NotificationProvider>
            </MenuVisibilityProvider>
          </ChurchRecordsProvider>
        </WebSocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
