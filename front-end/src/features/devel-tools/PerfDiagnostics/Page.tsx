import { useEffect, useMemo, useState } from 'react';
export default function PerfDiagnostics(){
  const [m,setM]=useState<any>({});
  useEffect(()=>{ setM({
    ua: navigator.userAgent,
    mem: (performance as any).memory || {},
    timing: performance.timing || {},
    nav: performance.getEntriesByType?.('navigation')?.[0] || null,
    paint: performance.getEntriesByType?.('paint') || [],
    now: Date.now()
  }) },[]);
  const kb=(n:number)=> (Math.round(n/1024)+' KB');
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Performance Diagnostics</h1>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <pre className="rounded-2xl border bg-white p-4 shadow-sm overflow-auto text-xs">{JSON.stringify(m,null,2)}</pre>
        <div className="rounded-2xl border bg-white p-4 shadow-sm text-sm space-y-2">
          <div>Build time: {import.meta.env.BUILD_TIME || 'N/A'}</div>
          <div>Commit: {import.meta.env.BUILD_SHA?.slice(0,7) || 'N/A'}</div>
          <div>Mode: {import.meta.env.MODE}</div>
          <div>Has Sentry: {String(!!import.meta.env.VITE_SENTRY_DSN)}</div>
        </div>
      </div>
    </div>
  );
}
