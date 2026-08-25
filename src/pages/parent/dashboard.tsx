import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useParentChildren } from '@/hooks/use-parents';
import { getCustomSession } from '@/lib/auth-utils';
import { getTimeBasedGreeting } from '@/lib/greeting';
import { Users, Award, Banknote, Newspaper, ArrowRight } from 'lucide-react';

export default function ParentDashboard() {
  const session = getCustomSession();
  const { data: children = [], isLoading } = useParentChildren(session?.id);

  return (
    <CustomSessionGuard role="parent">
      <DashboardLayout role="parent">
        <PageHeader 
          title="Parent Dashboard" 
          subtitle={getTimeBasedGreeting(session?.full_name?.split(' ')[0])}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="card-premium border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Children</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{children.length}</div>
              <p className="text-xs text-muted-foreground">Linked to your account</p>
            </CardContent>
          </Card>

          <Card className="card-premium border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Academic Results</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-start px-0" asChild>
                <a href="/parent/grades">
                  View Grades <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="card-premium border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">School Fees</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-start px-0" asChild>
                <a href="/parent/fees">
                  View Fees <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="card-premium border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Newsletters</CardTitle>
              <Newspaper className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-start px-0" asChild>
                <a href="/parent/newsletters">
                  View Updates <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </CustomSessionGuard>
  );
}
