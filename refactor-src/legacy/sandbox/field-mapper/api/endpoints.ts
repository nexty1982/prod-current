/**
 * Field Mapper API Endpoints
 * Centralized endpoint definitions for the field mapper module
 */

export const API_BASE = "/api";

export const endpoints = {
  columnSample: (churchId: string, recordType: string) =>
    `${API_BASE}/churches/${churchId}/../features/records/records/${recordType}/columns`,           // GET -> Column[]
  getMapping: (churchId: string, recordType: string) =>
    `${API_BASE}/churches/${churchId}/../features/records/records/${recordType}/field-mapping`,    // GET -> FieldMapping
  saveMapping: (churchId: string, recordType: string) =>
    `${API_BASE}/churches/${churchId}/../features/records/records/${recordType}/field-mapping`,    // PUT FieldMapping -> FieldMapping
  knownFields: (recordType: string) =>
    `${API_BASE}/../features/records/records/${recordType}/known-fields`,                          // GET -> KnownField[]
} as const;
