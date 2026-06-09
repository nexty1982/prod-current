/**
 * Shared helpers for OCR Studio `?church=` URL param.
 * Canonical param is `church`; `church_id` is accepted as a legacy alias.
 */

export const OCR_STUDIO_CHURCH_PARAM = 'church';
export const OCR_STUDIO_CHURCH_PARAM_LEGACY = 'church_id';

export function readOcrStudioChurchId(
  searchParams: URLSearchParams,
  fallbackUserChurchId?: number | null,
): number | null {
  const raw =
    searchParams.get(OCR_STUDIO_CHURCH_PARAM) ||
    searchParams.get(OCR_STUDIO_CHURCH_PARAM_LEGACY);
  if (raw) {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return fallbackUserChurchId ?? null;
}

export function setOcrStudioChurchParam(
  setSearchParams: (
    next: URLSearchParams | ((prev: URLSearchParams) => URLSearchParams),
    opts?: { replace?: boolean },
  ) => void,
  churchId: number,
) {
  setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    next.set(OCR_STUDIO_CHURCH_PARAM, String(churchId));
    next.delete(OCR_STUDIO_CHURCH_PARAM_LEGACY);
    return next;
  }, { replace: true });
}

export type OcrStudioChurchLabelFields = {
  id: number;
  church_name?: string;
  name?: string;
  city?: string;
  state_province?: string;
  state_code?: string;
  state?: string;
  country?: string;
};

function formatOcrStudioChurchLocation(church: OcrStudioChurchLabelFields): string | null {
  const city = (church.city || '').trim();
  const state = (church.state_province || church.state_code || church.state || '').trim();
  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state) return state;
  const country = (church.country || '').trim();
  if (country && !['US', 'USA', 'United States'].includes(country)) return country;
  return null;
}

export function formatOcrStudioChurchLabel(church: OcrStudioChurchLabelFields): string {
  const parishName = church.church_name || church.name || `Church ${church.id}`;
  const location = formatOcrStudioChurchLocation(church);
  if (location) return `${parishName} — ${location} (#${church.id})`;
  return `${parishName} (#${church.id})`;
}

export function ocrStudioPathWithChurch(path: string, searchParams: URLSearchParams): string {
  const churchId = readOcrStudioChurchId(searchParams);
  if (!churchId) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}${OCR_STUDIO_CHURCH_PARAM}=${churchId}`;
}
