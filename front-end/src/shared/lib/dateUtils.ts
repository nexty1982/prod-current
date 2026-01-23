/**
 * Normalizes date values for HTML5 date input fields (type="date")
 * 
 * HTML5 date inputs require YYYY-MM-DD format. This function converts various
 * date formats to that format without timezone shifts.
 * 
 * @param value - Date value in any format: Date object, ISO string, MM/DD/YYYY, or YYYY-MM-DD
 * @returns YYYY-MM-DD formatted string or empty string if value is invalid/null/undefined
 * 
 * @example
 * normalizeDateForInput(new Date('2023-12-25')) // '2023-12-25'
 * normalizeDateForInput('12/25/2023') // '2023-12-25'
 * normalizeDateForInput('2023-12-25T10:30:00Z') // '2023-12-25'
 * normalizeDateForInput(null) // ''
 */
export function normalizeDateForInput(value: any): string {
  if (!value) return '';

  // Handle Date objects
  if (value instanceof Date && !isNaN(value.getTime())) {
    // Use local date components to avoid timezone shifts
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Handle string values
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';

    // Already in YYYY-MM-DD format (may have time component)
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }

    // Handle MM/DD/YYYY format
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
      const [m, d, y] = trimmed.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // Try parsing as ISO date string
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return '';
}
