/**
 * Feature Flags Configuration
 * Controls which features are enabled/disabled in the application
 */

export const RECORDS_LEGACY_ENABLED =
  (import.meta.env.VITE_RECORDS_LEGACY_ENABLED ?? '0') === '1';

// Log feature flag status in development
if (import.meta.env.DEV) {
  console.log('🏁 Feature Flags:', {
    RECORDS_LEGACY_ENABLED,
  });
}
