import { useState, useEffect, useCallback, useRef } from 'react';

interface MaintenanceStatus {
  maintenance: boolean;
  status?: 'production' | 'updating' | 'frontend_only' | string;
  startTime?: string;
  message?: string;
}

// Poll every 60 seconds to reduce server load
const POLL_INTERVAL = 60000;

// Singleton to prevent multiple polling instances
let globalPollingStarted = false;
let globalMaintenanceState: MaintenanceStatus | null = null;
let globalListeners: Set<(state: MaintenanceStatus | null) => void> = new Set();

const notifyListeners = () => {
  globalListeners.forEach(listener => listener(globalMaintenanceState));
};

const startGlobalPolling = async () => {
  if (globalPollingStarted) return;
  globalPollingStarted = true;
  
  const poll = async () => {
    try {
      const response = await fetch('/api/maintenance/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        globalMaintenanceState = await response.json();
      } else {
        globalMaintenanceState = null;
        // Endpoint doesn't exist (404) — stop polling to avoid log spam
        return false;
      }
    } catch {
      globalMaintenanceState = null;
      return false;
    }
    notifyListeners();
    return true;
  };

  // Initial poll — only start interval if the endpoint actually exists
  const endpointExists = await poll();
  notifyListeners();

  if (endpointExists) {
    setInterval(poll, POLL_INTERVAL);
  }
};

export const useMaintenanceStatus = () => {
  const [maintenanceInfo, setMaintenanceInfo] = useState<MaintenanceStatus | null>(globalMaintenanceState);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    // Subscribe to updates
    const listener = (state: MaintenanceStatus | null) => setMaintenanceInfo(state);
    globalListeners.add(listener);
    
    // Start global polling (only happens once)
    startGlobalPolling();
    
    return () => {
      globalListeners.delete(listener);
    };
  }, []);

  const checkMaintenanceStatus = useCallback(async () => {
    // Manual refresh - just trigger a poll
    try {
      const response = await fetch('/api/maintenance/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        globalMaintenanceState = data;
        notifyListeners();
      }
    } catch {
      // Ignore errors on manual refresh
    }
  }, []);

  const toggleMaintenanceMode = useCallback(async (enable: boolean) => {
    if (isToggling) return;
    
    setIsToggling(true);
    try {
      const response = await fetch('/api/maintenance/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenance: enable }),
      });

      if (response.ok) {
        await checkMaintenanceStatus();
      }
    } catch (error) {
      console.error('Failed to toggle maintenance mode:', error);
    } finally {
      setIsToggling(false);
    }
  }, [isToggling, checkMaintenanceStatus]);

  return {
    isInMaintenance: maintenanceInfo?.maintenance || false,
    maintenanceInfo,
    checkMaintenanceStatus,
    toggleMaintenanceMode,
    isToggling,
  };
};
