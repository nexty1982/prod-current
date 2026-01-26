import { RefactorScan } from '@/types/refactorConsole';

class RefactorConsoleClient {
  private baseUrl = '/api/refactor-console';

  /**
   * Scan the codebase for refactoring analysis
   * @param rebuild - Whether to force a rebuild of the scan (ignore cache)
   * @param compareWithBackup - Whether to perform gap analysis with September 2025 backup
   * @returns Promise containing the scan results
   */
  async scan(rebuild: boolean = false, compareWithBackup: boolean = false): Promise<RefactorScan> {
    try {
      const params = new URLSearchParams();
      if (rebuild) {
        params.append('rebuild', '1');
      }
      if (compareWithBackup) {
        params.append('compareWithBackup', '1');
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
   * Restore a file from the September 2025 backup
   * @param relPath - Relative path of the file to restore
   * @returns Promise containing restore result
   */
  async restore(relPath: string): Promise<{ success: boolean; message: string; restoredPath: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ relPath }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to restore file:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to restore file');
    }
  }

  /**
   * Helper to safely parse JSON or text response
   */
  private async safeParseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      try {
        return await response.json();
      } catch (e) {
        // Fallback to text if JSON parsing fails
        const text = await response.text();
        throw new Error(`Invalid JSON response: ${text.substring(0, 200)}`);
      }
    } else {
      // Non-JSON response (likely HTML error page)
      const text = await response.text();
      throw new Error(`Non-JSON response (${contentType}): ${text.substring(0, 500)}`);
    }
  }

  /**
   * Start Phase 1: Discovery & Gap Analysis (background job)
   * @returns Promise containing jobId
   */
  async startPhase1Analysis(): Promise<{ ok: boolean; jobId: string; status: string; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/phase1/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await this.safeParseResponse(response);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await this.safeParseResponse(response);
      return data;
    } catch (error) {
      console.error('Failed to start Phase 1 analysis:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to start Phase 1 analysis');
    }
  }

  /**
   * Get Phase 1 job status
   * @param jobId - Job ID to check
   * @returns Promise containing job status
   */
  async getPhase1JobStatus(jobId: string): Promise<{
    ok: boolean;
    jobId: string;
    status: 'queued' | 'running' | 'done' | 'error';
    progress: number;
    currentStep: string;
    error: string | null;
    startedAt: number | null;
    finishedAt: number | null;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await this.safeParseResponse(response);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await this.safeParseResponse(response);
      return data;
    } catch (error) {
      console.error(`Failed to get Phase 1 job ${jobId} status:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get Phase 1 job status');
    }
  }

  /**
   * Get Phase 1 job result
   * @param jobId - Job ID to fetch result for
   * @returns Promise containing Phase 1 report
   */
  async getPhase1JobResult(jobId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/${jobId}/result`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.status === 409) {
        // Job not ready yet
        const data = await this.safeParseResponse(response);
        throw new Error(`Job not ready: ${data.status} (${data.progress}%)`);
      }

      if (!response.ok) {
        const errorData = await this.safeParseResponse(response);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await this.safeParseResponse(response);
      return data;
    } catch (error) {
      console.error(`Failed to get Phase 1 job ${jobId} result:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get Phase 1 job result');
    }
  }

  /**
   * Restore a bundle of files from backup
   * @param bundleRequest - Bundle restoration request
   * @returns Promise containing restore result
   */
  async restoreBundle(bundleRequest: {
    bundleFiles: string[];
    routePath?: string;
    menuLabel?: string;
    menuIcon?: string;
  }): Promise<{ success: boolean; message: string; restoredFiles: string[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/restore-bundle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(bundleRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to restore bundle:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to restore bundle');
    }
  }

  /**
   * Health check endpoint - verify API is reachable
   * @returns Promise containing health status
   */
  async healthCheck(): Promise<{ ok: boolean; service: string; ts: string; uptimeSec?: number; status?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      // Normalize response - server returns {ok: true, service: string, ts: string}
      return {
        ...data,
        status: data.ok ? 'ok' : 'error'
      };
    } catch (error) {
      console.error('Health check error:', error);
      throw new Error(error instanceof Error ? error.message : 'Health check failed');
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
