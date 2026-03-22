/**
 * accountConstants.ts — Shared types, constants, and helpers for Account Hub pages.
 *
 * Centralizes duplicated definitions to keep pages consistent and reduce drift.
 */

// ── Shared Types ─────────────────────────────────────────────────────────────

/** Common snackbar state used by all Account Hub settings pages. */
export interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info';
}

export const SNACKBAR_CLOSED: SnackbarState = { open: false, message: '', severity: 'success' };

/** Standard snackbar auto-hide duration (ms). */
export const SNACKBAR_DURATION = 4000;

/** Extended snackbar duration for critical actions (password change, etc.). */
export const SNACKBAR_DURATION_LONG = 6000;

// ── Church Field Constants ───────────────────────────────────────────────────

/** Canonical language options for church settings. ISO 639-1 codes. */
export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'gr', label: 'Greek' },
  { value: 'ru', label: 'Russian' },
  { value: 'ro', label: 'Romanian' },
  { value: 'ka', label: 'Georgian' },
] as const;

/** ISO 639-1 code to display label mapping. */
export const LANGUAGE_LABELS: Record<string, string> = Object.fromEntries(
  LANGUAGE_OPTIONS.map((o) => [o.value, o.label]),
);

/** Calendar type options. Empty string = not set, mapped to null on save. */
export const CALENDAR_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'Julian', label: 'Julian (Old Calendar)' },
  { value: 'Revised Julian', label: 'Revised Julian (New Calendar)' },
] as const;

// ── Church Settings Response Helper ──────────────────────────────────────────

/**
 * Extract church settings from the /api/my/church-settings response.
 *
 * The API wraps settings in `data.data.settings` but some consumers historically
 * expected `data.settings`. This helper normalizes access so all pages behave the same.
 */
export function extractChurchSettings<T = Record<string, unknown>>(responseData: any): T | null {
  if (!responseData?.success) return null;
  return responseData.data?.settings || responseData.settings || null;
}

/**
 * Resolve the canonical display name for a church.
 * The DB has both `name` and `church_name` columns; prefer `name`.
 */
export function getChurchDisplayName(settings: Record<string, any>): string {
  return settings?.name || settings?.church_name || '';
}

// ── Role Metadata ────────────────────────────────────────────────────────────

/** User-facing descriptions for each role. */
export const ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin: 'Full platform access including all administrative functions.',
  admin: 'Church administration and user management.',
  church_admin: 'Manage church settings, records, and parish operations.',
  priest: 'View and manage sacramental records.',
  deacon: 'View records and assist with parish operations.',
  editor: 'Edit and manage church records.',
  viewer: 'View-only access to church records.',
  guest: 'Limited access to public information.',
};
