// Empty component registry - no API calls
import type { ReactElement } from 'react';

export type ComponentInfo = {
  id: string;
  name: string;
  type: string;
  props: Record<string, unknown>;
  element: HTMLElement;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  path?: string[];   // ancestry path within the rendered tree (optional but helpful)
};

export type OverlayComponentInfo = {
  id: string;
  name: string;
  props: Record<string, unknown>;
  path: string[];   // ancestry path within the rendered tree (optional but helpful)
};

// Simple, fast, stable hash (djb2)
function djb2(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  // convert to unsigned & base36 to keep short
  return (h >>> 0).toString(36);
}

function toKebab(s: string): string {
  return String(s)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * generateComponentId
 * Build a stable id from component name + a hash of selected props + path.
 * Keep short & deterministic so overlays don't flicker.
 */
export function generateComponentId(
  name: string,
  props: Record<string, unknown> = {},
  path: string[] = []
): string {
  // pick only shallow, serializable props to avoid large ids
  const fingerprint = JSON.stringify(
    Object.fromEntries(
      Object.entries(props).filter(([k, v]) =>
        typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
      )
    )
  );
  const base = toKebab(name || 'component');
  const hash = djb2(`${base}|${fingerprint}|${path.join('.')}`);
  return `${base}-${hash}`;
}

/**
 * extractComponentInfo
 * Turn a React element into a normalized info object the overlay can use.
 * This version matches the signature expected by SiteEditorOverlay.
 */
export function extractComponentInfo(
  element: HTMLElement,
  name: string,
  props: Record<string, unknown> = {}
): Partial<ComponentInfo> {
  return {
    id: generateComponentId(name, props),
    name,
    props,
    path: [],
  };
}

export const useComponentRegistry = () => {
  return {
    components: [],
    loading: false,
    error: null,
    refresh: () => {}, // No-op
    registerComponent: (component: ComponentInfo) => {
      // No-op implementation - components are not actually stored
      console.log('Component registered:', component.name);
    }
  };
};

// Export empty arrays for backward compatibility
export const adminComponents = [];
export const componentAddons = []; 