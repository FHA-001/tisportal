import { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { PageHeader } from '@/components/shared/page-header';
import {
  useClassSubjects,
  useAssignClassSubject,
  useRemoveClassSubject,
  useClasses,
  useSubjects
} from '@/hooks/use-academics';
import { useTeachers } from '@/hooks/use-users';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Loader2, Trash2, Link as LinkIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';

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

    setFormData({
      class_id: '',
      subject_id: '',
      teacher_id: ''
    });
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

        <div className="bg-card rounded-xl border border-border p-6 shadow-sm mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class">Select Class *</Label>

                <Select
                  required
                  value={formData.class_id}
                  onValueChange={(value) =>
                    setFormData((current) => ({
                      ...current,
                      class_id: value
                    }))
                  }
                >
                  <SelectTrigger id="class">
                    <SelectValue placeholder="Choose class" />
                  </SelectTrigger>

                  <SelectContent>
                    {classes.map((classItem: any) => (
                      <SelectItem
                        key={classItem.id}
                        value={classItem.id}
                      >
                        {classItem.name} ({classItem.tier})
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
                  onValueChange={(value) =>
                    setFormData((current) => ({
                      ...current,
                      subject_id: value
                    }))
                  }
                >
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="Choose subject" />
                  </SelectTrigger>

                  <SelectContent>
                    {subjects.map((subject: any) => (
                      <SelectItem
                        key={subject.id}
                        value={subject.id}
                      >
                        {subject.name}{' '}
                        {subject.code ? `(${subject.code})` : ''}
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
                  onValueChange={(value) =>
                    setFormData((current) => ({
                      ...current,
                      teacher_id: value
                    }))
                  }
                >
                  <SelectTrigger id="teacher">
                    <SelectValue placeholder="Choose teacher" />
                  </SelectTrigger>

                  <SelectContent>
                    {teachers
                      .filter((teacher: any) => teacher.is_active !== false)
                      .map((teacher: any) => (
                        <SelectItem
                          key={teacher.id}
                          value={teacher.id}
                        >
                          {teacher.full_name}
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
                {assignClassSubject.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}

                <LinkIcon className="w-4 h-4 mr-2" />
                Assign Teacher to Subject
              </Button>
            </div>
          </form>
        </div>

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
                    <TableHead className="text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {classSubjects.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No class-subject assignments found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    classSubjects.map((classSubject: any) => {
                      const hasTeacher = Boolean(
                        classSubject.teacher_id
                      );

                      return (
                        <TableRow key={classSubject.id}>
                          <TableCell className="font-medium">
                            {classSubject.classes?.name || 'Unknown'}

                            <span className="text-muted-foreground text-sm ml-2">
                              ({classSubject.classes?.tier || ''})
                            </span>
                          </TableCell>

                          <TableCell>
                            {classSubject.subjects?.name || 'Unknown'}

                            {classSubject.subjects?.code && (
                              <span className="text-muted-foreground text-sm ml-2">
                                ({classSubject.subjects.code})
                              </span>
                            )}
                          </TableCell>

                          <TableCell>
                            {classSubject.teachers?.full_name ||
                              'Unassigned'}
                          </TableCell>

                          <TableCell className="text-right">
                            {hasTeacher ? (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50"
                                    title="Unassign Teacher"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>

                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Unassign Teacher
                                    </AlertDialogTitle>

                                    <AlertDialogDescription>
                                      This will remove the teacher from
                                      this class-subject assignment. The
                                      class and subject will remain
                                      available for reassignment, and
                                      existing scores for this assignment
                                      will be cleared.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>

                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>

                                    <AlertDialogAction
                                      className="bg-red-600 hover:bg-red-700 text-white"
                                      onClick={() =>
                                        handleRemove(classSubject.id)
                                      }
                                    >
                                      Unassign
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
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
