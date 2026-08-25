import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useParentChildren } from '@/hooks/use-parents';
import { getCustomSession } from '@/lib/auth-utils';
import { Users, UserCheck, Loader2 } from 'lucide-react';

export default function ParentChildren() {
  const session = getCustomSession();
  const { data: children = [], isLoading } = useParentChildren(session?.id);

  return (
    <CustomSessionGuard role="parent">
      <DashboardLayout role="parent">
        <PageHeader 
          title="My Children" 
          subtitle="View and manage your children's academic information" 
        />

        <Card className="card-premium border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Linked Children
            </CardTitle>
            <CardDescription>
              Students linked to your parent account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : children.length === 0 ? (
              <div className="text-center py-12">
                <div className="icon-premium mx-auto mb-4">
                  <Users className="w-6 h-6 text-navy-600" />
                </div>
                <h3 className="text-lg font-medium mb-2">No children linked yet</h3>
                <p className="text-muted-foreground">
                  Contact the school administration to link your children to your account.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {children.map((assignment: any) => (
                  <div
                    key={assignment.id}
                    className="card-premium border border-border rounded-2xl p-5 bg-gradient-to-br from-card to-muted/30"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {assignment.students ? (
                          <>
                            <div className="flex items-start gap-3 mb-2">
                              <h3 className="text-lg font-semibold">{assignment.students.full_name}</h3>
                              <div className="text-xs px-2.5 py-1 rounded-full bg-muted font-medium">
                                {assignment.students.admission_number}
                              </div>
                              {assignment.is_primary && (
                                <div className="text-xs px-2.5 py-1 rounded-full bg-navy-50 text-navy-600 font-medium">
                                  Primary Contact
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium">Class:</span> {assignment.students.classes?.name}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium">Tier:</span> {assignment.students.classes?.tier}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium">Relationship:</span> {assignment.relationship}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-muted-foreground">Student data not available</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </DashboardLayout>
    </CustomSessionGuard>
  );
}
