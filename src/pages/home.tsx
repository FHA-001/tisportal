import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabaseClient';
import { getCustomSession } from '@/lib/auth-utils';
import { restorePortalSession } from '@/lib/portal-auth';
import { LoadingScreen } from '@/components/shared/loading-screen';

export default function Home() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    let cancelled = false;

    const go = (path: string) => {
      if (!cancelled) setLocation(path);
    };

    const checkAuthAndRedirect = async () => {
      // Preserve any currently valid custom session first. This keeps Student
      // authentication unchanged and also avoids disrupting a session that was
      // already open while the migration was deployed.
      const customSession = getCustomSession();

      if (customSession) {
        if (customSession.role === 'student') {
          go('/student');
          return;
        }

        if (customSession.role === 'teacher') {
          go('/teacher');
          return;
        }

        if (customSession.role === 'accountant') {
          go('/accountant');
          return;
        }

        if (customSession.role === 'parent') {
          go('/parent');
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        go('/login');
        return;
      }

      const restored = await restorePortalSession();

      if (restored.role === 'admin') {
        go('/admin');
        return;
      }

      if (restored.role === 'teacher') {
        go('/teacher');
        return;
      }

      if (restored.role === 'accountant') {
        go('/accountant');
        return;
      }

      if (restored.role === 'parent') {
        go('/parent');
        return;
      }

      await supabase.auth.signOut();
      go('/login');
    };

    void checkAuthAndRedirect();

    return () => {
      cancelled = true;
    };
  }, [setLocation]);

  return <LoadingScreen />;
}
