import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useStudentAnnouncements } from '@/hooks/use-announcements';
import { Megaphone, Loader2, AlertTriangle, Calendar, Clock } from 'lucide-react';

export default function StudentAnnouncements() {
  const { data: announcements = [], isLoading } = useStudentAnnouncements();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent': return <AlertTriangle className="w-4 h-4" />;
      case 'event': return <Calendar className="w-4 h-4" />;
      case 'exam': return <Clock className="w-4 h-4" />;
      default: return <Megaphone className="w-4 h-4" />;
    }
  };

  return (
    <CustomSessionGuard role="student">
      <DashboardLayout role="student">
        <PageHeader 
          title="Announcements" 
          subtitle="Stay updated with the latest school news and events." 
        />

        <Card className="card-premium border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5" />
              School Announcements
            </CardTitle>
            <CardDescription>
              {announcements.length} announcement{announcements.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-5 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3 mt-2" />
                  </div>
                ))}
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-12">
                <div className="icon-premium mx-auto mb-4">
                  <Megaphone className="w-6 h-6 text-navy-600" />
                </div>
                <h3 className="text-lg font-medium mb-2">No announcements yet</h3>
                <p className="text-muted-foreground">
                  Check back later for school updates.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement: any, index: number) => (
                  <div
                    key={announcement.id}
                    className="p-5 rounded-lg border border-border bg-gradient-to-br from-card to-muted/30"
                  >
                    <div className="flex items-start gap-2 mb-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}.</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(announcement.priority)}`}>
                        {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-muted font-medium">
                        {announcement.announcement_type.charAt(0).toUpperCase() + announcement.announcement_type.slice(1)}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{announcement.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        {getTypeIcon(announcement.announcement_type)}
                        {announcement.announcement_type.charAt(0).toUpperCase() + announcement.announcement_type.slice(1)}
                      </span>
                      <span>•</span>
                      <span>{new Date(announcement.published_at).toLocaleDateString()}</span>
                      {announcement.expires_at && (
                        <>
                          <span>•</span>
                          <span>Expires: {new Date(announcement.expires_at).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{announcement.content}</p>
                    <div className="mt-3 text-xs text-muted-foreground">
                      Published by {announcement.teachers?.full_name}
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
