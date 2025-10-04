import { RefactorScan } from '@/types/refactorConsole';

class RefactorConsoleClient {
  private baseUrl = '/api/refactor-console';

  /**
   * Scan the codebase for refactoring analysis
   * @param rebuild - Whether to force a rebuild of the scan (ignore cache)
   * @returns Promise containing the scan results
   */
  async scan(rebuild: boolean = false): Promise<RefactorScan> {
    try {
      const params = new URLSearchParams();
      if (rebuild) {
        params.append('rebuild', '1');
      }

      const response = await fetch(`${this.baseUrl}/scan?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch refactor scan:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch scan data');
    }
  }

  /**
   * Check if cached scan data exists and is recent
   */
  async checkCacheStatus(): Promise<{ exists: boolean; age: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/scan`, {
        method: 'HEAD',
        credentials: 'include',
      });

      const age = response.status === 200 ? 0 : -1;
      return {
        exists: response.status === 200,
        age
      };
    } catch (error) {
      return { exists: false, age: -1 };
    }
  }
}

// Export singleton instance
export const refactorConsoleClient = new RefactorConsoleClient();
export default refactorConsoleClient;
