import { CssBaseline, ThemeProvider } from '@mui/material';
import RTL from './layouts/full/shared/customizer/RTL';
import { ThemeSettings } from './theme/Theme';
import { RouterProvider } from 'react-router-dom';
import router from './routes/Router';
import { CustomizerContext } from './context/CustomizerContext';
import { ChurchRecordsProvider } from './context/ChurchRecordsContext';
import { ChurchProvider } from './context/ChurchContext';
import { AuthProvider } from './context/AuthContext';
import { MenuVisibilityProvider } from './context/MenuVisibilityContext';
import { NotificationProvider } from './context/NotificationContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { EnvironmentProvider } from './context/EnvironmentContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useContext, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import FilterErrorBoundary from './components/ErrorBoundary/FilterErrorBoundary';
import { setupAxiosInterceptors } from './utils/axiosInterceptor';
import AdminMessageNotification from './components/AdminMessageNotification';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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
        <ChurchProvider>
          <EnvironmentProvider>
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
                        style={{ 
                          minHeight: '100vh',
                          backgroundColor: theme.palette.background.default,
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <ErrorBoundary>
                          <FilterErrorBoundary>
                            <AdminMessageNotification />
                            <RouterProvider router={router} />
                            <ToastContainer
                              position="top-right"
                              autoClose={3000}
                              hideProgressBar={false}
                              newestOnTop={false}
                              closeOnClick
                              rtl={false}
                              pauseOnFocusLoss
                              draggable
                              pauseOnHover
                              theme="light"
                            />
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
          </EnvironmentProvider>
        </ChurchProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
