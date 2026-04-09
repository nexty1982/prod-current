/**
 * recordWizardTypes — Shared types, constants, and API helper for RecordCreationWizard.
 * Extracted from RecordCreationWizard.tsx
 */

import { apiClient } from '@/api/utils/axiosInstance';

// ============================================================================
// TYPES
// ============================================================================
export interface Church {
  id: number;
  name: string;
  database_name?: string;
}

export interface FieldConfig {
  key: string;
  label: string;
  type: string;
  required: boolean;
  dbColumn: string;
  generationStrategy: string;
  generationDependsOn?: string;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: any;
  group?: string;
  displayOrder: number;
  visibleInPreview: boolean;
  dateConstraint?: any;
}

export interface ValidationIssue {
  row: number;
  field: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface WizardState {
  recordType: string;
  church: Church | null;
  mode: 'single' | 'batch' | 'auto' | 'template';
  count: number;
  dateStart: string;
  dateEnd: string;
  distribution: 'even' | 'random' | 'seasonal' | 'chronological';
  maxPerDay: number;
  overrides: Record<string, any>;
  records: Record<string, any>[];
  validationIssues: ValidationIssue[];
}

export interface Preset {
  id: number;
  name: string;
  record_type: string;
  church_id?: number;
  preset_json: any;
}

export type RecordType = 'baptism' | 'marriage' | 'funeral';

export const RECORD_TYPE_META: Record<RecordType, { label: string; color: string; icon: string }> = {
  baptism: { label: 'Baptism', color: '#1565c0', icon: '💧' },
  marriage: { label: 'Marriage', color: '#7b1fa2', icon: '💍' },
  funeral: { label: 'Funeral', color: '#455a64', icon: '🕊️' },
};

export const STEPS = [
  'Record Type',
  'Church',
  'Creation Mode',
  'Configure',
  'Preview & Validate',
  'Create',
];

export const today = new Date().toISOString().split('T')[0];
export const yearAgo = new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0];

// ============================================================================
// API HELPER
// ============================================================================
export async function apiJson(url: string, options?: RequestInit) {
  const cleanUrl = url.replace(/^\/api/, '');
  const method = (options?.method || 'GET').toLowerCase() as 'get' | 'post' | 'put' | 'delete';
  const body = options?.body ? JSON.parse(options.body as string) : undefined;
  if (method === 'get' || method === 'delete') {
    return apiClient[method]<any>(cleanUrl);
  }
  return apiClient[method]<any>(cleanUrl, body);
}
