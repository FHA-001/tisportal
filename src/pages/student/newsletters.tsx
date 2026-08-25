import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Newspaper, FileText, Calendar, ExternalLink, Loader2 } from 'lucide-react';
import { useNewsletters } from '@/hooks/use-newsletters';
import { format } from 'date-fns';

export default function StudentNewsletters() {
  const { data: newsletters = [], isLoading } = useNewsletters();

  return (
    <CustomSessionGuard role="student">
      <DashboardLayout role="student">
        <PageHeader 
          title="School Newsletters" 
          subtitle="Stay updated with the latest school news and announcements." 
        />

        <Card className="card-premium border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="w-5 h-5" />
              Published Newsletters
            </CardTitle>
            <CardDescription>
              View and download school newsletters published by the administration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : newsletters.length === 0 ? (
              <div className="text-center py-12">
                <div className="icon-premium mx-auto mb-4">
                  <Newspaper className="w-6 h-6 text-navy-600" />
                </div>
                <h3 className="text-lg font-medium mb-2">No newsletters yet</h3>
                <p className="text-muted-foreground">
                  Check back later for school newsletters and updates.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {newsletters.map((newsletter: any, index: number) => (
                  <div
                    key={newsletter.id}
                    className="card-premium border border-border rounded-2xl p-5 bg-gradient-to-br from-card to-muted/30"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <span className="text-sm font-medium text-muted-foreground w-6 pt-1">{index + 1}.</span>
                        <div className="icon-premium shrink-0">
                          <FileText className="w-6 h-6 text-navy-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-2">{newsletter.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                            <Calendar className="w-4 h-4" />
                            {newsletter.published_at 
                              ? format(new Date(newsletter.published_at), 'MMMM dd, yyyy')
                              : format(new Date(newsletter.created_at), 'MMMM dd, yyyy')
                            }
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {newsletter.pdf_file_name}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => window.open(newsletter.pdf_url, '_blank')}
                        className="shrink-0"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View PDF
                      </Button>
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
