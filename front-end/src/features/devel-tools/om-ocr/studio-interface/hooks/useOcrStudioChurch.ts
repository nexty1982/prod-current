import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import churchService from '@/shared/lib/churchService';
import { useOcrChurchSelector } from '../../hooks/useOcrChurchSelector';
import { formatOcrStudioChurchLabel } from '../../utils/ocrStudioChurch';

export function useOcrStudioChurch() {
  const { user } = useAuth();
  const { selectedChurchId } = useOcrChurchSelector();
  const churchId = selectedChurchId ?? (user?.church_id ? Number(user.church_id) : null);

  const [churchLabel, setChurchLabel] = useState<string>('');

  useEffect(() => {
    if (!churchId) {
      setChurchLabel('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const churches = await churchService.fetchChurches();
        const match = churches.find((c) => c.id === churchId);
        if (!cancelled) {
          setChurchLabel(match ? formatOcrStudioChurchLabel(match) : `Church #${churchId}`);
        }
      } catch {
        if (!cancelled) setChurchLabel(`Church #${churchId}`);
      }
    })();
    return () => { cancelled = true; };
  }, [churchId]);

  return { churchId, churchLabel };
}
