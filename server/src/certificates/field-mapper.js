/**
 * Field Mapper — Maps sacramental record data into certificate field values
 *
 * Takes a record + church metadata + template field definitions
 * and produces a key→value map ready for PDF rendering.
 *
 * Handles:
 *   - Direct record field access
 *   - Church metadata fields (name, rector)
 *   - Computed fields (full names from parts)
 *   - Date formatting
 *   - Text transforms (uppercase, capitalize)
 */

/**
 * Map record data to certificate field values using template field definitions.
 *
 * @param {object[]} fields — certificate_template_fields rows
 * @param {object} record — sacramental record from church DB
 * @param {object} church — church metadata { name, rector_name, seal_image_path, ... }
 * @returns {object} Map of field_key → rendered string value
 */
function mapFieldValues(fields, record, church = {}) {
  const result = {};

  for (const field of fields) {
    let value = '';

    switch (field.source_type) {
      case 'record':
        value = resolveRecordValue(field.source_path, record);
        break;

      case 'church':
        value = resolveChurchValue(field.source_path, church);
        break;

      case 'computed':
        value = resolveComputedValue(field.source_path, record, church);
        break;

      case 'static':
        value = field.source_path || '';
        break;

      case 'user_input':
        // User-provided at generation time — leave empty for now
        value = '';
        break;
    }

    // Format dates
    if (value && isDateField(field.field_key, field.source_path)) {
      value = formatDate(value);
    }

    // Apply text transform
    if (value && field.text_transform && field.text_transform !== 'none') {
      value = applyTextTransform(value, field.text_transform);
    }

    result[field.field_key] = value;
  }

  return result;
}

/**
 * Resolve a value from the sacramental record.
 */
function resolveRecordValue(sourcePath, record) {
  if (!sourcePath || !record) return '';

  // Support dot notation: e.g. 'sponsors'
  const parts = sourcePath.split('.');
  let val = record;
  for (const p of parts) {
    if (val == null) return '';
    val = val[p];
  }
  return val != null ? String(val) : '';
}

/**
 * Resolve a value from church metadata.
 */
function resolveChurchValue(sourcePath, church) {
  if (!sourcePath || !church) return '';

  const parts = sourcePath.split('.');
  let val = church;
  for (const p of parts) {
    if (val == null) return '';
    val = val[p];
  }
  return val != null ? String(val) : '';
}

/**
 * Resolve computed values — typically combining multiple record fields.
 *
 * source_path conventions:
 *   'first_name+last_name' — joins with space
 *   'fname_groom+lname_groom' — joins with space
 *   'parents' — returns parents field directly (used for child baptism "child of" line)
 */
function resolveComputedValue(sourcePath, record, church) {
  if (!sourcePath) return '';

  // Concatenation pattern: field1+field2
  if (sourcePath.includes('+')) {
    const parts = sourcePath.split('+');
    return parts
      .map(p => record[p.trim()] || '')
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  // Simple field fallback
  if (record[sourcePath] != null) return String(record[sourcePath]);
  if (church[sourcePath] != null) return String(church[sourcePath]);

  return '';
}

/**
 * Detect date fields by key or source path.
 */
function isDateField(fieldKey, sourcePath) {
  const datePatterns = ['date', '_date', 'mdate', 'reception_date', 'birth_date', 'deceased_date', 'burial_date'];
  const combined = `${fieldKey} ${sourcePath || ''}`.toLowerCase();
  return datePatterns.some(p => combined.includes(p));
}

/**
 * Format a date value for certificate display.
 * Produces "Month Day, Year" format (e.g., "March 15, 2026").
 */
function formatDate(value) {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return String(value);
  }
}

/**
 * Apply text transforms.
 */
function applyTextTransform(value, transform) {
  switch (transform) {
    case 'uppercase': return value.toUpperCase();
    case 'lowercase': return value.toLowerCase();
    case 'capitalize':
      return value.replace(/\b\w/g, c => c.toUpperCase());
    default: return value;
  }
}

module.exports = {
  mapFieldValues,
  formatDate,
  resolveComputedValue,
};
