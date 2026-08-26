import { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAllPaymentSubmissions, PaymentSubmission, generateSignedUrl, useApproveSubmission, useRejectSubmission } from '@/hooks/use-accountant';
import { useAcademicSessions } from '@/hooks/use-academics';
import { getCustomSession } from '@/lib/auth-utils';
import { Banknote, Clock, CheckCircle, XCircle, FileText, Search, Eye, Loader2, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function AccountantPaymentReview() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<PaymentSubmission | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [loadingProof, setLoadingProof] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const { data: submissions = [], isLoading } = useAllPaymentSubmissions(search, statusFilter, sessionFilter, methodFilter);
  const { data: sessions = [] } = useAcademicSessions();
  const approveSubmission = useApproveSubmission();
  const rejectSubmission = useRejectSubmission();
  const session = getCustomSession();

  const stats = {
    pending: submissions.filter((s: PaymentSubmission) => s.status === 'pending').length,
    approved: submissions.filter((s: PaymentSubmission) => s.status === 'approved').length,
    rejected: submissions.filter((s: PaymentSubmission) => s.status === 'rejected').length,
    total: submissions.length
  };

  const handleViewProof = async () => {
    if (!selectedSubmission?.proof_url) {
      toast.error('No payment proof attached');
      return;
    }

    setLoadingProof(true);
    try {
      const url = await generateSignedUrl(selectedSubmission.proof_url);
      setProofUrl(url);
      window.open(url, '_blank');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoadingProof(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedSubmission(null);
    setProofUrl(null);
    setRemarks('');
    setShowApproveDialog(false);
    setShowRejectDialog(false);
  };

  const handleApprove = () => {
    if (!remarks.trim()) {
      toast.error('Please enter remarks before approving');
      return;
    }
    setShowApproveDialog(true);
  };

  const handleReject = () => {
    if (!remarks.trim()) {
      toast.error('Please enter remarks before rejecting');
      return;
    }
    setShowRejectDialog(true);
  };

  const confirmApprove = () => {
    if (!selectedSubmission) return;

    approveSubmission.mutate({
      submissionId: selectedSubmission.id,
      remarks: remarks.trim()
    }, {
      onSuccess: () => {
        setShowApproveDialog(false);
        handleCloseDetail();
      }
    });
  };

  const confirmReject = () => {
    if (!selectedSubmission) return;

    rejectSubmission.mutate({
      submissionId: selectedSubmission.id,
      remarks: remarks.trim()
    }, {
      onSuccess: () => {
        setShowRejectDialog(false);
        handleCloseDetail();
      }
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      approved: 'bg-green-50 text-green-700 border-green-200',
      rejected: 'bg-red-50 text-red-700 border-red-200'
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  return (
    <CustomSessionGuard role="accountant">
      <DashboardLayout role="accountant">
        <div className="space-y-6">
          <PageHeader
            title="Payment Review"
            subtitle="Review and manage payment submissions"
          />

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="card-premium border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <span className="text-2xl font-bold">{stats.pending}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="card-premium border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-2xl font-bold">{stats.approved}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="card-premium border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-2xl font-bold">{stats.rejected}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="card-premium border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-navy-600" />
                  <span className="text-2xl font-bold">{stats.total}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="card-premium border-border">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Student, admission, parent..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session">Academic Session</Label>
                  <select
                    id="session"
                    value={sessionFilter}
                    onChange={(e) => setSessionFilter(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="">All Sessions</option>
                    {sessions.map(session => (
                      <option key={session.id} value={session.id}>{session.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="method">Payment Method</Label>
                  <select
                    id="method"
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="">All Methods</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submissions Table */}
          <Card className="card-premium border-border">
            <CardHeader>
              <CardTitle>Payment Submissions</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading...' : `${submissions.length} submission(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No submissions found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your filters or search terms.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Student</th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Parent</th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Session</th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Amount</th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Method</th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Submitted</th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((submission: PaymentSubmission) => (
                        <tr key={submission.id} className="border-b border-border hover:bg-muted/30 cursor-pointer">
                          <td className="py-3 px-4 text-sm">
                            <div>
                              <div className="font-medium">{submission.student_name}</div>
                              <div className="text-xs text-muted-foreground">{submission.student_admission_number}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm">{submission.parent_name}</td>
                          <td className="py-3 px-4 text-sm">{submission.academic_session_name}</td>
                          <td className="py-3 px-4 text-sm font-medium">
                            ₦{submission.amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {new Date(submission.payment_date).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {submission.payment_method.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${getStatusBadge(submission.status)}`}>
                              {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {new Date(submission.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedSubmission(submission)}
                              className="gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detail Modal */}
        {selectedSubmission && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="card-premium border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Submission Details</CardTitle>
                    <CardDescription>
                      ID: {selectedSubmission.id.slice(0, 8)}...
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleCloseDetail}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-sm">Student Name</Label>
                    <p className="font-medium">{selectedSubmission.student_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Admission Number</Label>
                    <p className="font-medium">{selectedSubmission.student_admission_number}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Parent Name</Label>
                    <p className="font-medium">{selectedSubmission.parent_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Parent Email</Label>
                    <p className="font-medium">{selectedSubmission.parent_email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Academic Session</Label>
                    <p className="font-medium">{selectedSubmission.academic_session_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Amount</Label>
                    <p className="font-medium">₦{selectedSubmission.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Payment Date</Label>
                    <p className="font-medium">{new Date(selectedSubmission.payment_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Payment Method</Label>
                    <p className="font-medium">
                      {selectedSubmission.payment_method.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </p>
                  </div>
                  {selectedSubmission.payment_reference && (
                    <div>
                      <Label className="text-muted-foreground text-sm">Payment Reference</Label>
                      <p className="font-medium">{selectedSubmission.payment_reference}</p>
                    </div>
                  )}
                  {selectedSubmission.bank_name && (
                    <div>
                      <Label className="text-muted-foreground text-sm">Bank Name</Label>
                      <p className="font-medium">{selectedSubmission.bank_name}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground text-sm">Status</Label>
                    <p>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${getStatusBadge(selectedSubmission.status)}`}>
                        {selectedSubmission.status.charAt(0).toUpperCase() + selectedSubmission.status.slice(1)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Submitted On</Label>
                    <p className="font-medium">{new Date(selectedSubmission.created_at).toLocaleString()}</p>
                  </div>
                </div>

                {selectedSubmission.accountant_remarks && (
                  <div>
                    <Label className="text-muted-foreground text-sm">Accountant Remarks</Label>
                    <p className="font-medium">{selectedSubmission.accountant_remarks}</p>
                  </div>
                )}

                {selectedSubmission.status === 'pending' && (
                  <div className="space-y-2 pt-4 border-t">
                    <Label htmlFor="remarks">Accountant Remarks *</Label>
                    <Textarea
                      id="remarks"
                      placeholder="Enter your remarks for this submission..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={3}
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t">
                  {selectedSubmission.proof_url ? (
                    <Button onClick={handleViewProof} disabled={loadingProof} className="gap-2">
                      {loadingProof ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                      View Payment Proof
                    </Button>
                  ) : (
                    <Button disabled variant="outline" className="gap-2">
                      <FileText className="w-4 h-4" />
                      No Proof Attached
                    </Button>
                  )}

                  {selectedSubmission.status === 'pending' && (
                    <>
                      <Button onClick={handleApprove} disabled={approveSubmission.isPending} className="gap-2 bg-green-600 hover:bg-green-700">
                        {approveSubmission.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Approve
                      </Button>
                      <Button onClick={handleReject} disabled={rejectSubmission.isPending} variant="destructive" className="gap-2">
                        {rejectSubmission.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Approve Confirmation Dialog */}
        {showApproveDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="card-premium border-border max-w-md w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  Confirm Approval
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to approve this payment submission? This will create an official fee payment record.
                </p>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={confirmApprove} 
                    disabled={approveSubmission.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {approveSubmission.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Approve'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reject Confirmation Dialog */}
        {showRejectDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="card-premium border-border max-w-md w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Confirm Rejection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to reject this payment submission? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={confirmReject} 
                    disabled={rejectSubmission.isPending}
                    variant="destructive"
                  >
                    {rejectSubmission.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Reject'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DashboardLayout>
    </CustomSessionGuard>
  );
}
