/**
 * Column Width Helper for Normal View Auto-Shrink Mode
 * Determines appropriate column widths based on field type and name
 */

export type ColumnWidthConfig = {
  type: 'fixed' | 'flex';
  px?: number;
  minPx?: number;
  weight?: number; // For flex columns, relative weight
};

/**
 * Get column width configuration for a field
 * @param fieldKey - The field name/key
 * @param dateFields - Array of field names that are dates
 * @param recordType - Record type ('baptism', 'marriage', 'funeral') for specific mappings
 * @returns ColumnWidthConfig
 */
export function getNormalColWidth(
  fieldKey: string,
  dateFields: string[] = [],
  recordType?: 'baptism' | 'marriage' | 'funeral'
): ColumnWidthConfig {
  const fieldLower = fieldKey.toLowerCase();

  // Date fields: fixed 120px
  // Specific date field mappings per record type
  if (dateFields.includes(fieldKey) || 
      fieldLower.includes('date') || 
      fieldLower.includes('_date') ||
      fieldLower === 'mdate' ||
      fieldLower === 'marriagedate' ||
      fieldLower === 'marriage_date' ||
      fieldLower === 'reception_date' ||
      fieldLower === 'receptiondate' ||
      fieldLower === 'dateofbaptism' ||
      fieldLower === 'date_of_baptism' ||
      fieldLower === 'birth_date' ||
      fieldLower === 'birthdate' ||
      fieldLower === 'deathdate' ||
      fieldLower === 'death_date' ||
      fieldLower === 'funeraldate' ||
      fieldLower === 'funeral_date' ||
      fieldLower === 'burialdate' ||
      fieldLower === 'burial_date' ||
      fieldLower === 'deceaseddate' ||
      fieldLower === 'deceased_date') {
    return { type: 'fixed', px: 120 };
  }

  // Small numeric fields (age, id, count): 80px
  if (fieldLower === 'age' ||
      fieldLower === 'id' ||
      fieldLower === 'count' ||
      fieldLower.includes('_id') ||
      fieldLower.includes('age')) {
    return { type: 'fixed', px: 80 };
  }

  // Name fields: fixed 160px
  // firstName, name, groomFirstName, brideFirstName, deceasedFirstName
  if (fieldLower === 'name' ||
      fieldLower === 'firstname' ||
      fieldLower === 'first_name' ||
      fieldLower === 'groomfirstname' ||
      fieldLower === 'groom_first_name' ||
      fieldLower === 'bridefirstname' ||
      fieldLower === 'bride_first_name' ||
      fieldLower === 'deceasedfirstname' ||
      fieldLower === 'deceased_first_name') {
    return { type: 'fixed', px: 160 };
  }

  // LastName fields: fixed 160px
  // lastName, groomLastName, brideLastName, deceasedLastName
  if (fieldLower === 'lastname' ||
      fieldLower === 'last_name' ||
      fieldLower === 'groomlastname' ||
      fieldLower === 'groom_last_name' ||
      fieldLower === 'bridelastname' ||
      fieldLower === 'bride_last_name' ||
      fieldLower === 'deceasedlastname' ||
      fieldLower === 'deceased_last_name') {
    return { type: 'fixed', px: 160 };
  }
  
  // Birthplace: fixed 160px (baptism)
  if (fieldLower === 'birthplace' ||
      fieldLower === 'birth_place') {
    return { type: 'fixed', px: 160 };
  }
  
  // EntryType: fixed 130px (baptism)
  if (fieldLower === 'entrytype' ||
      fieldLower === 'entry_type') {
    return { type: 'fixed', px: 130 };
  }

  // Clergy: fixed 180px
  if (fieldLower.includes('clergy') ||
      fieldLower === 'clergy' ||
      fieldLower === 'officiant' ||
      fieldLower === 'priest') {
    return { type: 'fixed', px: 180 };
  }

  // Parents fields (baptism): remainder column (split with sponsors if both exist)
  if (fieldLower.includes('parent') ||
      fieldLower === 'groomparents' ||
      fieldLower === 'brideparents' ||
      fieldLower === 'parents') {
    // In baptism, parents is a remainder column (flex) that shares space with sponsors
    if (recordType === 'baptism') {
      return { type: 'flex', weight: 1, minPx: 200 }; // Remainder column, split with sponsors
    }
    // For other record types, keep as fixed
    return { type: 'fixed', px: 220 };
  }

  // Sponsors (baptism): remainder column (split with parents if both exist)
  if (fieldLower === 'sponsors' ||
      fieldLower === 'sponsor' ||
      fieldLower.includes('sponsor')) {
    if (recordType === 'baptism') {
      return { type: 'flex', weight: 1, minPx: 200 }; // Remainder column, split with parents
    }
    return { type: 'flex', weight: 1, minPx: 200 };
  }

  // Witness (marriage): remainder or fixed 220px
  if (fieldLower === 'witness' ||
      fieldLower === 'witnesses' ||
      fieldLower.includes('witness')) {
    // In marriage, witness can be remainder
    if (recordType === 'marriage') {
      return { type: 'flex', weight: 1, minPx: 200 }; // Will be the remainder column
    }
    return { type: 'fixed', px: 220 };
  }

  // License/Number fields: 120-140px
  if (fieldLower.includes('license') ||
      fieldLower.includes('number') ||
      fieldLower.includes('num') ||
      fieldLower === 'marriagelicense' ||
      fieldLower === 'certificate_number') {
    return { type: 'fixed', px: 130 };
  }

  // Long text fields (burialLocation, notes, address): flex remainder
  // BurialLocation is specifically the remainder column for funeral records
  if (fieldLower === 'buriallocation' ||
      fieldLower === 'burial_location') {
    if (recordType === 'funeral') {
      return { type: 'flex', weight: 1, minPx: 200 }; // Will be the remainder column
    }
    return { type: 'flex', weight: 1, minPx: 200 };
  }
  
  if (fieldLower.includes('location') ||
      fieldLower.includes('address') ||
      fieldLower.includes('notes') ||
      fieldLower.includes('comment') ||
      fieldLower.includes('description') ||
      fieldLower === 'notes' ||
      fieldLower === 'address' ||
      fieldLower === 'street' ||
      fieldLower === 'city' ||
      fieldLower === 'state') {
    return { type: 'flex', weight: 1, minPx: 200 };
  }
  
  // Actions column (special case)
  if (fieldLower === '__actions' || fieldLower === 'actions') {
    return { type: 'fixed', px: 72 };
  }
  
  // Checkbox column (special case)
  if (fieldLower === '__checkbox' || fieldLower === 'checkbox') {
    return { type: 'fixed', px: 44 };
  }

  // Default: medium width flex column
  return { type: 'flex', weight: 1, minPx: 120 };
}

/**
 * Calculate column widths for all columns
 * @param columns - Array of column definitions
 * @param dateFields - Array of date field names
 * @param recordType - Record type for specific mappings
 * @returns Array of width values (px for fixed, percentage string for flex) and total fixed width
 */
export function calculateColumnWidths(
  columns: Array<{ field: string }>,
  dateFields: string[] = [],
  recordType?: 'baptism' | 'marriage' | 'funeral'
): { widths: Array<{ width: string | number; minWidth?: number }>; totalFixedWidth: number } {
  const configs = columns.map(col => getNormalColWidth(col.field, dateFields, recordType));
  
  // Separate fixed and flex columns
  const fixedColumns = configs.filter(c => c.type === 'fixed');
  const flexColumns = configs.filter(c => c.type === 'flex');
  
  // Calculate total fixed width
  const totalFixedWidth = fixedColumns.reduce((sum, c) => sum + (c.px || 0), 0);
  
  // For remainder column strategy: 
  // - If there's only one flex column, it gets all remaining space
  // - If multiple flex columns (e.g., sponsors + parents in baptism), split 50/50
  const flexColumnCount = flexColumns.length;
  
  const widths: Array<{ width: string | number; minWidth?: number }> = [];
  
  configs.forEach((config) => {
    if (config.type === 'fixed') {
      widths.push({
        width: config.px || 100,
        minWidth: config.minPx || config.px,
      });
    } else {
      // Flex column: remainder behavior
      if (flexColumnCount === 1) {
        // Single remainder column gets all remaining space
        const flexWidth = totalFixedWidth > 0 
          ? `calc(100% - ${totalFixedWidth}px)`
          : '100%';
        widths.push({
          width: flexWidth,
          minWidth: config.minPx || 200,
        });
      } else {
        // Multiple flex columns (e.g., sponsors + parents): split 50/50
        // Each gets equal share of remaining space
        const flexWidth = totalFixedWidth > 0 
          ? `calc((100% - ${totalFixedWidth}px) / ${flexColumnCount})`
          : `${100 / flexColumnCount}%`;
        widths.push({
          width: flexWidth,
          minWidth: config.minPx || 200,
        });
      }
    }
  });
  
  return { widths, totalFixedWidth };
}
