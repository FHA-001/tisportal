import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Newspaper, FileText, Calendar, ExternalLink, Loader2 } from 'lucide-react';
import { useNewsletters } from '@/hooks/use-newsletters';
import { format } from 'date-fns';

export default function AccountantNewsletters() {
  const { data: newsletters = [], isLoading } = useNewsletters();

  return (
    <CustomSessionGuard role="accountant">
      <DashboardLayout role="accountant">
        <PageHeader
          title="School Newsletters"
          subtitle="View newsletters and school updates published by the administration."
        />

        <Card className="card-premium border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="w-5 h-5" />
              Published Newsletters
            </CardTitle>
            <CardDescription>
              Open and download the latest school newsletters.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : newsletters.length === 0 ? (
              <div className="text-center py-12">
                <Newspaper className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
                <h3 className="font-medium">No newsletters yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Published newsletters will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {newsletters.map((newsletter: any, index: number) => (
                  <div
                    key={newsletter.id}
                    className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/30 p-4 sm:p-5"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <span className="w-5 shrink-0 pt-1 text-sm font-medium text-muted-foreground">
                        {index + 1}.
                      </span>

                      <div className="icon-premium shrink-0 hidden sm:flex">
                        <FileText className="w-6 h-6 text-navy-600" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-lg font-semibold mb-2 break-words">
                          {newsletter.title}
                        </h3>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Calendar className="w-4 h-4 shrink-0" />
                          <span>
                            {newsletter.published_at
                              ? format(new Date(newsletter.published_at), 'MMMM dd, yyyy')
                              : format(new Date(newsletter.created_at), 'MMMM dd, yyyy')}
                          </span>
                        </div>

                        <p className="text-sm text-muted-foreground break-all sm:break-words">
                          {newsletter.pdf_file_name}
                        </p>

                        <Button
                          onClick={() => window.open(newsletter.pdf_url, '_blank')}
                          className="mt-4 w-full sm:w-auto"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View PDF
                        </Button>
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
