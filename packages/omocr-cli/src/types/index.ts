export const CLI_VERSION = '0.1.0';

/** Stable exit codes for automation */
export const ExitCode = {
  OK: 0,
  ERROR: 1,
  USAGE: 2,
  API: 3,
  VALIDATION_FAILED: 4,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

export type OutputFormat = 'table' | 'json' | 'ndjson';

export interface GlobalCliFlags {
  profile?: string;
  json?: boolean;
  ndjson?: boolean;
  quiet?: boolean;
  verbose?: boolean;
  churchId?: number;
}

export interface OmocrProfile {
  apiBase: string;
  defaultChurchId?: number;
  timeoutSeconds?: number;
}

export interface OmocrConfigFile {
  activeProfile: string;
  profiles: Record<string, OmocrProfile>;
}

export interface JobSummary {
  id: string;
  church_id: string;
  filename: string;
  status: string;
  review_status?: string;
  record_type: string | null;
  records_count?: number | null;
  confirmed_count?: number | null;
  agent_status?: string | null;
  ready_to_seed?: boolean;
  created_at: string;
  layout?: string | null;
}

export interface JobDetail extends JobSummary {
  pages?: Array<{
    pageIndex: number;
    recordCandidates?: unknown;
    tableExtractionJson?: unknown;
    rawText?: string | null;
    status?: string;
  }>;
  agent_extract?: unknown;
  ocr_text?: string | null;
}

export interface ProcessScanResult {
  jobs: Array<{ id: number; churchId: number; filename: string; status: string }>;
}

export interface ValidationIssue {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  recordIndex?: number;
  field?: string;
}

export interface ValidationReport {
  jobId: number;
  churchId: number;
  passed: boolean;
  issues: ValidationIssue[];
  summary: Record<string, unknown>;
}
