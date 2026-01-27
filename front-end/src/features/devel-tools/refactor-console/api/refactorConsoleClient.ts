import { 
  RefactorScan, 
  Snapshot, 
  SourceType,
  PreviewRestoreResponse,
  RestoreHistoryResponse,
  RestoreHistoryEntry,
  RestoreHistoryStats
} from '@/types/refactorConsole';

// ============================================================================
// Path Configuration Interface
// ============================================================================
export interface PathConfig {
  sourcePath: string;
  destinationPath: string;
  backupPath?: string;
  sourceType?: SourceType;
  snapshotId?: string;
}

// Default paths
export const DEFAULT_PATH_CONFIG: PathConfig = {
  sourcePath: '/var/www/orthodoxmetrics/prod/refactor-src/',
  destinationPath: '/var/www/orthodoxmetrics/prod/front-end/src/',
  backupPath: '/var/www/orthodoxmetrics/backup'
};

// LocalStorage key for path configuration
const PATHS_STORAGE_KEY = 'refactor-console-paths';

class RefactorConsoleClient {
  private baseUrl = '/api/refactor-console';

  // ============================================================================
  // Path Configuration Management
  // ============================================================================
  
  /**
   * Get saved path configuration from localStorage
   */
  getSavedPaths(): PathConfig {
    try {
      const saved = localStorage.getItem(PATHS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          sourcePath: parsed.sourcePath || DEFAULT_PATH_CONFIG.sourcePath,
          destinationPath: parsed.destinationPath || DEFAULT_PATH_CONFIG.destinationPath,
          backupPath: parsed.backupPath || DEFAULT_PATH_CONFIG.backupPath
        };
      }
    } catch (e) {
      console.warn('Failed to parse saved path config:', e);
    }
    return { ...DEFAULT_PATH_CONFIG };
  }

  /**
   * Save path configuration to localStorage
   */
  savePaths(config: Partial<PathConfig>): void {
    try {
      const current = this.getSavedPaths();
      const updated = {
        ...current,
        ...config
      };
      localStorage.setItem(PATHS_STORAGE_KEY, JSON.stringify(updated));
      console.log('[RefactorConsole] Paths saved:', updated);
    } catch (e) {
      console.error('Failed to save path config:', e);
    }
  }

  /**
   * Clear saved path configuration (reset to defaults)
   */
  clearSavedPaths(): void {
    localStorage.removeItem(PATHS_STORAGE_KEY);
    console.log('[RefactorConsole] Paths reset to defaults');
  }

  /**
   * Get default path configuration from server
   */
  async getDefaultPaths(): Promise<{
    ok: boolean;
    defaults: PathConfig & { projectRoot: string };
    allowedBasePath: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/config/paths`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get default paths:', error);
      throw error;
    }
  }

  /**
   * Validate paths on the server
   */
  async validatePaths(config: Partial<PathConfig>): Promise<{
    ok: boolean;
    validations: Record<string, {
      input: string;
      isValid: boolean;
      sanitized: string;
      error?: string;
      exists: boolean;
    }>;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/config/validate-paths`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to validate paths:', error);
      throw error;
    }
  }

  // ============================================================================
  // Snapshot Discovery
  // ============================================================================
  
  /**
   * Fetch available snapshots from the source directory
   * @param sourceType - Type of source ('local' or 'remote')
   * @param sourcePath - Optional custom source path
   * @returns Promise containing list of available snapshots
   */
  async fetchSnapshots(
    sourceType: SourceType = 'local',
    sourcePath?: string
  ): Promise<{
    ok: boolean;
    sourceType: SourceType;
    basePath: string;
    snapshots: Snapshot[];
    defaultSnapshot: Snapshot | null;
    stats: {
      total: number;
      valid: number;
      invalid: number;
      oldest: Snapshot | null;
      newest: Snapshot | null;
      yearCounts: Record<number, number>;
    };
  }> {
    try {
      const params = new URLSearchParams();
      params.append('sourceType', sourceType);
      if (sourcePath) {
        params.append('sourcePath', sourcePath);
      }

      const response = await fetch(`${this.baseUrl}/snapshots?${params}`, {
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
      console.error('Failed to fetch snapshots:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch snapshots');
    }
  }

  // ============================================================================
  // Scan Endpoint (with dynamic path support)
  // ============================================================================
  
  /**
   * Scan the codebase for refactoring analysis
   * @param rebuild - Whether to force a rebuild of the scan (ignore cache)
   * @param compareWithBackup - Whether to perform gap analysis with backup
   * @param pathConfig - Optional custom path configuration
   * @param sourceType - Source type ('local' or 'remote')
   * @param snapshotId - Optional snapshot ID (e.g., '09-2025')
   * @returns Promise containing the scan results
   */
  async scan(
    rebuild: boolean = false, 
    compareWithBackup: boolean = false,
    pathConfig?: Partial<PathConfig>,
    sourceType?: SourceType,
    snapshotId?: string
  ): Promise<RefactorScan> {
    try {
      const params = new URLSearchParams();
      if (rebuild) {
        params.append('rebuild', '1');
      }
      if (compareWithBackup) {
        params.append('compareWithBackup', '1');
      }
      
      // Use saved paths if no custom config provided
      const paths = pathConfig || this.getSavedPaths();
      
      // Add sourceType and snapshotId
      const actualSourceType = sourceType || paths.sourceType || 'local';
      const actualSnapshotId = snapshotId || paths.snapshotId;
      
      params.append('sourceType', actualSourceType);
      if (actualSnapshotId) {
        params.append('snapshotId', actualSnapshotId);
      }
      
      if (paths.sourcePath) {
        params.append('sourcePath', paths.sourcePath);
      }
      if (paths.destinationPath) {
        params.append('destinationPath', paths.destinationPath);
      }
      if (paths.backupPath) {
        params.append('backupPath', paths.backupPath);
      }

      const response = await fetch(`${this.baseUrl}/scan?${params}`, {
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
      console.error('Failed to fetch refactor scan:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch scan data');
    }
  }

  /**
   * Preview restore (dry run) - get diff and dependency check before restoring
   * @param relPath - Relative path of the file to preview
   * @param pathConfig - Optional custom path configuration
   * @param sourceType - Source type ('local' or 'remote')
   * @param snapshotId - Optional snapshot ID (e.g., '09-2025')
   * @returns Promise containing preview with diff and dependencies
   */
  async previewRestore(
    relPath: string,
    pathConfig?: Partial<PathConfig>,
    sourceType?: SourceType,
    snapshotId?: string
  ): Promise<PreviewRestoreResponse> {
    try {
      // Use saved paths if no custom config provided
      const paths = pathConfig || this.getSavedPaths();
      
      // Use provided sourceType/snapshotId or fall back to saved values
      const actualSourceType = sourceType || paths.sourceType || 'local';
      const actualSnapshotId = snapshotId || paths.snapshotId;
      
      const response = await fetch(`${this.baseUrl}/preview-restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          relPath,
          sourcePath: paths.sourcePath || paths.backupPath,
          destinationPath: paths.destinationPath,
          sourceType: actualSourceType,
          snapshotId: actualSnapshotId
        }),
      });

      if (!response.ok) {
        const errorData = await this.safeParseResponse(response);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await this.safeParseResponse(response);
      return data;
    } catch (error) {
      console.error('Failed to preview restore:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to preview restore');
    }
  }

  /**
   * Restore a file from the source to destination
   * @param relPath - Relative path of the file to restore
   * @param pathConfig - Optional custom path configuration
   * @param sourceType - Source type ('local' or 'remote')
   * @param snapshotId - Optional snapshot ID (e.g., '09-2025')
   * @returns Promise containing restore result
   */
  async restore(
    relPath: string,
    pathConfig?: Partial<PathConfig>,
    sourceType?: SourceType,
    snapshotId?: string
  ): Promise<{ 
    success: boolean; 
    message: string; 
    sourcePath: string; 
    restoredPath: string;
    sourceType?: SourceType;
    snapshotId?: string | null;
  }> {
    try {
      // Use saved paths if no custom config provided
      const paths = pathConfig || this.getSavedPaths();
      
      // Use provided sourceType/snapshotId or fall back to saved values
      const actualSourceType = sourceType || paths.sourceType || 'local';
      const actualSnapshotId = snapshotId || paths.snapshotId;
      
      const response = await fetch(`${this.baseUrl}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          relPath,
          sourcePath: paths.sourcePath || paths.backupPath,
          destinationPath: paths.destinationPath,
          sourceType: actualSourceType,
          snapshotId: actualSnapshotId
        }),
      });

      if (!response.ok) {
        const errorData = await this.safeParseResponse(response);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await this.safeParseResponse(response);
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

  // ============================================================================
  // Restore History Endpoints
  // ============================================================================
  
  /**
   * Get restore history with pagination
   * @param limit - Number of entries to return
   * @param offset - Offset for pagination
   * @returns Promise containing restore history
   */
  async getRestoreHistory(
    limit: number = 50,
    offset: number = 0
  ): Promise<RestoreHistoryResponse> {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(`${this.baseUrl}/restore-history?${params}`, {
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
      console.error('Failed to get restore history:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get restore history');
    }
  }

  /**
   * Get restore history for a specific file
   * @param relPath - Relative path of the file
   * @returns Promise containing file restore history
   */
  async getFileRestoreHistory(relPath: string): Promise<{
    ok: boolean;
    relPath: string;
    count: number;
    entries: RestoreHistoryEntry[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/restore-history/file/${relPath}`, {
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
      console.error('Failed to get file restore history:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get file restore history');
    }
  }

  /**
   * Get restore statistics
   * @returns Promise containing restore statistics
   */
  async getRestoreHistoryStats(): Promise<{
    ok: boolean;
    stats: RestoreHistoryStats;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/restore-history/stats`, {
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
      console.error('Failed to get restore history stats:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get restore history stats');
    }
  }

  /**
   * Export restore history to CSV
   * @param limit - Number of entries to export
   * @returns Promise that triggers CSV download
   */
  async exportRestoreHistory(limit: number = 1000): Promise<void> {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());

      const url = `${this.baseUrl}/restore-history/export?${params}`;
      
      // Trigger download by opening in new window/tab
      window.open(url, '_blank');
    } catch (error) {
      console.error('Failed to export restore history:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to export restore history');
    }
  }
}

// Export singleton instance
export const refactorConsoleClient = new RefactorConsoleClient();
export default refactorConsoleClient;
