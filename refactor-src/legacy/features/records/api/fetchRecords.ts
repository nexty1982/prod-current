/**
 * Centralized Records API
 * Provides standardized functions for fetching records data with field mappings
 */

export interface Column {
  column_name: string;
  ordinal_position: number;
  data_type: string;
  is_nullable: boolean;
  column_default?: string;
  column_comment?: string;
}

export interface RecordsResponse {
  columns: Column[];
  mapping: Record<string, string>;
  rows: Array<Record<string, any>>;
  meta: {
    churchId: number;
    database: string;
    table: string;
    rowCount: number;
    columnCount: number;
  };
}

export interface FetchRecordsParams {
  page?: number;
  limit?: number;
  orderBy?: string;
  direction?: 'ASC' | 'DESC';
}

/**
 * Fetch records data with column schema and field mappings
 * @param churchId - Church ID
 * @param table - Table name (e.g., 'baptism_records')
 * @param params - Optional query parameters
 * @returns Promise with enhanced records data
 */
export async function fetchRecords(
  churchId: number, 
  table: string, 
  params?: FetchRecordsParams
): Promise<RecordsResponse> {
  try {
    // Construct database name
    const database = `om_church_${churchId}`;
    
    // Build query parameters
    const searchParams = new URLSearchParams({
      db: database,
      table: table,
      churchId: churchId.toString()
    });

    // Add optional parameters if provided
    if (params?.page) {
      searchParams.append('page', params.page.toString());
    }
    if (params?.limit) {
      searchParams.append('limit', params.limit.toString());
    }
    if (params?.orderBy) {
      searchParams.append('orderBy', params.orderBy);
    }
    if (params?.direction) {
      searchParams.append('direction', params.direction);
    }

    const apiUrl = `/api/../features/records/records/enhanced?${searchParams.toString()}`;
    console.log('🌐 Calling API:', apiUrl);

    const response = await fetch(apiUrl, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log('📡 API response status:', response.status);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Use default error message if JSON parsing fails
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('📦 API response:', result);

    if (!result.success) {
      throw new Error(result.error || 'API request failed');
    }

    return {
      columns: result.data.columns || [],
      mapping: result.data.mapping || {},
      rows: result.data.rows || [],
      meta: result.meta || {
        churchId,
        database,
        table,
        rowCount: 0,
        columnCount: 0
      }
    };

  } catch (error) {
    console.error(`Error fetching records for church ${churchId}, table ${table}:`, error);
    throw error;
  }
}

/**
 * Fetch available tables for a church
 * @param churchId - Church ID
 * @returns Promise with list of table names
 */
export async function fetchAvailableTables(churchId: number): Promise<string[]> {
  try {
    const database = `om_church_${churchId}`;
    
    const response = await fetch(`/api/../features/records/records/tables?db=${database}`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const tables = await response.json();
    return Array.isArray(tables) ? tables : [];

  } catch (error) {
    console.error(`Error fetching tables for church ${churchId}:`, error);
    return [];
  }
}

/**
 * Get column display name using field mapping
 * @param columnName - Original column name
 * @param mapping - Field mapping object
 * @returns Mapped display name or original column name
 */
export function getColumnDisplayName(columnName: string, mapping: Record<string, string>): string {
  return mapping[columnName] || columnName;
}

/**
 * Hook for fetching records with React Query integration
 */
export const RECORDS_QUERY_KEY = (churchId: number, table: string) => ['records', churchId, table];

// Type exports for external use
export type { FetchRecordsParams };
