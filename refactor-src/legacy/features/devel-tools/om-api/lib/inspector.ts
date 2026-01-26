/**
 * OM API Endpoint Inspector
 * Loads and processes the endpoint discovery index
 */

export interface EndpointSpec {
  method: string;
  path: string;
  description?: string;
  file: string;
  line?: number;
  tags?: string[];
}

export interface IndexEntry {
  timestamp: string;
  endpoints: EndpointSpec[];
  stats: {
    totalEndpoints: number;
    methodBreakdown: Record<string, number>;
    fileCount: number;
  };
}

/**
 * Endpoint Inspector class for managing API endpoint discovery
 */
export class EndpointInspector {
  private index: IndexEntry | null = null;
  private loading: boolean = false;
  
  /**
   * Load the endpoint index from the server
   */
  async loadIndex(): Promise<IndexEntry> {
    if (this.loading) {
      throw new Error('Index is already loading');
    }
    
    this.loading = true;
    
    try {
      // Try to load from the public directory
      const response = await fetch('/omapi-index.json');
      
      if (!response.ok) {
        // If the index doesn't exist, return a default structure
        console.warn('Endpoint index not found, using sample data');
        return this.getDefaultIndex();
      }
      
      const data = await response.json() as IndexEntry;
      this.index = data;
      return data;
      
    } catch (error) {
      console.warn('Failed to load endpoint index:', error);
      return this.getDefaultIndex();
    } finally {
      this.loading = false;
    }
  }
  
  /**
   * Get a default index with sample endpoints for demonstration
   */
  private getDefaultIndex(): IndexEntry {
    const sampleEndpoints: EndpointSpec[] = [
      {
        method: 'GET',
        path: '/api/health',
        description: 'Health check endpoint',
        file: 'server/health.ts',
        line: 15,
        tags: ['health', 'api']
      },
      {
        method: 'POST',
        path: '/api/auth/login',
        description: 'User authentication endpoint',
        file: 'server/auth/login.ts',
        line: 23,
        tags: ['auth', 'api']
      },
      {
        method: 'GET',
        path: '/api/records',
        description: 'Fetch church records',
        file: 'server/../features/records/records/index.ts',
        line: 45,
        tags: ['records', 'api']
      },
      {
        method: 'POST',
        path: '/api/records',
        description: 'Create new church record',
        file: 'server/../features/records/records/create.ts',
        line: 12,
        tags: ['records', 'api']
      },
      {
        method: 'PUT',
        path: '/api/../features/records/records/:id',
        description: 'Update existing church record',
        file: 'server/../features/records/records/update.ts',
        line: 18,
        tags: ['records', 'api']
      },
      {
        method: 'DELETE',
        path: '/api/../features/records/records/:id',
        description: 'Delete church record',
        file: 'server/../features/records/records/delete.ts',
        line: 8,
        tags: ['records', 'api']
      },
      {
        method: 'GET',
        path: '/api/admin/users',
        description: 'List all users (admin only)',
        file: 'server/admin/users.ts',
        line: 32,
        tags: ['admin', 'users', 'api']
      },
      {
        method: 'GET',
        path: '/api/church/:id/members',
        description: 'Get church members',
        file: 'server/church/members.ts',
        line: 25,
        tags: ['church', 'api']
      }
    ];
    
    const methodBreakdown = sampleEndpoints.reduce((acc, endpoint) => {
      acc[endpoint.method] = (acc[endpoint.method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    this.index = {
      timestamp: new Date().toISOString(),
      endpoints: sampleEndpoints,
      stats: {
        totalEndpoints: sampleEndpoints.length,
        methodBreakdown,
        fileCount: new Set(sampleEndpoints.map(e => e.file)).size
      }
    };
    
    return this.index;
  }
  
  /**
   * Get all discovered endpoints
   */
  getDiscoveredEndpoints(): EndpointSpec[] {
    return this.index?.endpoints || [];
  }
  
  /**
   * Get endpoint statistics
   */
  getStats() {
    return this.index?.stats || {
      totalEndpoints: 0,
      methodBreakdown: {},
      fileCount: 0
    };
  }
}

// Create a singleton instance
export const endpointInspector = new EndpointInspector();
