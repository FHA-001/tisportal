import { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useParentChildren, usePaymentSubmissions, useCreatePaymentSubmission } from '@/hooks/use-parents';
import { useAcademicSessions } from '@/hooks/use-academics';
import { getCustomSession } from '@/lib/auth-utils';
import { Banknote, Calendar, Loader2, Plus, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ParentPaymentSubmissions() {
  const session = getCustomSession();
  const { data: children = [], isLoading: childrenLoading } = useParentChildren(session?.id);
  const { data: sessions = [], isLoading: sessionsLoading } = useAcademicSessions();
  const { data: submissions = [], isLoading: submissionsLoading } = usePaymentSubmissions(session?.id);
  const createSubmission = useCreatePaymentSubmission();

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '',
    academic_session_id: '',
    amount: '',
    payment_date: '',
    payment_method: '',
    payment_reference: '',
    bank_name: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.student_id) newErrors.student_id = 'Student is required';
    if (!formData.academic_session_id) newErrors.academic_session_id = 'Academic session is required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Amount is required and must be greater than zero';
    if (!formData.payment_date) newErrors.payment_date = 'Payment date is required';
    if (!formData.payment_method) newErrors.payment_method = 'Payment method is required';
    if (!selectedFile) newErrors.file = 'Payment proof is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    createSubmission.mutate({
      student_id: formData.student_id,
      academic_session_id: formData.academic_session_id,
      amount: parseFloat(formData.amount),
      payment_date: formData.payment_date,
      payment_method: formData.payment_method,
      payment_reference: formData.payment_reference || undefined,
      bank_name: formData.bank_name || undefined,
      file: selectedFile || undefined
    }, {
      onSuccess: () => {
        setFormData({
          student_id: '',
          academic_session_id: '',
          amount: '',
          payment_date: '',
          payment_method: '',
          payment_reference: '',
          bank_name: ''
        });
        setSelectedFile(null);
        setShowForm(false);
        setErrors({});
      }
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setErrors({ ...errors, file: '' });
    }
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
    setErrors({ ...errors, file: 'Payment proof is required' });
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
    <CustomSessionGuard role="parent">
      <DashboardLayout role="parent">
        <PageHeader 
          title="Payment Submissions" 
          subtitle="Submit fee payment proofs for review"
          actions={
            <Button onClick={() => setShowForm(!showForm)} className="gap-2">
              <Plus className="w-4 h-4" />
              {showForm ? 'Cancel' : 'New Submission'}
            </Button>
          }
        />

        {showForm && (
          <Card className="card-premium border-border mb-6 max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                Submit Payment
              </CardTitle>
              <CardDescription>
                Fill in the payment details below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="student">Student *</Label>
                    <select
                      id="student"
                      value={formData.student_id}
                      onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                      className="w-full h-11 px-3 rounded-md border border-input bg-background"
                      disabled={childrenLoading}
                    >
                      <option value="">Select a student</option>
                      {children.map((child: any) => (
                        <option key={child.student_id} value={child.student_id}>
                          {child.students?.full_name} ({child.students?.admission_number})
                        </option>
                      ))}
                    </select>
                    {errors.student_id && <p className="text-sm text-destructive">{errors.student_id}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="session">Academic Session *</Label>
                    <select
                      id="session"
                      value={formData.academic_session_id}
                      onChange={(e) => setFormData({ ...formData, academic_session_id: e.target.value })}
                      className="w-full h-11 px-3 rounded-md border border-input bg-background"
                      disabled={sessionsLoading}
                    >
                      <option value="">Select a session</option>
                      {sessions.map((session: any) => (
                        <option key={session.id} value={session.id}>
                          {session.name}
                        </option>
                      ))}
                    </select>
                    {errors.academic_session_id && <p className="text-sm text-destructive">{errors.academic_session_id}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                    {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment_date">Payment Date *</Label>
                    <Input
                      id="payment_date"
                      type="date"
                      value={formData.payment_date}
                      onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    />
                    {errors.payment_date && <p className="text-sm text-destructive">{errors.payment_date}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment_method">Payment Method *</Label>
                    <select
                      id="payment_method"
                      value={formData.payment_method}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                      className="w-full h-11 px-3 rounded-md border border-input bg-background"
                    >
                      <option value="">Select a method</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="cheque">Cheque</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.payment_method && <p className="text-sm text-destructive">{errors.payment_method}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment_reference">Payment Reference (Optional)</Label>
                    <Input
                      id="payment_reference"
                      placeholder="Transaction ID or reference number"
                      value={formData.payment_reference}
                      onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bank_name">Bank Name (Optional)</Label>
                    <Input
                      id="bank_name"
                      placeholder="Bank name"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="payment_proof">Payment Proof *</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="payment_proof"
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={handleFileSelect}
                        className="flex-1"
                      />
                      {selectedFile && (
                        <Button type="button" variant="outline" size="icon" onClick={handleFileRemove}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                    {errors.file && <p className="text-sm text-destructive">{errors.file}</p>}
                    <p className="text-xs text-muted-foreground">
                      Accepted formats: JPG, JPEG, PNG, PDF. Maximum size: 10MB.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={createSubmission.isPending} className="gap-2">
                    {createSubmission.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Submit Payment
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowForm(false);
                      setSelectedFile(null);
                      setErrors({});
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="card-premium border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Submission History
            </CardTitle>
            <CardDescription>
              Your previous payment submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submissionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-12">
                <div className="icon-premium mx-auto mb-4">
                  <Banknote className="w-6 h-6 text-navy-600" />
                </div>
                <h3 className="text-lg font-medium mb-2">No submissions yet</h3>
                <p className="text-muted-foreground">
                  Submit your first payment proof to get started.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Submission Date</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Student</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Academic Session</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Amount</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Payment Method</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission: any) => (
                      <tr key={submission.id} className="border-b border-border hover:bg-muted/30">
                        <td className="py-3 px-4 text-sm">
                          {new Date(submission.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {submission.students?.full_name || 'Unknown'}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {submission.academic_sessions?.name}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium">
                          ₦{parseFloat(submission.amount).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {submission.payment_method}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${getStatusBadge(submission.status)}`}>
                            {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </DashboardLayout>
    </CustomSessionGuard>
  );
}
