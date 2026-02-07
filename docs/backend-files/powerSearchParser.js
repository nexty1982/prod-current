/**
 * Power Search Query Parser
 * Tokenizes and parses search queries with field scoping, operators, and quoted phrases
 * 
 * Grammar:
 * - Global terms: john smith
 * - Field scoping: first:john last:smith
 * - Operators: = (exact), ~ (partial), >, <, >=, <=, .. (range)
 * - Quoted phrases: "Rev. David"
 * - Field aliases: first/fname -> first_name, last/lname -> last_name, etc.
 * 
 * @module powerSearchParser
 */

// Field alias mappings - map user-friendly names to DB columns
const FIELD_ALIASES = {
  // Name fields
  'first': 'person_first',
  'fname': 'person_first',
  'firstname': 'person_first',
  'last': 'person_last',
  'lname': 'person_last',
  'lastname': 'person_last',
  'middle': 'person_middle',
  'name': 'person_full',
  'fullname': 'person_full',
  
  // Date fields
  'birth': 'birth_date',
  'birthdate': 'birth_date',
  'dob': 'birth_date',
  'baptism': 'baptism_date',
  'baptismdate': 'baptism_date',
  'reception': 'reception_date',
  
  // Location fields
  'place': 'place_name',
  'birthplace': 'place_name',
  'location': 'place_name',
  
  // Parent fields
  'father': 'father_name',
  'mother': 'mother_name',
  'parents': 'parents',
  
  // Officiant fields
  'clergy': 'officiant_name',
  'priest': 'officiant_name',
  'officiant': 'officiant_name',
  
  // Other fields
  'godparents': 'godparents',
  'sponsors': 'godparents',
  'certificate': 'certificate_no',
  'cert': 'certificate_no',
  'book': 'book_no',
  'page': 'page_no',
  'entry': 'entry_no',
  'notes': 'notes',
};

// Valid DB columns for baptism records (whitelist for security)
const VALID_COLUMNS = new Set([
  'person_first',
  'person_middle',
  'person_last',
  'person_full',
  'birth_date',
  'baptism_date',
  'reception_date',
  'place_name',
  'father_name',
  'mother_name',
  'parents',
  'officiant_name',
  'godparents',
  'certificate_no',
  'book_no',
  'page_no',
  'entry_no',
  'notes',
]);

// Date field types (for special handling)
const DATE_FIELDS = new Set([
  'birth_date',
  'baptism_date',
  'reception_date',
]);

// Text fields for global search
const GLOBAL_SEARCH_FIELDS = [
  'person_first',
  'person_last',
  'person_full',
  'father_name',
  'mother_name',
  'officiant_name',
  'place_name',
  'godparents',
  'notes',
];

/**
 * Token types
 */
const TOKEN_TYPES = {
  FIELD: 'field',
  OPERATOR: 'operator',
  VALUE: 'value',
  GLOBAL: 'global',
};

/**
 * Tokenize the query string
 * Handles quoted phrases, field:value pairs, and operators
 * 
 * @param {string} query - The search query
 * @returns {Array} Array of tokens
 */
function tokenize(query) {
  if (!query || typeof query !== 'string') {
    return [];
  }

  const tokens = [];
  let i = 0;
  const len = query.length;

  while (i < len) {
    // Skip whitespace
    if (/\s/.test(query[i])) {
      i++;
      continue;
    }

    // Handle standalone quoted phrases first (not part of field:value)
    if (query[i] === '"') {
      i++; // Skip opening quote
      let value = '';
      while (i < len && query[i] !== '"') {
        value += query[i];
        i++;
      }
      i++; // Skip closing quote
      tokens.push({ type: TOKEN_TYPES.GLOBAL, value: value.trim() });
      continue;
    }

    // Check for field:quoted-value pattern (e.g., clergy:"Rev. David")
    let token = '';
    let hasQuotedValue = false;
    
    // Read until we hit a colon or whitespace
    while (i < len && query[i] !== ':' && !/\s/.test(query[i])) {
      token += query[i];
      i++;
    }
    
    // If we hit a colon, this might be a field:value pattern
    if (i < len && query[i] === ':') {
      token += query[i]; // Add the colon
      i++;
      
      // Check if the value starts with a quote
      if (i < len && query[i] === '"') {
        hasQuotedValue = true;
        token += query[i]; // Add opening quote
        i++;
        
        // Read until closing quote
        while (i < len && query[i] !== '"') {
          token += query[i];
          i++;
        }
        
        if (i < len && query[i] === '"') {
          token += query[i]; // Add closing quote
          i++;
        }
      } else {
        // Read the value until whitespace
        while (i < len && !/\s/.test(query[i])) {
          token += query[i];
          i++;
        }
      }
      
      // Parse the field:value token
      parseToken(token, tokens, hasQuotedValue);
      continue;
    }

    // If we have a token without a colon, it's either a global term or field operator value
    if (token) {
      parseToken(token, tokens, false);
    }
  }

  return tokens;
}

/**
 * Parse a single token into field, operator, and value components
 * 
 * @param {string} token - The token to parse
 * @param {Array} tokens - The tokens array to append to
 * @param {boolean} hasQuotedValue - Whether the value is quoted
 */
function parseToken(token, tokens, hasQuotedValue = false) {
  if (!token) return;

  // Check for field:value pattern
  const colonIndex = token.indexOf(':');
  if (colonIndex > 0) {
    const field = token.substring(0, colonIndex).toLowerCase();
    let rest = token.substring(colonIndex + 1);

    // If value is quoted, extract it without the quotes
    if (hasQuotedValue && rest.startsWith('"') && rest.endsWith('"')) {
      rest = rest.substring(1, rest.length - 1);
    }

    // Check for operator after colon
    let operator = '~'; // Default partial match
    let value = rest;

    if (rest.startsWith('=')) {
      operator = '=';
      value = rest.substring(1);
    } else if (rest.startsWith('~')) {
      operator = '~';
      value = rest.substring(1);
    } else if (rest.startsWith('>=')) {
      operator = '>=';
      value = rest.substring(2);
    } else if (rest.startsWith('<=')) {
      operator = '<=';
      value = rest.substring(2);
    } else if (rest.startsWith('>')) {
      operator = '>';
      value = rest.substring(1);
    } else if (rest.startsWith('<')) {
      operator = '<';
      value = rest.substring(1);
    }

    // Check for range operator (..)
    const rangeIndex = value.indexOf('..');
    if (rangeIndex > 0) {
      const start = value.substring(0, rangeIndex);
      const end = value.substring(rangeIndex + 2);
      tokens.push({
        type: TOKEN_TYPES.FIELD,
        field: field,
        operator: '..',
        value: { start, end }
      });
      return;
    }

    tokens.push({
      type: TOKEN_TYPES.FIELD,
      field: field,
      operator: operator,
      value: value
    });
    return;
  }

  // Check for standalone operator (e.g., "birth>2020")
  const operatorMatch = token.match(/^([a-z_]+)(>=|<=|>|<|=|~)(.+)$/i);
  if (operatorMatch) {
    const [, field, operator, value] = operatorMatch;
    tokens.push({
      type: TOKEN_TYPES.FIELD,
      field: field.toLowerCase(),
      operator: operator,
      value: value
    });
    return;
  }

  // Global search term
  tokens.push({ type: TOKEN_TYPES.GLOBAL, value: token });
}

/**
 * Resolve field alias to actual DB column name
 * 
 * @param {string} field - The field name (possibly an alias)
 * @returns {string|null} The DB column name or null if invalid
 */
function resolveField(field) {
  const normalized = field.toLowerCase().replace(/[_-]/g, '');
  const resolved = FIELD_ALIASES[normalized] || field;
  return VALID_COLUMNS.has(resolved) ? resolved : null;
}

/**
 * Parse date value and determine SQL comparison
 * Supports:
 * - YYYY: year range
 * - YYYY-MM: month range
 * - YYYY-MM-DD: exact date
 * 
 * @param {string} value - The date value
 * @param {string} operator - The comparison operator
 * @returns {Object} SQL fragment and params
 */
function parseDateValue(value, operator) {
  // YYYY format - treat as year range
  if (/^\d{4}$/.test(value)) {
    const year = value;
    if (operator === '>' || operator === '>=') {
      return {
        sql: `>= ?`,
        params: [`${year}-12-31`]
      };
    } else if (operator === '<' || operator === '<=') {
      return {
        sql: `< ?`,
        params: [`${year}-01-01`]
      };
    } else {
      // Exact year match
      return {
        sql: `BETWEEN ? AND ?`,
        params: [`${year}-01-01`, `${year}-12-31`]
      };
    }
  }

  // YYYY-MM format - treat as month range
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split('-');
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    if (operator === '>' || operator === '>=') {
      return {
        sql: `>= ?`,
        params: [`${value}-${lastDay}`]
      };
    } else if (operator === '<' || operator === '<=') {
      return {
        sql: `< ?`,
        params: [`${value}-01`]
      };
    } else {
      return {
        sql: `BETWEEN ? AND ?`,
        params: [`${value}-01`, `${value}-${lastDay}`]
      };
    }
  }

  // YYYY-MM-DD format - exact date
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return {
      sql: `${operator} ?`,
      params: [value]
    };
  }

  // Invalid date format
  return null;
}

/**
 * Build SQL WHERE clause from parsed tokens
 * 
 * @param {Array} tokens - Parsed tokens
 * @returns {Object} { sql, params, warnings }
 */
function buildWhereClause(tokens) {
  const conditions = [];
  const params = [];
  const warnings = [];

  const globalTerms = [];
  const fieldConditions = [];

  for (const token of tokens) {
    if (token.type === TOKEN_TYPES.GLOBAL) {
      globalTerms.push(token.value);
    } else if (token.type === TOKEN_TYPES.FIELD) {
      const dbColumn = resolveField(token.field);
      
      if (!dbColumn) {
        warnings.push(`Unknown field: "${token.field}"`);
        continue;
      }

      // Handle range operator
      if (token.operator === '..') {
        if (DATE_FIELDS.has(dbColumn)) {
          const startParsed = parseDateValue(token.value.start, '>=');
          const endParsed = parseDateValue(token.value.end, '<=');
          
          if (startParsed && endParsed) {
            fieldConditions.push(`${dbColumn} BETWEEN ? AND ?`);
            params.push(startParsed.params[0], endParsed.params[0]);
          } else {
            warnings.push(`Invalid date range for ${token.field}`);
          }
        } else {
          warnings.push(`Range operator (..) only supported for date fields`);
        }
        continue;
      }

      // Handle date fields
      if (DATE_FIELDS.has(dbColumn)) {
        const parsed = parseDateValue(token.value, token.operator);
        if (parsed) {
          fieldConditions.push(`${dbColumn} ${parsed.sql}`);
          params.push(...parsed.params);
        } else {
          warnings.push(`Invalid date format for ${token.field}: ${token.value}`);
        }
        continue;
      }

      // Handle text fields
      if (token.operator === '=') {
        // Exact match
        fieldConditions.push(`${dbColumn} = ?`);
        params.push(token.value);
      } else if (token.operator === '~' || !token.operator) {
        // Partial match (LIKE)
        fieldConditions.push(`${dbColumn} LIKE ?`);
        params.push(`%${token.value}%`);
      } else {
        warnings.push(`Operator "${token.operator}" not supported for text field: ${token.field}`);
      }
    }
  }

  // Build global search conditions (OR across multiple fields)
  if (globalTerms.length > 0) {
    for (const term of globalTerms) {
      const globalConditions = GLOBAL_SEARCH_FIELDS.map(field => {
        params.push(`%${term}%`);
        return `${field} LIKE ?`;
      });
      conditions.push(`(${globalConditions.join(' OR ')})`);
    }
  }

  // Add field-specific conditions (AND)
  if (fieldConditions.length > 0) {
    conditions.push(...fieldConditions);
  }

  // Combine all conditions with AND
  const sql = conditions.length > 0 ? conditions.join(' AND ') : '';

  return { sql, params, warnings };
}

/**
 * Parse search query and build SQL WHERE clause
 * Main entry point for the parser
 * 
 * @param {string} query - The search query
 * @returns {Object} { sql, params, warnings, tokens }
 */
function parseSearchQuery(query) {
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return {
      sql: '',
      params: [],
      warnings: [],
      tokens: []
    };
  }

  const tokens = tokenize(query.trim());
  const { sql, params, warnings } = buildWhereClause(tokens);

  return {
    sql,
    params,
    warnings,
    tokens,
    summary: {
      globalTerms: tokens.filter(t => t.type === TOKEN_TYPES.GLOBAL).length,
      fieldFilters: tokens.filter(t => t.type === TOKEN_TYPES.FIELD).length,
      totalTokens: tokens.length
    }
  };
}

module.exports = {
  parseSearchQuery,
  tokenize,
  resolveField,
  parseDateValue,
  buildWhereClause,
  FIELD_ALIASES,
  VALID_COLUMNS,
  DATE_FIELDS,
  GLOBAL_SEARCH_FIELDS,
};
