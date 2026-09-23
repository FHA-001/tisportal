import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { PageHeader } from '@/components/shared/page-header';
import { useClasses, useAcademicSessions } from '@/hooks/use-academics';
import { useAdminClassResults } from '@/hooks/use-records';
import { generateReportCardPdf } from '@/lib/reportCardPdf';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpenCheck, Download, Eye, FileQuestion, Loader2, Users } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

type StudentGradeDetail = {
  id: string;
  subject: string;
  test_1: number | null;
  test_2: number | null;
  project_1: number | null;
  assignment_1: number | null;
  exam: number | null;
  total: number | null;
  grade_letter: string | null;
  remark: string | null;
};

export default function AdminGrades() {
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('First Term');
  const [selectedClass, setSelectedClass] = useState('');
  const [detailStudent, setDetailStudent] = useState<any | null>(null);
  const [detailGrades, setDetailGrades] = useState<StudentGradeDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [downloadingStudentId, setDownloadingStudentId] = useState<string | null>(null);

  const { data: classes = [] } = useClasses();
  const { data: sessions = [] } = useAcademicSessions();
  const activeSession = sessions.find((session) => session.is_active);

  useEffect(() => {
    if (!selectedSession && activeSession?.name) setSelectedSession(activeSession.name);
  }, [selectedSession, activeSession?.name]);

  const { data: overview, isLoading, error } = useAdminClassResults(
    selectedClass || undefined,
    selectedTerm,
    selectedSession || undefined
  );

  const selectedClassData = classes.find((item) => item.id === selectedClass);

  const summary = useMemo(() => ({
    students: overview?.students.length ?? 0,
    subjects: overview?.expected_subjects ?? 0,
    complete: overview?.complete_count ?? 0,
    incomplete: (overview?.incomplete_count ?? 0) + (overview?.no_grades_count ?? 0),
  }), [overview]);

  const fetchStudentGrades = async (studentId: string) => {
    const { data, error } = await supabase
      .from('grades')
      .select(`
        id,
        test_1,
        test_2,
        project_1,
        assignment_1,
        exam,
        total,
        grade_letter,
        remark,
        class_subjects(subjects(name))
      `)
      .eq('student_id', studentId)
      .eq('term', selectedTerm)
      .eq('session', selectedSession);

    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      id: row.id,
      subject: row.class_subjects?.subjects?.name || 'Unknown Subject',
      test_1: row.test_1,
      test_2: row.test_2,
      project_1: row.project_1,
      assignment_1: row.assignment_1,
      exam: row.exam,
      total: row.total,
      grade_letter: row.grade_letter,
      remark: row.remark,
    })) as StudentGradeDetail[];
  };

  const openStudentResult = async (student: any) => {
    setDetailStudent(student);
    setDetailGrades([]);
    setDetailLoading(true);
    try {
      setDetailGrades(await fetchStudentGrades(student.id));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load student result.');
      setDetailStudent(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDownloadPdf = async (student: any) => {
    setDownloadingStudentId(student.id);
    toast.loading('Generating report card...', { id: 'pdf-gen' });

    try {
      const grades = await fetchStudentGrades(student.id);
      if (grades.length === 0) {
        toast.error('No grades found for this student in the selected term.', { id: 'pdf-gen' });
        return;
      }

      await generateReportCardPdf(
        {
          full_name: student.full_name,
          admission_number: student.admission_number || '',
          class_name: student.class_name || selectedClassData?.name || '',
          tier: student.tier || selectedClassData?.tier || '',
        },
        selectedTerm,
        selectedSession,
        grades
      );

      toast.success('Report card downloaded successfully.', { id: 'pdf-gen' });
    } catch (err: any) {
      toast.error(`Failed to generate PDF: ${err?.message || 'Unknown error'}`, { id: 'pdf-gen' });
    } finally {
      setDownloadingStudentId(null);
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'complete') {
      return <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Complete</span>;
    }
    if (status === 'incomplete') {
      return <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Incomplete</span>;
    }
    return <span className="inline-flex rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">No Grades</span>;
  };

  return (
    <ProtectedRoute>
      <DashboardLayout role="admin">
        <PageHeader title="Class Results" subtitle="Review results by academic session, term, and class." />

        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Academic Session</Label>
                  <Select value={selectedSession} onValueChange={(value) => { setSelectedSession(value); setSelectedClass(''); }}>
                    <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
                    <SelectContent>
                      {sessions.map((session) => (
                        <SelectItem key={session.id} value={session.name}>
                          {session.name}{session.is_active ? ' (Active)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Term</Label>
                  <Select value={selectedTerm} onValueChange={(value) => { setSelectedTerm(value); setSelectedClass(''); }}>
                    <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="First Term">First Term</SelectItem>
                      <SelectItem value="Second Term">Second Term</SelectItem>
                      <SelectItem value="Third Term">Third Term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass} disabled={!selectedSession}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {!selectedClass ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30">
              <BookOpenCheck className="mb-3 h-9 w-9 text-muted-foreground/60" />
              <p className="font-medium">Select a class to review results.</p>
              <p className="mt-1 text-sm text-muted-foreground">Choose the academic session, term, and class above.</p>
            </div>
          ) : isLoading ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/40 bg-card p-6 text-sm text-destructive">
              Failed to load class results: {error.message}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Students</p><p className="text-2xl font-bold">{summary.students}</p></div></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div><p className="text-xs text-muted-foreground">Subjects</p><p className="text-2xl font-bold">{summary.subjects}</p></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div><p className="text-xs text-muted-foreground">Complete</p><p className="text-2xl font-bold text-emerald-700">{summary.complete}</p></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div><p className="text-xs text-muted-foreground">Incomplete</p><p className="text-2xl font-bold text-amber-700">{summary.incomplete}</p></div></CardContent></Card>
              </div>

              <Card className="overflow-hidden border-border shadow-sm">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table className="min-w-[900px]">
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Admission #</TableHead>
                          <TableHead className="text-center">Subjects</TableHead>
                          <TableHead className="text-center">Completed</TableHead>
                          <TableHead className="text-right">Average</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(overview?.students ?? []).length === 0 ? (
                          <TableRow><TableCell colSpan={7} className="h-28 text-center text-muted-foreground">No active students found in this class.</TableCell></TableRow>
                        ) : overview?.students.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">{student.full_name}</TableCell>
                            <TableCell className="font-mono text-xs">{student.admission_number || '-'}</TableCell>
                            <TableCell className="text-center">{student.expected_subjects}</TableCell>
                            <TableCell className="text-center">{student.completed_subjects}</TableCell>
                            <TableCell className="text-right font-semibold">{student.completed_subjects > 0 ? `${student.average.toFixed(1)}%` : '-'}</TableCell>
                            <TableCell className="text-center">{statusBadge(student.status)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => openStudentResult(student)}><Eye className="mr-1.5 h-4 w-4" />View</Button>
                                <Button variant="outline" size="sm" onClick={() => handleDownloadPdf(student)} disabled={student.completed_subjects === 0 || downloadingStudentId === student.id}>
                                  {downloadingStudentId === student.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
                                  PDF
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Dialog open={!!detailStudent} onOpenChange={(open) => { if (!open) { setDetailStudent(null); setDetailGrades([]); } }}>
          <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
            <DialogHeader><DialogTitle>{detailStudent?.full_name || 'Student'} — {selectedTerm}</DialogTitle></DialogHeader>
            {detailLoading ? (
              <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
            ) : detailGrades.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-center">
                <FileQuestion className="mb-3 h-8 w-8 text-muted-foreground/60" />
                <p className="font-medium">No grades recorded.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table className="min-w-[850px]">
                    <TableHeader className="bg-muted/50"><TableRow><TableHead>Subject</TableHead><TableHead className="text-right">T1</TableHead><TableHead className="text-right">T2</TableHead><TableHead className="text-right">Project</TableHead><TableHead className="text-right">Assignment</TableHead><TableHead className="text-right">Exam</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-center">Grade</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {detailGrades.map((grade) => (
                        <TableRow key={grade.id}>
                          <TableCell className="font-medium">{grade.subject}</TableCell>
                          <TableCell className="text-right">{grade.test_1 ?? '-'}</TableCell>
                          <TableCell className="text-right">{grade.test_2 ?? '-'}</TableCell>
                          <TableCell className="text-right">{grade.project_1 ?? '-'}</TableCell>
                          <TableCell className="text-right">{grade.assignment_1 ?? '-'}</TableCell>
                          <TableCell className="text-right">{grade.exam ?? '-'}</TableCell>
                          <TableCell className="text-right font-bold">{grade.total ?? '-'}</TableCell>
                          <TableCell className="text-center">{grade.grade_letter || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => handleDownloadPdf(detailStudent)} disabled={downloadingStudentId === detailStudent?.id}>
                    {downloadingStudentId === detailStudent?.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Download Report Card
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
