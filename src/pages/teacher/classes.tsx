import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { useClassSubjects } from '@/hooks/use-academics';
import { getCustomSession } from '@/lib/auth-utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen, Layers } from 'lucide-react';

export default function TeacherClasses() {
  const session = getCustomSession();
  const { data: assignments = [], isLoading } = useClassSubjects(undefined, session?.id);

  return (
    <CustomSessionGuard role="teacher">
      <DashboardLayout role="teacher">
        <PageHeader title="My Classes & Subjects" />

        <div className="grid gap-6">
          {isLoading ? (
            <div className="h-40 flex items-center justify-center bg-card rounded-xl border border-border">
              <span className="text-muted-foreground">Loading assignments...</span>
            </div>
          ) : assignments.length === 0 ? (
            <div className="py-16 text-center border border-dashed rounded-xl bg-muted/30">
              <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">No Classes Assigned</h3>
              <p className="text-muted-foreground max-w-md mx-auto mt-2">
                You have not been assigned to teach any classes yet. Please contact the administrator.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {assignments.map(a => (
                <Card key={a.id} className="overflow-hidden border-border hover:border-primary/50 transition-colors shadow-sm group">
                  <div className="h-2 bg-gradient-to-r from-navy-500 to-primary w-full" />
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl font-heading text-foreground">{a.classes?.name}</CardTitle>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-muted font-medium text-muted-foreground">
                        {a.classes?.tier}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-navy-50/50 dark:bg-navy-950/20 border border-navy-100 dark:border-navy-900">
                      <div className="p-2 rounded-md bg-white dark:bg-card shadow-sm border border-border">
                        <BookOpen className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Subject</p>
                        <p className="font-medium text-foreground">{a.subjects?.name}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </CustomSessionGuard>
  );
}
