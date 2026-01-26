/**
 * Records API Service
 * Service for interacting with church records (baptism, marriage, funeral)
 */

export type TableKey = 'baptism' | 'marriage' | 'funeral';
export type SortDir = 'asc' | 'desc';

export interface ListRecordsParams {
  table: TableKey;
  churchId: number;
  page: number;
  limit: number;
  search?: string;
  sortField?: string;
  sortDirection?: SortDir;
  signal?: AbortSignal;
}

export interface ListRecordsResponse {
  rows: any[];
  count: number;
  church?: {
    id: number;
    name: string;
  };
}

/**
 * List records from the specified table
 */
export const listRecords = async (params: ListRecordsParams): Promise<ListRecordsResponse> => {
  const {
    table,
    churchId,
    page,
    limit,
    search,
    sortField,
    sortDirection = 'desc',
    signal
  } = params;

  // Build query parameters
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
    ...(sortField && { sortField }),
    ...(sortDirection && { sortDirection })
  });

  try {
    // Use the appropriate API endpoint based on the table type
    let endpoint = '';
    switch (table) {
      case 'baptism':
        endpoint = `/api/baptism-records?${queryParams}`;
        break;
      case 'marriage':
        endpoint = `/api/marriage-records?${queryParams}`;
        break;
      case 'funeral':
        endpoint = `/api/funeral-records?${queryParams}`;
        break;
      default:
        throw new Error(`Unknown table: ${table}`);
    }

    // Add church ID to endpoint if provided
    if (churchId) {
      queryParams.set('churchId', churchId.toString());
      endpoint = `${endpoint.split('?')[0]}?${queryParams}`;
    }

    console.log(`[recordsApi] Fetching ${table} records:`, { endpoint, params });

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch ${table} records: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    // Normalize the response structure
    const result: ListRecordsResponse = {
      rows: data.records || data.data || data.rows || [],
      count: data.total || data.count || data.totalCount || 0,
      church: data.church || (churchId ? { id: churchId, name: data.churchName || 'Unknown Church' } : undefined)
    };

    console.log(`[recordsApi] Successfully fetched ${result.rows.length} ${table} records`);
    return result;

  } catch (error) {
    console.error(`[recordsApi] Error fetching ${table} records:`, error);
    
    // Handle abort signal
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    
    // Return empty result on error to prevent UI crashes
    return {
      rows: [],
      count: 0,
      church: churchId ? { id: churchId, name: 'Unknown Church' } : undefined
    };
  }
};

export default {
  listRecords
};
