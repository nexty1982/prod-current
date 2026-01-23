/**
 * Types for Quick Facts feature
 */

export type RecordType = 'baptism' | 'marriage' | 'funeral';

export interface QuickFactsSection {
  title: string;
  facts: QuickFact[];
}

export interface QuickFact {
  label: string;
  value: string | number;
  highlight?: boolean;
  tooltip?: string;
}

export interface QuickFactsResult {
  sections: QuickFactsSection[];
  isEmpty: boolean;
}

export interface QuickFactsOptions {
  includeEmpty?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}
