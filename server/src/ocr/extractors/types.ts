/**
 * TypeScript types for OCR Extractor system
 */

export type FieldType = 'text' | 'number' | 'date' | 'group';
export type PageMode = 'single' | 'variable';
export type RecordType = 'baptism' | 'marriage' | 'funeral' | 'custom';

export interface OcrExtractor {
  id: number;
  name: string;
  description: string | null;
  record_type: RecordType;
  page_mode: PageMode;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface OcrExtractorField {
  id: number;
  extractor_id: number;
  parent_field_id: number | null;
  name: string;
  key: string;
  field_type: FieldType;
  multiple: boolean;
  instructions: string | null;
  sort_order: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface OcrExtractorWithFields extends OcrExtractor {
  fields: OcrExtractorField[];
}

export interface ExtractorFieldTree extends OcrExtractorField {
  children?: ExtractorFieldTree[];
}

export interface CreateExtractorInput {
  name: string;
  description?: string | null;
  record_type?: RecordType;
  page_mode?: PageMode;
  fields?: CreateFieldInput[];
}

export interface CreateFieldInput {
  name: string;
  key: string;
  field_type: FieldType;
  multiple?: boolean;
  instructions?: string | null;
  sort_order?: number;
  parent_field_id?: number | null;
  children?: CreateFieldInput[];
}

export interface UpdateExtractorInput {
  name?: string;
  description?: string | null;
  record_type?: RecordType;
  page_mode?: PageMode;
  fields?: CreateFieldInput[];
}

export interface ExtractorTestInput {
  imageId?: number;
  jobId?: number;
  fileRef?: string;
  page?: number;
  recordType?: string;
}

export interface ExtractorTestResult {
  extractor: OcrExtractorWithFields;
  result: Record<string, unknown>;
  diagnostics: {
    fields: Array<{
      key: string;
      found: boolean;
      confidence?: number;
      bbox?: { x: number; y: number; w: number; h: number };
      warning?: string;
    }>;
    warnings: string[];
  };
}

export interface RunExtractionInput {
  extractorId: number;
  jobId: number;
}

export interface RunExtractionResult {
  draftId: number | null;
  resultSummary: {
    entries: number;
    fieldsExtracted: number;
    confidence: number;
  };
}

