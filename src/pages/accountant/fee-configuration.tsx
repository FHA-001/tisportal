import { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AccountantFeeConfiguration,
  useAccountantFeeConfiguration,
  useUpdateAccountantSchoolFee,
} from '@/hooks/use-accountant-fees';
import { Banknote, CheckCircle2, Loader2, Pencil, Save, Search, X } from 'lucide-react';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

export default function AccountantFeeConfigurationPage() {
  const [search, setSearch] = useState('');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState('');

  const { data: fees = [], isLoading, error } = useAccountantFeeConfiguration();
  const updateFee = useUpdateAccountantSchoolFee();

  const filteredFees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return fees;

    return fees.filter((fee) =>
      fee.class_name.toLowerCase().includes(q) ||
      (fee.class_tier ?? '').toLowerCase().includes(q)
    );
  }, [fees, search]);

  const configuredCount = fees.filter((fee) => fee.fee_id && fee.fee_amount > 0).length;
  const missingCount = fees.length - configuredCount;
  const sessionName = fees[0]?.academic_session_name ?? 'No active session';
  const currentTerm = fees[0]?.current_term ?? '';

  const beginEdit = (fee: AccountantFeeConfiguration) => {
    setEditingClassId(fee.class_id);
    setEditingAmount(fee.fee_amount > 0 ? String(fee.fee_amount) : '');
  };

  const cancelEdit = () => {
    setEditingClassId(null);
    setEditingAmount('');
  };

  const saveFee = async (classId: string) => {
    const amount = Number(editingAmount);
    if (!Number.isFinite(amount) || amount < 0) return;

    await updateFee.mutateAsync({ classId, feeAmount: amount });
    cancelEdit();
  };

  return (
    <CustomSessionGuard role="accountant">
      <DashboardLayout role="accountant">
        <PageHeader title="Fee Configuration" subtitle="View and update class fee amounts." />

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="card-premium border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Banknote className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Classes</p>
                    <p className="text-2xl font-bold">{fees.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-premium border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Configured</p>
                    <p className="text-2xl font-bold">{configuredCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-premium border-border">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Active Session</p>
                <p className="font-semibold">{sessionName}</p>
                {currentTerm && <p className="text-xs text-muted-foreground">{currentTerm}</p>}
              </CardContent>
            </Card>
          </div>

          <Card className="card-premium border-border">
            <CardHeader>
              <CardTitle>Class Fee Structure</CardTitle>
              <CardDescription>
                Accountant access is limited to class fee amounts. Payment accounts and other administrator controls remain Admin-only.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="w-full space-y-2 sm:max-w-sm">
                  <Label htmlFor="fee-search">Search Classes</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="fee-search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by class or tier..."
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  {missingCount > 0
                    ? `${missingCount} class(es) have no fee configured`
                    : 'All classes have fee amounts configured'}
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
                  Failed to load fee configuration: {error.message}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <Table className="min-w-[720px]">
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Class</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Fee Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                            No classes match your search.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredFees.map((fee) => {
                          const isEditing = editingClassId === fee.class_id;
                          const configured = Boolean(fee.fee_id) && fee.fee_amount > 0;

                          return (
                            <TableRow key={fee.class_id}>
                              <TableCell className="font-medium">{fee.class_name}</TableCell>
                              <TableCell>{fee.class_tier || '-'}</TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">₦</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={editingAmount}
                                      onChange={(e) => setEditingAmount(e.target.value)}
                                      className="h-9 w-40"
                                      autoFocus
                                    />
                                  </div>
                                ) : (
                                  <span className="font-semibold">
                                    {configured ? formatCurrency(fee.fee_amount) : 'Not configured'}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className={configured
                                  ? 'inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700'
                                  : 'inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700'}>
                                  {configured ? 'Configured' : 'Missing'}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {isEditing ? (
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => saveFee(fee.class_id)}
                                      disabled={updateFee.isPending || editingAmount.trim() === '' || Number(editingAmount) < 0}
                                    >
                                      {updateFee.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={updateFee.isPending}>
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button size="sm" variant="ghost" onClick={() => beginEdit(fee)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </CustomSessionGuard>
  );
}
