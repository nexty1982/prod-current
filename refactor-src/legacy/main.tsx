import * as Sentry from '@sentry/react';
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

// Initialize global error handlers for OMAI
setupGlobalErrorHandlers();

// Auto-refresh functionality after rebuild
const setupAutoRefresh = () => {
  // Check for version changes every 30 seconds
  const checkForUpdates = async () => {
    try {
      // Determine the correct server URL for development vs production
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const baseUrl = isDev ? `http://localhost:3002` : '';
      
      // Get current build timestamp from package.json or build meta
      const response = await fetch(`${baseUrl}/build.meta.json?` + Date.now());
      
      // Check if the response is valid
      if (!response.ok) {
        // If we get 403/404, build.meta.json doesn't exist or isn't accessible
        // This is normal in development, so just return silently
        return;
      }
      
      const buildMeta = await response.json();
      
      const currentVersion = localStorage.getItem('appVersion');
      const newVersion = buildMeta.buildTime || buildMeta.version || buildMeta.lastBuild;
      
      if (currentVersion && currentVersion !== newVersion) {
        console.log('🔄 New build detected, refreshing page...');
        // Show a brief notification before refreshing
        const notification = document.createElement('div');
        notification.innerHTML = '🔄 New version available, refreshing...';
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #059669;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          z-index: 10000;
          font-family: system-ui;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(notification);
        
        // Refresh after 2 seconds
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else if (!currentVersion && newVersion) {
        // First load, store version
        localStorage.setItem('appVersion', newVersion);
      }
    } catch (error) {
      // Silently fail - build.meta.json might not exist in development
      // or there might be network issues
    }
  };

  // Initial check
  checkForUpdates();
  
  // Periodic checks
  setInterval(checkForUpdates, 30000);
};

// Setup auto-refresh in production or when enabled
if (import.meta.env.PROD || localStorage.getItem('enableAutoRefresh') === 'true') {
  setupAutoRefresh();
}

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

// Initialize Sentry if DSN is provided
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({ 
    dsn: import.meta.env.VITE_SENTRY_DSN, 
    integrations:[Sentry.browserTracingIntegration()], 
    tracesSampleRate: 0.1 
  });
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
