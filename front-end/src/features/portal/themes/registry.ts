import ModernPortalLayout from './modern/ModernPortalLayout';
import type { PortalLayoutThemeId, PortalThemeBundle, PortalThemeMeta } from './types';

export const PORTAL_THEME_META: Record<PortalLayoutThemeId, PortalThemeMeta> = {
  modern: {
    id: 'modern',
    label: 'Modern',
    description: 'Clean SaaS workspace with Tailwind, Radix primitives, and hub-first navigation.',
    available: true,
  },
  heritage: {
    id: 'heritage',
    label: 'Heritage',
    description: 'Traditional Orthodox layout with MUI sidebar chrome and liturgical accents.',
    available: false,
  },
  cathedral: {
    id: 'cathedral',
    label: 'Cathedral',
    description: 'Dense enterprise console with advanced grids and multi-panel tooling.',
    available: false,
  },
};

const BUNDLES: Record<PortalLayoutThemeId, PortalThemeBundle> = {
  modern: {
    meta: PORTAL_THEME_META.modern,
    Layout: ModernPortalLayout,
    scopeClass: 'portal-modern',
  },
  heritage: {
    meta: PORTAL_THEME_META.heritage,
    Layout: ModernPortalLayout,
    scopeClass: 'portal-modern',
  },
  cathedral: {
    meta: PORTAL_THEME_META.cathedral,
    Layout: ModernPortalLayout,
    scopeClass: 'portal-modern',
  },
};

export const DEFAULT_PORTAL_LAYOUT_THEME: PortalLayoutThemeId = 'modern';

export function isPortalLayoutThemeId(value: unknown): value is PortalLayoutThemeId {
  return value === 'modern' || value === 'heritage' || value === 'cathedral';
}

export function resolvePortalLayoutTheme(value: unknown): PortalLayoutThemeId {
  if (!isPortalLayoutThemeId(value)) return DEFAULT_PORTAL_LAYOUT_THEME;
  if (!PORTAL_THEME_META[value].available) return DEFAULT_PORTAL_LAYOUT_THEME;
  return value;
}

export function getPortalThemeBundle(themeId: PortalLayoutThemeId): PortalThemeBundle {
  return BUNDLES[resolvePortalLayoutTheme(themeId)];
}

export { ModernPortalLayout };
