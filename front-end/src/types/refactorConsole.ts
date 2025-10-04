export type Classification = 'green' | 'orange' | 'yellow' | 'red';

export interface UsageData {
  importRefs: number;
  serverRefs: number;
  routeRefs: number;
  runtimeHints: number;
  score: number;
}

export interface SimilarityData {
  duplicates: string[];
  nearMatches: { target: string; similarity: number }[];
}

export interface FileNode {
  path: string;
  relPath: string;
  type: 'file' | 'dir';
  size: number;
  mtimeMs: number;
  classification: Classification;
  reasons: string[];
  usage: UsageData;
  similarity?: SimilarityData;
  featurePathMatch: boolean;
  inDevelTree: boolean;
}

export interface ScanSummary {
  totalFiles: number;
  totalDirs: number;
  duplicates: number;
  likelyInProd: number;
  highRisk: number;
  inDevelopment: number;
  legacyOrDupes: number;
}

export interface RefactorScan {
  generatedAt: string;
  root: string;
  summary: ScanSummary;
  nodes: FileNode[];
}

export interface FilterState {
  classifications: Classification[];
  searchQuery: string;
  fileType: string;
  modifiedDays: number;
  showDuplicates: boolean;
}

export interface SortOption {
  key: 'score' | 'name' | 'mtime' | 'classification';
  direction: 'asc' | 'desc';
  label: string;
}

export type TreeItem = FileNode & {
  children?: TreeItem[];
  expanded?: boolean;
  visible?: boolean;
  parentPath?: string;
};
