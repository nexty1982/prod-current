/**
 * Church Service for Orthodox Metrics
 * Handles church data and multi-tenant record access
 */

export interface Church {
  id: number;
  name?: string;
  church_name?: string;
  email?: string;
  database_name?: string;
  is_active?: boolean;
  // Additional fields for UI
  address?: string;
  phone?: string;
  has_baptism_records?: boolean;
  has_marriage_records?: boolean;
  has_funeral_records?: boolean;
  setup_complete?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FetchRecordsOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface RecordsResponse {
  records: any[];
  totalRecords: number;
  currentPage: number;
  totalPages: number;
}

const churchService = {
  /**
   * Fetch all churches the current user has access to
   * Super admins see all churches, others see only assigned churches
   */
  fetchChurches: async (): Promise<Church[]> => {
    try {
      console.log('🔍 Fetching churches from /api/my/churches...');
      const response = await fetch('/api/my/churches', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_user');
        window.location.href = `/auth/sign-in?redirect=${encodeURIComponent(window.location.pathname)}`;
        throw new Error('Session expired');
      }
      if (!response.ok) {
        throw new Error(`Failed to fetch churches: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Handle various response formats:
      // - { success: true, data: { churches: [...] } } (ApiResponse format)
      // - { churches: [...] } (direct object)
      // - [...] (direct array)
      let churches: Church[] = [];
      
      if (data.data?.churches) {
        churches = data.data.churches;
      } else if (data.churches) {
        churches = data.churches;
      } else if (Array.isArray(data.data)) {
        churches = data.data;
      } else if (Array.isArray(data)) {
        churches = data;
      }
      
      console.log(`✅ Fetched ${churches.length} churches`);
      return churches;
    } catch (error) {
      console.error('❌ Error fetching churches:', error);
      throw error;
    }
  },

  /**
   * Fetch records for a specific church and record type
   * Each church has its own database (om_church_{id})
   */
  fetchChurchRecords: async (
    churchId: number,
    recordType: string,
    options: FetchRecordsOptions = {}
  ): Promise<RecordsResponse> => {
    try {
      const { page = 1, limit = 100, search = '', sortField = 'id', sortDirection = 'desc' } = options;
      
      console.log(`🔍 Fetching ${recordType} records for church ${churchId}...`);
      
      const params = new URLSearchParams({
        church_id: churchId.toString(),
        page: page.toString(),
        limit: limit.toString(),
        sortField,
        sortDirection,
      });
      
      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`/api/${recordType}-records?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch records: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log(`✅ Fetched ${data.records?.length || 0} ${recordType} records`);
      
      return {
        records: data.records || [],
        totalRecords: data.totalRecords || data.records?.length || 0,
        currentPage: data.currentPage || page,
        totalPages: data.totalPages || Math.ceil((data.totalRecords || 0) / limit),
      };
    } catch (error) {
      console.error(`❌ Error fetching ${recordType} records:`, error);
      throw error;
    }
  },

  /**
   * Get a single church by ID
   */
  getChurch: async (id: number): Promise<Church | null> => {
    try {
      const response = await fetch(`/api/churches/${id}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch church: ${response.status}`);
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('Error fetching church:', error);
      throw error;
    }
  },

  /**
   * Get churches (alias for fetchChurches for backwards compatibility)
   */
  getChurches: async (): Promise<Church[]> => {
    return churchService.fetchChurches();
  },

  /**
   * Create a new church
   */
  createChurch: async (church: Partial<Church>): Promise<Church> => {
    const response = await fetch('/api/churches', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(church),
    });

    if (!response.ok) {
      throw new Error(`Failed to create church: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  },

  /**
   * Update an existing church
   */
  updateChurch: async (id: number, church: Partial<Church>): Promise<Church> => {
    const response = await fetch(`/api/churches/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(church),
    });

    if (!response.ok) {
      throw new Error(`Failed to update church: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  },

  /**
   * Delete a church
   */
  deleteChurch: async (id: number): Promise<boolean> => {
    const response = await fetch(`/api/churches/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete church: ${response.status}`);
    }

    return true;
  },
};

export default churchService;
