import { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { PageHeader } from '@/components/shared/page-header';
import { useClasses, useClassSubjects, useAcademicSessions } from '@/hooks/use-academics';
import { useGrades } from '@/hooks/use-records';
import { generateReportCardPdf } from '@/lib/reportCardPdf';
import { computeClassRankings } from '@/lib/reportCardData';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Download, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export default function AdminGrades() {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('First Term');

  const { data: classes = [] } = useClasses();
  const { data: sessions = [] } = useAcademicSessions();
  const activeSession = sessions.find(s => s.is_active);

  // Get subjects mapped to the selected class
  const { data: classSubjects = [] } = useClassSubjects(selectedClass || 'none');
  
  // Use the specific class_subject_id based on selection
  const targetClassSubject = classSubjects.find(cs => cs.subject_id === selectedSubject);

  const { data: grades = [], isLoading: loadingGrades } = useGrades({
    class_subject_id: targetClassSubject?.id,
    term: selectedTerm,
    session: activeSession?.name
  });

  const getBadgeColor = (letter: string | null) => {
    if (!letter) return 'bg-muted text-muted-foreground';
    if (letter.startsWith('A')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';
    if (letter.startsWith('B')) return 'bg-navy-100 text-navy-700 dark:bg-navy-900/40 dark:text-navy-400';
    if (letter.startsWith('C') || letter.startsWith('D') || letter.startsWith('E')) return 'bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-400';
    if (letter.startsWith('F')) return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
    return 'bg-muted text-muted-foreground';
  };

  const handleDownloadPdf = async (studentId: string, studentData: any) => {
    try {
      toast.loading('Generating report card...', { id: 'pdf-gen' });
      
      // Fetch ALL grades for this student and term to build the full report card
      const { data: allStudentGrades, error } = await supabase
        .from('grades')
        .select(`
          *,
          class_subjects(
            subjects(name)
          )
        `)
        .eq('student_id', studentId)
        .eq('term', selectedTerm)
        .eq('session', activeSession?.name || '');

      if (error) throw error;

      if (!allStudentGrades || allStudentGrades.length === 0) {
        toast.error('No grades found for this student in the selected term.', { id: 'pdf-gen' });
        return;
      }

      const classId = studentData.class_id || selectedClass;
      let rankings: Awaited<ReturnType<typeof computeClassRankings>> | null = null;
      if (classId && activeSession?.name) {
        try {
          rankings = await computeClassRankings(classId, selectedTerm, activeSession.name);
        } catch {
          rankings = null;
        }
      }

      // Format data for PDF generator
      const pdfGrades = allStudentGrades.map(g => ({
        subject: g.class_subjects?.subjects?.name || 'Unknown Subject',
        test_1: g.test_1,
        test_2: g.test_2,
        project_1: g.project_1,
        assignment_1: g.assignment_1,
        exam: g.exam,
        total: g.total,
        grade_letter: g.grade_letter,
        remark: g.remark,
      }));

      const studentInfo = {
        full_name: studentData.full_name,
        admission_number: studentData.admission_number,
        class_name: studentData.classes?.name || '',
        tier: studentData.tier,
      };

      await generateReportCardPdf(studentInfo, selectedTerm, activeSession?.name, pdfGrades);
      toast.success('Report card downloaded successfully.', { id: 'pdf-gen' });
    } catch (err: any) {
      toast.error(`Failed to generate PDF: ${err.message}`, { id: 'pdf-gen' });
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout role="admin">
        <PageHeader title="View Grades & Report Cards" />

        <div className="bg-card rounded-xl border border-border shadow-sm mb-6 p-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 w-full md:w-48">
              <Label>Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger><SelectValue placeholder="Select Term" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="First Term">First Term</SelectItem>
                  <SelectItem value="Second Term">Second Term</SelectItem>
                  <SelectItem value="Third Term">Third Term</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full md:w-48">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedSubject(''); }}>
                <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full md:w-64">
              <Label>Subject (Filtered by Class)</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={!selectedClass || classSubjects.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={!selectedClass ? "Select class first" : classSubjects.length === 0 ? "No subjects assigned" : "Select Subject"} />
                </SelectTrigger>
                <SelectContent>
                  {classSubjects.map(cs => (
                    <SelectItem key={cs.subject_id} value={cs.subject_id}>{cs.subjects?.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {!selectedClass || !selectedSubject ? (
          <div className="h-64 flex flex-col items-center justify-center border border-dashed rounded-xl bg-muted/30">
            <Filter className="w-8 h-8 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Select a class and subject to view grades.</p>
          </div>
        ) : loadingGrades ? (
          <div className="h-64 flex items-center justify-center border border-border rounded-xl bg-card">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : grades.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center border border-dashed rounded-xl bg-muted/30">
            <p className="text-muted-foreground">No grades recorded for this subject and term.</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="text-right">T1</TableHead>
                  <TableHead className="text-right">T2</TableHead>
                  <TableHead className="text-right">Proj</TableHead>
                  <TableHead className="text-right">Asgn</TableHead>
                  <TableHead className="text-right">Exam</TableHead>
                  <TableHead className="text-right font-bold">Total</TableHead>
                  <TableHead className="text-center">Grade</TableHead>
                  <TableHead className="text-right">Report Card</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map(g => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.students?.full_name}</TableCell>
                    <TableCell className="text-right">{g.test_1 ?? '-'}</TableCell>
                    <TableCell className="text-right">{g.test_2 ?? '-'}</TableCell>
                    <TableCell className="text-right">{g.project_1 ?? '-'}</TableCell>
                    <TableCell className="text-right">{g.assignment_1 ?? '-'}</TableCell>
                    <TableCell className="text-right">{g.exam ?? '-'}</TableCell>
                    <TableCell className="text-right font-bold text-navy-700 dark:text-navy-300">{g.total ?? '-'}</TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${getBadgeColor(g.grade_letter)}`}>
                        {g.grade_letter || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-xs bg-navy-50 hover:bg-navy-100 text-navy-700 border-navy-200 dark:bg-navy-900/30 dark:border-navy-800 dark:text-navy-300"
                        onClick={() => handleDownloadPdf(g.student_id, g.students)}
                        title="Download Report Card PDF"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
