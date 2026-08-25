import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { BookOpen, Users, Award } from 'lucide-react';
import { useClassSubjects } from '@/hooks/use-academics';
import { getCustomSession } from '@/lib/auth-utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getTimeBasedGreeting } from '@/lib/greeting';

export default function TeacherDashboard() {
  const session = getCustomSession();
  // Fetch classes assigned to this teacher
  const { data: assignments = [] } = useClassSubjects(undefined, session?.id);

  // Unique classes the teacher teaches
  const uniqueClassIds = new Set(assignments.map(a => a.class_id));
  const classCount = uniqueClassIds.size;
  const subjectCount = assignments.length;

  return (
    <CustomSessionGuard role="teacher">
      <DashboardLayout role="teacher">
        <PageHeader 
          title="Teacher Dashboard" 
          subtitle={getTimeBasedGreeting(session?.full_name?.split(' ')[0])} 
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <StatCard icon={BookOpen} label="My Classes" value={classCount} color="primary" delay={0} />
          <StatCard icon={Award} label="Subjects Assigned" value={subjectCount} color="gold" delay={0.1} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card-premium border-border">
            <CardHeader>
              <CardTitle className="text-lg font-heading">My Class Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="icon-premium mx-auto mb-4">
                    <BookOpen className="w-6 h-6 text-navy-600" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No classes assigned yet</h3>
                  <p className="text-muted-foreground">
                    Contact the administrator to get class assignments.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map(a => (
                    <div key={a.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-navy-50 text-navy-600 flex items-center justify-center font-bold font-heading">
                          {a.classes?.name.substring(0,2)}
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{a.classes?.name}</h4>
                          <p className="text-sm text-muted-foreground">{a.subjects?.name}</p>
                        </div>
                      </div>
                      <div className="text-xs px-2.5 py-1 rounded-full bg-muted font-medium">
                        {a.classes?.tier}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="card-premium border-border bg-gradient-to-br from-card to-navy-50/30">
            <CardHeader>
              <CardTitle className="text-lg font-heading">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <a href="/teacher/grading" className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary hover:shadow-md transition-all group">
                <div className="p-2 rounded-lg bg-gold-50 text-gold-600 group-hover:scale-110 transition-transform"><Award className="w-5 h-5" /></div>
                <div>
                  <h4 className="font-medium text-foreground">Input Grades</h4>
                  <p className="text-sm text-muted-foreground">Enter test and exam scores</p>
                </div>
              </a>
              <a href="/teacher/students" className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary hover:shadow-md transition-all group">
                <div className="p-2 rounded-lg bg-navy-50 text-navy-600 group-hover:scale-110 transition-transform"><Users className="w-5 h-5" /></div>
                <div>
                  <h4 className="font-medium text-foreground">Manage Students</h4>
                  <p className="text-sm text-muted-foreground">View roster and register new students</p>
                </div>
              </a>
            </CardContent>
          </Card>
        </div>

      </DashboardLayout>
    </CustomSessionGuard>
  );
}
