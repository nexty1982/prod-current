/**
 * useServerVersion Hook
 * Fetches server version information from the backend
 */

import { useState, useEffect, useCallback } from 'react';

export interface ServerVersion {
  version: string;
  gitSha: string;
  gitShaFull: string;
  buildTime: string;
  nodeVersion: string;
  environment: string;
  uptime: number;
}

interface UseServerVersionReturn {
  serverVersion: ServerVersion | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useServerVersion = (): UseServerVersionReturn => {
  const [serverVersion, setServerVersion] = useState<ServerVersion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchServerVersion = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/system/version', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch server version: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.server) {
        setServerVersion({
          version: data.server.version || 'unknown',
          gitSha: data.server.gitSha || 'unknown',
          gitShaFull: data.server.gitShaFull || 'unknown',
          buildTime: data.server.buildTime || new Date().toISOString(),
          nodeVersion: data.server.nodeVersion || 'unknown',
          environment: data.server.environment || 'unknown',
          uptime: data.server.uptime || 0,
        });
      } else {
        throw new Error('Invalid server version response');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch server version';
      setError(errorMessage);
      setServerVersion({
        version: 'unknown',
        gitSha: 'unknown',
        gitShaFull: 'unknown',
        buildTime: new Date().toISOString(),
        nodeVersion: 'unknown',
        environment: 'unknown',
        uptime: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServerVersion();
  }, [fetchServerVersion]);

  return {
    serverVersion,
    isLoading,
    error,
    refetch: fetchServerVersion,
  };
};

export default useServerVersion;
