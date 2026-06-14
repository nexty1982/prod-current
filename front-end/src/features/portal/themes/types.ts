import type { ComponentType, ReactNode } from 'react';

/** Parish portal layout themes — each maps to a cohesive component family. */
export type PortalLayoutThemeId = 'modern' | 'heritage' | 'cathedral';

export interface PortalThemeMeta {
  id: PortalLayoutThemeId;
  label: string;
  description: string;
  /** When false, UI shows the theme as coming soon and falls back to modern. */
  available: boolean;
}

export interface PortalThemeBundle {
  meta: PortalThemeMeta;
  /** Root layout shell for /portal/* routes. */
  Layout: ComponentType;
  /** CSS scope class applied to the portal root element. */
  scopeClass: string;
}

export interface PortalThemeContextValue {
  layoutTheme: PortalLayoutThemeId;
  bundle: PortalThemeBundle;
  loading: boolean;
}

export interface PortalPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}
