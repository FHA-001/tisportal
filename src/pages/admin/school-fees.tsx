import { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Banknote, 
  CreditCard, 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  X,
  Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  useSchoolFees, 
  useUpdateSchoolFee, 
  usePaymentAccounts, 
  useCreatePaymentAccount, 
  useUpdatePaymentAccount, 
  useDeletePaymentAccount 
} from '@/hooks/use-school-fees';
import { 
  useFeePayments, 
  useCreateFeePayment, 
  useDeleteFeePayment,
  useSchoolAccountDetails,
  useUpdateSchoolAccountDetails
} from '@/hooks/use-parents';
import { useStudents } from '@/hooks/use-records';
import { useAcademicSessions } from '@/hooks/use-academics';

export default function AdminSchoolFees() {
  const { data: schoolFees = [], isLoading: loadingFees } = useSchoolFees();
  const { data: paymentAccounts = [], isLoading: loadingAccounts } = usePaymentAccounts();
  const { data: students = [] } = useStudents();
  const { data: sessions = [] } = useAcademicSessions();
  const { data: feePayments = [], isLoading: loadingPayments } = useFeePayments();
  const { data: schoolAccount } = useSchoolAccountDetails();
  
  const updateSchoolFee = useUpdateSchoolFee();
  const createPaymentAccount = useCreatePaymentAccount();
  const updatePaymentAccount = useUpdatePaymentAccount();
  const deletePaymentAccount = useDeletePaymentAccount();
  const createFeePayment = useCreateFeePayment();
  const deleteFeePayment = useDeleteFeePayment();
  const updateSchoolAccountDetails = useUpdateSchoolAccountDetails();

  const [activeTab, setActiveTab] = useState('fees');
  
  // Editing state for school fees
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
  const [editingFeeAmount, setEditingFeeAmount] = useState<string>('');

  // Payment account form state
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountForm, setAccountForm] = useState({
    bankName: '',
    accountNumber: '',
    accountName: 'Triton International School',
    sortOrder: 0
  });

  // Fee payment recording form state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    student_id: '',
    term_id: '',
    amount: '',
    reference_note: '',
    payment_method: 'Bank Transfer'
  });

  // School account details form state
  const [showSchoolAccountForm, setShowSchoolAccountForm] = useState(false);
  const [schoolAccountForm, setSchoolAccountForm] = useState({
    bank_name: '',
    account_number: '',
    account_name: ''
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleFeeEdit = (id: string, currentAmount: number) => {
    setEditingFeeId(id);
    setEditingFeeAmount(currentAmount.toString());
  };

  const handleFeeSave = async (id: string) => {
    const amount = parseFloat(editingFeeAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    await updateSchoolFee.mutateAsync({ id, feeAmount: amount });
    setEditingFeeId(null);
    setEditingFeeAmount('');
  };

  const handleFeeCancel = () => {
    setEditingFeeId(null);
    setEditingFeeAmount('');
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.bankName || !accountForm.accountNumber) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (editingAccountId) {
      await updatePaymentAccount.mutateAsync({
        id: editingAccountId,
        bankName: accountForm.bankName,
        accountNumber: accountForm.accountNumber,
        accountName: accountForm.accountName,
        sortOrder: accountForm.sortOrder
      });
    } else {
      await createPaymentAccount.mutateAsync({
        bankName: accountForm.bankName,
        accountNumber: accountForm.accountNumber,
        accountName: accountForm.accountName
      });
    }
    
    setAccountForm({ bankName: '', accountNumber: '', accountName: 'Triton International School', sortOrder: 0 });
    setShowAccountForm(false);
    setEditingAccountId(null);
  };

  const handleAccountEdit = (account: any) => {
    setEditingAccountId(account.id);
    setAccountForm({
      bankName: account.bank_name,
      accountNumber: account.account_number,
      accountName: account.account_name,
      sortOrder: account.sort_order
    });
    setShowAccountForm(true);
  };

  const handleAccountDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this payment account?')) {
      await deletePaymentAccount.mutateAsync(id);
    }
  };

  const handleAccountCancel = () => {
    setShowAccountForm(false);
    setEditingAccountId(null);
    setAccountForm({ bankName: '', accountNumber: '', accountName: 'Triton International School', sortOrder: 0 });
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.student_id || !paymentForm.term_id || !paymentForm.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    await createFeePayment.mutateAsync({
      student_id: paymentForm.student_id,
      term_id: paymentForm.term_id,
      amount: parseFloat(paymentForm.amount),
      reference_note: paymentForm.reference_note,
      payment_method: paymentForm.payment_method
    });

    setPaymentForm({
      student_id: '',
      term_id: '',
      amount: '',
      reference_note: '',
      payment_method: 'Bank Transfer'
    });
    setShowPaymentForm(false);
  };

  const handlePaymentDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this payment record?')) {
      await deleteFeePayment.mutateAsync(id);
    }
  };

  const handleSchoolAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolAccountForm.bank_name || !schoolAccountForm.account_number || !schoolAccountForm.account_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    await updateSchoolAccountDetails.mutateAsync(schoolAccountForm);
    setShowSchoolAccountForm(false);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout role="admin">
        <PageHeader title="School Fees Management" />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card border border-border p-1 w-full sm:w-auto h-auto grid grid-cols-3">
            <TabsTrigger value="fees" className="py-2.5 data-[state=active]:bg-muted">
              <Banknote className="w-4 h-4 mr-2" /> Class Fees
            </TabsTrigger>
            <TabsTrigger value="payments" className="py-2.5 data-[state=active]:bg-muted">
              <CreditCard className="w-4 h-4 mr-2" /> Fee Payments
            </TabsTrigger>
            <TabsTrigger value="accounts" className="py-2.5 data-[state=active]:bg-muted">
              <CreditCard className="w-4 h-4 mr-2" /> Payment Accounts
            </TabsTrigger>
          </TabsList>

          {/* Class Fees Tab */}
          <TabsContent value="fees" className="outline-none space-y-6">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle>Class Fee Structure</CardTitle>
                <CardDescription>Set the school fee amount for each class. These fees are displayed publicly.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingFees ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="pl-6">Class</TableHead>
                        <TableHead>Fee Amount (₦)</TableHead>
                        <TableHead className="text-right pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schoolFees.map((fee) => (
                        <TableRow key={fee.id}>
                          <TableCell className="pl-6 font-medium">{fee.class_name}</TableCell>
                          <TableCell>
                            {editingFeeId === fee.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={editingFeeAmount}
                                  onChange={(e) => setEditingFeeAmount(e.target.value)}
                                  className="w-32 h-8"
                                  min="0"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleFeeSave(fee.id)}
                                  disabled={updateSchoolFee.isPending}
                                  title="Save Fee Amount"
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleFeeCancel}
                                  title="Cancel Edit"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="font-semibold">
                                {fee.fee_amount > 0 ? formatCurrency(fee.fee_amount) : '-'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            {editingFeeId !== fee.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleFeeEdit(fee.id, fee.fee_amount)}
                                title="Edit Fee Amount"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fee Payments Tab */}
          <TabsContent value="payments" className="outline-none space-y-6">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle>Fee Payment Recording</CardTitle>
                <CardDescription>Record and manage student fee payments.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* School Account Details */}
                <div className="border border-border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">School Account Details</h3>
                    <Button size="sm" variant="outline" onClick={() => setShowSchoolAccountForm(!showSchoolAccountForm)}>
                      {showSchoolAccountForm ? 'Cancel' : 'Edit'}
                    </Button>
                  </div>
                  
                  {showSchoolAccountForm ? (
                    <form onSubmit={handleSchoolAccountSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="school-bank-name">Bank Name</Label>
                          <Input
                            id="school-bank-name"
                            value={schoolAccountForm.bank_name}
                            onChange={(e) => setSchoolAccountForm({ ...schoolAccountForm, bank_name: e.target.value })}
                            placeholder={schoolAccount?.bank_name || 'Bank name'}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="school-account-number">Account Number</Label>
                          <Input
                            id="school-account-number"
                            value={schoolAccountForm.account_number}
                            onChange={(e) => setSchoolAccountForm({ ...schoolAccountForm, account_number: e.target.value })}
                            placeholder={schoolAccount?.account_number || 'Account number'}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="school-account-name">Account Name</Label>
                          <Input
                            id="school-account-name"
                            value={schoolAccountForm.account_name}
                            onChange={(e) => setSchoolAccountForm({ ...schoolAccountForm, account_name: e.target.value })}
                            placeholder={schoolAccount?.account_name || 'Account name'}
                          />
                        </div>
                      </div>
                      <Button type="submit" disabled={updateSchoolAccountDetails.isPending}>
                        {updateSchoolAccountDetails.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : null}
                        Update Account Details
                      </Button>
                    </form>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Bank Name</div>
                        <div className="font-medium">{schoolAccount?.bank_name || 'Not set'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Account Number</div>
                        <div className="font-medium font-mono">{schoolAccount?.account_number || 'Not set'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Account Name</div>
                        <div className="font-medium">{schoolAccount?.account_name || 'Not set'}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Record Payment Form */}
                {showPaymentForm && (
                  <div className="border border-border rounded-lg p-4 bg-muted/30">
                    <h3 className="font-semibold mb-4">Record Fee Payment</h3>
                    <form onSubmit={handlePaymentSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="payment-student">Student *</Label>
                          <select
                            id="payment-student"
                            value={paymentForm.student_id}
                            onChange={(e) => setPaymentForm({ ...paymentForm, student_id: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                            required
                          >
                            <option value="">Select a student</option>
                            {students.map((s: any) => (
                              <option key={s.id} value={s.id}>{s.full_name} ({s.admission_number})</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="payment-term">Academic Term *</Label>
                          <select
                            id="payment-term"
                            value={paymentForm.term_id}
                            onChange={(e) => setPaymentForm({ ...paymentForm, term_id: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                            required
                          >
                            <option value="">Select a term</option>
                            {sessions.map((s: any) => (
                              <option key={s.id} value={s.id}>{s.name} ({s.term} {s.year})</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="payment-amount">Amount (₦) *</Label>
                          <Input
                            id="payment-amount"
                            type="number"
                            value={paymentForm.amount}
                            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                            placeholder="Enter amount"
                            min="0"
                            step="0.01"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="payment-method">Payment Method</Label>
                          <select
                            id="payment-method"
                            value={paymentForm.payment_method}
                            onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                          >
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cash">Cash</option>
                            <option value="POS">POS</option>
                            <option value="Cheque">Cheque</option>
                          </select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="payment-reference">Reference Note (Teller Number, Transaction Ref, etc.)</Label>
                          <Input
                            id="payment-reference"
                            value={paymentForm.reference_note}
                            onChange={(e) => setPaymentForm({ ...paymentForm, reference_note: e.target.value })}
                            placeholder="Enter reference number"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={createFeePayment.isPending}>
                          {createFeePayment.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : null}
                          Record Payment
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setShowPaymentForm(false)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {!showPaymentForm && (
                  <Button onClick={() => setShowPaymentForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Record New Payment
                  </Button>
                )}

                {/* Payments List */}
                {loadingPayments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="pl-6">Student</TableHead>
                        <TableHead>Term</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feePayments.map((payment: any) => (
                        <TableRow key={payment.id}>
                          <TableCell className="pl-6 font-medium">
                            {payment.students?.full_name} ({payment.students?.admission_number})
                          </TableCell>
                          <TableCell>{payment.academic_sessions?.name}</TableCell>
                          <TableCell className="font-semibold">₦{parseFloat(payment.amount).toLocaleString()}</TableCell>
                          <TableCell>{payment.payment_method}</TableCell>
                          <TableCell className="font-mono text-sm">{payment.reference_note || '-'}</TableCell>
                          <TableCell>{new Date(payment.date_paid).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right pr-6">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePaymentDelete(payment.id)}
                              disabled={deleteFeePayment.isPending}
                              title="Delete Payment"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {feePayments.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No fee payments recorded yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Accounts Tab */}
          <TabsContent value="accounts" className="outline-none space-y-6">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle>Payment Accounts</CardTitle>
                <CardDescription>Manage bank accounts where parents can pay school fees.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add/Edit Account Form */}
                {showAccountForm && (
                  <div className="border border-border rounded-lg p-4 bg-muted/30">
                    <h3 className="font-semibold mb-4">
                      {editingAccountId ? 'Edit Payment Account' : 'Add New Payment Account'}
                    </h3>
                    <form onSubmit={handleAccountSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="bank-name">Bank Name *</Label>
                          <Input
                            id="bank-name"
                            value={accountForm.bankName}
                            onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                            placeholder="e.g., GTB"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="account-number">Account Number *</Label>
                          <Input
                            id="account-number"
                            value={accountForm.accountNumber}
                            onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
                            placeholder="e.g., 0123456789"
                            required
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="account-name">Account Name</Label>
                          <Input
                            id="account-name"
                            value={accountForm.accountName}
                            onChange={(e) => setAccountForm({ ...accountForm, accountName: e.target.value })}
                            placeholder="Triton International School"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sort-order">Display Order</Label>
                          <Input
                            id="sort-order"
                            type="number"
                            value={accountForm.sortOrder}
                            onChange={(e) => setAccountForm({ ...accountForm, sortOrder: parseInt(e.target.value) || 0 })}
                            min="0"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={createPaymentAccount.isPending || updatePaymentAccount.isPending}>
                          {createPaymentAccount.isPending || updatePaymentAccount.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : null}
                          {editingAccountId ? 'Update Account' : 'Add Account'}
                        </Button>
                        <Button type="button" variant="outline" onClick={handleAccountCancel}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {!showAccountForm && (
                  <Button onClick={() => setShowAccountForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Payment Account
                  </Button>
                )}

                {/* Accounts List */}
                {loadingAccounts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="pl-6">Bank</TableHead>
                        <TableHead>Account Number</TableHead>
                        <TableHead>Account Name</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead className="text-right pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="pl-6 font-medium">{account.bank_name}</TableCell>
                          <TableCell className="font-mono">{account.account_number}</TableCell>
                          <TableCell>{account.account_name}</TableCell>
                          <TableCell>{account.sort_order}</TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleAccountEdit(account)}
                                title="Edit Payment Account"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleAccountDelete(account.id)}
                                disabled={deletePaymentAccount.isPending}
                                title="Delete Payment Account"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
