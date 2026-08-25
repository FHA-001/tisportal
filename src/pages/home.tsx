import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabaseClient';
import { getCustomSession } from '@/lib/auth-utils';
import { LoadingScreen } from '@/components/shared/loading-screen';

export default function Home() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      // Check custom session first (Teacher/Student)
      const customSession = getCustomSession();
      if (customSession) {
        if (customSession.role === 'teacher') {
          setLocation('/teacher');
          return;
        }
        if (customSession.role === 'student') {
          setLocation('/student');
          return;
        }
      }

      // Check Admin session via Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setLocation('/admin');
        return;
      }

      // No active session found
      setLocation('/login');
    };

    checkAuthAndRedirect();
  }, [setLocation]);

  return <LoadingScreen />;
}
