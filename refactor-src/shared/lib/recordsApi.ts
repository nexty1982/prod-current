/**
 * Records API Service
 * Service for  funeral: {
    deathDate:      'deceased_date',  // was death_date
    funeralDate:    'burial_date',    // "Burial Date"
    firstName:      'first_name',
    lastName:       'last_name',
    age:            'age',
    burialLocation: 'burial_location',
    clergy:         'clergy',
  },ing with church records (baptism, marriage, funeral)
 */

export type TableKey = 'baptism' | 'marriage' | 'funeral';
export type SortDir = 'asc' | 'desc';

export interface ListRecordsParams {
  table: TableKey;
  churchId: number;
  page: number;
  limit: number;
  search?: string;
  sortField?: string;      // UI key, e.g. 'funeralDate'
  sortDirection?: SortDir; // 'asc' | 'desc'
  signal?: AbortSignal;
}

export interface ListRecordsResponse {
  rows: any[];
  count: number;
  church?: { id: number; name: string };
}

/** UI → API sort field map per table */
const FIELD_MAP: Record<TableKey, Record<string, string>> = {
  baptism: {
    baptismDate: 'reception_date',
    birthDate:   'birth_date',
    firstName:   'first_name',
    lastName:    'last_name',
  },
  marriage: {
    marriageDate:   'mdate',            // ← was marriage_date; must be mdate
    groomFirstName: 'groom_first_name',
    groomLastName:  'groom_last_name',
    brideFirstName: 'bride_first_name',
    brideLastName:  'bride_last_name',
    clergy:         'clergy',
  },
  funeral: {
    deathDate:      'death_date',
    funeralDate:    'burial_date',        // “Burial Date”
    firstName:      'first_name',
    lastName:       'last_name',
    age:            'age',
    burialLocation: 'burial_location',
    clergy:         'clergy',
  },
};

/** endpoint per table */
const ENDPOINT: Record<TableKey, string> = {
  baptism:  '/api/baptism-records',
  marriage: '/api/marriage-records',
  funeral:  '/api/funeral-records',
};

export const listRecords = async ({
  table,
  churchId,
  page,
  limit,
  search,
  sortField,
  sortDirection = 'desc',
  signal,
}: ListRecordsParams): Promise<ListRecordsResponse> => {
  // translate UI sort to API field
  const apiSort = sortField && FIELD_MAP[table]?.[sortField];

  const qp = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search?.trim()) qp.set('search', search.trim());

  // include both snake_case and camelCase to be backend-friendly
  if (apiSort) {
    qp.set('sort_field', apiSort);
    qp.set('sortField', apiSort);
    qp.set('sort_dir', sortDirection);
    qp.set('sortDirection', sortDirection);
  }

  // church filter, both variants
  if (churchId) {
    qp.set('church_id', String(churchId));
    qp.set('churchId', String(churchId));
  }

  const url = `${ENDPOINT[table]}?${qp.toString()}`;
  // eslint-disable-next-line no-console
  console.log(`[recordsApi] GET ${url}`);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal,
      credentials: 'include',
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status} ${txt}`);
    }

    const data = await res.json();

    // normalize to a stable shape for the UI
    const rows  = data?.records ?? data?.rows ?? data?.data ?? [];
    const count = data?.total   ?? data?.count ?? data?.totalCount ?? rows.length;
    const church =
      data?.church ??
      (churchId ? { id: churchId, name: data?.churchName || 'Unknown Church' } : undefined);

    // eslint-disable-next-line no-console
    console.log(`[recordsApi] ${table}: ${rows.length} rows, count=${count}`);
    return { rows, count, church };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[recordsApi] ${table} error`, err);
    // propagate AbortError; otherwise return empty so UI doesn’t crash
    if (err instanceof Error && err.name === 'AbortError') throw err;
    return { rows: [], count: 0, church: churchId ? { id: churchId, name: 'Unknown Church' } : undefined };
  }
};

export default { listRecords };
