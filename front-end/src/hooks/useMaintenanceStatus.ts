import { useState, useEffect, useCallback } from 'react';

interface MaintenanceStatus {
  maintenance: boolean;
  status?: string;
  startTime?: string;
  message?: string;
}

export const useMaintenanceStatus = () => {
  const [isInMaintenance, setIsInMaintenance] = useState(false);
  const [maintenanceInfo, setMaintenanceInfo] = useState<MaintenanceStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);

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

  useEffect(() => {
    checkMaintenanceStatus();
    const interval = setInterval(checkMaintenanceStatus, 5000);
    return () => clearInterval(interval);
  }, [checkMaintenanceStatus]);

  return {
    isInMaintenance,
    maintenanceInfo,
    checkMaintenanceStatus,
  };
};
