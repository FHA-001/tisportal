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
import { Save, Plus, Calendar, Shield, Settings2, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';

export default function AdminSettings() {
  const { data: sessions = [], isLoading: loadingSessions } = useAcademicSessions();
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();

  const [newSessionData, setNewSessionData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    current_term: 'First Term',
    is_active: false
  });

  const [newAdminData, setNewAdminData] = useState({
    email: '',
    password: ''
  });
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  const [activeTab, setActiveTab] = useState('academic');

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

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsCreatingAdmin(true);
    const { error } = await supabase.auth.signUp({
      email: newAdminData.email,
      password: newAdminData.password,
      options: {
        data: { role: 'admin' }
      }
    });
    setIsCreatingAdmin(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Admin account created successfully. They can now sign in.');
      setNewAdminData({ email: '', password: '' });
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout role="admin">
        <PageHeader title="School Settings" />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card border border-border p-1 w-full sm:w-auto h-auto grid grid-cols-3">
            <TabsTrigger value="academic" className="py-2.5 data-[state=active]:bg-muted"><Calendar className="w-4 h-4 mr-2" /> Academic Sessions</TabsTrigger>
            <TabsTrigger value="general" className="py-2.5 data-[state=active]:bg-muted"><Settings2 className="w-4 h-4 mr-2" /> General Config</TabsTrigger>
            <TabsTrigger value="security" className="py-2.5 data-[state=active]:bg-muted"><Shield className="w-4 h-4 mr-2" /> Security & Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="academic" className="space-y-6 outline-none">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle>Create New Session</CardTitle>
                <CardDescription>Setup a new academic year.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateSession} className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="space-y-2 flex-1">
                    <Label>Session Name (e.g. 2024/2025)</Label>
                    <Input required value={newSessionData.name} onChange={e => setNewSessionData({...newSessionData, name: e.target.value})} />
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label>Start Date</Label>
                    <Input type="date" required value={newSessionData.start_date} onChange={e => setNewSessionData({...newSessionData, start_date: e.target.value})} />
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label>End Date</Label>
                    <Input type="date" required value={newSessionData.end_date} onChange={e => setNewSessionData({...newSessionData, end_date: e.target.value})} />
                  </div>
                  <Button type="submit" className="bg-navy-700 hover:bg-navy-800 text-white" disabled={createSession.isPending}>
                    <Plus className="w-4 h-4 mr-2" /> Add Session
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle>Manage Sessions & Terms</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
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

          <TabsContent value="security" className="outline-none space-y-6">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle>Create Admin Account</CardTitle>
                <CardDescription>Add a new administrator to the system. They will be able to access all admin features.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateAdmin} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Email Address</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@example.com"
                      value={newAdminData.email}
                      onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      placeholder="Min 6 characters"
                      value={newAdminData.password}
                      onChange={(e) => setNewAdminData({ ...newAdminData, password: e.target.value })}
                      required
                      className="h-11"
                    />
                  </div>
                  <Button type="submit" className="w-full h-11 bg-navy-700 hover:bg-navy-800 text-white" disabled={isCreatingAdmin}>
                    {isCreatingAdmin && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Admin Account
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>Recent system activity.</CardDescription>
              </CardHeader>
              <CardContent className="h-64 flex items-center justify-center border border-dashed rounded-xl m-6 bg-muted/30">
                <div className="text-center">
                  <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground font-medium">Audit logging enabled</p>
                  <p className="text-sm text-muted-foreground">Logs are written to the database.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

      </DashboardLayout>
    </ProtectedRoute>
  );
}
