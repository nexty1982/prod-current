import { useEffect, useState } from 'react';
import type { PortalRecordsThemeStyle } from '@/features/portal/themes/records/portalRecordsTheme';

export interface RecordsSurfaceColors {
  accent: string;
  accentDark: string;
  headerBg: string;
  headerFg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  foreground: string;
  muted: string;
}

function readScopeColors(scopeEl: Element | null, fallback: PortalRecordsThemeStyle['colors']): RecordsSurfaceColors {
  if (!scopeEl) return fallback;
  const cs = getComputedStyle(scopeEl);
  const pick = (varName: string, fb: string) => cs.getPropertyValue(varName).trim() || fb;
  return {
    accent: pick('--rm-accent', fallback.accent),
    accentDark: pick('--rm-accent-dark', fallback.accentDark),
    headerBg: pick('--rm-muted', fallback.headerBg),
    headerFg: pick('--rm-fg', fallback.headerFg),
    surface: pick('--rm-card', fallback.surface),
    surfaceAlt: pick('--rm-muted', fallback.surfaceAlt),
    border: pick('--rm-border', fallback.border),
    foreground: pick('--rm-fg', fallback.foreground),
    muted: pick('--rm-muted-fg', fallback.muted),
  };
}

/** Resolve live --rm-* tokens from the themed .rm-scope wrapper (respects light/dark + portal theme). */
export function useRecordsThemeColors(
  recordsTheme: PortalRecordsThemeStyle,
  scopeClassName: string,
): RecordsSurfaceColors {
  const [colors, setColors] = useState<RecordsSurfaceColors>(recordsTheme.colors);

  useEffect(() => {
    const refresh = () => {
      const el = document.querySelector(`.rm-scope.${scopeClassName}`) ?? document.querySelector('.rm-scope');
      setColors(readScopeColors(el, recordsTheme.colors));
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme-mode'] });
    return () => observer.disconnect();
  }, [recordsTheme, scopeClassName]);

  return colors;
}
