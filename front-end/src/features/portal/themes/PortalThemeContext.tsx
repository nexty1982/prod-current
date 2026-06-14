import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { CustomizerContext } from '@/context/CustomizerContext';
import { useParishSettings } from '@/features/account/parish-management/useParishSettings';
import {
  DEFAULT_PORTAL_LAYOUT_THEME,
  getPortalThemeBundle,
  resolvePortalLayoutTheme,
} from './registry';
import type { PortalLayoutThemeId, PortalThemeContextValue } from './types';

interface ThemeSettings {
  portalLayoutTheme?: PortalLayoutThemeId | 'heritage' | 'cathedral';
}

const PortalThemeContext = createContext<PortalThemeContextValue | null>(null);

export function PortalThemeProvider({ children }: { children: React.ReactNode }) {
  const { data, loading } = useParishSettings<ThemeSettings>('theme');
  const { portalLayoutTheme, setPortalLayoutTheme } = useContext(CustomizerContext);
  const syncedFromServer = useRef(false);

  // One-time sync from parish settings into Customizer (Settings drawer slots)
  useEffect(() => {
    if (loading || syncedFromServer.current) return;
    const serverTheme = data?.portalLayoutTheme;
    if (serverTheme) {
      setPortalLayoutTheme(resolvePortalLayoutTheme(serverTheme));
      syncedFromServer.current = true;
    } else if (!loading) {
      syncedFromServer.current = true;
    }
  }, [data?.portalLayoutTheme, loading, setPortalLayoutTheme]);

  const layoutTheme = resolvePortalLayoutTheme(portalLayoutTheme ?? DEFAULT_PORTAL_LAYOUT_THEME);
  const bundle = getPortalThemeBundle(layoutTheme);

  const value = useMemo<PortalThemeContextValue>(
    () => ({ layoutTheme, bundle, loading }),
    [layoutTheme, bundle, loading],
  );

  return (
    <PortalThemeContext.Provider value={value}>
      {children}
    </PortalThemeContext.Provider>
  );
}

export function usePortalTheme(): PortalThemeContextValue {
  const ctx = useContext(PortalThemeContext);
  const { portalLayoutTheme } = useContext(CustomizerContext);
  if (!ctx) {
    const layoutTheme = resolvePortalLayoutTheme(portalLayoutTheme ?? DEFAULT_PORTAL_LAYOUT_THEME);
    return {
      layoutTheme,
      bundle: getPortalThemeBundle(layoutTheme),
      loading: false,
    };
  }
  return ctx;
}
