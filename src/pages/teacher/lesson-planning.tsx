import { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useLessonPlans, useCreateLessonPlan, useUpdateLessonPlan, useDeleteLessonPlan } from '@/hooks/use-lesson-plans';
import { useTeacherClasses } from '@/hooks/use-users';
import { getCustomSession } from '@/lib/auth-utils';
import { FileEdit, Plus, Pencil, Trash2, Loader2, Calendar, Clock, BookOpen, Target, Package, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function TeacherLessonPlanning() {
  const session = getCustomSession();
  const { data: classes = [] } = useTeacherClasses(session?.id);
  const { data: lessonPlans = [], isLoading } = useLessonPlans(session?.id);
  const createLessonPlan = useCreateLessonPlan();
  const updateLessonPlan = useUpdateLessonPlan();
  const deleteLessonPlan = useDeleteLessonPlan();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    class_id: '',
    subject_id: '',
    lesson_date: '',
    start_time: '',
    end_time: '',
    objectives: '',
    materials: '',
    activities: '',
    homework: '',
    notes: '',
    status: 'draft'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.class_id || !formData.lesson_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!session?.id) {
      toast.error('Session expired. Please login again.');
      return;
    }

    const lessonPlanData = {
      title: formData.title,
      description: formData.description,
      class_id: formData.class_id,
      subject_id: formData.subject_id,
      teacher_id: session.id,
      lesson_date: formData.lesson_date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      objectives: formData.objectives ? formData.objectives.split('\n').filter(o => o.trim()) : [],
      materials: formData.materials ? formData.materials.split('\n').filter(m => m.trim()) : [],
      activities: formData.activities,
      homework: formData.homework,
      notes: formData.notes,
      status: formData.status
    };

    if (editingId) {
      await updateLessonPlan.mutateAsync({ id: editingId, ...lessonPlanData });
    } else {
      await createLessonPlan.mutateAsync(lessonPlanData);
    }

    setFormData({
      title: '',
      description: '',
      class_id: '',
      subject_id: '',
      lesson_date: '',
      start_time: '',
      end_time: '',
      objectives: '',
      materials: '',
      activities: '',
      homework: '',
      notes: '',
      status: 'draft'
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (lessonPlan: any) => {
    setEditingId(lessonPlan.id);
    setFormData({
      title: lessonPlan.title,
      description: lessonPlan.description || '',
      class_id: lessonPlan.class_id,
      subject_id: lessonPlan.subject_id || '',
      lesson_date: lessonPlan.lesson_date,
      start_time: lessonPlan.start_time || '',
      end_time: lessonPlan.end_time || '',
      objectives: lessonPlan.objectives ? lessonPlan.objectives.join('\n') : '',
      materials: lessonPlan.materials ? lessonPlan.materials.join('\n') : '',
      activities: lessonPlan.activities || '',
      homework: lessonPlan.homework || '',
      notes: lessonPlan.notes || '',
      status: lessonPlan.status
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this lesson plan?')) {
      await deleteLessonPlan.mutateAsync(id);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      class_id: '',
      subject_id: '',
      lesson_date: '',
      start_time: '',
      end_time: '',
      objectives: '',
      materials: '',
      activities: '',
      homework: '',
      notes: '',
      status: 'draft'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'planned': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <DashboardLayout role="teacher">
      <PageHeader 
        title="Lesson Planning" 
        subtitle="Create and manage your lesson plans for effective teaching." 
      />

      <Card className="card-premium border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileEdit className="w-5 h-5" />
                Lesson Plans
              </CardTitle>
              <CardDescription>
                {lessonPlans.length} lesson plan{lessonPlans.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            {!showForm && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Lesson Plan
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {showForm && (
            <div className="border border-border rounded-lg p-6 bg-muted/30">
              <h3 className="font-semibold mb-4">
                {editingId ? 'Edit Lesson Plan' : 'Create New Lesson Plan'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Lesson title"
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of the lesson"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="class">Class *</Label>
                    <Select
                      value={formData.class_id}
                      onValueChange={(value) => setFormData({ ...formData, class_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls: any) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.classes?.name} - {cls.classes?.tier}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Lesson Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.lesson_date}
                      onChange={(e) => setFormData({ ...formData, lesson_date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="objectives">Learning Objectives (one per line)</Label>
                    <Textarea
                      id="objectives"
                      value={formData.objectives}
                      onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                      placeholder="Enter learning objectives, one per line"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="materials">Materials Needed (one per line)</Label>
                    <Textarea
                      id="materials"
                      value={formData.materials}
                      onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
                      placeholder="Enter materials needed, one per line"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="activities">Activities</Label>
                    <Textarea
                      id="activities"
                      value={formData.activities}
                      onChange={(e) => setFormData({ ...formData, activities: e.target.value })}
                      placeholder="Describe the lesson activities"
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="homework">Homework</Label>
                    <Textarea
                      id="homework"
                      value={formData.homework}
                      onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
                      placeholder="Assign homework for this lesson"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes for the lesson"
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={createLessonPlan.isPending || updateLessonPlan.isPending}>
                    {createLessonPlan.isPending || updateLessonPlan.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    {editingId ? 'Update' : 'Create'} Lesson Plan
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

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
          ) : lessonPlans.length === 0 ? (
            <div className="text-center py-12">
              <div className="icon-premium mx-auto mb-4">
                <FileEdit className="w-6 h-6 text-navy-600" />
              </div>
              <h3 className="text-lg font-medium mb-2">No lesson plans yet</h3>
              <p className="text-muted-foreground">
                Create your first lesson plan to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {lessonPlans.map((lessonPlan: any) => (
                <div
                  key={lessonPlan.id}
                  className="p-5 rounded-lg border border-border bg-gradient-to-br from-card to-muted/30"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-start gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(lessonPlan.status)}`}>
                          {lessonPlan.status.charAt(0).toUpperCase() + lessonPlan.status.slice(1)}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-muted font-medium">
                          {lessonPlan.classes?.name} - {lessonPlan.classes?.tier}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold mb-1">{lessonPlan.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(lessonPlan.lesson_date).toLocaleDateString()}
                        </span>
                        {lessonPlan.start_time && lessonPlan.end_time && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {lessonPlan.start_time} - {lessonPlan.end_time}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(lessonPlan)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(lessonPlan.id)}
                        disabled={deleteLessonPlan.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {lessonPlan.description && (
                    <p className="text-sm text-muted-foreground mb-3">{lessonPlan.description}</p>
                  )}
                  {lessonPlan.objectives && lessonPlan.objectives.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        Objectives
                      </h4>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {lessonPlan.objectives.map((obj: string, idx: number) => (
                          <li key={idx}>{obj}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {lessonPlan.materials && lessonPlan.materials.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        Materials
                      </h4>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {lessonPlan.materials.map((mat: string, idx: number) => (
                          <li key={idx}>{mat}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {lessonPlan.activities && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        Activities
                      </h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lessonPlan.activities}</p>
                    </div>
                  )}
                  {lessonPlan.homework && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Homework:</strong> {lessonPlan.homework}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
