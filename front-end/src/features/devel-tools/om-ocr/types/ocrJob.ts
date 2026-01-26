/**
 * OCR Job types for the Record Uploader
 */

export type OCRJobStatus = 'queued' | 'uploading' | 'processing' | 'completed' | 'failed';
export type RecordType = 'baptism' | 'marriage' | 'funeral';

export type WorkflowStatus = 'draft' | 'in_review' | 'finalized' | 'committed';

export interface OCRJobRow {
  id: number;
  church_id: number;
  original_filename: string;
  filename?: string;
  status: OCRJobStatus;
  record_type: RecordType;
  confidence_score?: number | null;
  language?: string | null;
  created_at?: string;
  updated_at?: string;
  ocr_text_preview?: string | null;
  has_ocr_text?: boolean;
  error_message?: string | null;
  // Workflow status from fusion drafts
  workflow_status?: WorkflowStatus | null;
  draft_count?: number;
}

export interface OCRJobDetail extends OCRJobRow {
  ocr_text: string | null;
  ocr_result: any | null;
  file_path?: string;
  mapping?: any | null;
}

