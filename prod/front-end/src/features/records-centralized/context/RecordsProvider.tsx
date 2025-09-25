import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getRecordsAPI } from '../api/recordsAutoClient';

type Ctx = {
  churchId: string;
  setChurchId: (v: string) => void;
  apiReady: boolean;
  api: Awaited<ReturnType<typeof getRecordsAPI>> | null;
};

const RecordsContext = createContext<Ctx | null>(null);

export function RecordsProvider({ children }: { children: React.ReactNode }) {
  const [churchId, setChurchId] = useState(() => 
    (import.meta.env.VITE_DEFAULT_CHURCH_ID as string) || '1'
  );
  const [api, setApi] = useState<Awaited<ReturnType<typeof getRecordsAPI>> | null>(null);
  const [apiReady, setApiReady] = useState(false);

  useEffect(() => {
    getRecordsAPI()
      .then(result => {
        setApi(result);
        setApiReady(true);
        console.log(`✅ Records API discovered: ${result.api.name} at ${result.base}`);
      })
      .catch(err => {
        console.error('❌ Failed to discover Records API:', err.message);
        setApiReady(false);
      });
  }, []);

  const value = useMemo(() => ({
    churchId,
    setChurchId,
    apiReady,
    api
  }), [churchId, apiReady, api]);

  return (
    <RecordsContext.Provider value={value}>
      {children}
    </RecordsContext.Provider>
  );
}

export function useRecords() {
  const ctx = useContext(RecordsContext);
  if (!ctx) throw new Error('useRecords must be used within RecordsProvider');
  return ctx;
}