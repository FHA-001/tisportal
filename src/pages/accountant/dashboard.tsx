import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCustomSession } from '@/lib/auth-utils';
import { getTimeBasedGreeting } from '@/lib/greeting';
import { useFinanceStats, useMonthlyRevenue, usePaymentMethodBreakdown, useSessionRevenue } from '@/hooks/use-finance';
import { Banknote, Clock, CheckCircle, XCircle, TrendingUp, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

          <Card className="card-premium border-border">
            <CardContent className="p-6">
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Detailed finance analytics and reports will be available in the Financial Reports section.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monthly Revenue Chart */}
            <Card className="card-premium border-border">
              <CardHeader>
                <CardTitle>Monthly Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `₦${value.toLocaleString()}`} />
                    <Bar dataKey="revenue" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Payment Methods Chart */}
            <Card className="card-premium border-border">
              <CardHeader>
                <CardTitle>Payment Methods Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
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
                      {paymentMethodChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `₦${value.toLocaleString()}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Session Revenue Chart */}
          <Card className="card-premium border-border">
            <CardHeader>
              <CardTitle>Revenue by Academic Session</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sessionRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sessionName" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `₦${value.toLocaleString()}`} />
                  <Bar dataKey="revenue" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

      </DashboardLayout>
    </CustomSessionGuard>
  );
}
