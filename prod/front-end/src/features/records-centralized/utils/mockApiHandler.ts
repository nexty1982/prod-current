// Mock API handler for testing Records API auto-discovery
// This simulates backend endpoints when no real backend is available

interface MockRecord {
  id: number;
  [key: string]: any;
}

const MOCK_TABLES = ['baptism_records', 'marriage_records', 'funeral_records'];

const MOCK_COLUMNS = {
  baptism_records: ['id', 'first_name', 'last_name', 'date_of_birth', 'date_of_baptism', 'parents', 'sponsors', 'clergy', 'notes'],
  marriage_records: ['id', 'groom_first_name', 'groom_last_name', 'bride_first_name', 'bride_last_name', 'marriage_date', 'clergy', 'witnesses', 'notes'],
  funeral_records: ['id', 'first_name', 'last_name', 'date_of_death', 'date_of_funeral', 'age', 'burial_location', 'clergy', 'notes']
};

const MOCK_DATA = {
  baptism_records: [
    { id: 1, first_name: 'John', last_name: 'Smith', date_of_birth: '2023-01-15', date_of_baptism: '2023-02-20', parents: 'Michael & Sarah Smith', sponsors: 'Peter & Mary Johnson', clergy: 'Fr. Nicholas', notes: 'Beautiful ceremony' },
    { id: 2, first_name: 'Maria', last_name: 'Popovic', date_of_birth: '2022-12-10', date_of_baptism: '2023-01-25', parents: 'Stefan & Ana Popovic', sponsors: 'Milos & Jovana Nikolic', clergy: 'Fr. Nicholas', notes: 'Family celebration' },
    { id: 3, first_name: 'Alexander', last_name: 'Petrov', date_of_birth: '2023-03-05', date_of_baptism: '2023-04-10', parents: 'Dimitri & Elena Petrov', sponsors: 'Victor & Natasha Volkov', clergy: 'Fr. Michael', notes: 'Easter season baptism' },
  ],
  marriage_records: [
    { id: 1, groom_first_name: 'David', groom_last_name: 'Wilson', bride_first_name: 'Anna', bride_last_name: 'Kozlov', marriage_date: '2023-06-15', clergy: 'Fr. Nicholas', witnesses: 'James Wilson, Marina Kozlova', notes: 'Summer wedding' },
    { id: 2, groom_first_name: 'Nikola', groom_last_name: 'Jovanovic', bride_first_name: 'Milica', bride_last_name: 'Stojanovic', marriage_date: '2023-09-20', clergy: 'Fr. Michael', witnesses: 'Marko Jovanovic, Jelena Stojanovic', notes: 'Traditional ceremony' },
  ],
  funeral_records: [
    { id: 1, first_name: 'George', last_name: 'Anderson', date_of_death: '2023-08-10', date_of_funeral: '2023-08-15', age: 78, burial_location: 'St. Nicholas Cemetery', clergy: 'Fr. Nicholas', notes: 'Beloved community member' },
    { id: 2, first_name: 'Mileva', last_name: 'Milic', date_of_death: '2023-10-05', date_of_funeral: '2023-10-08', age: 85, burial_location: 'Orthodox Cemetery', clergy: 'Fr. Michael', notes: 'Peacefully passed' },
  ]
};

// Simulate API response time
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class MockAPIHandler {
  private isEnabled: boolean = false;

  enable() {
    this.isEnabled = true;
    console.log('🎭 Mock API handler enabled for testing');
  }

  disable() {
    this.isEnabled = false;
    console.log('🎭 Mock API handler disabled');
  }

  async handleRequest(url: string): Promise<Response | null> {
    if (!this.isEnabled) return null;

    await delay(300 + Math.random() * 200); // Simulate network delay

    // Parse the URL to determine what's being requested
    const urlObj = new URL(url, location.origin);
    const path = urlObj.pathname;
    const params = urlObj.searchParams;

    // Handle different API patterns
    try {
      // Pattern 1: /api/records/:churchId/tables
      const v2TablesMatch = path.match(/^\/api\/records\/(\d+)\/tables$/);
      if (v2TablesMatch) {
        return this.mockResponse({ tables: MOCK_TABLES });
      }

      // Pattern 1: /api/records/:churchId/tables/:table/columns
      const v2ColumnsMatch = path.match(/^\/api\/records\/(\d+)\/tables\/([^/]+)\/columns$/);
      if (v2ColumnsMatch) {
        const table = v2ColumnsMatch[2];
        return this.mockResponse({ columns: MOCK_COLUMNS[table as keyof typeof MOCK_COLUMNS] || [] });
      }

      // Pattern 1: /api/records/:churchId/tables/:table/rows
      const v2RowsMatch = path.match(/^\/api\/records\/(\d+)\/tables\/([^/]+)\/rows$/);
      if (v2RowsMatch) {
        const table = v2RowsMatch[2];
        const limit = parseInt(params.get('limit') || '50');
        const offset = parseInt(params.get('offset') || '0');
        const q = params.get('q') || '';
        
        let data = MOCK_DATA[table as keyof typeof MOCK_DATA] || [];
        
        // Apply search filter
        if (q) {
          data = data.filter(record => 
            Object.values(record).some(value => 
              String(value).toLowerCase().includes(q.toLowerCase())
            )
          );
        }
        
        const total = data.length;
        const rows = data.slice(offset, offset + limit);
        
        return this.mockResponse({ rows, total });
      }

      // Pattern 2: Legacy style /api/church/:churchId/records/tables
      const legacyTablesMatch = path.match(/^\/api\/church\/(\d+)\/records\/tables$/);
      if (legacyTablesMatch) {
        return this.mockResponse({ tables: MOCK_TABLES });
      }

      // Pattern 3: Flat style /api/records with query params
      if (path === '/api/records') {
        const op = params.get('op');
        const churchId = params.get('churchId');
        
        if (op === 'listTables' && churchId) {
          return this.mockResponse({ tables: MOCK_TABLES });
        }
        
        if (op === 'listColumns' && churchId) {
          const table = params.get('table');
          return this.mockResponse({ columns: MOCK_COLUMNS[table as keyof typeof MOCK_COLUMNS] || [] });
        }
        
        if (op === 'listRows' && churchId) {
          const table = params.get('table');
          const limit = parseInt(params.get('limit') || '50');
          const offset = parseInt(params.get('offset') || '0');
          const q = params.get('q') || '';
          
          let data = MOCK_DATA[table as keyof typeof MOCK_DATA] || [];
          
          if (q) {
            data = data.filter(record => 
              Object.values(record).some(value => 
                String(value).toLowerCase().includes(q.toLowerCase())
              )
            );
          }
          
          const total = data.length;
          const rows = data.slice(offset, offset + limit);
          
          return this.mockResponse({ rows, total });
        }
      }

    } catch (error) {
      console.error('Mock API error:', error);
    }

    return null; // Not handled by mock
  }

  private mockResponse(data: any): Response {
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export const mockAPIHandler = new MockAPIHandler();

// Override fetch for testing when enabled
const originalFetch = window.fetch;

window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  
  const mockResponse = await mockAPIHandler.handleRequest(url);
  if (mockResponse) {
    console.log('🎭 Mock API responded to:', url);
    return mockResponse;
  }
  
  // Fall back to real fetch
  return originalFetch(input, init);
};