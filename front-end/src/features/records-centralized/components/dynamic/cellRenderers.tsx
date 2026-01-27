/**
 * Cell Renderers for Dynamic Records Display
 * Ported from December 2025 backup
 */

import React from 'react';
import { Typography } from '@mui/material';
import { detectFieldType } from './columnMappers';

export function formatDate(value: any): string {
  if (value == null || value === '') return '';
  
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString();
  } catch {
    return String(value);
  }
}

export function renderCellValue(
  value: any,
  fieldName: string,
  dateFields: string[] = []
): React.ReactNode {
  if (value == null || value === '') {
    return <Typography variant="body2" color="textSecondary">—</Typography>;
  }

  if (dateFields.includes(fieldName)) {
    return <Typography variant="body2">{formatDate(value)}</Typography>;
  }

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
