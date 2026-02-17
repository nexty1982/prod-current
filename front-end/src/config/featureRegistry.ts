/**
 * Feature Registry — Single Source of Truth
 *
 * Every user-facing feature is registered here with its current lifecycle stage.
 * The EnvironmentContext and EnvironmentAwarePage derive visibility and banner
 * styling from this registry instead of hardcoded feature sets.
 *
 * Stages:
 *   1 = Prototype    (red banner, super_admin only)
 *   2 = Development  (red banner, super_admin only)
 *   3 = Review       (orange banner, super_admin only)
 *   4 = Stabilizing  (orange banner, super_admin only)
 *   5 = Production   (green banner or none, all users)
 *
 * See docs/sdlc.md for full lifecycle documentation.
 */

export interface FeatureEntry {
  /** Unique feature ID (kebab-case, matches featureId in EnvironmentAwarePage) */
  id: string;
  /** Human-readable name */
  name: string;
  /** Current lifecycle stage */
  stage: 1 | 2 | 3 | 4 | 5;
  /** Who owns / is working on the feature */
  owner?: string;
  /** Primary route path */
  route?: string;
  /** One-line description */
  description?: string;
  /** Date feature entered current stage (YYYY-MM-DD) */
  since?: string;
}

// ────────────────────────────────────────────────────────────
// Registry
// ────────────────────────────────────────────────────────────

export const FEATURE_REGISTRY: FeatureEntry[] = [
  // ── Stage 5: Production ────────────────────────────────────
  { id: 'user-profile', name: 'User Profile', stage: 5, route: '/apps/user-profile' },
  { id: 'contacts', name: 'Contacts', stage: 5, route: '/apps/contacts' },
  { id: 'notes', name: 'Notes', stage: 5, route: '/apps/notes' },
  { id: 'tickets', name: 'Tickets', stage: 5, route: '/apps/tickets' },
  { id: 'email', name: 'Email', stage: 5, route: '/apps/email' },
  { id: 'kanban', name: 'Kanban Board', stage: 5, route: '/apps/kanban' },
  { id: 'invoice', name: 'Invoice', stage: 5, route: '/apps/invoice/list' },
  { id: 'church-management', name: 'Church Management', stage: 5, route: '/admin/churches' },
  { id: 'social-chat', name: 'Social Chat', stage: 5, route: '/social/chat' },
  { id: 'notifications', name: 'Notifications', stage: 5, route: '/notifications' },
  { id: 'baptism-records-v2', name: 'Baptism Records', stage: 5, route: '/apps/records/baptism', since: '2026-02-15' },
  { id: 'certificates', name: 'Certificate Generator', stage: 5, route: '/apps/certificates/generate' },

  // ── Stage 4: Stabilizing ───────────────────────────────────
  { id: 'ocr-studio', name: 'OCR Studio', stage: 4, route: '/devel/ocr-studio', since: '2026-02-01' },
  { id: 'interactive-reports', name: 'Interactive Reports', stage: 4, route: '/apps/records/interactive-reports', since: '2026-02-01' },
  { id: 'interactive-report-jobs', name: 'Interactive Report Jobs', stage: 4, route: '/devel-tools/interactive-reports/jobs', since: '2026-02-01' },

  // ── Stage 3: Review ────────────────────────────────────────
  { id: 'funeral-records-v2', name: 'Funeral Records', stage: 3, route: '/apps/records/funeral', since: '2026-02-01' },

  // ── Stage 2: Development ───────────────────────────────────
  { id: 'marriage-records-v2', name: 'Marriage Records', stage: 2, route: '/apps/records/marriage', since: '2026-02-01' },
  { id: 'enhanced-ocr-uploader', name: 'Enhanced OCR Uploader', stage: 2, route: '/devel/ocr-studio/upload', since: '2026-01-15' },
  { id: 'dynamic-records-inspector', name: 'Dynamic Records Inspector', stage: 2, route: '/devel/dynamic-records', since: '2026-01-20' },
  { id: 'crm', name: 'CRM', stage: 2, route: '/devel-tools/crm', since: '2026-02-01' },

  // ── Stage 1: Prototype ─────────────────────────────────────
  { id: 'us-church-map', name: 'US Church Map', stage: 1, route: '/devel-tools/us-church-map', since: '2026-02-01' },
  { id: 'live-table-builder', name: 'Live Table Builder', stage: 1, route: '/devel-tools/live-table-builder', since: '2026-01-20' },
  { id: 'berry-crm-leads', name: 'Berry CRM Leads', stage: 1, route: '/berry/crm/leads', since: '2026-02-17' },
  { id: 'berry-crm-contacts', name: 'Berry CRM Contacts', stage: 1, route: '/berry/crm/contacts', since: '2026-02-17' },
  { id: 'berry-crm-sales', name: 'Berry CRM Sales', stage: 1, route: '/berry/crm/sales', since: '2026-02-17' },
  { id: 'berry-calendar', name: 'Berry Calendar', stage: 1, route: '/berry/calendar', since: '2026-02-17' },
  { id: 'berry-map', name: 'Berry Map', stage: 1, route: '/berry/map', since: '2026-02-17' },
  { id: 'berry-cards', name: 'Berry Card Gallery', stage: 1, route: '/berry/cards', since: '2026-02-17' },
  { id: 'berry-profile-02', name: 'Berry Account Settings', stage: 1, route: '/berry/profile/settings', since: '2026-02-17' },
  { id: 'berry-profile-03', name: 'Berry Account Profile', stage: 1, route: '/berry/profile/account', since: '2026-02-17' },
];

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

const _byId = new Map<string, FeatureEntry>(
  FEATURE_REGISTRY.map((f) => [f.id, f]),
);

/** Look up a feature by its ID */
export function getFeature(id: string): FeatureEntry | undefined {
  return _byId.get(id);
}

/** Get all features at a given stage */
export function getFeaturesByStage(stage: number): FeatureEntry[] {
  return FEATURE_REGISTRY.filter((f) => f.stage === stage);
}

/** Returns true when the feature is stage 5 (production) */
export function isProductionFeature(id: string): boolean {
  const f = _byId.get(id);
  return f ? f.stage === 5 : false;
}

/**
 * Returns the feature's stage number (used as priority).
 * Unknown features return undefined so callers can fall back to explicit priority.
 */
export function featurePriority(id: string): number | undefined {
  return _byId.get(id)?.stage;
}
