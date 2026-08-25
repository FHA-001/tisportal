import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, AlertTriangle, Lock } from 'lucide-react';
import { useLocation, Link } from 'wouter';
import { toast } from 'sonner';
import { SCHOOL_CONFIG } from '@/lib/app-config';

import { TISLogo } from '@/components/shared/tis-logo';
import { ThemeToggle } from '@/components/shared/theme-toggle';

import { loginTeacher, loginStudent, loginParent } from '@/lib/auth-utils';
import { supabase } from '@/lib/supabaseClient';
import {
  isRateLimited,
  recordFailedAttempt,
  recordSuccessfulAttempt,
  getRemainingAttempts,
  getLockoutRemainingTime,
  formatLockoutTime
} from '@/lib/rate-limiter';

export default function Login() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('staff');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [studentUsername, setStudentUsername] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPassword, setParentPassword] = useState('');

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const identifier = `staff_${staffEmail}`;
    if (isRateLimited(identifier)) {
      const lockoutTime = getLockoutRemainingTime(identifier);
      setErrorMsg(`Too many failed attempts. Please try again in ${formatLockoutTime(lockoutTime)}`);
      return;
    }
    
    setIsLoading(true);
    setErrorMsg('');
    
    // First try teacher login (custom RPC)
    const teacherResult = await loginTeacher(staffEmail, staffPassword);
    
    if (teacherResult.session) {
      // Teacher login successful
      recordSuccessfulAttempt(identifier);
      toast.success(`Welcome back, ${teacherResult.session.full_name}`);
      if (teacherResult.session.must_change_password) {
        setLocation('/change-password');
      } else {
        // Route based on role
        if (teacherResult.session.role === 'accountant') {
          setLocation('/accountant');
        } else {
          setLocation('/teacher');
        }
      }
      setIsLoading(false);
      return;
    }
    
    // If teacher login failed, try admin login (Supabase Auth)
    const adminResult = await supabase.auth.signInWithPassword({
      email: staffEmail,
      password: staffPassword,
    });
    
    setIsLoading(false);
    
    if (adminResult.error) {
      // All auth methods failed
      const attempts = recordFailedAttempt(identifier);
      const remaining = getRemainingAttempts(identifier);
      if (remaining > 0) {
        setErrorMsg(`Invalid credentials. ${remaining} attempts remaining.`);
      } else {
        setErrorMsg(`Too many failed attempts. Account locked for 15 minutes.`);
      }
    } else {
      // Admin login successful
      recordSuccessfulAttempt(identifier);
      toast.success('Welcome back');
      setLocation('/admin');
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const identifier = `student_${studentUsername}`;
    if (isRateLimited(identifier)) {
      const lockoutTime = getLockoutRemainingTime(identifier);
      setErrorMsg(`Too many failed attempts. Please try again in ${formatLockoutTime(lockoutTime)}`);
      return;
    }
    
    setIsLoading(true);
    setErrorMsg('');
    const { session, error } = await loginStudent(studentUsername, studentPassword);
    setIsLoading(false);
    
    if (error) {
      const attempts = recordFailedAttempt(identifier);
      const remaining = getRemainingAttempts(identifier);
      if (remaining > 0) {
        setErrorMsg(`${error}. ${remaining} attempts remaining.`);
      } else {
        setErrorMsg(`Too many failed attempts. Account locked for 15 minutes.`);
      }
    } else if (session) {
      recordSuccessfulAttempt(identifier);
      toast.success(`Welcome back, ${session.full_name}`);
      if (session.must_change_password) {
        setLocation('/change-password');
      } else {
        setLocation('/student');
      }
    }
  };

  const handleParentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const identifier = `parent_${parentEmail}`;
    if (isRateLimited(identifier)) {
      const lockoutTime = getLockoutRemainingTime(identifier);
      setErrorMsg(`Too many failed attempts. Please try again in ${formatLockoutTime(lockoutTime)}`);
      return;
    }
    
    setIsLoading(true);
    setErrorMsg('');
    const { session, error } = await loginParent(parentEmail, parentPassword);
    setIsLoading(false);
    
    if (error) {
      const attempts = recordFailedAttempt(identifier);
      const remaining = getRemainingAttempts(identifier);
      if (remaining > 0) {
        setErrorMsg(`${error}. ${remaining} attempts remaining.`);
      } else {
        setErrorMsg(`Too many failed attempts. Account locked for 15 minutes.`);
      }
    } else if (session) {
      recordSuccessfulAttempt(identifier);
      toast.success(`Welcome back, ${session.full_name}`);
      if (session.must_change_password) {
        setLocation('/change-password');
      } else {
        setLocation('/parent');
      }
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
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/18" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-8 py-8 text-center bg-gradient-to-r from-navy-800 to-navy-900 relative">
            <div className="absolute top-4 right-4 text-white">
              <ThemeToggle />
            </div>
            <div className="flex justify-center mb-4">
              <TISLogo size="lg" />
            </div>
            <h1 className="text-xl font-heading font-bold text-white mb-1">{SCHOOL_CONFIG.name}</h1>
            <p className="text-navy-200 text-sm">{SCHOOL_CONFIG.location}</p>
          </div>

          <div className="p-6 md:p-8 flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50 p-1 border border-border">
                <TabsTrigger value="staff" className="rounded-md data-[state=active]:bg-navy-800 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-navy-900 data-[state=inactive]:text-foreground/70 data-[state=inactive]:hover:bg-muted">Staff</TabsTrigger>
                <TabsTrigger value="student" className="rounded-md data-[state=active]:bg-navy-800 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-navy-900 data-[state=inactive]:text-foreground/70 data-[state=inactive]:hover:bg-muted">Student</TabsTrigger>
                <TabsTrigger value="parent" className="rounded-md data-[state=active]:bg-navy-800 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-navy-900 data-[state=inactive]:text-foreground/70 data-[state=inactive]:hover:bg-muted">Parent</TabsTrigger>
              </TabsList>

              <AnimatePresence mode="wait">
                {errorMsg && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }} 
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20 text-center"
                  >
                    {errorMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* STAFF TAB */}
              <TabsContent value="staff" className="mt-0 focus-visible:outline-none">
                <form onSubmit={handleStaffLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="staff-email">Email Address</Label>
                    <Input
                      id="staff-email"
                      type="email"
                      placeholder=""
                      className="h-11 border-input bg-transparent rounded-md"
                      value={staffEmail}
                      onChange={e => setStaffEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2 relative">
                    <Label htmlFor="staff-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="staff-password"
                        type={showPassword ? "text" : "password"}
                        className="h-11 border-input bg-transparent rounded-md pr-10"
                        value={staffPassword}
                        onChange={e => setStaffPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? "Hide Password" : "Show Password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11 bg-navy-800 hover:bg-navy-900 text-white mt-2" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                  <div className="text-center pt-2 space-y-1">
                    <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                      For forgotten password, contact school admin/secretary
                    </p>
                    <button
                      type="button"
                      onClick={() => setLocation('/school-fees')}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      View School Fees
                    </button>
                  </div>
                </form>
              </TabsContent>

              {/* STUDENT TAB */}
              <TabsContent value="student" className="mt-0 focus-visible:outline-none">
                <form onSubmit={handleStudentLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-username">Username</Label>
                    <Input 
                      id="student-username" 
                      type="text" 
                      placeholder="Enter your username" 
                      className="h-11 border-input bg-transparent rounded-md"
                      value={studentUsername}
                      onChange={e => setStudentUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2 relative">
                    <Label htmlFor="student-password">Password</Label>
                    <div className="relative">
                      <Input 
                        id="student-password" 
                        type={showPassword ? "text" : "password"} 
                        className="h-11 border-input bg-transparent rounded-md pr-10"
                        value={studentPassword}
                        onChange={e => setStudentPassword(e.target.value)}
                        required
                      />
                      <button 
                        type="button" 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? "Hide Password" : "Show Password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11 bg-navy-800 hover:bg-navy-900 text-white mt-2" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                  <div className="text-center pt-2 space-y-1">
                    <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                      For forgotten password, contact school admin/secretary
                    </p>
                    <button
                      type="button"
                      onClick={() => setLocation('/signup')}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      New student? Sign up for an account
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocation('/school-fees')}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      View School Fees
                    </button>
                  </div>
                </form>
              </TabsContent>

              {/* PARENT TAB */}
              <TabsContent value="parent" className="mt-0 focus-visible:outline-none">
                <form onSubmit={handleParentLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="parent-email">Email Address</Label>
                    <Input 
                      id="parent-email" 
                      type="email" 
                      placeholder="" 
                      className="h-11 border-input bg-transparent rounded-md"
                      value={parentEmail}
                      onChange={e => setParentEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2 relative">
                    <Label htmlFor="parent-password">Password</Label>
                    <div className="relative">
                      <Input 
                        id="parent-password" 
                        type={showPassword ? "text" : "password"} 
                        className="h-11 border-input bg-transparent rounded-md pr-10"
                        value={parentPassword}
                        onChange={e => setParentPassword(e.target.value)}
                        required
                      />
                      <button 
                        type="button" 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? "Hide Password" : "Show Password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11 bg-navy-800 hover:bg-navy-900 text-white mt-2" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                  <div className="text-center pt-2 space-y-1">
                    <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                      For forgotten password, contact school admin/secretary
                    </p>
                    <button
                      type="button"
                      onClick={() => setLocation('/school-fees')}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      View School Fees
                    </button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
            
            {/* Trust/Security Cue */}
            <div className="mt-4 pt-4 border-t border-border/50 text-center">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Lock className="w-3 h-3" />
                <span>Secure login</span>
                <span className="mx-1">•</span>
                <button
                  type="button"
                  onClick={() => setLocation('/privacy-policy')}
                  className="hover:underline"
                >
                  Privacy Policy
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-6 text-navy-200/60 text-sm">
          &copy; {new Date().getFullYear()} {SCHOOL_CONFIG.name}. All rights reserved.
        </div>
      </motion.div>
    </div>
  );
}
