/**
 * Development Logger for Orthodox Metrics
 * Placeholder implementation
 */

export const devLogStateChange = (component: string, state: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${component}] State change:`, state);
  }
};
