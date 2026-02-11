// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { CssBaseline, ThemeProvider } from '@mui/material';
import { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { CustomizerContextProvider } from './context/CustomizerContext';
import './index.css';
import Spinner from './shared/ui/Spinner';
import { omTheme } from './theme/omTheme';
import './utils/i18n';
// Temporarily commented out to avoid conflicts with Tailwind CSS
// import 'bootstrap/dist/css/bootstrap.min.css';

// Import AG Grid styles globally (required for legacy CSS theme approach)
// Imported exactly once here to avoid error #239 (Theming API and CSS both used)
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { registerAgGridModulesOnce } from './agGridModules';
import './shared/lib/debugLogger'; // Initialize debug logger
import { setupDevErrorHandlers } from './shared/lib/devErrorHandler';
import { setupGlobalErrorHandlers } from './shared/lib/globalErrorHandler';

// Register AG Grid modules before React renders
// This prevents error #272: "No AG Grid modules are registered"
registerAgGridModulesOnce();

// Initialize global error handlers for OMAI
setupGlobalErrorHandlers();

// Initialize DEV-only error handlers for debugging React errors
if (import.meta.env.DEV) {
  setupDevErrorHandlers();
}

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
