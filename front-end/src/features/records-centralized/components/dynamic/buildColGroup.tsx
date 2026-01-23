/**
 * Build colgroup element for NORMAL view auto-shrink mode
 * Creates deterministic column widths using <colgroup> with <col> elements
 */

import React from 'react';
import { calculateColumnWidths } from './columnWidthHelper';

export interface BuildColGroupProps {
  recordType?: 'baptism' | 'marriage' | 'funeral';
  columns: Array<{ field: string }>;
  autoShrinkEnabled: boolean;
  dateFields?: string[];
  showCheckboxes?: boolean;
  showActions?: boolean;
}

/**
 * Build colgroup element with deterministic widths
 * @param props - Configuration for building colgroup
 * @returns JSX colgroup element or null
 */
export function buildNormalColGroup(props: BuildColGroupProps): React.ReactElement | null {
  const {
    recordType,
    columns,
    autoShrinkEnabled,
    dateFields = [],
    showCheckboxes = false,
    showActions = false,
  } = props;

  if (!autoShrinkEnabled) {
    return null;
  }

  // Build column list including checkbox and actions if needed
  const visibleColumns = [...columns];
  if (showActions) {
    visibleColumns.push({ field: '__actions' });
  }

  // Calculate widths
  const { widths, totalFixedWidth } = calculateColumnWidths(
    visibleColumns,
    dateFields,
    recordType
  );

  // Add checkbox column width at the beginning if needed
  const finalWidths = showCheckboxes
    ? [{ width: 44, minWidth: 44 }, ...widths]
    : widths;

  const finalTotalFixedWidth = showCheckboxes
    ? totalFixedWidth + 44
    : totalFixedWidth;

  return (
    <colgroup>
      {finalWidths.map((widthConfig, idx) => (
        <col
          key={idx}
          style={{
            width:
              typeof widthConfig.width === 'number'
                ? `${widthConfig.width}px`
                : widthConfig.width,
            minWidth: widthConfig.minWidth
              ? `${widthConfig.minWidth}px`
              : undefined,
          }}
        />
      ))}
    </colgroup>
  );
}
