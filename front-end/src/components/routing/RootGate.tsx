import SiteFooter from '@/components/frontend-pages/shared/footer/SiteFooter';
import HpHeader from '@/components/frontend-pages/shared/header/HpHeader';
import { useAuth } from '@/context/AuthContext';
import { getPostLoginPath } from '@/utils/roles';
import { EditModeProvider } from '@/context/EditModeContext';
import { lazy, Suspense, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Homepage = lazy(() => import('@/features/pages/frontend-pages/Homepage'));

/**
 * RootGate — what `/` does for unauthenticated visitors.
 *
 * Unauthenticated users see the marketing Homepage immediately (wrapped in
 * the public HpHeader + SiteFooter), with no auth-check spinner. A first-time
 * visitor typing the apex URL lands on marketing copy, not the login screen.
 *
 * Authenticated users get role-based redirected to their dashboard via
 * useEffect (super_admin / admin → /admin/control-panel, everyone else → /portal).
 * They may briefly see the Homepage before the redirect fires; this matches
 * the standard SaaS pattern.
 *
 * Replaces SmartRedirect at `/`. SmartRedirect is still importable for any
 * other call site that needs the spinner-then-decide behavior.
 */
const RootGate = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const authenticated = auth?.authenticated ?? false;
  const user = auth?.user;

  useEffect(() => {
    if (!authenticated || !user) return;

    navigate(getPostLoginPath(user), { replace: true });
  }, [authenticated, user, navigate]);

  return (
    <div className="om-page-container">
      <HpHeader />
      <EditModeProvider>
        <Suspense fallback={null}>
          <Homepage />
        </Suspense>
      </EditModeProvider>
      <SiteFooter />
    </div>
  );
};

export default RootGate;
