import { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Book, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  Calendar,
  Clock,
  FileText,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { useHomework, useCreateHomework, useUpdateHomework, useDeleteHomework } from '@/hooks/use-homework';
import { getCustomSession } from '@/lib/auth-utils';
import { useClasses, useSubjects, useClassSubjects } from '@/hooks/use-academics';
import { format } from 'date-fns';

export default function TeacherHomework() {
  const session = getCustomSession();
  const { data: homework = [], isLoading } = useHomework(session?.id || '');
  const createHomework = useCreateHomework();
  const updateHomework = useUpdateHomework();
  const deleteHomework = useDeleteHomework();

  const { data: classes = [] } = useClasses();
  const { data: subjects = [] } = useSubjects();
  const { data: assignments = [] } = useClassSubjects(undefined, session?.id);

  const [showForm, setShowForm] = useState(false);
  const [editingHomework, setEditingHomework] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    class_id: '',
    subject_id: '',
    due_date: '',
    attachment_url: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.class_id || !formData.subject_id || !formData.due_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (editingHomework) {
      await updateHomework.mutateAsync({
        id: editingHomework.id,
        ...formData
      });
    } else {
      await createHomework.mutateAsync({
        ...formData,
        teacher_id: session?.id || ''
      });
    }

    setFormData({ title: '', description: '', class_id: '', subject_id: '', due_date: '', attachment_url: '' });
    setShowForm(false);
    setEditingHomework(null);
  };

  const handleEdit = (homework: any) => {
    setEditingHomework(homework);
    setFormData({
      title: homework.title,
      description: homework.description,
      class_id: homework.class_id,
      subject_id: homework.subject_id,
      due_date: homework.due_date,
      attachment_url: homework.attachment_url || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this homework?')) {
      await deleteHomework.mutateAsync(id);
    }
  };

  const handleCancel = () => {
    setFormData({ title: '', description: '', class_id: '', subject_id: '', due_date: '', attachment_url: '' });
    setShowForm(false);
    setEditingHomework(null);
  };

  // Filter classes and subjects based on teacher's assignments
  const assignedClassIds = new Set(assignments.map(a => a.class_id));
  const assignedSubjectIds = new Set(assignments.map(a => a.subject_id));
  const availableClasses = classes.filter(c => assignedClassIds.has(c.id));
  const availableSubjects = subjects.filter(s => assignedSubjectIds.has(s.id));

  return (
    <CustomSessionGuard role="teacher">
      <DashboardLayout role="teacher">
        <PageHeader 
          title="Homework Management" 
          subtitle="Create and manage homework assignments for your classes." 
        />

        <Card className="card-premium border-border mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="w-5 h-5" />
              {editingHomework ? 'Edit Homework' : 'Create New Homework'}
            </CardTitle>
            <CardDescription>
              {editingHomework ? 'Update the homework assignment details.' : 'Assign homework to your classes.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showForm ? (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Homework
              </Button>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="class">Class *</Label>
                    <select
                      id="class"
                      value={formData.class_id}
                      onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                      required
                    >
                      <option value="">Select a class</option>
                      {availableClasses.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.tier})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <select
                      id="subject"
                      value={formData.subject_id}
                      onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                      required
                    >
                      <option value="">Select a subject</option>
                      {availableSubjects.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Homework Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Chapter 5 Exercises"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the homework assignment..."
                    rows={4}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date *</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attachment">Attachment URL (Optional)</Label>
                  <Input
                    id="attachment"
                    value={formData.attachment_url}
                    onChange={(e) => setFormData({ ...formData, attachment_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={createHomework.isPending || updateHomework.isPending}
                  >
                    {createHomework.isPending || updateHomework.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : editingHomework ? (
                      <Edit className="w-4 h-4 mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {editingHomework ? 'Update' : 'Create'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCancel}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="card-premium border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="w-5 h-5" />
              My Homework Assignments
            </CardTitle>
            <CardDescription>
              View and manage all homework you've created.
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
                  Create your first homework assignment to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {homework.map((hw: any) => (
                  <div
                    key={hw.id}
                    className="card-premium border border-border rounded-2xl p-5 bg-gradient-to-br from-card to-muted/30"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold">{hw.title}</h3>
                          <div className="text-xs px-2.5 py-1 rounded-full bg-muted font-medium">
                            {hw.classes?.name}
                          </div>
                          <div className="text-xs px-2.5 py-1 rounded-full bg-navy-50 text-navy-600 font-medium">
                            {hw.subjects?.name}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{hw.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            Due: {format(new Date(hw.due_date), 'MMM dd, yyyy')}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            Published: {format(new Date(hw.published_at), 'MMM dd, yyyy')}
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
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(hw)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(hw.id)}
                          disabled={deleteHomework.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
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
