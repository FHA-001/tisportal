import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { getCustomSession, isSessionExpired } from '@/lib/auth-utils';
import { LoadingScreen } from './loading-screen';
import { toast } from 'sonner';

export function CustomSessionGuard({ role, children }: { role: 'teacher' | 'student' | 'parent' | 'accountant', children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = getCustomSession();
    
    if (!session || session.role !== role) {
      setLocation('/login');
    } else if (isSessionExpired()) {
      toast.error('Your session has expired. Please log in again.');
      setLocation('/login');
    } else {
      setIsLoading(false);
    }
  }, [role, setLocation]);

  if (isLoading) return <LoadingScreen />;

  return <>{children}</>;
}
