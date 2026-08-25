import { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { PageHeader } from '@/components/shared/page-header';
import { useClassSubjects, useAssignClassSubject, useRemoveClassSubject } from '@/hooks/use-academics';
import { useClasses } from '@/hooks/use-academics';
import { useSubjects } from '@/hooks/use-academics';
import { useTeachers } from '@/hooks/use-users';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2, Link as LinkIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function AdminClassSubjects() {
  const { data: classSubjects = [], isLoading } = useClassSubjects();
  const { data: classes = [] } = useClasses();
  const { data: subjects = [] } = useSubjects();
  const { data: teachers = [] } = useTeachers();
  
  const assignClassSubject = useAssignClassSubject();
  const removeClassSubject = useRemoveClassSubject();

  const [formData, setFormData] = useState({
    class_id: '',
    subject_id: '',
    teacher_id: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await assignClassSubject.mutateAsync(formData);
    setFormData({ class_id: '', subject_id: '', teacher_id: '' });
  };

  const handleRemove = async (id: string) => {
    await removeClassSubject.mutateAsync(id);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout role="admin">
        <PageHeader 
          title="Class-Subject Assignments" 
          subtitle="Manage which teachers are assigned to teach specific subjects in each class"
        />

        {/* Assignment Form */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class">Select Class *</Label>
                <Select 
                  required 
                  value={formData.class_id} 
                  onValueChange={v => setFormData({...formData, class_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.tier})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Select Subject *</Label>
                <Select 
                  required 
                  value={formData.subject_id} 
                  onValueChange={v => setFormData({...formData, subject_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {s.code && `(${s.code})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="teacher">Select Teacher *</Label>
                <Select 
                  required 
                  value={formData.teacher_id} 
                  onValueChange={v => setFormData({...formData, teacher_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.filter(t => t.is_active !== false).map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                disabled={assignClassSubject.isPending}
              >
                {assignClassSubject.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <LinkIcon className="w-4 h-4 mr-2" />
                Assign Teacher to Subject
              </Button>
            </div>
          </form>
        </div>

        {/* Assignments Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classSubjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No class-subject assignments found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    classSubjects.map((cs: any) => (
                      <TableRow key={cs.id}>
                        <TableCell className="font-medium">
                          {cs.classes?.name || 'Unknown'} 
                          <span className="text-muted-foreground text-sm ml-2">
                            ({cs.classes?.tier || ''})
                          </span>
                        </TableCell>
                        <TableCell>
                          {cs.subjects?.name || 'Unknown'}
                          {cs.subjects?.code && (
                            <span className="text-muted-foreground text-sm ml-2">
                              ({cs.subjects.code})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{cs.teachers?.full_name || 'Unknown'}</TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50"
                                title="Remove Assignment"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Assignment</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove this assignment? This will unassign the teacher from teaching this subject in this class.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  onClick={() => handleRemove(cs.id)}
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
