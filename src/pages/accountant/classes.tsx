import { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useAccountantClassesFeeSummary,
  useAccountantClassFeeOverview,
  AccountantFeeStatus,
} from '@/hooks/use-accountant-classes';
import {
  BookOpen,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  Search,
  Users,
  WalletCards,
} from 'lucide-react';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

const statusLabel: Record<AccountantFeeStatus, string> = {
  paid: 'Paid',
  partially_paid: 'Partially Paid',
  unpaid: 'Unpaid',
  not_configured: 'Fee Not Configured',
};

const statusClass: Record<AccountantFeeStatus, string> = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900',
  partially_paid: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900',
  unpaid: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900',
  not_configured: 'bg-muted text-muted-foreground border-border',
};

export default function AccountantClasses() {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AccountantFeeStatus>('all');

  const {
    data: classes = [],
    isLoading: classesLoading,
    error: classesError,
  } = useAccountantClassesFeeSummary();

  const {
    data: students = [],
    isLoading: studentsLoading,
    error: studentsError,
  } = useAccountantClassFeeOverview(selectedClassId);

  const selectedClass = classes.find((item) => item.class_id === selectedClassId);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((student) => {
      const matchesSearch =
        !query ||
        student.full_name.toLowerCase().includes(query) ||
        (student.admission_number ?? '').toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === 'all' || student.fee_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [students, search, statusFilter]);

  const summary = useMemo(() => {
    return students.reduce(
      (acc, student) => {
        acc.total += 1;
        acc.totalExpected += student.configured_fee;
        acc.totalPaid += student.amount_paid;
        acc.totalOutstanding += student.balance;

        if (student.fee_status === 'paid') acc.paid += 1;
        if (student.fee_status === 'partially_paid') acc.partial += 1;
        if (student.fee_status === 'unpaid') acc.unpaid += 1;

        return acc;
      },
      {
        total: 0,
        paid: 0,
        partial: 0,
        unpaid: 0,
        totalExpected: 0,
        totalPaid: 0,
        totalOutstanding: 0,
      }
    );
  }, [students]);

  return (
    <CustomSessionGuard role="accountant">
      <DashboardLayout role="accountant">
        <PageHeader
          title="Classes & Fee Status"
          subtitle="View student fee positions by class for the active academic session."
        />

        <div className="space-y-6">
          <Card className="card-premium border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5" />
                Select Class
              </CardTitle>
            </CardHeader>
            <CardContent>
              {classesLoading ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading classes...
                </div>
              ) : classesError ? (
                <p className="text-sm text-destructive">
                  Failed to load classes: {classesError.message}
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                  <div className="space-y-2">
                    <Label htmlFor="class-filter">Class</Label>
                    <select
                      id="class-filter"
                      value={selectedClassId}
                      onChange={(event) => {
                        setSelectedClassId(event.target.value);
                        setSearch('');
                        setStatusFilter('all');
                      }}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Select a class</option>
                      {classes.map((item) => (
                        <option key={item.class_id} value={item.class_id}>
                          {item.class_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedClass && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">Configured Fee</p>
                        <p className="mt-1 font-semibold">
                          {formatCurrency(selectedClass.fee_amount)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">Students</p>
                        <p className="mt-1 font-semibold">
                          {selectedClass.active_student_count}
                        </p>
                      </div>
                      <div className="col-span-2 rounded-xl border border-border bg-muted/30 p-3 sm:col-span-1">
                        <p className="text-xs text-muted-foreground">Session</p>
                        <p className="mt-1 font-semibold">
                          {selectedClass.academic_session_name ?? 'Not configured'}
                        </p>
                        {selectedClass.current_term && (
                          <p className="text-xs text-muted-foreground">
                            {selectedClass.current_term}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {!selectedClassId ? (
            <Card className="border-dashed border-border">
              <CardContent className="py-14 text-center">
                <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <h3 className="font-medium">Select a class</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose a class above to view its students and fee status.
                </p>
              </CardContent>
            </Card>
          ) : studentsLoading ? (
            <Card className="border-border">
              <CardContent className="flex items-center justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : studentsError ? (
            <Card className="border-destructive/40">
              <CardContent className="py-8 text-sm text-destructive">
                Failed to load student fee status: {studentsError.message}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Card className="card-premium border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Students</p>
                        <p className="text-2xl font-bold">{summary.total}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-premium border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="text-2xl font-bold">{summary.paid}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-premium border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <WalletCards className="h-5 w-5 text-amber-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Part Paid</p>
                        <p className="text-2xl font-bold">{summary.partial}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-premium border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <CircleDollarSign className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Outstanding</p>
                        <p className="text-lg font-bold">
                          {formatCurrency(summary.totalOutstanding)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="card-premium border-border">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {selectedClass?.class_name ?? 'Class'} Fee Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="student-search">Search Student</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="student-search"
                          placeholder="Name or admission number..."
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fee-status">Fee Status</Label>
                      <select
                        id="fee-status"
                        value={statusFilter}
                        onChange={(event) =>
                          setStatusFilter(
                            event.target.value as 'all' | AccountantFeeStatus
                          )
                        }
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="all">All Statuses</option>
                        <option value="paid">Paid</option>
                        <option value="partially_paid">Partially Paid</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="not_configured">Fee Not Configured</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Expected</p>
                      <p className="font-semibold">
                        {formatCurrency(summary.totalExpected)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Received</p>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(summary.totalPaid)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Outstanding</p>
                      <p className="font-semibold text-red-700 dark:text-red-400">
                        {formatCurrency(summary.totalOutstanding)}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <Table className="min-w-[900px]">
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Admission #</TableHead>
                          <TableHead>Configured Fee</TableHead>
                          <TableHead>Paid</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="h-28 text-center text-muted-foreground"
                            >
                              No students match the current filters.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredStudents.map((student) => (
                            <TableRow key={student.student_id}>
                              <TableCell className="font-medium">
                                {student.full_name}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {student.admission_number || '-'}
                              </TableCell>
                              <TableCell>
                                {formatCurrency(student.configured_fee)}
                              </TableCell>
                              <TableCell className="font-medium text-emerald-700 dark:text-emerald-400">
                                {formatCurrency(student.amount_paid)}
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(student.balance)}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass[student.fee_status]}`}
                                >
                                  {statusLabel[student.fee_status]}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Showing {filteredStudents.length} of {students.length} active
                    student(s).
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DashboardLayout>
    </CustomSessionGuard>
  );
}
