/**
 * Cell Renderers for Dynamic Records Display
 */

import React from 'react';
import { Typography } from '@mui/material';
import { detectFieldType } from './columnMappers';
import { formatRecordDate } from '@/utils/formatDate';

/**
 * @deprecated Use formatRecordDate from utils/formatDate instead
 * Kept for backward compatibility
 */
export function formatDate(value: any): string {
  return formatRecordDate(value) || '';
}

export function renderCellValue(
  value: any,
  fieldName: string,
  dateFields: string[] = []
): React.ReactNode {
  // Only show "—" for null/undefined, not for empty strings or falsy values
  // Allow 0, false, '' to display as-is (or '' as empty but not '-')
  if (value === null || value === undefined) {
    return <Typography variant="body2" color="textSecondary">—</Typography>;
  }
  
  // Empty string should render as empty, not as "—"
  if (value === '') {
    return <Typography variant="body2" color="textSecondary"></Typography>;
  }

  // Handle arrays: empty → '-', else join(', ')
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <Typography variant="body2" color="textSecondary">—</Typography>;
    }
    // Join array items as strings (for primitives)
    const arrayStrings = value.map(item => {
      // STRICT null check - allow 0, false, ''
      if (item === null || item === undefined) return '';
      if (typeof item === 'object' && !(item instanceof Date)) {
        // Try common object fields first
        if ('label' in item && item.label != null) return String(item.label);
        if ('name' in item && item.name != null) return String(item.name);
        if ('value' in item && item.value != null) return String(item.value);
        // Fallback to JSON in DEV only
        if (import.meta.env.DEV) {
          return JSON.stringify(item);
        }
        return '[Object]';
      }
      return String(item);
    }).filter(item => item !== ''); // Filter out empty strings but keep '0', 'false'
    const stringValue = arrayStrings.join(', ');
    return (
      <Typography variant="body2">
        {stringValue.length > 50 ? `${stringValue.substring(0, 50)}...` : stringValue}
      </Typography>
    );
  }

  // Handle objects: try common fields (label, name, value), else stringify
  if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
    // Try common fields in order: label, name, value
    if ('label' in value && value.label != null && value.label !== undefined) {
      return <Typography variant="body2">{String(value.label)}</Typography>;
    }
    if ('name' in value && value.name != null && value.name !== undefined) {
      return <Typography variant="body2">{String(value.name)}</Typography>;
    }
    if ('value' in value && value.value != null && value.value !== undefined) {
      return <Typography variant="body2">{String(value.value)}</Typography>;
    }
    // Fallback: stringify in DEV only, show [Object] in prod
    if (import.meta.env.DEV) {
      try {
        const stringValue = JSON.stringify(value);
        return (
          <Typography variant="body2">
            {stringValue.length > 50 ? `${stringValue.substring(0, 50)}...` : stringValue}
          </Typography>
        );
      } catch {
        return <Typography variant="body2" color="textSecondary">[Object]</Typography>;
      }
    }
    return <Typography variant="body2" color="textSecondary">[Object]</Typography>;
  }

  if (dateFields.includes(fieldName)) {
    const formatted = formatRecordDate(value);
    return <Typography variant="body2">{formatted || '—'}</Typography>;
  }

  // Ensure we always return a string
  const stringValue = String(value);
  return (
    <Typography variant="body2">
      {stringValue.length > 50 ? `${stringValue.substring(0, 50)}...` : stringValue}
    </Typography>
  );
}

export default {
  renderCellValue,
  formatDate,
};
