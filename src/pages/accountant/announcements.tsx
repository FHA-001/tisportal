import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Megaphone, Loader2, CalendarDays } from 'lucide-react';
import { useAnnouncements } from '@/hooks/use-announcements';
import { format } from 'date-fns';

export default function AccountantAnnouncements() {
  const { data: announcements = [], isLoading } = useAnnouncements();

  const visibleAnnouncements = announcements.filter((announcement: any) => {
    const audience = (announcement.target_audience || 'all').toLowerCase();
    return ['all', 'accountant', 'accountants', 'staff'].includes(audience);
  });

  return (
    <CustomSessionGuard role="accountant">
      <DashboardLayout role="accountant">
        <PageHeader
          title="School Announcements"
          subtitle="View school-wide announcements and important updates."
        />

        <Card className="card-premium border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5" />
              Announcements
            </CardTitle>
            <CardDescription>
              Current announcements published by the school administration.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : visibleAnnouncements.length === 0 ? (
              <div className="text-center py-12">
                <Megaphone className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
                <h3 className="font-medium">No announcements right now</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  New school announcements will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleAnnouncements.map((announcement: any) => (
                  <div
                    key={announcement.id}
                    className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/30 p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-semibold text-base sm:text-lg break-words">
                            {announcement.title}
                          </h3>

                          {announcement.priority && announcement.priority !== 'normal' && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize">
                              {announcement.priority}
                            </span>
                          )}
                        </div>

                        <p className="text-sm leading-6 text-muted-foreground whitespace-pre-wrap break-words">
                          {announcement.content}
                        </p>
                      </div>

                      {(announcement.published_at || announcement.created_at) && (
                        <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="w-4 h-4" />
                          {format(
                            new Date(announcement.published_at || announcement.created_at),
                            'MMM dd, yyyy'
                          )}
                        </div>
                      )}
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
