/**
 * Records API - Front-end helpers for dynamic records
 * Fetches records data and handles field mappings
 */

interface Column {
  column_name: string;
  ordinal_position: number;
  data_type?: string;
  is_nullable?: boolean;
}

interface RecordsResponse {
  columns: Column[];
  mapping: Record<string, string>;
  rows: Array<Record<string, any>> | Array<any[]>;
  total: number;
}

interface FetchRecordsOptions {
  page?: number;
  pageSize?: number;
  sort?: string;
  dir?: 'asc' | 'desc';
}

/**
 * Fetch available *_records tables for a church
 */
export async function fetchTables(churchId: number): Promise<string[]> {
  try {
    const response = await fetch(`/api/admin/churches/${churchId}/records/tables`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tables: ${response.status} ${response.statusText}`);
    }

    const tables = await response.json();
    return Array.isArray(tables) ? tables : [];
  } catch (error) {
    console.error('Error fetching tables:', error);
    throw error;
  }
}

/**
 * Fetch records with columns, mapping, and pagination
 */
export async function fetchRecords(
  churchId: number, 
  table: string, 
  options: FetchRecordsOptions = {}
): Promise<RecordsResponse> {
  try {
    const {
      page = 1,
      pageSize = 50,
      sort,
      dir = 'desc'
    } = options;

    // Build query parameters for the church-specific endpoint
    const params = new URLSearchParams({
      table,
      page: page.toString(),
      pageSize: pageSize.toString()
    });

    if (sort) {
      params.append('sort', sort);
      params.append('dir', dir);
    }

    const response = await fetch(`/api/admin/churches/${churchId}/records?${params}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch records: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch records');
    }
    
    // Return the normalized structure
    return {
      columns: data.columns || [],
      mapping: data.mapping || {},
      rows: data.rows || [],
      total: data.total || 0
    };
  } catch (error) {
    console.error('Error fetching records:', error);
    throw error;
  }
}

/**
 * Alternative method using the enhanced records endpoint
 */
export async function fetchRecordsEnhanced(
  churchId: number, 
  table: string, 
  options: FetchRecordsOptions = {}
): Promise<RecordsResponse> {
  try {
    const {
      page = 1,
      pageSize = 50,
      sort,
      dir = 'desc'
    } = options;

    const dbName = `om_church_${churchId.toString().padStart(2, '0')}`;
    
    // Build query parameters for enhanced endpoint
    const params = new URLSearchParams({
      db: dbName,
      table,
      churchId: churchId.toString()
    });

    const response = await fetch(`/api/records/enhanced?${params}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch enhanced records: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch records');
    }

    const { data } = result;
    
    // Apply client-side pagination since enhanced endpoint doesn't support it yet
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedRows = data.rows.slice(startIndex, endIndex);

    // Apply client-side sorting if requested
    let sortedRows = paginatedRows;
    if (sort && data.columns) {
      const sortColumn = data.columns.find((col: Column) => col.column_name === sort);
      if (sortColumn) {
        const columnIndex = sortColumn.ordinal_position - 1;
        sortedRows = [...paginatedRows].sort((a, b) => {
          const aVal = Array.isArray(a) ? a[columnIndex] : a[sort];
          const bVal = Array.isArray(b) ? b[columnIndex] : b[sort];
          
          if (aVal < bVal) return dir === 'asc' ? -1 : 1;
          if (aVal > bVal) return dir === 'asc' ? 1 : -1;
          return 0;
        });
      }
    }

    return {
      columns: data.columns || [],
      mapping: data.mapping || {},
      rows: sortedRows,
      total: data.rows?.length || 0
    };
  } catch (error) {
    console.error('Error fetching enhanced records:', error);
    throw error;
  }
}
