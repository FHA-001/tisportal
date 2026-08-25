import { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, UserCheck, UserX, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';

export default function SignupRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pending_student_signups')
      .select('*')
      .order('signup_date', { ascending: true });

    if (error) {
      toast.error('Failed to load signup requests');
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  useState(() => {
    fetchRequests();
  });

  const handleApprove = async (studentId: string) => {
    setProcessing(studentId);
    
    // Get admin ID from session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Admin session required');
      setProcessing(null);
      return;
    }

    const { data, error } = await supabase.rpc('approve_student_signup', {
      p_student_id: studentId,
      p_admin_id: user.id
    });

    if (error) {
      toast.error(error.message);
    } else if (data.error) {
      toast.error(data.error);
    } else {
      toast.success(`Student approved! Admission number: ${data.admission_number}`);
      fetchRequests();
    }
    setProcessing(null);
  };

  const handleReject = async (studentId: string) => {
    if (!confirm('Are you sure you want to reject this signup request?')) {
      return;
    }

    setProcessing(studentId);
    
    // Get admin ID from session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Admin session required');
      setProcessing(null);
      return;
    }

    const { data, error } = await supabase.rpc('reject_student_signup', {
      p_student_id: studentId,
      p_admin_id: user.id
    });

    if (error) {
      toast.error(error.message);
    } else if (data.error) {
      toast.error(data.error);
    } else {
      toast.success('Signup request rejected');
      fetchRequests();
    }
    setProcessing(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ProtectedRoute>
      <DashboardLayout role="admin">
        <PageHeader title="Student Signup Requests" />

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Pending Requests
            </CardTitle>
            <CardDescription>
              Students who have submitted registration requests and are waiting for approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-xl bg-muted/30">
                <Clock className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground font-medium">No pending signup requests</p>
                <p className="text-sm text-muted-foreground mt-1">New requests will appear here</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-12">S/N</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Parent Name</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request, index) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-medium">{request.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{request.username}</TableCell>
                        <TableCell>{request.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-navy-50 dark:bg-navy-900/30 text-navy-700 dark:text-navy-300">
                            {request.class_name}
                          </Badge>
                        </TableCell>
                        <TableCell>{request.parent_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(request.signup_date)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(request.id)}
                              disabled={processing === request.id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {processing === request.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <UserCheck className="w-4 h-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(request.id)}
                              disabled={processing === request.id}
                            >
                              {processing === request.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <UserX className="w-4 h-4 mr-1" />
                                  Reject
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
