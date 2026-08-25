import { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAcademicSessions } from '@/hooks/use-academics';
import { useFinanceStats, useMonthlyRevenue } from '@/hooks/use-finance';
import { getCustomSession } from '@/lib/auth-utils';
import { Search, Download, FileText, Calendar, TrendingUp, Filter } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function FinancialReports() {
  const [search, setSearch] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const session = getCustomSession();
  const { data: sessions = [] } = useAcademicSessions();
  const { data: stats } = useFinanceStats();
  const { data: monthlyRevenue } = useMonthlyRevenue();

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Report', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });
    
    // Summary Statistics
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary Statistics', 20, 45);
    
    const summaryData = [
      ['Total Revenue', `₦${stats?.totalRevenue?.toLocaleString() || 0}`],
      ['Revenue This Session', `₦${stats?.revenueThisSession?.toLocaleString() || 0}`],
      ['Revenue This Month', `₦${stats?.revenueThisMonth?.toLocaleString() || 0}`],
      ['Approved Payments', stats?.approvedPayments?.toString() || '0'],
      ['Pending Reviews', stats?.pendingReviews?.toString() || '0'],
      ['Rejected Payments', stats?.rejectedPayments?.toString() || '0'],
      ['Total Transactions', stats?.totalTransactions?.toString() || '0'],
    ];
    
    autoTable(doc, {
      startY: 50,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
    });
    
    // Monthly Revenue
    const monthlyData = monthlyRevenue?.map(mr => [mr.month, `₦${mr.revenue.toLocaleString()}`]) || [];
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Month', 'Revenue']],
      body: monthlyData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
    });
    
    doc.save('financial-report.pdf');
    toast.success('Financial report exported successfully');
  };

  const handleExportExcel = () => {
    // Create CSV content
    let csv = 'Month,Revenue\n';
    monthlyRevenue?.forEach(mr => {
      csv += `${mr.month},${mr.revenue}\n`;
    });
    
    // Add summary statistics
    csv += '\nSummary Statistics\n';
    csv += `Total Revenue,${stats?.totalRevenue || 0}\n`;
    csv += `Revenue This Session,${stats?.revenueThisSession || 0}\n`;
    csv += `Revenue This Month,${stats?.revenueThisMonth || 0}\n`;
    csv += `Approved Payments,${stats?.approvedPayments || 0}\n`;
    csv += `Pending Reviews,${stats?.pendingReviews || 0}\n`;
    csv += `Rejected Payments,${stats?.rejectedPayments || 0}\n`;
    csv += `Total Transactions,${stats?.totalTransactions || 0}\n`;
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'financial-report.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Financial report exported successfully');
  };

  return (
    <CustomSessionGuard role="accountant">
      <DashboardLayout role="accountant">
        <PageHeader title="Financial Reports" />

        <div className="space-y-6">
          {/* Filters */}
          <Card className="card-premium border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
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
                  <Label>Status</Label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  >
                    <option value="">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Buttons */}
          <div className="flex gap-4">
            <Button onClick={handleExportPDF} className="gap-2">
              <FileText className="w-4 h-4" />
              Export PDF
            </Button>
            <Button onClick={handleExportExcel} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export Excel
            </Button>
          </div>

          {/* Financial Statistics */}
          <Card className="card-premium border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Financial Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Total Approved Amount</Label>
                  <p className="text-2xl font-bold">₦{stats?.totalRevenue?.toLocaleString() || 0}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Total Pending Amount</Label>
                  <p className="text-2xl font-bold text-yellow-600">
                    ₦{stats?.pendingAmount?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Total Rejected Amount</Label>
                  <p className="text-2xl font-bold text-red-600">
                    ₦{stats?.rejectedAmount?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Approval Rate</Label>
                  <p className="text-2xl font-bold text-green-600">
                    {stats?.totalTransactions ? ((stats.approvedPayments / stats.totalTransactions) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Rejection Rate</Label>
                  <p className="text-2xl font-bold text-red-600">
                    {stats?.totalTransactions ? ((stats.rejectedPayments / stats.totalTransactions) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Average Monthly Revenue</Label>
                  <p className="text-2xl font-bold">
                    ₦{stats?.revenueThisMonth ? stats.revenueThisMonth.toLocaleString() : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Revenue Table */}
          <Card className="card-premium border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Monthly Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Month</th>
                      <th className="text-left p-3 font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyRevenue?.map((mr) => (
                      <tr key={mr.month} className="border-b hover:bg-muted/50">
                        <td className="p-3">{mr.month}</td>
                        <td className="p-3 font-medium">₦{mr.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </CustomSessionGuard>
  );
}
