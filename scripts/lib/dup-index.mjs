import { readFileSync, existsSync } from 'fs';
import { join, resolve, relative } from 'path';

export class DuplicateIndex {
  constructor(frontendRoot) {
    this.frontendRoot = frontendRoot;
    this.analysisData = null;
    this.canonicalMap = new Map();
    this.caseNormalizedMap = new Map();
  }

  async loadAnalysis(analysisData) {
    this.analysisData = analysisData;
    this.buildCanonicalMap();
    this.buildCaseNormalizedMap();
  }

  buildCanonicalMap() {
    if (!this.analysisData) return;

    for (const [key, duplicateInfo] of Object.entries(this.analysisData.duplicates)) {
      if (duplicateInfo.featureFiles.length > 0) {
        const canonicalPath = duplicateInfo.featureFiles[0];
        this.canonicalMap.set(key, canonicalPath);
      }
    }
  }

  buildCaseNormalizedMap() {
    if (!this.analysisData) return;

    // Build case normalization map for path variants
    const pathVariants = new Map();
    
    for (const [key, duplicateInfo] of Object.entries(this.analysisData.duplicates)) {
      for (const featureFile of duplicateInfo.featureFiles) {
        const normalizedPath = this.normalizeCase(featureFile);
        if (!pathVariants.has(normalizedPath)) {
          pathVariants.set(normalizedPath, []);
        }
        pathVariants.get(normalizedPath).push(featureFile);
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

  normalizeCase(path) {
    // Normalize case for path comparison
    return path.toLowerCase().replace(/[_-]/g, '-');
  }

  getDuplicates() {
    if (!this.analysisData) {
      throw new Error('Analysis data not loaded');
    }
    return new Map(Object.entries(this.analysisData.duplicates));
  }

  getCanonicalPath(key) {
    return this.canonicalMap.get(key);
  }

  getCaseNormalizedPath(path) {
    return this.caseNormalizedMap.get(path);
  }

  getDuplicateCount() {
    return this.analysisData?.summary.totalDuplicates || 0;
  }

  getOutsideFileCount() {
    return this.analysisData?.summary.totalOutsideFiles || 0;
  }

  getFeatureFileCount() {
    return this.analysisData?.summary.totalFeatureFiles || 0;
  }

  isCanonicalPath(path) {
    const relativePath = relative(this.frontendRoot, path);
    return Array.from(this.canonicalMap.values()).includes(relativePath);
  }

  findDuplicatesForPath(path) {
    const relativePath = relative(this.frontendRoot, path);
    const duplicates = [];
    
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
