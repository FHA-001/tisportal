import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, GraduationCap, Calendar, Award, Banknote } from 'lucide-react';
import { getCustomSession } from '@/lib/auth-utils';
import { useGrades } from '@/hooks/use-records';
import { useClassSubjects, useAcademicSessions } from '@/hooks/use-academics';
import { getTimeBasedGreeting } from '@/lib/greeting';

export default function StudentDashboard() {
  const session = getCustomSession() as any; // student session
  
  const { data: sessions = [] } = useAcademicSessions();
  const activeSession = sessions.find(s => s.is_active);

  // Student specific data
  const { data: grades = [] } = useGrades({
    student_id: session?.id,
    term: activeSession?.current_term || 'First Term',
    session: activeSession?.name
  });

  const { data: classSubjects = [] } = useClassSubjects(session?.class_id);

  // Stats calculation
  const totalSubjects = classSubjects.length;
  
  // Calculate average from available grades
  const validGrades = grades.filter(g => g.total !== null);
  const totalScored = validGrades.reduce((acc, g) => acc + (g.total || 0), 0);
  const currentAverage = validGrades.length > 0 ? (totalScored / validGrades.length).toFixed(1) : 0;

  return (
    <CustomSessionGuard role="student">
      <DashboardLayout role="student">
        <PageHeader 
          title="Student Dashboard" 
          subtitle={getTimeBasedGreeting(session?.full_name?.split(' ')[0])} 
        />

        {/* Identity Card */}
        <div className="gradient-premium rounded-2xl p-6 md:p-8 mb-8 text-white relative overflow-hidden shadow-lg border border-navy-700">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-32 -mb-16 w-48 h-48 rounded-full bg-gold-500/10 blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/20 shrink-0 shadow-inner">
              <span className="text-3xl font-heading font-bold">{session?.full_name?.charAt(0)}</span>
            </div>
            <div className="text-center md:text-left flex-1">
              <h2 className="text-2xl md:text-3xl font-heading font-bold mb-1">{session?.full_name}</h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-navy-100 mb-4">
                <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full text-sm font-medium">
                  <span className="opacity-70">Adm #:</span> {session?.admission_number}
                </div>
                <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full text-sm font-medium">
                  <GraduationCap className="w-4 h-4 opacity-70" /> {session?.tier}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                  <div className="text-xs text-navy-200 mb-1">Current Average</div>
                  <div className="text-xl font-bold">{currentAverage ? `${currentAverage}%` : '-'}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                  <div className="text-xs text-navy-200 mb-1">Subjects Offered</div>
                  <div className="text-xl font-bold">{totalSubjects}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <StatCard 
            icon={Award} 
            label="Current Term Average" 
            value={currentAverage ? `${currentAverage}%` : '-'} 
            color="primary" 
            delay={0} 
          />
          <StatCard 
            icon={BookOpen} 
            label="Subjects Offered" 
            value={totalSubjects} 
            color="gold" 
            delay={0.1} 
          />
        </div>

        <h3 className="text-xl font-heading font-bold mb-4">Quick Links</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a href="/student/grades" className="block">
            <Card className="hover:border-primary/50 hover:shadow-md transition-all h-full bg-gradient-to-br from-card to-muted/30">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-heading font-semibold mb-1">My Grades & Report Cards</h4>
                  <p className="text-sm text-muted-foreground">View your academic performance and download terminal report cards.</p>
                </div>
              </CardContent>
            </Card>
          </a>
          <a href="/student/timetable" className="block">
            <Card className="hover:border-primary/50 hover:shadow-md transition-all h-full bg-gradient-to-br from-card to-muted/30">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-heading font-semibold mb-1">Class Timetable</h4>
                  <p className="text-sm text-muted-foreground">View your weekly schedule and assigned subject teachers.</p>
                </div>
              </CardContent>
            </Card>
          </a>
          <a href="/school-fees" className="block">
            <Card className="hover:border-primary/50 hover:shadow-md transition-all h-full bg-gradient-to-br from-card to-muted/30">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold-50 text-gold-600 flex items-center justify-center shrink-0">
                  <Banknote className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-heading font-semibold mb-1">School Fees</h4>
                  <p className="text-sm text-muted-foreground">View fee structure, payment accounts, and payment instructions.</p>
                </div>
              </CardContent>
            </Card>
          </a>
        </div>

      </DashboardLayout>
    </CustomSessionGuard>
  );
}
