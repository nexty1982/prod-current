/**
 * Record-type-specific analytics configuration.
 *
 * Defines KPI cards, chart sections, labels, icons, and colors
 * for each sacrament type so the shared analytics shell can render
 * type-specific dashboards without copy-paste duplication.
 */

import {
  IconDroplet, IconHeart, IconCross, IconChartBar,
  IconCalendar, IconTrendingUp, IconUsers, IconClock,
} from '@tabler/icons-react';

/* ── Palette (matches OM Charts) ── */
export const PALETTE = {
  baptism: '#6366F1',
  marriage: '#22C55E',
  funeral: '#F59E0B',
};

export type RecordType = 'baptism' | 'marriage' | 'funeral';

export interface KpiDefinition {
  id: string;
  label: string;
  icon: any;
  color: string;
  /** Returns the display value from dashboard + chart data */
  getValue: (ctx: AnalyticsContext) => string | number;
  /** Optional subtitle */
  getSubtitle?: (ctx: AnalyticsContext) => string | undefined;
}

export interface AnalyticsContext {
  recordType: RecordType;
  counts: { baptisms: number; marriages: number; funerals: number; total: number };
  yearOverYear: { currentYear: number; previousYear: number; current: number; previous: number; changePercent: number } | null;
  chartData: {
    sacramentsByYear: Array<{ year: number; baptism: number; marriage: number; funeral: number }>;
    monthlyTrends: Array<{ month: string; baptism: number; marriage: number; funeral: number }>;
    byPriest: Array<{ name: string; count: number }>;
    baptismAge: Array<{ range: string; count: number }>;
    seasonalPatterns: Array<{ month: string; baptism: number; marriage: number; funeral: number }>;
  } | null;
}

/* ── Helpers ── */

function getTypeCount(ctx: AnalyticsContext): number {
  const { recordType, counts } = ctx;
  if (recordType === 'baptism') return counts.baptisms;
  if (recordType === 'marriage') return counts.marriages;
  return counts.funerals;
}

function getThisYearCount(ctx: AnalyticsContext): number {
  if (!ctx.chartData?.sacramentsByYear?.length) return 0;
  const currentYear = new Date().getFullYear();
  const row = ctx.chartData.sacramentsByYear.find(r => r.year === currentYear);
  return row ? (row[ctx.recordType] ?? 0) : 0;
}

function getPeakYear(ctx: AnalyticsContext): { year: string; count: number } | null {
  if (!ctx.chartData?.sacramentsByYear?.length) return null;
  let best = { year: '', count: 0 };
  ctx.chartData.sacramentsByYear.forEach(row => {
    const val = row[ctx.recordType] ?? 0;
    if (val > best.count) best = { year: String(row.year), count: val };
  });
  return best.count > 0 ? best : null;
}

function getAvgPerYear(ctx: AnalyticsContext): number {
  if (!ctx.chartData?.sacramentsByYear?.length) return 0;
  const total = getTypeCount(ctx);
  const yearsWithData = ctx.chartData.sacramentsByYear.filter(r => (r[ctx.recordType] ?? 0) > 0).length;
  return yearsWithData > 0 ? Math.round(total / yearsWithData) : 0;
}

/* ── Type labels ── */
const TYPE_LABELS: Record<RecordType, { singular: string; plural: string; titleCase: string }> = {
  baptism: { singular: 'baptism', plural: 'baptisms', titleCase: 'Baptisms' },
  marriage: { singular: 'marriage', plural: 'marriages', titleCase: 'Marriages' },
  funeral: { singular: 'funeral', plural: 'funerals', titleCase: 'Funerals' },
};

const TYPE_ICONS: Record<RecordType, any> = {
  baptism: IconDroplet,
  marriage: IconHeart,
  funeral: IconCross,
};

/* ── KPI Definitions ── */

function buildKpis(type: RecordType): KpiDefinition[] {
  const labels = TYPE_LABELS[type];
  const icon = TYPE_ICONS[type];
  const color = PALETTE[type];

  return [
    {
      id: 'total',
      label: `Total ${labels.titleCase}`,
      icon,
      color,
      getValue: (ctx) => getTypeCount(ctx),
    },
    {
      id: 'this-year',
      label: `${labels.titleCase} This Year`,
      icon: IconCalendar,
      color,
      getValue: (ctx) => getThisYearCount(ctx),
      getSubtitle: (ctx) => ctx.yearOverYear ? `${ctx.yearOverYear.currentYear} year-to-date` : undefined,
    },
    {
      id: 'peak-year',
      label: `Peak ${labels.singular[0].toUpperCase() + labels.singular.slice(1)} Year`,
      icon: IconTrendingUp,
      color: '#22C55E',
      getValue: (ctx) => getPeakYear(ctx)?.year ?? '—',
      getSubtitle: (ctx) => {
        const peak = getPeakYear(ctx);
        return peak ? `${peak.count} ${labels.plural}` : undefined;
      },
    },
    {
      id: 'avg-per-year',
      label: `Avg. ${labels.titleCase} Per Year`,
      icon: IconChartBar,
      color: PALETTE[type],
      getValue: (ctx) => getAvgPerYear(ctx),
      getSubtitle: () => 'Across years with records',
    },
  ];
}

/* ── Chart flags per type ── */

export interface RecordAnalyticsConfig {
  type: RecordType;
  title: string;
  subtitle: string;
  icon: any;
  accentColor: string;
  kpis: KpiDefinition[];
  /** Show baptism age distribution chart */
  showAgeDistribution: boolean;
  /** Chart section labels */
  trendChartTitle: string;
  trendChartSubtitle: string;
  clergyChartTitle: string;
  clergyChartSubtitle: string;
  seasonalChartTitle: string;
  seasonalChartSubtitle: string;
  /** Empty state */
  emptyTitle: string;
  emptyDescription: string;
}

/* ── Build configs ── */

export const ANALYTICS_CONFIGS: Record<RecordType, RecordAnalyticsConfig> = {
  baptism: {
    type: 'baptism',
    title: 'Baptism Analytics',
    subtitle: 'Baptismal records overview and historical insights',
    icon: IconDroplet,
    accentColor: PALETTE.baptism,
    kpis: buildKpis('baptism'),
    showAgeDistribution: true,
    trendChartTitle: 'Baptism Trends',
    trendChartSubtitle: 'Monthly baptismal activity over time',
    clergyChartTitle: 'Clergy Activity',
    clergyChartSubtitle: 'Sacraments performed by priest',
    seasonalChartTitle: 'Seasonal Baptism Patterns',
    seasonalChartSubtitle: 'Monthly baptism distribution across all years',
    emptyTitle: 'No baptism records available yet.',
    emptyDescription: 'Once baptism records are added, insights will appear here.',
  },
  marriage: {
    type: 'marriage',
    title: 'Marriage Analytics',
    subtitle: 'Marriage records overview and historical insights',
    icon: IconHeart,
    accentColor: PALETTE.marriage,
    kpis: buildKpis('marriage'),
    showAgeDistribution: false,
    trendChartTitle: 'Marriage Trends',
    trendChartSubtitle: 'Monthly marriage activity over time',
    clergyChartTitle: 'Clergy Activity',
    clergyChartSubtitle: 'Marriages officiated by priest',
    seasonalChartTitle: 'Seasonal Marriage Patterns',
    seasonalChartSubtitle: 'Monthly marriage distribution across all years',
    emptyTitle: 'No marriage records available yet.',
    emptyDescription: 'Once marriage records are added, insights will appear here.',
  },
  funeral: {
    type: 'funeral',
    title: 'Funeral Analytics',
    subtitle: 'Funeral records overview and historical insights',
    icon: IconCross,
    accentColor: PALETTE.funeral,
    kpis: buildKpis('funeral'),
    showAgeDistribution: false,
    trendChartTitle: 'Funeral Trends',
    trendChartSubtitle: 'Monthly funeral activity over time',
    clergyChartTitle: 'Clergy Activity',
    clergyChartSubtitle: 'Funerals officiated by priest',
    seasonalChartTitle: 'Seasonal Funeral Patterns',
    seasonalChartSubtitle: 'Monthly funeral distribution across all years',
    emptyTitle: 'No funeral records available yet.',
    emptyDescription: 'Once funeral records are added, insights will appear here.',
  },
};

export { TYPE_LABELS, TYPE_ICONS, getTypeCount, getThisYearCount, getPeakYear, getAvgPerYear };

/* ── Diocesan dashboard palette (navy, gold, cream, neutrals) ── */
export const DIOCESAN_PALETTE = {
  navy: '#1a365d',
  navyMid: '#2c5282',
  gold: '#c9a14a',
  goldLight: '#e8d5a3',
  cream: '#f5f0e6',
  baptism: '#6366F1',
  marriage: '#22C55E',
  funeral: '#F59E0B',
  custom: '#8b5cf6',
  above: '#16a34a',
  near: '#64748b',
  below: '#dc2626',
  stale: '#f59e0b',
  incomplete: '#ea580c',
};

export const DIOCESE_PERIODS = [
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: 'ytd', label: 'Year to date' },
  { id: '12m', label: 'Last 12 months' },
  { id: 'all', label: 'All time' },
];

export const DIOCESE_RECORD_TYPES = [
  { id: 'all', label: 'All record types' },
  { id: 'baptism', label: 'Baptisms' },
  { id: 'marriage', label: 'Marriages' },
  { id: 'funeral', label: 'Funerals' },
  { id: 'custom', label: 'Custom records' },
];

export const DIOCESE_PARISH_SIZES = [
  { id: 'all', label: 'All sizes' },
  { id: 'small', label: 'Small (< 500 records)' },
  { id: 'medium', label: 'Medium (500–999)' },
  { id: 'large', label: 'Large (1,000+)' },
];

/** OCA dioceses from color-coded sales workbook (OCA Diocese Legend sheet) */
export const DIOCESE_OPTIONS = [
  { slug: 'diocese-of-alaska', name: 'Diocese of Alaska' },
  { slug: 'diocese-of-eastern-pennsylvania', name: 'Diocese of Eastern Pennsylvania' },
  { slug: 'diocese-of-the-midwest', name: 'Diocese of the Midwest' },
  { slug: 'diocese-of-new-england', name: 'Diocese of New England' },
  { slug: 'diocese-of-new-york-and-new-jersey', name: 'Diocese of New York and New Jersey' },
  { slug: 'diocese-of-the-south', name: 'Diocese of the South' },
  { slug: 'archdiocese-of-washington-d-c', name: 'Archdiocese of Washington, D.C.' },
  { slug: 'diocese-of-the-west', name: 'Diocese of the West' },
  { slug: 'archdiocese-of-western-pennsylvania', name: 'Archdiocese of Western Pennsylvania' },
  { slug: 'albanian-archdiocese', name: 'Albanian Archdiocese' },
  { slug: 'bulgarian-diocese', name: 'Bulgarian Diocese' },
  { slug: 'romanian-episcopate', name: 'Romanian Episcopate' },
  { slug: 'archdiocese-of-canada', name: 'Archdiocese of Canada' },
  { slug: 'diocese-of-mexico', name: 'Diocese of Mexico' },
];

export type VsAverage = 'above' | 'near' | 'below' | 'no_data';

export interface DiocesanParishRow {
  churchId: number;
  name: string;
  city: string;
  state: string;
  region: string;
  parishSize: string;
  records: {
    total: number;
    baptism: number;
    marriage: number;
    funeral: number;
    custom: number;
    addedInPeriod: number;
    completeness: number;
    lastActivityAt: string | null;
    dataStatus: string;
    completenessByType: { baptism: number; marriage: number; funeral: number };
  };
  changePercent: number;
  vsDiocesanAverage: VsAverage;
  latitude?: number | null;
  longitude?: number | null;
}
