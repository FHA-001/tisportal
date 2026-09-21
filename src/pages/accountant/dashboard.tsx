import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCustomSession } from '@/lib/auth-utils';
import { getTimeBasedGreeting } from '@/lib/greeting';
import { useFinanceStats, useMonthlyRevenue, usePaymentMethodBreakdown, useSessionRevenue } from '@/hooks/use-finance';
import { Banknote, Clock, CheckCircle, XCircle, TrendingUp, Calendar, Megaphone, Newspaper, ArrowRight, ClipboardList } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Button } from '@/components/ui/button';

export default function AccountantDashboard() {
  const session = getCustomSession();
  const { data: stats, isLoading } = useFinanceStats();
  const { data: monthlyRevenue } = useMonthlyRevenue();
  const { data: paymentMethods } = usePaymentMethodBreakdown();
  const { data: sessionRevenue } = useSessionRevenue();

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const paymentMethodChartData = paymentMethods?.map(pm => ({
    name: pm.method.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
    value: pm.amount,
    count: pm.count,
  })) || [];

  return (
    <CustomSessionGuard role="accountant">
      <DashboardLayout role="accountant">
        <PageHeader 
          title="Accountant Dashboard" 
          subtitle={getTimeBasedGreeting(session?.full_name?.split(' ')[0])}
        />

        <div className="space-y-6">
          {/* Finance Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="card-premium border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">
                      {isLoading ? '...' : `₦${stats?.totalRevenue?.toLocaleString() || 0}`}
                    </p>
                  </div>
                  <Banknote className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-premium border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue This Session</p>
                    <p className="text-2xl font-bold">
                      {isLoading ? '...' : `₦${stats?.revenueThisSession?.toLocaleString() || 0}`}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-premium border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue This Month</p>
                    <p className="text-2xl font-bold">
                      {isLoading ? '...' : `₦${stats?.revenueThisMonth?.toLocaleString() || 0}`}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-premium border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue Today</p>
                    <p className="text-2xl font-bold">
                      {isLoading ? '...' : `₦${stats?.revenueToday?.toLocaleString() || 0}`}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="card-premium border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Approved Payments</p>
                    <p className="text-2xl font-bold">{isLoading ? '...' : stats?.approvedPayments || 0}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-premium border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Reviews</p>
                    <p className="text-2xl font-bold">{isLoading ? '...' : stats?.pendingReviews || 0}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-premium border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Rejected Payments</p>
                    <p className="text-2xl font-bold">{isLoading ? '...' : stats?.rejectedPayments || 0}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-premium border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Transactions</p>
                    <p className="text-2xl font-bold">{isLoading ? '...' : stats?.totalTransactions || 0}</p>
                  </div>
                  <Banknote className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="card-premium border-border">
            <CardHeader>
              <CardTitle className="text-lg font-heading">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <a
                href="/accountant/payment-review"
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary hover:shadow-md"
              >
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Review Payments</h4>
                  <p className="text-sm text-muted-foreground">Review pending payment submissions</p>
                </div>
              </a>

              <a
                href="/accountant/financial-reports"
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary hover:shadow-md"
              >
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">View Reports</h4>
                  <p className="text-sm text-muted-foreground">Open financial reports and summaries</p>
                </div>
              </a>
            </CardContent>
          </Card>

          {/* Communication */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="card-premium border-border">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Megaphone className="w-5 h-5 text-primary" />
                      <p className="font-semibold">Announcements</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      View important school notices and updates.
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" asChild className="shrink-0">
                    <a href="/accountant/announcements" aria-label="View announcements">
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="card-premium border-border">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Newspaper className="w-5 h-5 text-primary" />
                      <p className="font-semibold">Newsletters</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Open the latest published school newsletters.
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" asChild className="shrink-0">
                    <a href="/accountant/newsletters" aria-label="View newsletters">
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monthly Revenue Chart */}
            <Card className="card-premium border-border">
              <CardHeader>
                <CardTitle>Monthly Revenue</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <div className="min-w-[520px]">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `₦${value.toLocaleString()}`} />
                    <Bar dataKey="revenue" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods Chart */}
            <Card className="card-premium border-border">
              <CardHeader>
                <CardTitle>Payment Methods Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <div className="min-w-[520px]">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentMethodChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentMethodChartData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `₦${value.toLocaleString()}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Session Revenue Chart */}
          <Card className="card-premium border-border">
            <CardHeader>
              <CardTitle>Revenue by Academic Session</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="min-w-[520px]">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sessionRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sessionName" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `₦${value.toLocaleString()}`} />
                  <Bar dataKey="revenue" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

      </DashboardLayout>
    </CustomSessionGuard>
  );
}
