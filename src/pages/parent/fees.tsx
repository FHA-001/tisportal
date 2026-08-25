import { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useParentChildren } from '@/hooks/use-parents';
import { useFeePayments, useStudentFeeSummary } from '@/hooks/use-parents';
import { usePaymentAccounts } from '@/hooks/use-school-fees';
import { useAcademicSessions } from '@/hooks/use-academics';
import { getCustomSession } from '@/lib/auth-utils';
import { Banknote, Loader2, ChevronDown, User, CreditCard, AlertCircle, CheckCircle, Building2 } from 'lucide-react';

export default function ParentFees() {
  const session = getCustomSession();
  const { data: children = [], isLoading: childrenLoading } = useParentChildren(session?.id);
  const { data: sessions = [] } = useAcademicSessions();
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [showChildDropdown, setShowChildDropdown] = useState(false);
  const [showTermDropdown, setShowTermDropdown] = useState(false);

  const selectedChild = children.find((c: any) => c.students?.id === selectedChildId);
  const selectedTerm = sessions.find((s: any) => s.id === selectedTermId);
  
  // Set first child and current term as default when data loads
  if (children.length > 0 && !selectedChildId && children[0].students) {
    setSelectedChildId(children[0].students.id);
  }
  if (sessions.length > 0 && !selectedTermId) {
    setSelectedTermId(sessions[0].id);
  }

  const { data: feeSummary, isLoading: summaryLoading } = useStudentFeeSummary(selectedChildId, selectedTermId, selectedChild?.students?.classes?.name);
  const { data: payments = [], isLoading: paymentsLoading } = useFeePayments(selectedChildId);
  const { data: paymentAccounts = [] } = usePaymentAccounts();

  const filteredPayments = payments.filter((p: any) => p.term_id === selectedTermId);

  return (
    <CustomSessionGuard role="parent">
      <DashboardLayout role="parent">
        <PageHeader 
          title="School Fees" 
          subtitle="View fee payment status and school account details." 
        />

        <Card className="card-premium border-border mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Select Child & Term
            </CardTitle>
            <CardDescription>
              Choose which child and academic term to view fees for.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="text-sm font-medium mb-2 block">Child</label>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => setShowChildDropdown(!showChildDropdown)}
                  disabled={childrenLoading}
                >
                  {selectedChild && selectedChild.students ? (
                    <span>{selectedChild.students.full_name} ({selectedChild.students.admission_number})</span>
                  ) : (
                    <span>Select a child</span>
                  )}
                  <ChevronDown className="w-4 h-4" />
                </Button>
                
                {showChildDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {children.map((child: any) => (
                      <button
                        key={child.id}
                        className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b last:border-b-0"
                        onClick={() => {
                          if (child.students) {
                            setSelectedChildId(child.students.id);
                            setShowChildDropdown(false);
                          }
                        }}
                      >
                        {child.students ? (
                          <>
                            <div className="font-medium">{child.students.full_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {child.students.admission_number} • {child.students.classes?.name}
                            </div>
                          </>
                        ) : (
                          <div className="text-muted-foreground">Student data not available</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <label className="text-sm font-medium mb-2 block">Academic Term</label>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => setShowTermDropdown(!showTermDropdown)}
                  disabled={sessions.length === 0}
                >
                  {selectedTerm ? (
                    <span>{selectedTerm.name} ({selectedTerm.term} {selectedTerm.year})</span>
                  ) : (
                    <span>Select a term</span>
                  )}
                  <ChevronDown className="w-4 h-4" />
                </Button>
                
                {showTermDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {sessions.map((session: any) => (
                      <button
                        key={session.id}
                        className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b last:border-b-0"
                        onClick={() => {
                          setSelectedTermId(session.id);
                          setShowTermDropdown(false);
                        }}
                      >
                        <div className="font-medium">{session.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {session.term} • {session.year}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedChild && selectedChild.students && selectedTerm && (
          <>
            <Card className="card-premium border-border mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="w-5 h-5" />
                  Fee Summary
                </CardTitle>
                <CardDescription>
                  {selectedChild.students.full_name} • {selectedTerm.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : feeSummary ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Total Fees</div>
                      <div className="text-2xl font-bold">₦{feeSummary.total_fees.toLocaleString()}</div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Amount Paid</div>
                      <div className="text-2xl font-bold text-emerald-600">₦{feeSummary.total_paid.toLocaleString()}</div>
                    </div>
                    <div className={`p-4 rounded-lg ${feeSummary.outstanding > 0 ? 'bg-red-50' : feeSummary.outstanding < 0 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                      <div className="text-sm text-muted-foreground mb-1">
                        {feeSummary.outstanding < 0 ? 'Overpayment' : 'Outstanding Balance'}
                      </div>
                      <div className={`text-2xl font-bold ${feeSummary.outstanding > 0 ? 'text-red-600' : feeSummary.outstanding < 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        ₦{Math.abs(feeSummary.outstanding).toLocaleString()}
                      </div>
                      {feeSummary.outstanding > 0 && (
                        <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                          <AlertCircle className="w-3 h-3" />
                          Payment pending
                        </div>
                      )}
                      {feeSummary.outstanding === 0 && (
                        <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
                          <CheckCircle className="w-3 h-3" />
                          Fully paid
                        </div>
                      )}
                      {feeSummary.outstanding < 0 && (
                        <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                          <AlertCircle className="w-3 h-3" />
                          You overpaid by ₦{Math.abs(feeSummary.outstanding).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No fee information available for this term.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="card-premium border-border mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  School Account Details
                </CardTitle>
                <CardDescription>
                  Use these details to make fee payments via bank transfer.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {paymentAccounts.length > 0 ? (
                  <div className="space-y-4">
                    {paymentAccounts.map((account: any) => (
                      <div key={account.id} className="p-4 bg-muted/50 rounded-lg border border-border">
                        <div className="text-sm text-muted-foreground mb-1">Bank Name</div>
                        <div className="text-lg font-bold">{account.bank_name}</div>
                        <div className="text-sm text-muted-foreground mb-1 mt-2">Account Number</div>
                        <div className="text-lg font-bold">{account.account_number}</div>
                        <div className="text-sm text-muted-foreground mb-1 mt-2">Account Name</div>
                        <div className="text-lg font-bold">{account.account_name}</div>
                      </div>
                    ))}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start gap-2">
                        <CreditCard className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <strong>Important:</strong> After making a payment, please send your payment confirmation (teller number, amount, date) to the school administration for recording.
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    School account details not available. Please contact the administration.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="card-premium border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment History
                </CardTitle>
                <CardDescription>
                  Record of all fee payments made for this term.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredPayments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No payments recorded for this term yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredPayments.map((payment: any) => (
                      <div
                        key={payment.id}
                        className="p-4 bg-muted/50 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium">₦{parseFloat(payment.amount).toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(payment.date_paid).toLocaleDateString()}
                            {payment.reference_note && ` • Ref: ${payment.reference_note}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {payment.payment_method} • Recorded by {payment.admins?.full_name}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">Paid</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </DashboardLayout>
    </CustomSessionGuard>
  );
}
