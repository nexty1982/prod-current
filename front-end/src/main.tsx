// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { Suspense } from 'react';
import { CustomizerContextProvider } from './context/CustomizerContext';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { omTheme } from './theme/omTheme';
import App from './App';
import Spinner from './shared/ui/Spinner';
import './utils/i18n';
import './index.css';
// Temporarily commented out to avoid conflicts with Tailwind CSS
// import 'bootstrap/dist/css/bootstrap.min.css';
import { setupGlobalErrorHandlers } from './shared/lib/globalErrorHandler';
import './shared/lib/debugLogger'; // Initialize debug logger
import { registerAgGridModulesOnce } from './agGridModules';

// Register AG Grid modules before React renders
// This prevents error #272: "No AG Grid modules are registered"
registerAgGridModulesOnce();

// Initialize global error handlers for OMAI
setupGlobalErrorHandlers();

// Auto-refresh functionality disabled - removed to prevent refresh loops
// Users can manually refresh when needed

async function deferRender() {
  // Only enable mock service worker in development if VITE_ENABLE_MOCKS is true
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    try {
      const { worker } = await import("./mocks/browser");
      return worker.start({
        onUnhandledRequest: 'bypass',
      });
    } catch (error) {
      console.warn('Mock service worker failed to start:', error);
    }
  }
  return Promise.resolve();
}

deferRender().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <ThemeProvider theme={omTheme}>
      <CssBaseline />
      <CustomizerContextProvider>
        <Suspense fallback={<Spinner />}>
          <App />
        </Suspense>
      </CustomizerContextProvider>
    </ThemeProvider>,
  )
})
