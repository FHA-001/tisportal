import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabaseClient';
import { LoadingScreen } from './loading-screen';
import { toast } from 'sonner';

const ADMIN_SESSION_TIMEOUT_MINUTES = 30;
const ADMIN_SESSION_KEY = 'admin_session_timestamp';

export function ProtectedRoute({ children, requiredRole = 'admin' }: { children: React.ReactNode, requiredRole?: 'admin' | 'teacher' | 'student' | 'parent' }) {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLocation('/login');
        return;
      }

      // Check user role from user metadata
      const userRole = session.user?.user_metadata?.role;
      
      // For admin routes, verify the user has admin role
      if (requiredRole === 'admin' && userRole !== 'admin') {
        toast.error('Access denied. Admin access required.');
        setLocation('/login');
        return;
      }

      // Check admin session timeout
      const timestamp = localStorage.getItem(ADMIN_SESSION_KEY);
      if (timestamp) {
        const sessionTime = parseInt(timestamp, 10);
        const currentTime = Date.now();
        const elapsedMinutes = (currentTime - sessionTime) / (1000 * 60);

        if (elapsedMinutes > ADMIN_SESSION_TIMEOUT_MINUTES) {
          await supabase.auth.signOut();
          localStorage.removeItem(ADMIN_SESSION_KEY);
          toast.error('Your session has expired. Please log in again.');
          setLocation('/login');
          return;
        }
      }

      // Update timestamp on session access
      localStorage.setItem(ADMIN_SESSION_KEY, Date.now().toString());
      setIsLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setLocation('/login');
      } else if (_event === 'SIGNED_IN') {
        localStorage.setItem(ADMIN_SESSION_KEY, Date.now().toString());
      }
    });

    return () => subscription.unsubscribe();
  }, [setLocation, requiredRole]);

  if (isLoading) return <LoadingScreen />;

  return <>{children}</>;
}
