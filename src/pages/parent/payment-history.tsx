import { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useParentPaymentHistory, PaymentHistoryItem } from '@/hooks/use-parents';
import { useParentChildren } from '@/hooks/use-parents';
import { useAcademicSessions } from '@/hooks/use-academics';
import { getCustomSession } from '@/lib/auth-utils';
import { downloadReceiptPDF, viewReceiptPDF } from '@/lib/receipt-generator';
import { Banknote, Clock, CheckCircle, XCircle, FileText, Search, Eye, Download, X, Calendar, Filter } from 'lucide-react';
import { toast } from 'sonner';

export default function ParentPaymentHistory() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentHistoryItem | null>(null);

  const session = getCustomSession();
  const { data: children = [] } = useParentChildren();
  const { data: sessions = [] } = useAcademicSessions();
  const { data: payments = [], isLoading } = useParentPaymentHistory(
    statusFilter,
    sessionFilter,
    studentFilter
  );

  const stats = {
    pending: payments.filter((p: PaymentHistoryItem) => p.status === 'pending').length,
    approved: payments.filter((p: PaymentHistoryItem) => p.status === 'approved').length,
    rejected: payments.filter((p: PaymentHistoryItem) => p.status === 'rejected').length,
    total: payments.length
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      approved: 'bg-green-50 text-green-700 border-green-200',
      rejected: 'bg-red-50 text-red-700 border-red-200'
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const handleViewDetails = (payment: PaymentHistoryItem) => {
    setSelectedPayment(payment);
  };

  const handleCloseDetails = () => {
    setSelectedPayment(null);
  };

  const handleDownloadReceipt = () => {
    if (!selectedPayment?.receipt_number) {
      toast.error('Receipt not available');
      return;
    }
    
    downloadReceiptPDF({
      receiptNumber: selectedPayment.receipt_number,
      issueDate: selectedPayment.created_at,
      studentName: selectedPayment.student_name,
      admissionNumber: selectedPayment.student_admission_number,
      parentName: selectedPayment.parent_name,
      academicSession: selectedPayment.academic_session_name,
      amount: selectedPayment.amount,
      paymentMethod: selectedPayment.payment_method,
      paymentReference: selectedPayment.payment_reference || undefined,
      bankName: selectedPayment.bank_name || undefined,
      paymentDate: selectedPayment.payment_date,
      accountantName: session?.full_name,
    });
  };

  const handleViewReceipt = () => {
    if (!selectedPayment?.receipt_number) {
      toast.error('Receipt not available');
      return;
    }
    
    viewReceiptPDF({
      receiptNumber: selectedPayment.receipt_number,
      issueDate: selectedPayment.created_at,
      studentName: selectedPayment.student_name,
      admissionNumber: selectedPayment.student_admission_number,
      parentName: selectedPayment.parent_name,
      academicSession: selectedPayment.academic_session_name,
      amount: selectedPayment.amount,
      paymentMethod: selectedPayment.payment_method,
      paymentReference: selectedPayment.payment_reference || undefined,
      bankName: selectedPayment.bank_name || undefined,
      paymentDate: selectedPayment.payment_date,
      accountantName: session?.full_name,
    });
  };

  return (
    <CustomSessionGuard role="parent">
      <DashboardLayout role="parent">
        <div className="space-y-6">
          <PageHeader title="Payment History" />

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="card-premium border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Transactions</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Banknote className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-premium border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">{stats.pending}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-premium border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Approved</p>
                    <p className="text-2xl font-bold">{stats.approved}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-premium border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Rejected</p>
                    <p className="text-2xl font-bold">{stats.rejected}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="card-premium border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by student name..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Academic Session</Label>
                  <select
                    value={sessionFilter}
                    onChange={(e) => setSessionFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  >
                    <option value="">All Sessions</option>
                    {sessions.map((session: any) => (
                      <option key={session.id} value={session.id}>
                        {session.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Student</Label>
                  <select
                    value={studentFilter}
                    onChange={(e) => setStudentFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  >
                    <option value="">All Students</option>
                    {children.map((child: any) => (
                      <option key={child.student_id} value={child.student_id}>
                        {child.student_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment History Table */}
          <Card className="card-premium border-border">
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading...' : `${payments.length} transactions found`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payment history found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Student</th>
                        <th className="text-left p-3 font-medium">Session</th>
                        <th className="text-left p-3 font-medium">Amount</th>
                        <th className="text-left p-3 font-medium">Payment Date</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment: PaymentHistoryItem) => (
                        <tr key={payment.id} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            <div>
                              <p className="font-medium">{payment.student_name}</p>
                              <p className="text-sm text-muted-foreground">{payment.student_admission_number}</p>
                            </div>
                          </td>
                          <td className="p-3">
                            <p className="text-sm">{payment.academic_session_name}</p>
                          </td>
                          <td className="p-3">
                            <p className="font-medium">₦{payment.amount.toLocaleString()}</p>
                          </td>
                          <td className="p-3">
                            <p className="text-sm">{new Date(payment.payment_date).toLocaleDateString()}</p>
                          </td>
                          <td className="p-3">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${getStatusBadge(payment.status)}`}>
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </span>
                          </td>
                          <td className="p-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(payment)}
                              className="gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              View Details
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

          {/* Payment Details Modal */}
          {selectedPayment && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="card-premium border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>Payment Details</CardTitle>
                      <CardDescription>
                        {selectedPayment.type === 'payment' ? `Receipt: ${selectedPayment.receipt_number}` : `Submission ID: ${selectedPayment.id.slice(0, 8)}...`}
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleCloseDetails}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-sm">Student Name</Label>
                      <p className="font-medium">{selectedPayment.student_name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Admission Number</Label>
                      <p className="font-medium">{selectedPayment.student_admission_number}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Parent Name</Label>
                      <p className="font-medium">{selectedPayment.parent_name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Parent Email</Label>
                      <p className="font-medium">{selectedPayment.parent_email}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Academic Session</Label>
                      <p className="font-medium">{selectedPayment.academic_session_name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Amount</Label>
                      <p className="font-medium">₦{selectedPayment.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Payment Date</Label>
                      <p className="font-medium">{new Date(selectedPayment.payment_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Payment Method</Label>
                      <p className="font-medium">
                        {selectedPayment.payment_method.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </p>
                    </div>
                    {selectedPayment.payment_reference && (
                      <div>
                        <Label className="text-muted-foreground text-sm">Payment Reference</Label>
                        <p className="font-medium">{selectedPayment.payment_reference}</p>
                      </div>
                    )}
                    {selectedPayment.bank_name && (
                      <div>
                        <Label className="text-muted-foreground text-sm">Bank Name</Label>
                        <p className="font-medium">{selectedPayment.bank_name}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-muted-foreground text-sm">Status</Label>
                      <p>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${getStatusBadge(selectedPayment.status)}`}>
                          {selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1)}
                        </span>
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Submission Date</Label>
                      <p className="font-medium">{new Date(selectedPayment.created_at).toLocaleString()}</p>
                    </div>
                    {selectedPayment.accountant_remarks && (
                      <div className="col-span-2">
                        <Label className="text-muted-foreground text-sm">Accountant Remarks</Label>
                        <p className="font-medium">{selectedPayment.accountant_remarks}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-muted-foreground text-sm">Proof Status</Label>
                      <p className="font-medium">{selectedPayment.proof_url ? 'Attached' : 'Not Attached'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Receipt Availability</Label>
                      <p className="font-medium">{selectedPayment.receipt_number ? 'Available' : 'Not Available'}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    {selectedPayment.status === 'approved' && selectedPayment.receipt_number && (
                      <>
                        <Button onClick={handleViewReceipt} className="gap-2">
                          <Eye className="w-4 h-4" />
                          View Receipt
                        </Button>
                        <Button onClick={handleDownloadReceipt} variant="outline" className="gap-2">
                          <Download className="w-4 h-4" />
                          Download Receipt
                        </Button>
                      </>
                    )}
                    {selectedPayment.status !== 'approved' && (
                      <Button disabled variant="outline" className="gap-2">
                        <FileText className="w-4 h-4" />
                        Receipt Not Available
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DashboardLayout>
    </CustomSessionGuard>
  );
}
