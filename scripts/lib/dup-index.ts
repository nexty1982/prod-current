import { readFileSync, existsSync } from 'fs';
import { join, resolve, relative } from 'path';

export interface DuplicateInfo {
  featureFiles: string[];
  outsideFiles: string[];
}

export interface AnalysisData {
  timestamp: string;
  summary: {
    totalDuplicates: number;
    totalOutsideFiles: number;
    totalFeatureFiles: number;
  };
  duplicates: Record<string, DuplicateInfo>;
}

export class DuplicateIndex {
  private frontendRoot: string;
  private analysisData: AnalysisData | null = null;
  private canonicalMap: Map<string, string> = new Map();
  private caseNormalizedMap: Map<string, string> = new Map();

  constructor(frontendRoot: string) {
    this.frontendRoot = frontendRoot;
  }

  async loadAnalysis(analysisData: AnalysisData) {
    this.analysisData = analysisData;
    this.buildCanonicalMap();
    this.buildCaseNormalizedMap();
  }

  private buildCanonicalMap() {
    if (!this.analysisData) return;

    for (const [key, duplicateInfo] of Object.entries(this.analysisData.duplicates)) {
      if (duplicateInfo.featureFiles.length > 0) {
        const canonicalPath = duplicateInfo.featureFiles[0];
        this.canonicalMap.set(key, canonicalPath);
      }
    }
  }

  private buildCaseNormalizedMap() {
    if (!this.analysisData) return;

    // Build case normalization map for path variants
    const pathVariants = new Map<string, string[]>();
    
    for (const [key, duplicateInfo] of Object.entries(this.analysisData.duplicates)) {
      for (const featureFile of duplicateInfo.featureFiles) {
        const normalizedPath = this.normalizeCase(featureFile);
        if (!pathVariants.has(normalizedPath)) {
          pathVariants.set(normalizedPath, []);
        }
        pathVariants.get(normalizedPath)!.push(featureFile);
      }
    }

    // For each normalized path, pick the canonical one
    for (const [normalizedPath, variants] of pathVariants) {
      if (variants.length > 1) {
        // Prefer the first one as canonical
        const canonical = variants[0];
        for (const variant of variants) {
          this.caseNormalizedMap.set(variant, canonical);
        }
      }
    }
  }

  private normalizeCase(path: string): string {
    // Normalize case for path comparison
    return path.toLowerCase().replace(/[_-]/g, '-');
  }

  getDuplicates(): Map<string, DuplicateInfo> {
    if (!this.analysisData) {
      throw new Error('Analysis data not loaded');
    }
    return new Map(Object.entries(this.analysisData.duplicates));
  }

  getCanonicalPath(key: string): string | undefined {
    return this.canonicalMap.get(key);
  }

  getCaseNormalizedPath(path: string): string | undefined {
    return this.caseNormalizedMap.get(path);
  }

  getDuplicateCount(): number {
    return this.analysisData?.summary.totalDuplicates || 0;
  }

  getOutsideFileCount(): number {
    return this.analysisData?.summary.totalOutsideFiles || 0;
  }

  getFeatureFileCount(): number {
    return this.analysisData?.summary.totalFeatureFiles || 0;
  }

  isCanonicalPath(path: string): boolean {
    const relativePath = relative(this.frontendRoot, path);
    return Array.from(this.canonicalMap.values()).includes(relativePath);
  }

  findDuplicatesForPath(path: string): string[] {
    const relativePath = relative(this.frontendRoot, path);
    const duplicates: string[] = [];
    
    for (const [key, duplicateInfo] of this.getDuplicates()) {
      if (duplicateInfo.outsideFiles.includes(relativePath)) {
        duplicates.push(key);
      }
    }
    
    return duplicates;
  }

  getSummary() {
    if (!this.analysisData) {
      throw new Error('Analysis data not loaded');
    }
    
    return {
      timestamp: this.analysisData.timestamp,
      totalDuplicates: this.analysisData.summary.totalDuplicates,
      totalOutsideFiles: this.analysisData.summary.totalOutsideFiles,
      totalFeatureFiles: this.analysisData.summary.totalFeatureFiles,
      canonicalPaths: this.canonicalMap.size,
      caseNormalizedPaths: this.caseNormalizedMap.size
    };
  }
}
