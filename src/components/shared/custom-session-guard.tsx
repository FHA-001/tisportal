import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { getCustomSession, isSessionExpired } from '@/lib/auth-utils';
import { restorePortalSession } from '@/lib/portal-auth';
import { LoadingScreen } from './loading-screen';
import { toast } from 'sonner';

export function CustomSessionGuard({
  role,
  children,
}: {
  role: 'teacher' | 'student' | 'parent' | 'accountant';
  children: React.ReactNode;
}) {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      // Student mode: use custom session only
      if (role === 'student') {
        const session = getCustomSession();

        if (session && session.role === role && !isSessionExpired()) {
          if (!cancelled) setIsLoading(false);
          return;
        }

        // Students intentionally remain on the existing custom username
        // authentication system. There is no Supabase Auth fallback for them.
        if (!cancelled) {
          toast.error('Your session has expired. Please log in again.');
          setLocation('/login');
        }
        return;
      }

      // Migrated roles (teacher/accountant/parent): use Supabase Auth + getPortalIdentity
      // No custom session dependency
      const restored = await restorePortalSession(role);

      if (cancelled) return;

      if (restored.role === role) {
        // Check must_change_password flag from portal identity
        if (restored.must_change_password) {
          toast.info('Please change your temporary password to continue.');
          setLocation('/change-password');
          return;
        }

        setIsLoading(false);
        return;
      }

      toast.error('Your session has expired. Please log in again.');
      setLocation('/login');
    };

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, [role, setLocation]);

  if (isLoading) return <LoadingScreen />;

  return <>{children}</>;
}
