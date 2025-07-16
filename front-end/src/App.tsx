import { CssBaseline, ThemeProvider } from '@mui/material';
import { ThemeSettings } from './theme/Theme';
import RTL from './layouts/full/shared/customizer/RTL';
import { RouterProvider } from 'react-router';
import router from './routes/Router';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { ChurchRecordsProvider } from './context/ChurchRecordsProvider';
import { AuthProvider } from './context/AuthContext';
import { MenuVisibilityProvider } from './contexts/MenuVisibilityContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useContext } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';

// Import Orthodox styling
import './styles/orthodox-fonts.css';

// Import Orthodox Theme System
import { ThemeProvider as OrthodoxThemeProvider } from './context/ThemeContext';
import './styles/themes/orthodox-traditional.css';
import './styles/themes/lent-season.css';
import './styles/themes/pascha-theme.css';

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


  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OrthodoxThemeProvider>
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
                        <RouterProvider router={router} />
                      </ErrorBoundary>
                    </div>
                    <ReactQueryDevtools initialIsOpen={false} />
                  </RTL>
                </ThemeProvider>
              </NotificationProvider>
            </MenuVisibilityProvider>
          </ChurchRecordsProvider>
        </OrthodoxThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
