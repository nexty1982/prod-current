/**
 * tourDemoData.ts — Centralized mock data for the interactive tour demo.
 * All content is plain strings so it can be swapped for i18n keys later.
 */

// ── Step 1: Upload / Digitize ──

export interface MockUploadFile {
  name: string;
  size: string;
  type: 'scan' | 'photo' | 'batch';
  pages?: number;
}

export const MOCK_UPLOAD_FILES: MockUploadFile[] = [
  { name: 'Baptism_Ledger_1962.pdf', size: '4.2 MB', type: 'scan', pages: 24 },
  { name: 'Marriage_Records_Photo.jpg', size: '1.8 MB', type: 'photo' },
  { name: 'Funeral_Book_1978.pdf', size: '6.1 MB', type: 'scan', pages: 38 },
  { name: 'Parish_Register_Batch.zip', size: '12.4 MB', type: 'batch', pages: 96 },
];

// ── Step 2: Organize / Structure ──

export interface MockRecordField {
  label: string;
  value: string;
  delay: number; // stagger delay in ms
}

export interface MockSacramentRecord {
  type: 'baptism' | 'marriage' | 'funeral';
  typeLabel: string;
  fields: MockRecordField[];
}

export const MOCK_RECORDS: MockSacramentRecord[] = [
  {
    type: 'baptism',
    typeLabel: 'Baptism',
    fields: [
      { label: 'Full Name', value: 'Constantine Michael Papadopoulos', delay: 0 },
      { label: 'Date of Baptism', value: 'April 15, 1985', delay: 150 },
      { label: 'Officiating Priest', value: 'Fr. Demetrios Antonopoulos', delay: 300 },
      { label: 'Godparent', value: 'Maria Eleni Stavropoulos', delay: 450 },
      { label: 'Parents', value: 'Michael & Eleni Papadopoulos', delay: 600 },
      { label: 'Place of Birth', value: 'Thessaloniki, Greece', delay: 750 },
    ],
  },
  {
    type: 'marriage',
    typeLabel: 'Marriage',
    fields: [
      { label: 'Groom', value: 'Nikolaos George Andreopoulos', delay: 0 },
      { label: 'Bride', value: 'Anastasia Maria Christodoulou', delay: 150 },
      { label: 'Date of Marriage', value: 'June 22, 1991', delay: 300 },
      { label: 'Officiating Priest', value: 'Fr. Ioannis Georgiadis', delay: 450 },
      { label: 'Best Man (Koumbaros)', value: 'Spyridon Pappas', delay: 600 },
      { label: 'Parish', value: 'Holy Trinity Cathedral', delay: 750 },
    ],
  },
  {
    type: 'funeral',
    typeLabel: 'Funeral',
    fields: [
      { label: 'Full Name', value: 'Stavros Dimitrios Katsaros', delay: 0 },
      { label: 'Date of Repose', value: 'March 3, 2019', delay: 150 },
      { label: 'Date of Funeral', value: 'March 6, 2019', delay: 300 },
      { label: 'Officiating Priest', value: 'Fr. Athanasios Petropoulos', delay: 450 },
      { label: 'Age', value: '84 years', delay: 600 },
      { label: 'Cemetery', value: 'Evergreen Memorial Park', delay: 750 },
    ],
  },
];

// ── Step 3: Search ──

export interface MockSearchResult {
  name: string;
  type: 'baptism' | 'marriage' | 'funeral';
  typeLabel: string;
  date: string;
  parish: string;
  detail: string;
}

export const MOCK_SEARCH_RESULTS: MockSearchResult[] = [
  { name: 'Constantine M. Papadopoulos', type: 'baptism', typeLabel: 'Baptism', date: 'Apr 15, 1985', parish: 'Holy Trinity', detail: 'Godparent: Maria Stavropoulos' },
  { name: 'Eleni Papadopoulos', type: 'marriage', typeLabel: 'Marriage', date: 'Sep 12, 1978', parish: 'Annunciation Cathedral', detail: 'Spouse: Michael Papadopoulos' },
  { name: 'Dimitrios Papadopoulos', type: 'funeral', typeLabel: 'Funeral', date: 'Nov 3, 2012', parish: 'St. Nicholas', detail: 'Age: 91 years' },
  { name: 'Sophia Papadopoulos-Raptis', type: 'baptism', typeLabel: 'Baptism', date: 'Jul 28, 2001', parish: 'Holy Trinity', detail: 'Godparent: George Raptis' },
  { name: 'Anastasia Papadopoulos', type: 'marriage', typeLabel: 'Marriage', date: 'Jun 5, 2015', parish: 'St. Demetrios', detail: 'Spouse: Nikos Andreopoulos' },
];

export const SEARCH_QUERY = 'Papadopoulos';

export const SEARCH_FILTER_CHIPS = ['All Records', 'Baptism', 'Marriage', 'Funeral'] as const;

// ── Step 4: Analytics ──

export interface MockKPI {
  label: string;
  value: number;
  suffix?: string;
  trend: 'up' | 'down' | 'flat';
  trendValue: string;
}

export const MOCK_KPIS: MockKPI[] = [
  { label: 'Total Records', value: 3847, trend: 'up', trendValue: '+12%' },
  { label: 'Baptisms', value: 1562, trend: 'up', trendValue: '+8%' },
  { label: 'Marriages', value: 1048, trend: 'flat', trendValue: '+2%' },
  { label: 'Funerals', value: 1237, trend: 'down', trendValue: '-3%' },
];

export interface MockChartPoint {
  year: string;
  baptisms: number;
  marriages: number;
  funerals: number;
}

export const MOCK_CHART_DATA: MockChartPoint[] = [
  { year: '2019', baptisms: 42, marriages: 28, funerals: 31 },
  { year: '2020', baptisms: 31, marriages: 15, funerals: 35 },
  { year: '2021', baptisms: 38, marriages: 22, funerals: 29 },
  { year: '2022', baptisms: 45, marriages: 30, funerals: 27 },
  { year: '2023', baptisms: 51, marriages: 34, funerals: 33 },
  { year: '2024', baptisms: 48, marriages: 31, funerals: 30 },
  { year: '2025', baptisms: 55, marriages: 36, funerals: 28 },
];
