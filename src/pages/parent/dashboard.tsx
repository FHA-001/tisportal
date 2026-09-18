import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useParentChildren, useStudentFeeSummary } from '@/hooks/use-parents';
import { useAcademicSessions } from '@/hooks/use-academics';
import { getCustomSession } from '@/lib/auth-utils';
import { getTimeBasedGreeting } from '@/lib/greeting';
import {
  Users,
  Award,
  Banknote,
  Newspaper,
  ArrowRight,
  CheckCircle2,
  Clock3,
  AlertCircle,
} from 'lucide-react';

type ParentChild = {
  student_id: string;
  students?: {
    id?: string;
    full_name?: string;
    admission_number?: string;
    class_id?: string;
    tier?: string;
    classes?: {
      name?: string;
    } | null;
  } | null;
};

function formatNaira(value: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);
}

function ChildFeeStatus({
  child,
  activeSessionId,
}: {
  child: ParentChild;
  activeSessionId?: string;
}) {
  const studentId = child.students?.id || child.student_id;
  const studentName = child.students?.full_name || 'Student';
  const admissionNumber = child.students?.admission_number || 'No admission number';
  const className = child.students?.classes?.name || '';

  const {
    data: feeSummary,
    isLoading,
    isError,
  } = useStudentFeeSummary(studentId, activeSessionId, className);

  if (!activeSessionId) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <div className="font-medium">{studentName}</div>
        <p className="text-xs text-muted-foreground mt-1">{admissionNumber}</p>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          No active academic session configured.
        </div>
      </div>
    );
  }

  if (!className) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <div className="font-medium">{studentName}</div>
        <p className="text-xs text-muted-foreground mt-1">{admissionNumber}</p>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          Student class is not available.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-4 animate-pulse">
        <div className="h-4 w-32 rounded bg-muted mb-2" />
        <div className="h-3 w-24 rounded bg-muted mb-5" />
        <div className="h-2 w-full rounded bg-muted" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <div className="font-medium">{studentName}</div>
        <p className="text-xs text-muted-foreground mt-1">{admissionNumber}</p>
        <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          Unable to load fee status.
        </div>
      </div>
    );
  }

  const totalFees = Number(feeSummary?.total_fees || 0);
  const totalPaid = Number(feeSummary?.total_paid || 0);
  const outstanding = Math.max(Number(feeSummary?.outstanding || 0), 0);

  const progress =
    totalFees > 0 ? Math.min(100, Math.max(0, (totalPaid / totalFees) * 100)) : 0;

  const feeConfigured = totalFees > 0;
  const isPaid = feeConfigured && outstanding <= 0;
  const isPartial = feeConfigured && totalPaid > 0 && outstanding > 0;

  const statusLabel = !feeConfigured
    ? 'Fee Not Configured'
    : isPaid
      ? 'Paid'
      : isPartial
        ? 'Partially Paid'
        : 'Not Paid';

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold truncate">{studentName}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {admissionNumber}
            {className ? ` • ${className}` : ''}
          </p>
        </div>

        <div
          className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isPaid
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : isPartial
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                : 'bg-red-500/10 text-red-700 dark:text-red-400'
          }`}
        >
          {isPaid ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : isPartial ? (
            <Clock3 className="h-3.5 w-3.5" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5" />
          )}
          {statusLabel}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Payment progress</span>
          <span>{Math.round(progress)}%</span>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Fee</p>
          <p className="font-semibold mt-1">{formatNaira(totalFees)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="font-semibold mt-1">{formatNaira(totalPaid)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Balance</p>
          <p className="font-semibold mt-1">{formatNaira(outstanding)}</p>
        </div>
      </div>
    </div>
  );
}

export default function ParentDashboard() {
  const session = getCustomSession();
  const { data: children = [], isLoading: childrenLoading } = useParentChildren();
  const { data: sessions = [] } = useAcademicSessions();

  const activeSession = sessions.find((item) => item.is_active);

  return (
    <CustomSessionGuard role="parent">
      <DashboardLayout role="parent">
        <PageHeader
          title="Parent Dashboard"
          subtitle={getTimeBasedGreeting(session?.full_name?.split(' ')[0])}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="card-premium border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Children</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {childrenLoading ? '—' : children.length}
              </div>
              <p className="text-xs text-muted-foreground">Linked to your account</p>
            </CardContent>
          </Card>

          <Card className="card-premium border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Academic Results</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-start px-0" asChild>
                <a href="/parent/grades">
                  View Grades <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="card-premium border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">School Fees</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-start px-0" asChild>
                <a href="/parent/fees">
                  View Fees <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="card-premium border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Newsletters</CardTitle>
              <Newspaper className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-start px-0" asChild>
                <a href="/parent/newsletters">
                  View Updates <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="card-premium border-border">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-primary" />
                School Fee Status
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeSession?.name
                  ? `${activeSession.name} • ${activeSession.current_term || 'Current term'}`
                  : 'Current academic session'}
              </p>
            </div>

            <Button variant="outline" size="sm" asChild>
              <a href="/parent/payment-history">Payment History</a>
            </Button>
          </CardHeader>

          <CardContent>
            {childrenLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[0, 1].map((item) => (
                  <div
                    key={item}
                    className="h-40 rounded-xl border border-border bg-muted/20 animate-pulse"
                  />
                ))}
              </div>
            ) : children.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 font-medium">No linked children</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fee status will appear once a student is linked to this parent account.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {children.map((child: ParentChild) => (
                  <ChildFeeStatus
                    key={child.student_id}
                    child={child}
                    activeSessionId={activeSession?.id}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </DashboardLayout>
    </CustomSessionGuard>
  );
}
