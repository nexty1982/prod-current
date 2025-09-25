// Tries common OrthodoxMetrics endpoint shapes, normalizes to one interface.
type RowsArgs = { churchId: string; table: string; limit?: number; offset?: number; q?: string; orderBy?: string; orderDir?: 'ASC'|'DESC' };

type RecordsAPI = {
  name: string;                                   // which shape matched
  listTables(churchId: string): Promise<string[]>;
  listColumns(churchId: string, table: string): Promise<string[]>;
  listRows(args: RowsArgs): Promise<{ rows: any[]; total: number }>;
  getMapping?(churchId: string, table: string): Promise<any>;
};

async function safeJson(response: Response) {
  if (!response.ok) console.log(`${response.url} -> ${response.status}`);
  return response.json();
}

// Candidate shapes your backend might already expose:
function candidates(apiBase: string): RecordsAPI[] {
  return [
    // A) Nick's newer module style
    {
      name: 'records.v2',
      async listTables(churchId) {
        const j = await safeJson(await fetch(`${apiBase}/records/${churchId}/tables`));
        return j.tables ?? j.data ?? [];
      },
      async listColumns(churchId, table) {
        const j = await safeJson(await fetch(`${apiBase}/records/${churchId}/tables/${table}/columns`));
        return j.columns ?? j.data ?? [];
      },
      async listRows({ churchId, table, limit=50, offset=0, q='', orderBy='id', orderDir='DESC' }) {
        const u = new URL(`${apiBase}/records/${churchId}/tables/${table}/rows`, location.origin);
        u.searchParams.set('limit', String(limit));
        u.searchParams.set('offset', String(offset));
        if (q) u.searchParams.set('q', q);
        u.searchParams.set('orderBy', orderBy);
        u.searchParams.set('orderDir', orderDir);
        const j = await safeJson(await fetch(u.toString().replace(location.origin, '')));
        return { rows: j.rows ?? j.data ?? [], total: j.total ?? j.count ?? 0 };
      },
      async getMapping(churchId, table) {
        const r = await fetch(`${apiBase}/records/${churchId}/tables/${table}/mapping`);
        if (!r.ok) return null;
        const j = await r.json().catch(() => null);
        return j?.mapping ?? null;
      }
    },

    // B) Legacy style e.g. /api/church/:id/records
    {
      name: 'records.legacy',
      async listTables(churchId) {
        const j = await safeJson(await fetch(`${apiBase}/church/${churchId}/records/tables`));
        return j.tables ?? [];
      },
      async listColumns(churchId, table) {
        const j = await safeJson(await fetch(`${apiBase}/church/${churchId}/records/${table}/columns`));
        return j.columns ?? [];
      },
      async listRows({ churchId, table, limit=50, offset=0, q='', orderBy='id', orderDir='DESC' }) {
        const u = new URL(`${apiBase}/church/${churchId}/records/${table}/rows`, location.origin);
        u.searchParams.set('limit', String(limit));
        u.searchParams.set('offset', String(offset));
        if (q) u.searchParams.set('q', q);
        u.searchParams.set('orderBy', orderBy);
        u.searchParams.set('orderDir', orderDir);
        const j = await safeJson(await fetch(u.toString().replace(location.origin, '')));
        return { rows: j.rows ?? [], total: j.total ?? 0 };
      }
    },

    // C) Super-legacy: flat endpoints
    {
      name: 'records.flat',
      async listTables(churchId) {
        const j = await safeJson(await fetch(`${apiBase}/records?churchId=${churchId}&op=listTables`));
        return j.tables ?? j.data ?? [];
      },
      async listColumns(churchId, table) {
        const j = await safeJson(await fetch(`${apiBase}/records?churchId=${churchId}&op=listColumns&table=${encodeURIComponent(table)}`));
        return j.columns ?? j.data ?? [];
      },
      async listRows({ churchId, table, limit=50, offset=0, q='', orderBy='id', orderDir='DESC' }) {
        const u = new URL(`${apiBase}/records`, location.origin);
        u.searchParams.set('churchId', churchId);
        u.searchParams.set('op', 'listRows');
        u.searchParams.set('table', table);
        u.searchParams.set('limit', String(limit));
        u.searchParams.set('offset', String(offset));
        if (q) u.searchParams.set('q', q);
        u.searchParams.set('orderBy', orderBy);
        u.searchParams.set('orderDir', orderDir);
        const j = await safeJson(await fetch(u.toString().replace(location.origin, '')));
        return { rows: j.rows ?? j.data ?? [], total: j.total ?? 0 };
      }
    }
  ];
}

let cached: { api: RecordsAPI; base: string } | null = null;

export async function getRecordsAPI() {
  if (cached) return cached;

  const bases = [
    (import.meta.env.VITE_API_BASE as string) || '/api', // preferred
    '/api',
    ''                                                    // same origin proxy
  ];

  for (const base of bases) {
    for (const c of candidates(base)) {
      try {
        // Probe with a benign call using a placeholder churchId if available via env
        const probeChurch = (import.meta.env.VITE_DEFAULT_CHURCH_ID as string) || '1';
        await c.listTables(probeChurch);
        cached = { api: c, base };
        return cached;
      } catch {
        // try next candidate
      }
    }
  }
  throw new Error('No matching Records API shape discovered');
}