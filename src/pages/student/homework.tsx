import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Book, Calendar, Clock, FileText, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useStudentHomework, getHomeworkStatus } from '@/hooks/use-homework';
import { getCustomSession } from '@/lib/auth-utils';
import { format } from 'date-fns';

export default function StudentHomework() {
  const session = getCustomSession();
  const { data: homework = [], isLoading } = useStudentHomework(session?.id || '');

  return (
    <CustomSessionGuard role="student">
      <DashboardLayout role="student">
        <PageHeader 
          title="My Homework" 
          subtitle="View homework assignments for your class." 
        />

        <Card className="card-premium border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="w-5 h-5" />
              Homework Assignments
            </CardTitle>
            <CardDescription>
              Stay on top of your assignments and deadlines.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : homework.length === 0 ? (
              <div className="text-center py-12">
                <div className="icon-premium mx-auto mb-4">
                  <Book className="w-6 h-6 text-navy-600" />
                </div>
                <h3 className="text-lg font-medium mb-2">No homework assigned yet</h3>
                <p className="text-muted-foreground">
                  Check back later for homework assignments from your teachers.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {homework.map((hw: any) => {
                  const { status, color } = getHomeworkStatus(hw.due_date);
                  const isOverdue = status === 'Overdue';
                  const isDueToday = status === 'Due Today';
                  
                  return (
                    <div
                      key={hw.id}
                      className={`card-premium border rounded-2xl p-5 bg-gradient-to-br from-card to-muted/30 ${
                        isOverdue ? 'border-destructive/50' : isDueToday ? 'border-amber-500/50' : 'border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-2 flex-wrap">
                            <h3 className="text-lg font-semibold">{hw.title}</h3>
                            <div className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                              isOverdue 
                                ? 'bg-destructive/10 text-destructive' 
                                : isDueToday 
                                ? 'bg-amber-500/10 text-amber-600' 
                                : 'bg-emerald-500/10 text-emerald-600'
                            }`}>
                              {status}
                            </div>
                            <div className="text-xs px-2.5 py-1 rounded-full bg-muted font-medium">
                              {hw.subjects?.name}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{hw.description}</p>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" />
                              Due: {format(new Date(hw.due_date), 'MMM dd, yyyy')}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              Published: {format(new Date(hw.published_at), 'MMM dd, yyyy')}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Book className="w-4 h-4" />
                              Teacher: {hw.teachers?.full_name}
                            </div>
                            {hw.attachment_url && (
                              <div className="flex items-center gap-1.5">
                                <FileText className="w-4 h-4" />
                                <a 
                                  href={hw.attachment_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  View Attachment
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className={`p-2 rounded-lg ${
                          isOverdue 
                            ? 'bg-destructive/10 text-destructive' 
                            : isDueToday 
                            ? 'bg-amber-500/10 text-amber-600' 
                            : 'bg-emerald-500/10 text-emerald-600'
                        }`}>
                          {isOverdue ? (
                            <AlertCircle className="w-5 h-5" />
                          ) : isDueToday ? (
                            <AlertCircle className="w-5 h-5" />
                          ) : (
                            <CheckCircle className="w-5 h-5" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </DashboardLayout>
    </CustomSessionGuard>
  );
}
