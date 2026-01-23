/**
 * DEV-only Global Error Handlers
 * Captures React errors and unhandled promise rejections for debugging
 * Only runs in development builds (guarded with import.meta.env.DEV)
 */

/**
 * Setup DEV-only global error listeners
 * Logs full error details including stack, route, and component info
 */
export function setupDevErrorHandlers() {
  // Only run in dev builds
  if (!import.meta.env.DEV) {
    return;
  }

  // Global error handler for uncaught errors
  window.addEventListener('error', (event) => {
    // Filter out resource load errors (images, stylesheets, scripts) - these are not actionable React errors
    const target = event.target as HTMLElement | null;
    if (target && (
      target instanceof HTMLImageElement ||
      target instanceof HTMLLinkElement ||
      target instanceof HTMLScriptElement ||
      target instanceof HTMLStyleElement
    )) {
      // Resource load error - log compactly ONCE per unique URL and ignore
      const resourceType = target instanceof HTMLImageElement ? 'image' :
                          target instanceof HTMLLinkElement ? 'stylesheet' :
                          target instanceof HTMLScriptElement ? 'script' : 'style';
      const resourceUrl = target instanceof HTMLImageElement ? (target as HTMLImageElement).src :
                         target instanceof HTMLLinkElement ? (target as HTMLLinkElement).href :
                         target instanceof HTMLScriptElement ? (target as HTMLScriptElement).src : '';
      
      // Track logged URLs to prevent spam (only in dev)
      if (import.meta.env.DEV) {
        const loggedKey = `__dev_logged_${resourceType}_${resourceUrl}`;
        if (!(window as any)[loggedKey]) {
          (window as any)[loggedKey] = true;
          console.warn(`⚠️ DEV: Resource load failed (${resourceType}): ${resourceUrl || 'unknown'}`);
        }
      }
      return; // Don't log as full error - these are expected for missing assets
    }

    // Real JavaScript/React errors - log fully
    const error = event.error || new Error(event.message);
    const location = window.location;
    
    console.group('🚨 DEV: Global Error Handler');
    console.error('Error:', error);
    console.error('Message:', event.message);
    console.error('Filename:', event.filename);
    console.error('Line:', event.lineno);
    console.error('Column:', event.colno);
    console.error('Stack:', error.stack);
    console.error('Location:', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      fullUrl: location.href,
    });
    console.error('Timestamp:', new Date().toISOString());
    console.groupEnd();
  }, true); // Use capture phase

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const location = window.location;
    
    console.group('🚨 DEV: Unhandled Promise Rejection');
    
    // Safely stringify reason to avoid "Error: undefined"
    if (reason instanceof Error) {
      console.error('Error Message:', reason.message || '(no message)');
      console.error('Stack:', reason.stack || '(no stack)');
    } else if (reason === null || reason === undefined) {
      console.error('Rejection Value: null/undefined');
    } else {
      try {
        const stringified = typeof reason === 'object' ? JSON.stringify(reason, null, 2) : String(reason);
        console.error('Rejection Value:', stringified);
      } catch (e) {
        console.error('Rejection Value:', String(reason));
      }
    }
    
    console.error('Location:', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      fullUrl: location.href,
    });
    console.error('Timestamp:', new Date().toISOString());
    console.groupEnd();
    
    // Prevent default browser console error (we've logged it)
    // event.preventDefault();
  });
}
