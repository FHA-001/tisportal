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
      // Student: preserve custom session (no Supabase Auth)
      const customSession = getCustomSession();

      if (customSession && customSession.role === 'student') {
        go('/student');
        return;
      }

      // Migrated roles (admin/teacher/accountant/parent): use Supabase Auth + getPortalIdentity
      // Ignore any legacy custom sessions for these roles
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
        // Check must_change_password flag
        if (restored.must_change_password) {
          go('/change-password');
          return;
        }
        go('/teacher');
        return;
      }

      if (restored.role === 'accountant') {
        // Check must_change_password flag
        if (restored.must_change_password) {
          go('/change-password');
          return;
        }
        go('/accountant');
        return;
      }

      if (restored.role === 'parent') {
        // Check must_change_password flag
        if (restored.must_change_password) {
          go('/change-password');
          return;
        }
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
