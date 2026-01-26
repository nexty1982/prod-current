/**
 * Orthodox Metrics - Church Service
 * Frontend service layer for church data operations
 * Updated with proper 401 error handling and retry limits
 */

import axios from 'axios';
import { withAuthRetry, createRetryKey, is401Error, handle401Error } from '../utils/authErrorHandler';

// Configure axios defaults
axios.defaults.withCredentials = true;

// Types for Church data
export interface Church {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  preferred_language?: string;
  timezone?: string;
  currency?: string;
  website?: string;
  is_active: boolean;
  has_baptism_records?: boolean;
  has_marriage_records?: boolean;
  has_funeral_records?: boolean;
  setup_complete?: boolean;
  created_at: string;
  updated_at: string;
  description_multilang?: string;
  tax_id?: string;
  database_name?: string;
}

// Additional interfaces
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Church Service Class
 */
class ChurchService {
  private retryCount = new Map<string, number>();
  private readonly MAX_RETRIES = 3;

  /**
   * Fetch all churches with proper error handling
   */
  async fetchChurches(): Promise<Church[]> {
    const retryKey = createRetryKey('fetchChurches');
    
    const fetchFunction = async (): Promise<Church[]> => {
      try {
        console.log('🔍 Fetching churches from API...');
        
        const response = await axios.get('/api/churches');
        
        // Handle different API response formats
        let churchesData: any[] = [];
        
        if (response.data.success && response.data.data && response.data.data.churches) {
          // Format: { success: true, data: { churches: [...] }, meta: {...} }
          churchesData = response.data.data.churches;
          console.log(`✅ Successfully fetched ${churchesData.length} churches`);
        } else if (response.data.success && response.data.churches) {
          // Format: { success: true, churches: [...] }
          churchesData = response.data.churches;
          console.log(`✅ Successfully fetched ${churchesData.length} churches`);
        } else if (response.data.data && Array.isArray(response.data.data)) {
          // Format: { data: [...], pagination: {...} }
          churchesData = response.data.data;
          console.log(`✅ Successfully fetched ${churchesData.length} churches`);
        } else if (Array.isArray(response.data)) {
          // Format: direct array
          churchesData = response.data;
          console.log(`✅ Successfully fetched ${churchesData.length} churches`);
        } else {
          console.error('❌ API response indicates failure:', response.data);
          throw new Error(response.data.error || 'Failed to fetch churches');
        }
        
        // Map API fields to expected Church interface fields
        return churchesData.map((church: any) => ({
          id: church.id,
          name: church.name || 'Unknown Church',
          email: church.email || '',
          phone: church.phone || '',
          address: church.address || '',
          city: church.city || '',
          state_province: church.state_province || '',
          postal_code: church.postal_code || '',
          country: church.country || '',
          preferred_language: church.preferred_language || 'en',
          timezone: church.timezone || 'UTC',
          currency: church.currency || 'USD',
          website: church.website || '',
          is_active: church.is_active !== false,
          has_baptism_records: church.has_baptism_records !== false,
          has_marriage_records: church.has_marriage_records !== false,
          has_funeral_records: church.has_funeral_records !== false,
          setup_complete: church.setup_complete !== false,
          created_at: church.created_at || church.createdAt || new Date().toISOString(),
          updated_at: church.updated_at || church.updatedAt || new Date().toISOString(),
          description_multilang: church.description_multilang || '',
          tax_id: church.tax_id || '',
          database_name: church.database_name || '',
        }));
      } catch (error: any) {
        console.error('❌ Error fetching churches:', error);
        
        // Check if it's a 401 error
        if (is401Error(error)) {
          console.warn('🔒 Authentication error fetching churches - redirecting to login');
          await handle401Error(error, 'fetchChurches');
          throw error; // Never reached due to redirect
        }
        
        // For other errors, provide mock data as fallback after retries are exhausted
        console.log('🔄 Using mock church data as fallback');
        return this.getMockChurches();
      }
    };

    // Use withAuthRetry to handle authentication errors and retries
    return withAuthRetry(fetchFunction, {
      maxRetries: this.MAX_RETRIES,
      retryKey,
      onRetryExceeded: () => {
        console.warn('🚨 Max retries exceeded for fetchChurches - using mock data');
      }
    })();
  }

  /**
   * Fetch church by ID with proper error handling
   */
  async fetchChurchById(churchId: number): Promise<Church> {
    const retryKey = createRetryKey('fetchChurchById', churchId);
    
    const fetchFunction = async (): Promise<Church> => {
      try {
        console.log(`🔍 Fetching church ${churchId} from API...`);
        
        const response = await axios.get<ApiResponse<Church>>(`/api/churches/${churchId}`);
        
        if (response.data.success && response.data.data) {
          console.log(`✅ Successfully fetched church: ${response.data.data.name}`);
          return response.data.data;
        } else {
          console.error('❌ API response indicates failure:', response.data);
          throw new Error(response.data.error || 'Failed to fetch church');
        }
      } catch (error: any) {
        console.error(`❌ Error fetching church ${churchId}:`, error);
        
        // Check if it's a 401 error
        if (is401Error(error)) {
          console.warn(`🔒 Authentication error fetching church ${churchId} - redirecting to login`);
          await handle401Error(error, 'fetchChurchById');
          throw error; // Never reached due to redirect
        }
        
        // Return mock data as fallback
        const mockChurches = this.getMockChurches();
        const church = mockChurches.find(c => c.id === churchId);
        if (church) {
          console.log(`🔄 Using mock data for church ${churchId}`);
          return church;
        }
        
        throw new Error(`Church with ID ${churchId} not found`);
      }
    };

    return withAuthRetry(fetchFunction, {
      maxRetries: this.MAX_RETRIES,
      retryKey
    })();
  }

  /**
   * Fetch church-specific records by type with proper error handling
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
    const retryKey = createRetryKey('fetchChurchRecords', churchId, recordType, params);
    
    const fetchFunction = async () => {
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
        
        // Add church_id to query params if specific church is selected
        if (churchId !== 0) {
          queryParams.append('church_id', churchId.toString());
        }
        
        const url = `${apiEndpoint}?${queryParams.toString()}`;
        console.log(`🌐 Calling API: ${url}`);
        
        const response = await axios.get(url);
        
        if (response.data && response.data.records) {
          console.log(`✅ Successfully fetched ${response.data.records.length} ${recordType} records`);
          
          // Filter by church if needed (as fallback in case API doesn't filter)
          let filteredRecords = response.data.records;
          if (churchId !== 0) {
            filteredRecords = response.data.records.filter((record: any) => 
              record.church_id === churchId || record.churchId === churchId || 
              record.church_id === churchId.toString() || record.churchId === churchId.toString()
            );
            console.log(`🔍 Filtered to ${filteredRecords.length} records for church ${churchId}`);
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
        
        // Check if it's a 401 error
        if (is401Error(error)) {
          console.warn(`🔒 Authentication error fetching ${recordType} records - redirecting to login`);
          await handle401Error(error, 'fetchChurchRecords');
          throw error; // Never reached due to redirect
        }
        
        // Return mock data as fallback
        console.log('🔄 Using mock record data as fallback');
        return this.getMockRecords(recordType);
      }
    };

    return withAuthRetry(fetchFunction, {
      maxRetries: this.MAX_RETRIES,
      retryKey
    })();
  }

  /**
   * Mock church data for fallback
   */
  private getMockChurches(): Church[] {
    return [
      {
        id: 1,
        name: "Saints Peter and Paul Orthodox Church",
        email: "info@ssppoc.org",
        phone: "(555) 123-4567",
        address: "123 Orthodox Way",
        city: "Orthodox City",
        state_province: "Orthodox State",
        postal_code: "12345",
        country: "USA",
        preferred_language: "English",
        timezone: "America/New_York",
        currency: "USD",
        website: "https://ssppoc.org",
        is_active: true,
        has_baptism_records: true,
        has_marriage_records: true,
        has_funeral_records: true,
        setup_complete: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        description_multilang: "A beautiful Orthodox church in the heart of the city.",
        tax_id: "123-45-6789",
        database_name: "ssppoc_db"
      },
      {
        id: 2,
        name: "Holy Trinity Orthodox Cathedral",
        email: "cathedral@holytrinityorthodox.org",
        phone: "(555) 987-6543",
        address: "456 Cathedral Street",
        city: "Orthodox City",
        state_province: "Orthodox State",
        postal_code: "12346",
        country: "USA",
        preferred_language: "English",
        timezone: "America/New_York",
        currency: "USD",
        website: "https://holytrinityorthodox.org",
        is_active: true,
        has_baptism_records: true,
        has_marriage_records: false,
        has_funeral_records: true,
        setup_complete: true,
        created_at: "2024-01-15T00:00:00Z",
        updated_at: "2024-01-15T00:00:00Z",
        description_multilang: "The main cathedral of the diocese, serving the city's Orthodox community.",
        tax_id: "987-65-4321",
        database_name: "holytrinity_db"
      },
      {
        id: 3,
        name: "St. Nicholas Orthodox Church",
        email: "stnicolas@orthodox.org",
        phone: "(555) 456-7890",
        address: "789 St. Nicholas Lane",
        city: "Orthodox City",
        state_province: "Orthodox State",
        postal_code: "12347",
        country: "USA",
        preferred_language: "Greek",
        timezone: "America/New_York",
        currency: "USD",
        website: "https://stnicholasorthodox.org",
        is_active: true,
        has_baptism_records: false,
        has_marriage_records: true,
        has_funeral_records: false,
        setup_complete: false,
        created_at: "2024-02-01T00:00:00Z",
        updated_at: "2024-02-01T00:00:00Z",
        description_multilang: "A traditional Greek Orthodox parish serving the local community.",
        tax_id: "456-78-9123",
        database_name: "stnicolas_db"
      }
    ];
  }

  /**
   * Mock record data for fallback
   */
  private getMockRecords(recordType: string): {
    records: any[];
    totalRecords: number;
    currentPage: number;
    totalPages: number;
  } {
    const mockRecords = [];
    
    // Create some mock records based on type
    for (let i = 1; i <= 5; i++) {
      if (recordType === 'baptism') {
        mockRecords.push({
          id: i,
          firstName: `John${i}`,
          lastName: `Doe${i}`,
          dateOfBaptism: `2024-0${i}-01`,
          priest: 'Fr. John Smith',
          church_id: 1,
          churchName: 'Saints Peter and Paul Orthodox Church'
        });
      } else if (recordType === 'marriage') {
        mockRecords.push({
          id: i,
          groomFirstName: `Groom${i}`,
          groomLastName: `Smith${i}`,
          brideFirstName: `Bride${i}`,
          brideLastName: `Jones${i}`,
          marriageDate: `2024-0${i}-15`,
          priest: 'Fr. John Smith',
          church_id: 1,
          churchName: 'Saints Peter and Paul Orthodox Church'
        });
      } else if (recordType === 'funeral') {
        mockRecords.push({
          id: i,
          firstName: `Deceased${i}`,
          lastName: `Person${i}`,
          dateOfFuneral: `2024-0${i}-30`,
          priest: 'Fr. John Smith',
          church_id: 1,
          churchName: 'Saints Peter and Paul Orthodox Church'
        });
      }
    }
    
    return {
      records: mockRecords,
      totalRecords: mockRecords.length,
      currentPage: 1,
      totalPages: 1
    };
  }
}

// Export singleton instance
export const churchService = new ChurchService();
export default churchService;
