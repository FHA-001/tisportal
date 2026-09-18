import { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useClasses, useAcademicSessions } from '@/hooks/use-academics';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { BellRing, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';

type NotifyResultsResponse = {
  success?: boolean;
  error?: string | null;
  student_notifications?: number;
  parent_notifications?: number;
  teacher_notifications?: number;
  class_name?: string;
  term?: string;
  session?: string;
};

export default function AdminReports() {
  const { data: classes = [] } = useClasses();
  const { data: sessions = [] } = useAcademicSessions();
  const activeSession = sessions.find((session) => session.is_active);

  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('First Term');
  const [isSending, setIsSending] = useState(false);

  // Mock data for charts - in a real app, these would aggregate actual DB data
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

  const handleNotifyResults = async () => {
    if (!selectedClass || !selectedTerm) {
      toast.error('Please select a class and term first.');
      return;
    }

    if (!activeSession?.name) {
      toast.error('No active academic session is configured.');
      return;
    }

    setIsSending(true);
    toast.loading('Publishing result notifications...', { id: 'notify-results' });

    try {
      const { data, error } = await supabase.rpc('notify_results_posted', {
        p_class_id: selectedClass,
        p_term: selectedTerm,
        p_session: activeSession.name,
      });

      if (error) throw error;

      const result = data as NotifyResultsResponse | null;

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to publish result notifications.');
      }

      const studentsNotified = result.student_notifications ?? 0;
      const parentsNotified = result.parent_notifications ?? 0;
      const teachersNotified = result.teacher_notifications ?? 0;

      toast.success(
        `Results posted: ${studentsNotified} student(s), ${parentsNotified} parent(s), and ${teachersNotified} teacher(s) notified.`,
        { id: 'notify-results' }
      );
    } catch (err: any) {
      toast.error(err?.message || 'Failed to publish result notifications.', {
        id: 'notify-results',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout role="admin">
        <PageHeader title="Reports & Analytics" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="shadow-sm border-border">
            <CardHeader>
              <CardTitle className="text-lg font-heading">Enrollment by Class</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={enrollmentByClass}
                  margin={{ top: 20, right: 30, left: 0, bottom: 25 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--color-border)"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--color-navy-600)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border">
            <CardHeader>
              <CardTitle className="text-lg font-heading">
                School-Wide Grade Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={gradeDistribution}
                  margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--color-border)"
                  />
                  <XAxis
                    dataKey="grade"
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--color-gold-500)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border-border bg-gradient-to-br from-card to-navy-50/50 dark:to-navy-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading">
              <BellRing className="w-5 h-5 text-navy-600" />
              Publish Results & Notify Users
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="space-y-2 w-full md:w-64">
                <Label>Select Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 w-full md:w-64">
                <Label>Select Term</Label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="First Term">First Term</SelectItem>
                    <SelectItem value="Second Term">Second Term</SelectItem>
                    <SelectItem value="Third Term">Third Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleNotifyResults}
                disabled={isSending || !selectedClass || !activeSession?.name}
                className="bg-navy-700 hover:bg-navy-800 text-white w-full md:w-auto"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <BellRing className="w-4 h-4 mr-2" />
                )}
                Publish & Notify
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              Sends an in-portal result notification to active students in the selected
              class, their linked parents, and teachers assigned to that class for the
              active academic session.
            </p>

            {!activeSession?.name && (
              <p className="text-sm text-destructive mt-2">
                No active academic session is configured. Activate a session before
                publishing result notifications.
              </p>
            )}
          </CardContent>
        </Card>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
