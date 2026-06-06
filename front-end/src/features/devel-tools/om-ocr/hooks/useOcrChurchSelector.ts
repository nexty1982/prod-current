/**
 * useOcrChurchSelector — Shared hook for OCR Studio pages that need
 * a church selector.
 *
 * Reads/writes `?church=XX` in URL search params so the selection
 * persists across page navigation via OcrStudioNav.
 */

import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'react-router-dom';

export function useOcrChurchSelector() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const churchParam = searchParams.get('church');
  const selectedChurchId = churchParam
    ? Number(churchParam)
    : (user?.church_id ? Number(user.church_id) : null);

  return { selectedChurchId };
}
