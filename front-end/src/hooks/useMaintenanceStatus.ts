import { useState, useEffect, useCallback } from 'react';

interface MaintenanceStatus {
  maintenance: boolean;
  status?: 'production' | 'updating' | 'frontend_only' | string;
  startTime?: string;
  message?: string;
}

export const useMaintenanceStatus = () => {
  const [isInMaintenance, setIsInMaintenance] = useState(false);
  const [maintenanceInfo, setMaintenanceInfo] = useState<MaintenanceStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const checkMaintenanceStatus = useCallback(async () => {
    if (isChecking) return;
    
    setIsChecking(true);
    try {
      const response = await fetch('/api/maintenance/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data: MaintenanceStatus = await response.json();
        setMaintenanceInfo(data);
        setIsInMaintenance(data.maintenance || false);
      } else {
        setIsInMaintenance(false);
        setMaintenanceInfo(null);
      }
    } catch (error) {
      setIsInMaintenance(false);
      setMaintenanceInfo(null);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking]);

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
        setIsInMaintenance(enable);
        await checkMaintenanceStatus();
      }
    } catch (error) {
      console.error('Failed to toggle maintenance mode:', error);
    } finally {
      setIsToggling(false);
    }
  }, [isToggling, checkMaintenanceStatus]);

  useEffect(() => {
    checkMaintenanceStatus();
    const interval = setInterval(checkMaintenanceStatus, 5000);
    return () => clearInterval(interval);
  }, [checkMaintenanceStatus]);

  return {
    isInMaintenance,
    maintenanceInfo,
    checkMaintenanceStatus,
    toggleMaintenanceMode,
    isToggling,
  };
};

