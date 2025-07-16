/**
 * OCR Interface Types and Interfaces
 * For the redesigned OCR Data Management interface
 */

export interface OcrJobMetadata {
  id: string;
  filename: string;
  original_filename: string;
  image_preview_url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'error';
  record_type: 'baptism' | 'marriage' | 'funeral';
  language: string;
  confidence_score: number;
  extracted_fields: ExtractedField[];
  extracted_entities?: any;
  entity_confidence?: number;
  retryable: boolean;
  editable: boolean;
  error_message?: string;
  created_at: string;
  processing_completed_at?: string;
  needs_review: boolean;
}

export interface ExtractedField {
  field: string;
  value: string;
  confidence: number;
  coordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface OcrUploadConfig {
  churchId: string;
  recordType: 'baptism' | 'marriage' | 'funeral';
  language: 'en' | 'es' | 'fr' | 'de' | 'ru' | 'ar';
  quality: 'fast' | 'balanced' | 'accurate';
  autoSubmit: boolean;
  batchMode: boolean;
}

export interface OcrWizardStep {
  step: number;
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
}

export interface OcrProcessingStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface FieldMappingConfig {
  ocr_label: string;
  target_column: string;
  alias?: string;
  concat_with?: string[];
  format?: string;
  required?: boolean;
  validation_pattern?: string;
}

export interface OcrPreviewData {
  originalText: string;
  extractedFields: ExtractedField[];
  imageUrl: string;
  confidence: number;
  suggestions: string[];
}

export type OcrUploadMode = 'wizard' | 'manual';
export type OcrTheme = 'light' | 'dark' | 'liturgical_gold' | 'byzantine' | 'ocean_blue';
