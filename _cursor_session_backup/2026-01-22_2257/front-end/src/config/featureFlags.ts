/**
 * Feature Flags Configuration
 * Controls feature availability across the application
 * 
 * Uses Vite environment variables (import.meta.env) not process.env
 */

import { getEnvBool } from '@/utils/env';

export interface FeatureFlags {
  interactiveReports: {
    enableRecipientPages: boolean;
  };
}

// Default feature flags (can be overridden by environment variables)
const defaultFlags: FeatureFlags = {
  interactiveReports: {
    enableRecipientPages: getEnvBool('ENABLE_INTERACTIVE_REPORT_RECIPIENTS', false),
  },
};

// Get feature flag value
export function getFeatureFlag<K extends keyof FeatureFlags>(
  category: K,
  flag: keyof FeatureFlags[K]
): boolean {
  const categoryFlags = defaultFlags[category];
  if (!categoryFlags) return false;
  return (categoryFlags[flag] as boolean) ?? false;
}

// Check if interactive report recipient pages are enabled
export function isInteractiveReportRecipientsEnabled(): boolean {
  return getFeatureFlag('interactiveReports', 'enableRecipientPages');
}

export default defaultFlags;
