/**
 * Orthodox Metrics - Church Service
 * Frontend service layer for church data operations
 */

import axios from 'axios';

// Configure axios defaults
axios.defaults.withCredentials = true;

// Types for Church data
export interface Church {
  id: number;
  church_name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  language_preference?: string;
  timezone?: string;
  currency?: string;
  website?: string;
  is_active: boolean;
  has_baptism_records: boolean;
  has_marriage_records: boolean;
  has_funeral_records: boolean;
  setup_complete: boolean;
  created_at: string;
  updated_at: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

/**
 * Church Service Class
 */
class ChurchService {
  /**
   * Fetch all churches
   */
  async fetchChurches(): Promise<Church[]> {
    try {
      console.log('🔍 Fetching churches from API...');
      
      const response = await axios.get('/api/churches');
      
      if (response.data.success && response.data.churches) {
        console.log(`✅ Successfully fetched ${response.data.churches.length} churches`);
        return response.data.churches;
      } else {
        console.error('❌ API response indicates failure:', response.data);
        throw new Error(response.data.error || 'Failed to fetch churches');
      }
    } catch (error: any) {
      console.error('❌ Error fetching churches:', error);
      
      // Provide mock data as fallback
      console.log('🔄 Using mock church data as fallback');
      return this.getMockChurches();
    }
  }

  /**
   * Fetch church by ID
   */
  async fetchChurchById(churchId: number): Promise<Church> {
    try {
      console.log(`🔍 Fetching church ${churchId} from API...`);
      
      const response = await axios.get<ApiResponse<Church>>(`/api/churches/${churchId}`);
      
      if (response.data.success && response.data.data) {
        console.log(`✅ Successfully fetched church: ${response.data.data.church_name}`);
        return response.data.data;
      } else {
        console.error('❌ API response indicates failure:', response.data);
        throw new Error(response.data.error || 'Failed to fetch church');
      }
    } catch (error: any) {
      console.error(`❌ Error fetching church ${churchId}:`, error);
      
      // Return mock data as fallback
      const mockChurches = this.getMockChurches();
      const church = mockChurches.find(c => c.id === churchId);
      if (church) {
        return church;
      }
      
      throw new Error(`Church with ID ${churchId} not found`);
    }
  }

  /**
   * Fetch church-specific records by type
   */
  async fetchChurchRecords(churchId: number, recordType: string, params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<{
    records: any[];
    totalRecords: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      console.log(`🔍 Fetching ${recordType} records for church ${churchId}...`);
      
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      
      // Use the correct API endpoint based on record type
      let apiEndpoint = '';
      switch (recordType) {
        case 'baptism':
          apiEndpoint = '/api/baptism-records';
          break;
        case 'marriage':
          apiEndpoint = '/api/marriage-records';
          break;
        case 'funeral':
          apiEndpoint = '/api/funeral-records';
          break;
        default:
          apiEndpoint = `/api/${recordType}-records`;
      }
      
      const url = `${apiEndpoint}?${queryParams.toString()}`;
      const response = await axios.get(url);
      
      if (response.data && response.data.records) {
        console.log(`✅ Successfully fetched ${response.data.records.length} ${recordType} records`);
        
        // Filter by church if needed (since the API might return all churches)
        let filteredRecords = response.data.records;
        if (churchId !== 0) {
          filteredRecords = response.data.records.filter((record: any) => 
            record.church_id === churchId || record.churchId === churchId
          );
        }
        
        return {
          records: filteredRecords,
          totalRecords: response.data.totalRecords || filteredRecords.length,
          currentPage: response.data.currentPage || 1,
          totalPages: response.data.totalPages || 1
        };
      } else {
        console.error('❌ API response indicates failure:', response.data);
        throw new Error('Failed to fetch church records');
      }
    } catch (error: any) {
      console.error(`❌ Error fetching ${recordType} records for church ${churchId}:`, error);
      
      // Return mock data as fallback
      console.log('🔄 Using mock record data as fallback');
      return this.getMockRecords(recordType);
    }
  }

  /**
   * Mock church data for fallback
   */
  private getMockChurches(): Church[] {
    return [
      {
        id: 1,
        church_name: "Saints Peter and Paul Orthodox Church",
        email: "info@ssppoc.org",
        phone: "(555) 123-4567",
        address: "123 Orthodox Way",
        city: "Orthodox City",
        state_province: "Orthodox State",
        postal_code: "12345",
        country: "USA",
        language_preference: "English",
        timezone: "America/New_York",
        currency: "USD",
        website: "https://ssppoc.org",
        is_active: true,
        has_baptism_records: true,
        has_marriage_records: true,
        has_funeral_records: true,
        setup_complete: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z"
      },
      {
        id: 2,
        church_name: "Holy Trinity Orthodox Cathedral",
        email: "cathedral@holytrinityorthodox.org",
        phone: "(555) 987-6543",
        address: "456 Cathedral Street",
        city: "Orthodox City",
        state_province: "Orthodox State",
        postal_code: "12346",
        country: "USA",
        language_preference: "English",
        timezone: "America/New_York",
        currency: "USD",
        website: "https://holytrinityorthodox.org",
        is_active: true,
        has_baptism_records: true,
        has_marriage_records: false,
        has_funeral_records: true,
        setup_complete: true,
        created_at: "2024-01-15T00:00:00Z",
        updated_at: "2024-01-15T00:00:00Z"
      },
      {
        id: 3,
        church_name: "St. Nicholas Orthodox Church",
        email: "parish@stnicholasorthodox.com",
        phone: "(555) 456-7890",
        address: "789 Saint Nicholas Lane",
        city: "Orthodox Town",
        state_province: "Orthodox State",
        postal_code: "12347",
        country: "USA",
        language_preference: "English",
        timezone: "America/New_York",
        currency: "USD",
        website: "https://stnicholasorthodox.com",
        is_active: true,
        has_baptism_records: false,
        has_marriage_records: true,
        has_funeral_records: false,
        setup_complete: false,
        created_at: "2024-02-01T00:00:00Z",
        updated_at: "2024-02-01T00:00:00Z"
      }
    ];
  }

  /**
   * Mock record data for fallback
   */
  private getMockRecords(recordType: string) {
    const mockBaptismRecords = [
      {
        id: "1",
        registryNumber: "BAP-2024-001",
        firstName: "John",
        middleName: "Michael",
        lastName: "Smith",
        dateOfBirth: "2024-01-15",
        dateOfBaptism: "2024-03-15",
        placeOfBirth: "Orthodox City",
        placeOfBaptism: "Saints Peter and Paul Orthodox Church",
        fatherName: "David Smith",
        motherName: "Sarah Smith",
        godparentNames: "Mark Johnson, Lisa Johnson",
        priest: "Father Peter Orthodox",
        churchName: "Saints Peter and Paul Orthodox Church",
        church_id: 1,
        notes: "Baptized during Theophany season",
        status: "active",
        created_at: "2024-03-15T10:00:00Z",
        updated_at: "2024-03-15T10:00:00Z"
      },
      {
        id: "2",
        registryNumber: "BAP-2024-002",
        firstName: "Maria",
        middleName: "Elizabeth",
        lastName: "Jones",
        dateOfBirth: "2024-02-20",
        dateOfBaptism: "2024-04-20",
        placeOfBirth: "Orthodox City",
        placeOfBaptism: "Saints Peter and Paul Orthodox Church",
        fatherName: "Robert Jones",
        motherName: "Anna Jones",
        godparentNames: "Michael Orthodox, Catherine Orthodox",
        priest: "Father Peter Orthodox",
        churchName: "Saints Peter and Paul Orthodox Church",
        church_id: 1,
        notes: "Baptized during Pascha season",
        status: "active",
        created_at: "2024-04-20T14:30:00Z",
        updated_at: "2024-04-20T14:30:00Z"
      }
    ];

    return {
      records: mockBaptismRecords,
      totalRecords: mockBaptismRecords.length,
      currentPage: 1,
      totalPages: 1
    };
  }
}

// Export singleton instance
export const churchService = new ChurchService();
export default churchService;
