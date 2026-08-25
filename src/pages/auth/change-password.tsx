import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { TISLogo } from '@/components/shared/tis-logo';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { getCustomSession, clearCustomSession, changePassword, validatePasswordStrength } from '@/lib/auth-utils';
import { CustomSession } from '@/lib/auth-utils';

export default function ChangePassword() {
  const [, setLocation] = useLocation();
  const session = getCustomSession();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Redirect if not logged in
  if (!session) {
    setLocation('/login');
    return null;
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Basic validation
    if (!currentPassword) {
      setErrors({ currentPassword: 'Current password is required' });
      return;
    }
    
    if (!newPassword) {
      setErrors({ newPassword: 'New password is required' });
      return;
    }
    
    if (!confirmPassword) {
      setErrors({ confirmPassword: 'Please confirm your password' });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }
    
    if (currentPassword === newPassword) {
      setErrors({ newPassword: 'New password must be different from current password' });
      return;
    }
    
    // Password strength validation
    const strengthValidation = validatePasswordStrength(newPassword);
    if (!strengthValidation.isValid) {
      setErrors({ newPassword: strengthValidation.errors[0] });
      return;
    }
    
    setIsLoading(true);
    
    const result = await changePassword(session.id, currentPassword, newPassword);
    
    setIsLoading(false);
    
    if (result.error) {
      if (result.error === 'invalid_password') {
        setErrors({ currentPassword: 'Current password is incorrect' });
      } else {
        toast.error(result.error);
      }
    } else {
      toast.success('Password changed successfully');
      
      // Update session to clear must_change_password flag
      const updatedSession = { ...session, must_change_password: false };
      localStorage.setItem('tis_session', JSON.stringify(updatedSession));
      
      // Redirect to appropriate dashboard
      switch (session.role) {
        case 'teacher':
          setLocation('/teacher');
          break;
        case 'student':
          setLocation('/student');
          break;
        case 'parent':
          setLocation('/parent');
          break;
        default:
          setLocation('/login');
      }
    }
  };

  const strengthValidation = validatePasswordStrength(newPassword);
  const isStrong = strengthValidation.isValid && newPassword.length > 0;

  const getDashboardPath = () => {
    switch (session.role) {
      case 'teacher': return '/teacher';
      case 'student': return '/student';
      case 'parent': return '/parent';
      default: return '/login';
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: "url('/school-background.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      <div className="w-full max-w-md z-10">
        <div className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-8 py-8 text-center bg-gradient-to-r from-navy-800 to-navy-900 relative">
            <div className="absolute top-4 right-4 text-white">
              <ThemeToggle />
            </div>
            <div className="flex justify-center mb-4">
              <TISLogo size="lg" />
            </div>
            <h1 className="text-xl font-heading font-bold text-white mb-1">Change Password</h1>
            <p className="text-navy-200 text-sm">
              {session.role === 'teacher' && 'Teacher Account'}
              {session.role === 'student' && 'Student Account'}
              {session.role === 'parent' && 'Parent Account'}
            </p>
          </div>

          <div className="p-6 md:p-8 flex-1">
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-300 mb-1">Password Change Required</p>
                  <p className="text-amber-700 dark:text-amber-400">For security reasons, you must change your password before continuing.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title={showCurrentPassword ? "Hide Password" : "Show Password"}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.currentPassword}
                  </p>
                )}
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title={showNewPassword ? "Hide Password" : "Show Password"}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.newPassword}
                  </p>
                )}
                {newPassword && !errors.newPassword && (
                  <div className="space-y-1">
                    {isStrong ? (
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Password is strong
                      </p>
                    ) : (
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>Password must contain:</p>
                        <ul className="list-disc list-inside space-y-0.5 ml-1">
                          <li className={/[A-Z]/.test(newPassword) ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                            At least one uppercase letter
                          </li>
                          <li className={/[a-z]/.test(newPassword) ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                            At least one lowercase letter
                          </li>
                          <li className={/[0-9]/.test(newPassword) ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                            At least one number
                          </li>
                          <li className={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                            At least one special character
                          </li>
                          <li className={newPassword.length >= 8 ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                            At least 8 characters
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title={showConfirmPassword ? "Hide Password" : "Show Password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.confirmPassword}
                  </p>
                )}
                {confirmPassword && !errors.confirmPassword && confirmPassword === newPassword && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Passwords match
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white mt-2" 
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change Password
              </Button>

              <div className="text-center pt-4">
                <Link 
                  href={getDashboardPath()}
                  className="text-sm text-primary hover:underline font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    clearCustomSession();
                    setLocation('/login');
                  }}
                >
                  Sign Out
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
