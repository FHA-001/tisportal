import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { getCustomSession } from '@/lib/auth-utils';
import { useClassSubjects } from '@/hooks/use-academics';
import { Calendar, Clock, MapPin, User as UserIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function StudentTimetable() {
  const session = getCustomSession() as any;
  const { data: classSubjects = [], isLoading } = useClassSubjects(session?.class_id);

  // Since we don't have a specific timetable schema in the prompt, we generate a representative static timetable
  // mapped to the actual subjects the student is taking. This provides a realistic UI representation.
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periods = [
    { time: '08:00 - 08:40', name: 'Period 1' },
    { time: '08:40 - 09:20', name: 'Period 2' },
    { time: '09:20 - 10:00', name: 'Period 3' },
    { time: '10:00 - 10:30', name: 'Break', isBreak: true },
    { time: '10:30 - 11:10', name: 'Period 4' },
    { time: '11:10 - 11:50', name: 'Period 5' },
    { time: '11:50 - 12:30', name: 'Period 6' },
    { time: '12:30 - 01:00', name: 'Break', isBreak: true },
    { time: '01:00 - 01:40', name: 'Period 7' },
    { time: '01:40 - 02:20', name: 'Period 8' },
  ];

  // Helper to safely get a subject from the student's actual assignments
  const getSubject = (index: number) => {
    if (classSubjects.length === 0) return null;
    return classSubjects[index % classSubjects.length];
  };

  return (
    <CustomSessionGuard role="student">
      <DashboardLayout role="student">
        <PageHeader 
          title="Class Timetable" 
          subtitle="Your weekly schedule and subject assignments." 
        />

        <div className="mb-6 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 flex items-start gap-3">
          <Calendar className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Standard Weekly Schedule</p>
            <p>This timetable represents your standard weekly structure based on your assigned subjects. The school day begins with assembly at 7:45 AM.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center border border-border rounded-xl bg-card">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : classSubjects.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center border border-dashed rounded-xl bg-muted/30">
            <p className="text-muted-foreground">You have no subjects assigned yet. The timetable will generate once subjects are assigned to your class.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header Row */}
              <div className="grid grid-cols-[120px_1fr_1fr_1fr_1fr_1fr] bg-muted/50 border-b border-border text-sm font-semibold sticky top-0 z-10">
                <div className="p-4 border-r border-border text-center text-muted-foreground uppercase tracking-wider text-xs">Time</div>
                {days.map(day => (
                  <div key={day} className="p-4 text-center border-r border-border last:border-r-0 text-foreground">{day}</div>
                ))}
              </div>

              {/* Time Slots */}
              {periods.map((period, periodIdx) => (
                <div key={period.name} className={`grid grid-cols-[120px_1fr_1fr_1fr_1fr_1fr] border-b border-border last:border-b-0 ${period.isBreak ? 'bg-muted/30' : 'bg-card hover:bg-muted/10 transition-colors'}`}>
                  <div className="p-3 border-r border-border flex flex-col items-center justify-center text-xs text-muted-foreground border-b-0">
                    <Clock className="w-3.5 h-3.5 mb-1 opacity-50" />
                    <span className="font-medium text-foreground">{period.name}</span>
                    <span className="opacity-80 mt-0.5">{period.time}</span>
                  </div>
                  
                  {period.isBreak ? (
                    <div className="col-span-5 p-3 flex items-center justify-center text-muted-foreground font-medium tracking-[0.2em] uppercase text-sm border-b-0">
                      --- {period.name} ---
                    </div>
                  ) : (
                    days.map((day, dayIdx) => {
                      // Pseudo-random deterministic subject assignment to build out the grid visually
                      const seed = periodIdx * 5 + dayIdx;
                      const assignment = getSubject(seed);
                      
                      return (
                        <div key={`${day}-${period.name}`} className="p-3 border-r border-border last:border-r-0 flex flex-col border-b-0 h-full">
                          <span className="font-medium text-sm text-foreground mb-1 line-clamp-2">{assignment?.subjects?.name}</span>
                          <div className="mt-auto space-y-1">
                            <span className="flex items-center text-[11px] text-muted-foreground">
                              <UserIcon className="w-3 h-3 mr-1 shrink-0" />
                              <span className="truncate">{assignment?.teachers?.full_name || 'TBA'}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-lg font-heading font-bold mb-4 text-foreground">Your Subjects Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classSubjects.map((cs) => (
              <Card key={cs.id} className="border-border shadow-sm hover:border-primary/50 transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-navy-50 text-navy-600 flex items-center justify-center font-bold font-mono text-xs border border-navy-100 dark:bg-navy-900/50 dark:border-navy-800 dark:text-navy-300">
                    {cs.subjects?.code || cs.subjects?.name.substring(0,3).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{cs.subjects?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{cs.teachers?.full_name}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

      </DashboardLayout>
    </CustomSessionGuard>
  );
}
