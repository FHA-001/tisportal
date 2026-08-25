import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { resetPasswordWithToken } from '@/lib/auth-utils';
import { Loader2 } from 'lucide-react';
import { TISLogo } from '@/components/shared/tis-logo';

export default function ResetCustomPassword() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');
  const roleParam = searchParams.get('role');
  
  const role = roleParam === 'teacher' || roleParam === 'student' || roleParam === 'parent' ? roleParam : null;

  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!token || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card p-8 rounded-xl border border-border shadow-lg text-center">
          <h2 className="text-xl font-bold mb-4">Invalid Reset Link</h2>
          <p className="text-muted-foreground mb-6">This password reset link is invalid or missing required parameters.</p>
          <Button onClick={() => setLocation('/login')} className="w-full">Return to Login</Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    const { success, error } = await resetPasswordWithToken(role, token, password);
    setIsLoading(false);

    if (error) {
      toast.error(error);
    } else if (success) {
      toast.success('Password reset successful! You can now log in.');
      setLocation('/login');
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
        <div className="px-8 py-8 text-center bg-gradient-to-r from-navy-800 to-navy-900 border-b border-border/50">
          <div className="flex justify-center mb-4">
            <TISLogo size="lg" />
          </div>
          <h1 className="text-xl font-heading font-bold text-white mb-2">Set New Password</h1>
          <p className="text-navy-100 text-sm">Enter a new password for your {role} account.</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="At least 6 characters"
                className="h-11"
              />
            </div>
            
            <Button type="submit" className="w-full h-11 bg-navy-700 hover:bg-navy-800 text-white" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
