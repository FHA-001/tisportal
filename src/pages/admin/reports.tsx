import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useClasses } from '@/hooks/use-academics';

export default function AdminReports() {
  const { data: classes = [] } = useClasses();

  const enrollmentByClass = classes
    .map((c) => ({
      name: c.name,
      count: c.students?.[0]?.count || 0,
    }))
    .filter((c) => c.count > 0);

  const gradeDistribution = [
    { grade: 'A1', count: 45 },
    { grade: 'B2', count: 60 },
    { grade: 'B3', count: 55 },
    { grade: 'C4', count: 40 },
    { grade: 'C5', count: 35 },
    { grade: 'C6', count: 30 },
    { grade: 'D7', count: 15 },
    { grade: 'E8', count: 10 },
    { grade: 'F9', count: 5 },
  ];

  return (
    <ProtectedRoute>
      <DashboardLayout role="admin">
        <PageHeader title="Reports & Analytics" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="border-border shadow-sm">
            <CardHeader><CardTitle className="text-lg font-heading">Enrollment by Class</CardTitle></CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enrollmentByClass} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} angle={-45} textAnchor="end" />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                  <Bar dataKey="count" fill="var(--color-navy-600)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader><CardTitle className="text-lg font-heading">School-Wide Grade Distribution</CardTitle></CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeDistribution} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="grade" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                  <Bar dataKey="count" fill="var(--color-gold-500)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
