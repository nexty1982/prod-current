import type { PortalLayoutThemeId } from '../types';

export type RecordsTableHeaderMode = 'subtle' | 'filled';
export type RecordsCardsLayout = 'carousel' | 'grid' | 'bento' | 'list' | 'glass' | 'ornate';
export type RecordsTimelineLayout = 'rail' | 'editorial' | 'neon' | 'minimal' | 'glass' | 'ornate';

export interface PortalRecordsThemeStyle {
  id: PortalLayoutThemeId;
  recordsClass: string;
  table: {
    headerMode: RecordsTableHeaderMode;
    radius: string;
    fontFamily: string;
  };
  cards: {
    layout: RecordsCardsLayout;
  };
  timeline: {
    layout: RecordsTimelineLayout;
  };
  colors: {
    accent: string;
    accentDark: string;
    headerBg: string;
    headerFg: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    foreground: string;
    muted: string;
  };
}

const THEMES: Record<PortalLayoutThemeId, PortalRecordsThemeStyle> = {
  modern: {
    id: 'modern',
    recordsClass: 'rm-records-modern',
    table: { headerMode: 'subtle', radius: '0.75rem', fontFamily: 'Inter, sans-serif' },
    cards: { layout: 'carousel' },
    timeline: { layout: 'rail' },
    colors: {
      accent: '#2563eb',
      accentDark: '#1d4ed8',
      headerBg: '#f1f5f9',
      headerFg: '#0f172a',
      surface: '#ffffff',
      surfaceAlt: '#f8fafc',
      border: '#e2e8f0',
      foreground: '#0f172a',
      muted: '#64748b',
    },
  },
  'art-deco': {
    id: 'art-deco',
    recordsClass: 'rm-records-art-deco',
    table: { headerMode: 'filled', radius: '0.75rem', fontFamily: 'Georgia, serif' },
    cards: { layout: 'ornate' },
    timeline: { layout: 'ornate' },
    colors: {
      accent: '#c9a227',
      accentDark: '#8a6914',
      headerBg: '#1a2744',
      headerFg: '#f5eed6',
      surface: '#fffdf8',
      surfaceAlt: '#f4f0e6',
      border: 'rgba(201, 162, 39, 0.35)',
      foreground: '#1a2744',
      muted: '#5c5344',
    },
  },
  'neo-gothic': {
    id: 'neo-gothic',
    recordsClass: 'rm-records-neo-gothic',
    table: { headerMode: 'filled', radius: '0.5rem', fontFamily: 'Inter, sans-serif' },
    cards: { layout: 'grid' },
    timeline: { layout: 'neon' },
    colors: {
      accent: '#818cf8',
      accentDark: '#6366f1',
      headerBg: '#141420',
      headerFg: '#e8e9ed',
      surface: 'rgba(20, 20, 32, 0.92)',
      surfaceAlt: '#1a1a2e',
      border: 'rgba(129, 140, 248, 0.25)',
      foreground: '#e8e9ed',
      muted: '#94a3b8',
    },
  },
  paper: {
    id: 'paper',
    recordsClass: 'rm-records-paper',
    table: { headerMode: 'subtle', radius: '0.25rem', fontFamily: 'Georgia, serif' },
    cards: { layout: 'list' },
    timeline: { layout: 'editorial' },
    colors: {
      accent: '#1a1a1a',
      accentDark: '#000000',
      headerBg: '#ede8df',
      headerFg: '#1a1a1a',
      surface: '#faf8f4',
      surfaceAlt: '#f7f3eb',
      border: '#d4cfc4',
      foreground: '#1a1a1a',
      muted: '#6b6b6b',
    },
  },
  bento: {
    id: 'bento',
    recordsClass: 'rm-records-bento',
    table: { headerMode: 'subtle', radius: '1rem', fontFamily: 'Inter, sans-serif' },
    cards: { layout: 'bento' },
    timeline: { layout: 'minimal' },
    colors: {
      accent: '#0ea5e9',
      accentDark: '#0284c7',
      headerBg: '#f0fdfa',
      headerFg: '#0f766e',
      surface: '#ffffff',
      surfaceAlt: '#e8f4f2',
      border: '#99f6e4',
      foreground: '#1e293b',
      muted: '#64748b',
    },
  },
  glass: {
    id: 'glass',
    recordsClass: 'rm-records-glass',
    table: { headerMode: 'subtle', radius: '1rem', fontFamily: 'Inter, sans-serif' },
    cards: { layout: 'glass' },
    timeline: { layout: 'glass' },
    colors: {
      accent: '#818cf8',
      accentDark: '#6366f1',
      headerBg: 'rgba(255, 255, 255, 0.12)',
      headerFg: '#e8e9ed',
      surface: 'rgba(255, 255, 255, 0.08)',
      surfaceAlt: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.15)',
      foreground: '#e8e9ed',
      muted: '#a5b4fc',
    },
  },
};

export function getPortalRecordsTheme(themeId: PortalLayoutThemeId): PortalRecordsThemeStyle {
  return THEMES[themeId] ?? THEMES.modern;
}
