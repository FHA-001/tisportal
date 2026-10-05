import { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAcademicSessions, useCreateSession, useUpdateSession } from '@/hooks/use-academics';
import { SCHOOL_CONFIG } from '@/lib/app-config';
import { format } from 'date-fns';
import { Plus, Calendar, Settings2, Key, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { changePortalAuthPassword } from '@/lib/portal-auth';

export default function AdminSettings() {
  const { data: sessions = [] } = useAcademicSessions();
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();

  const [newSessionData, setNewSessionData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    current_term: 'First Term',
    is_active: false
  });

  const [activeTab, setActiveTab] = useState('academic');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{ [key: string]: string }>({});

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});

    // Validation
    if (!currentPassword) {
      setPasswordErrors({ currentPassword: 'Current password is required' });
      return;
    }

    if (!newPassword) {
      setPasswordErrors({ newPassword: 'New password is required' });
      return;
    }

    // Admin-specific validation: minimum 6 characters
    if (newPassword.length < 6) {
      setPasswordErrors({ newPassword: 'Password must be at least 6 characters' });
      return;
    }

    if (!confirmPassword) {
      setPasswordErrors({ confirmPassword: 'Please confirm your new password' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setIsChangingPassword(true);

    try {
      const result = await changePortalAuthPassword(currentPassword, newPassword);

      if (result.success) {
        toast.success('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        if (result.error === 'invalid_password') {
          setPasswordErrors({ currentPassword: 'Current password is incorrect' });
        } else {
          setPasswordErrors({ newPassword: result.error || 'Failed to change password' });
        }
      }
    } catch (error: any) {
      setPasswordErrors({ newPassword: error?.message || 'An unexpected error occurred' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    await createSession.mutateAsync(newSessionData);
    setNewSessionData({ name: '', start_date: '', end_date: '', current_term: 'First Term', is_active: false });
  };

  const toggleSessionActive = async (session: any) => {
    if (session.is_active) return; // Cannot deactivate directly, must activate another
    await updateSession.mutateAsync({ id: session.id, data: { is_active: true } });
  };

  const updateTerm = async (session: any, term: string) => {
    await updateSession.mutateAsync({ id: session.id, data: { current_term: term } });
  };

  return (
    <ProtectedRoute>
      <DashboardLayout role="admin">
        <PageHeader title="School Settings" />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card border border-border p-1 w-full h-auto grid grid-cols-1 sm:grid-cols-3 sm:w-auto">
            <TabsTrigger value="academic" className="justify-start sm:justify-center py-2.5 data-[state=active]:bg-muted"><Calendar className="w-4 h-4 mr-2" /> Academic Sessions</TabsTrigger>
            <TabsTrigger value="general" className="justify-start sm:justify-center py-2.5 data-[state=active]:bg-muted"><Settings2 className="w-4 h-4 mr-2" /> General Config</TabsTrigger>
            <TabsTrigger value="security" className="justify-start sm:justify-center py-2.5 data-[state=active]:bg-muted"><Key className="w-4 h-4 mr-2" /> Security & Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="academic" className="space-y-6 outline-none">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle>Create New Session</CardTitle>
                <CardDescription>Setup a new academic year.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateSession} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2 w-full">
                    <Label>Session Name (e.g. 2024/2025)</Label>
                    <Input required value={newSessionData.name} onChange={e => setNewSessionData({...newSessionData, name: e.target.value})} />
                  </div>
                  <div className="space-y-2 w-full">
                    <Label>Start Date</Label>
                    <Input type="date" required value={newSessionData.start_date} onChange={e => setNewSessionData({...newSessionData, start_date: e.target.value})} />
                  </div>
                  <div className="space-y-2 w-full">
                    <Label>End Date</Label>
                    <Input type="date" required value={newSessionData.end_date} onChange={e => setNewSessionData({...newSessionData, end_date: e.target.value})} />
                  </div>
                  <Button type="submit" className="bg-navy-700 hover:bg-navy-800 text-white w-full md:w-auto" disabled={createSession.isPending}>
                    <Plus className="w-4 h-4 mr-2" /> Add Session
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle>Manage Sessions & Terms</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-[680px]">
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="pl-6">Session</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Current Term</TableHead>
                      <TableHead className="text-right pr-6">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="pl-6 font-medium">{s.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {s.start_date ? format(new Date(s.start_date), 'MMM yyyy') : '-'} to {s.end_date ? format(new Date(s.end_date), 'MMM yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          <select 
                            className="bg-transparent border border-input rounded-md px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
                            value={s.current_term}
                            onChange={(e) => updateTerm(s, e.target.value)}
                            disabled={!s.is_active}
                          >
                            <option value="First Term">First Term</option>
                            <option value="Second Term">Second Term</option>
                            <option value="Third Term">Third Term</option>
                          </select>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-3">
                            <span className={`text-sm font-medium ${s.is_active ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                              {s.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <Switch checked={s.is_active} onCheckedChange={() => toggleSessionActive(s)} disabled={s.is_active} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general" className="outline-none">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle>School Information</CardTitle>
                <CardDescription>Configuration values used in report cards and headers. These are currently hardcoded in app-config.ts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>School Name</Label>
                    <Input readOnly value={SCHOOL_CONFIG.name} className="bg-muted text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <Label>Short Name</Label>
                    <Input readOnly value={SCHOOL_CONFIG.shortName} className="bg-muted text-muted-foreground" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Location / Address</Label>
                    <Input readOnly value={SCHOOL_CONFIG.location} className="bg-muted text-muted-foreground" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Logo URL</Label>
                    <Input readOnly value={SCHOOL_CONFIG.logoUrl} className="bg-muted text-muted-foreground" />
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <Button disabled variant="outline">Edit in Codebase</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="outline-none">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your admin account password for security.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current password"
                        disabled={isChangingPassword}
                        className={passwordErrors.currentPassword ? 'border-destructive' : ''}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordErrors.currentPassword && (
                      <p className="text-sm text-destructive mt-1">{passwordErrors.currentPassword}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter your new password"
                        disabled={isChangingPassword}
                        className={passwordErrors.newPassword ? 'border-destructive' : ''}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Minimum 6 characters.</p>
                    {passwordErrors.newPassword && (
                      <p className="text-sm text-destructive mt-1">{passwordErrors.newPassword}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your new password"
                        disabled={isChangingPassword}
                        className={passwordErrors.confirmPassword ? 'border-destructive' : ''}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && (
                      <p className="text-sm text-destructive mt-1">{passwordErrors.confirmPassword}</p>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isChangingPassword}
                      className="bg-navy-700 hover:bg-navy-800 text-white"
                    >
                      {isChangingPassword ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Changing Password...
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4 mr-2" />
                          Change Password
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

      </DashboardLayout>
    </ProtectedRoute>
  );
}
