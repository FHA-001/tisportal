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
      const session = getCustomSession();

      if (session && session.role === role && !isSessionExpired()) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      // Students intentionally remain on the existing custom username
      // authentication system. There is no Supabase Auth fallback for them.
      if (role === 'student') {
        if (!cancelled) {
          toast.error('Your session has expired. Please log in again.');
          setLocation('/login');
        }
        return;
      }

      // Teacher / Accountant / Parent are now authenticated by Supabase Auth.
      // If their compatibility token expired or the page was reloaded, rebuild
      // it from the trusted auth.uid() -> profile link.
      const restored = await restorePortalSession(role);

      if (cancelled) return;

      if (restored.role === role) {
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
