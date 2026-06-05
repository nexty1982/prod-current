/**
 * Field Configuration — church-level record field labels/headers/visibility.
 * Falls back to localStorage overrides for legacy OCR workbench flows.
 */

import { apiClient } from '@/shared/lib/axiosInstance';
import {
  type ChurchRecordFieldConfig,
  type RecordTypeKey,
  resolveRecordFields,
  resolveAllRecordFieldRows,
  type FieldDefinition,
} from '../config/recordFields';
import { getFieldsForType, type RecordField } from './recordFields';

export interface FieldOverride {
  label?: string;
  hidden?: boolean;
}

const STORAGE_PREFIX = 'om.ocr.fieldConfig.';

function storageKey(recordType: string): string {
  return `${STORAGE_PREFIX}${recordType}`;
}

export function getFieldOverrides(recordType: string): Record<string, FieldOverride> {
  try {
    const raw = localStorage.getItem(storageKey(recordType));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

export function saveFieldOverrides(recordType: string, overrides: Record<string, FieldOverride>): void {
  localStorage.setItem(storageKey(recordType), JSON.stringify(overrides));
}

export function resetFieldOverrides(recordType: string): void {
  localStorage.removeItem(storageKey(recordType));
}

export async function fetchChurchRecordFields(churchId: number): Promise<ChurchRecordFieldConfig> {
  const res: any = await apiClient.get(`/api/church/${churchId}/ocr/record-fields`);
  const data = res?.data ?? res;
  return data?.fields || {};
}

export async function saveChurchRecordFields(
  churchId: number,
  recordFieldConfig: ChurchRecordFieldConfig,
): Promise<ChurchRecordFieldConfig> {
  const res: any = await apiClient.put(`/api/church/${churchId}/ocr/record-fields`, { recordFieldConfig });
  const data = res?.data ?? res;
  return data?.fields || {};
}

export function getReviewFieldsForType(
  recordType: string,
  churchConfig?: ChurchRecordFieldConfig | null,
): FieldDefinition[] {
  return resolveRecordFields(recordType, churchConfig);
}

export function getEditableRowsForType(
  recordType: RecordTypeKey,
  churchConfig?: ChurchRecordFieldConfig | null,
) {
  return resolveAllRecordFieldRows(recordType, churchConfig);
}

/** Legacy workbench helper — prefers church config, then localStorage overrides. */
export function getCustomFieldsForType(recordType: string): RecordField[] {
  const defaults = getFieldsForType(recordType);
  const overrides = getFieldOverrides(recordType);

  return defaults
    .filter(f => !overrides[f.key]?.hidden)
    .map(f => {
      const ovr = overrides[f.key];
      if (!ovr?.label) return f;
      return { ...f, label: ovr.label };
    });
}
