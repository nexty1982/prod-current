/**
 * Dynamic Records API Service
 * Service for interacting with the new ordinal-based abstract records API
 */

export interface ColumnMetadata {
  pos: number;
  name: string;
  type: string;
}

export interface OrderBy {
  pos: number;
  name: string;
  dir: 'asc' | 'desc';
}

export interface RecordTableData {
  churchDb: string;
  table: string;
  columns: ColumnMetadata[];
  orderBy: OrderBy;
  limit: number;
  offset: number;
  rows: any[][]; // Array of arrays (ordinal-based)
  hasMore: boolean;
  nextOffset: number | null;
  totalRows: number;
}

export interface TableSummary {
  table: string;
  columns: ColumnMetadata[];
  orderBy: OrderBy;
  rows: any[][];
}

export interface DiscoverResponse {
  churchDb: string;
  tables: TableSummary[];
}

/**
 * Get list of all _records tables in a church database
 */
export async function getRecordsTables(churchDb: string): Promise<string[]> {
  const url = new URL('/api/../features/records/records/tables', window.location.origin);
  url.searchParams.set('db', churchDb);
  
  const response = await fetch(url.toString(), {
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get data from a specific records table
 */
export async function getTableData(
  churchDb: string,
  table: string,
  options: {
    limit?: number;
    offset?: number;
    orderByPos?: number;
    orderDir?: 'asc' | 'desc';
    format?: 'array';
  } = {}
): Promise<RecordTableData> {
  const {
    limit = 200,
    offset = 0,
    orderByPos = 1,
    orderDir = 'desc',
    format = 'array'
  } = options;
  
  const url = new URL(`/api/../features/records/records/${table}`, window.location.origin);
  url.searchParams.set('db', churchDb);
  url.searchParams.set('limit', limit.toString());
  url.searchParams.set('offset', offset.toString());
  url.searchParams.set('orderByPos', orderByPos.toString());
  url.searchParams.set('orderDir', orderDir);
  url.searchParams.set('format', format);
  
  const response = await fetch(url.toString(), {
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Discover all records tables with sample data
 */
export async function discoverTables(
  churchDb: string,
  limit: number = 50
): Promise<DiscoverResponse> {
  const url = new URL('/api/../features/records/records/discover', window.location.origin);
  url.searchParams.set('db', churchDb);
  url.searchParams.set('limit', limit.toString());
  
  const response = await fetch(url.toString(), {
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Convert array-based row data to object format for easier display
 */
export function rowArrayToObject(row: any[], columns: ColumnMetadata[]): Record<string, any> {
  const obj: Record<string, any> = {};
  columns.forEach((col, index) => {
    obj[col.name] = row[index];
  });
  return obj;
}

/**
 * Format cell value for display based on column type
 */
export function formatCellValue(value: any, columnType: string): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  // Handle different data types
  switch (columnType.toLowerCase()) {
    case 'date':
      if (value instanceof Date) {
        return value.toLocaleDateString();
      }
      if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
        return new Date(value).toLocaleDateString();
      }
      break;
    case 'datetime':
    case 'timestamp':
      if (value instanceof Date) {
        return value.toLocaleString();
      }
      if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
        return new Date(value).toLocaleString();
      }
      break;
    case 'decimal':
    case 'float':
    case 'double':
      if (typeof value === 'number') {
        return value.toFixed(2);
      }
      break;
    case 'int':
    case 'integer':
    case 'bigint':
      if (typeof value === 'number') {
        return value.toString();
      }
      break;
  }
  
  return String(value);
}

/**
 * Get display name for a column based on its database name
 */
export function getColumnDisplayName(columnName: string): string {
  // Convert snake_case to Title Case
  return columnName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get icon for a table based on its name
 */
export function getTableIcon(tableName: string): string {
  if (tableName.includes('baptism')) return '👶';
  if (tableName.includes('marriage')) return '💒';
  if (tableName.includes('funeral') || tableName.includes('burial')) return '⚱️';
  if (tableName.includes('member')) return '👥';
  if (tableName.includes('clergy')) return '⛪';
  if (tableName.includes('donation')) return '💰';
  if (tableName.includes('event')) return '📅';
  if (tableName.includes('service')) return '🙏';
  return '📋'; // Default icon
}
