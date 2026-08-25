import { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Newspaper, 
  Upload, 
  FileText, 
  Eye, 
  EyeOff, 
  Trash2, 
  Loader2,
  Calendar,
  Check,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  useAllNewsletters, 
  useUploadNewsletter, 
  usePublishNewsletter, 
  useUnpublishNewsletter, 
  useDeleteNewsletter 
} from '@/hooks/use-newsletters';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';

export default function AdminNewsletters() {
  const { data: newsletters = [], isLoading } = useAllNewsletters();
  const uploadNewsletter = useUploadNewsletter();
  const publishNewsletter = usePublishNewsletter();
  const unpublishNewsletter = useUnpublishNewsletter();
  const deleteNewsletter = useDeleteNewsletter();

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    file: null as File | null
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadForm({ ...uploadForm, file });
    } else if (file) {
      toast.error('Please upload a PDF file');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.title || !uploadForm.file) {
      toast.error('Please provide a title and select a PDF file');
      return;
    }

    // Get current admin user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in to upload newsletters');
      return;
    }

    await uploadNewsletter.mutateAsync({
      file: uploadForm.file,
      title: uploadForm.title,
      publishedBy: user.id
    });

    setUploadForm({ title: '', file: null });
    setShowUploadForm(false);
  };

  const handlePublish = async (id: string) => {
    await publishNewsletter.mutateAsync(id);
  };

  const handleUnpublish = async (id: string) => {
    await unpublishNewsletter.mutateAsync(id);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this newsletter?')) {
      await deleteNewsletter.mutateAsync(id);
    }
  };

  const handleCancelUpload = () => {
    setUploadForm({ title: '', file: null });
    setShowUploadForm(false);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout role="admin">
        <PageHeader title="Newsletter Management" />

        <Card className="border-border shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="w-5 h-5" />
              Upload New Newsletter
            </CardTitle>
            <CardDescription>
              Upload PDF newsletters and publish them for teachers and students to view.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showUploadForm ? (
              <Button onClick={() => setShowUploadForm(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Newsletter
              </Button>
            ) : (
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newsletter-title">Newsletter Title *</Label>
                  <Input
                    id="newsletter-title"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    placeholder="e.g., Newsletter for First Term 2025/26"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newsletter-file">PDF File *</Label>
                  <Input
                    id="newsletter-file"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    required
                  />
                  {uploadForm.file && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {uploadForm.file.name}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={uploadNewsletter.isPending}
                  >
                    {uploadNewsletter.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCancelUpload}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>All Newsletters</CardTitle>
            <CardDescription>
              Manage uploaded newsletters. Publish them to make them visible to teachers and students.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : newsletters.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No newsletters uploaded yet.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-12">S/N</TableHead>
                    <TableHead className="pl-6">Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {newsletters.map((newsletter: any, index: number) => (
                    <TableRow key={newsletter.id}>
                      <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-navy-50 text-navy-600 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-medium">{newsletter.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {newsletter.pdf_file_name}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {newsletter.created_at ? format(new Date(newsletter.created_at), 'MMM dd, yyyy') : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {newsletter.is_published ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-sm font-medium">
                            <Check className="w-3.5 h-3.5" />
                            Published
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-foreground bg-muted px-2.5 py-1 rounded-full text-sm font-medium">
                            <X className="w-3.5 h-3.5" />
                            Draft
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {newsletter.is_published ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnpublish(newsletter.id)}
                              disabled={unpublishNewsletter.isPending}
                              title="Unpublish Newsletter"
                            >
                              <EyeOff className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handlePublish(newsletter.id)}
                              disabled={publishNewsletter.isPending}
                              title="Publish Newsletter"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(newsletter.pdf_url, '_blank')}
                            title="View Newsletter PDF"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(newsletter.id)}
                            disabled={deleteNewsletter.isPending}
                            title="Delete Newsletter"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
