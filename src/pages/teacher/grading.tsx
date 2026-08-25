import { useState, useRef, useCallback, useEffect } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { useClassSubjects, useAcademicSessions } from '@/hooks/use-academics';
import { useStudents } from '@/hooks/use-users';
import { useGrades, useSaveGrades } from '@/hooks/use-records';
import { getCustomSession, getGradeLetter, getGradeRemark, computeTotal, getMaxScores } from '@/lib/auth-utils';
import { generateReportCardPdf } from '@/lib/reportCardPdf';
import { validateGradeData } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Save, Download, Filter, Zap, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

export default function TeacherGrading() {
  const session = getCustomSession();
  
  const { data: assignments = [] } = useClassSubjects(undefined, session?.id);
  const { data: sessions = [] } = useAcademicSessions();
  const activeSession = sessions.find(s => s.is_active);

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('First Term');
  
  // Bulk fill state
  const [bulkColumn, setBulkColumn] = useState<string>('');
  const [bulkValue, setBulkValue] = useState<string>('');

  const targetAssignment = assignments.find(a => a.id === selectedAssignmentId);
  const selectedClass = targetAssignment?.class_id;

  const { data: students = [], isLoading: loadingStudents } = useStudents('teacher', selectedClass);
  
  const { data: grades = [], isLoading: loadingGrades } = useGrades({
    class_subject_id: selectedAssignmentId,
    term: selectedTerm,
    session: activeSession?.name
  });
  
  const saveGrades = useSaveGrades();

  // Local editing state
  const [localGrades, setLocalGrades] = useState<Record<string, any>>({});

  // Sync server data to local state when class/term changes
  useEffect(() => {
    if (students.length > 0) {
      const newLocal: Record<string, any> = {};
      students.forEach(student => {
        const existingGrade = grades.find(g => g.student_id === student.id);
        newLocal[student.id] = {
          id: existingGrade?.id,
          student_id: student.id,
          test_1: existingGrade?.test_1 ?? '',
          test_2: existingGrade?.test_2 ?? '',
          project_1: existingGrade?.project_1 ?? '',
          assignment_1: existingGrade?.assignment_1 ?? '',
          exam: existingGrade?.exam ?? '',
        };
      });
      setLocalGrades(newLocal);
    } else {
      setLocalGrades({});
    }
  }, [students, grades]);

  const handleScoreChange = (studentId: string, field: string, val: string) => {
    const numVal = val === '' ? '' : Number(val);
    
    // Max score validation
    if (numVal !== '' && targetAssignment?.classes?.tier) {
      const maxScores = getMaxScores(targetAssignment.classes.tier);
      const max = maxScores[field as keyof typeof maxScores];
      if (max !== undefined && (Number(numVal) > max || Number(numVal) < 0)) {
        return; // Reject invalid input
      }
    }

    setLocalGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: numVal
      }
    }));
  };

  const handleBulkFill = () => {
    if (!bulkColumn || bulkValue === '') {
      toast.error('Select a column and enter a valid score');
      return;
    }

    const numVal = Number(bulkValue);
    if (targetAssignment?.classes?.tier) {
      const maxScores = getMaxScores(targetAssignment.classes.tier);
      const max = maxScores[bulkColumn as keyof typeof maxScores];
      if (max !== undefined && (numVal > max || numVal < 0)) {
        toast.error(`Max score for this column is ${max}`);
        return;
      }
    }

    setLocalGrades(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(studentId => {
        next[studentId] = {
          ...next[studentId],
          [bulkColumn]: numVal
        };
      });
      return next;
    });
    setBulkValue('');
    toast.success(`Filled ${bulkColumn} with ${numVal} for all students`);
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all currently entered scores? This will not delete saved grades until you click Save.')) {
      setLocalGrades(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(studentId => {
          next[studentId] = {
            ...next[studentId],
            test_1: '', test_2: '', project_1: '', assignment_1: '', exam: ''
          };
        });
        return next;
      });
    }
  };

  const handleSaveAll = async () => {
    if (!selectedAssignmentId || !selectedTerm || Object.keys(localGrades).length === 0) return;

    // Validate all grade entries
    for (const [studentId, gradeData] of Object.entries(localGrades)) {
      const validation = validateGradeData(gradeData);
      if (!validation.valid) {
        toast.error(`Invalid grade data for student: ${validation.errors.join(', ')}`);
        return;
      }
    }

    const payload = Object.values(localGrades).map(localData => {
      const scores = {
        test_1: localData.test_1 === '' ? null : Number(localData.test_1),
        test_2: localData.test_2 === '' ? null : Number(localData.test_2),
        project_1: localData.project_1 === '' ? null : Number(localData.project_1),
        assignment_1: localData.assignment_1 === '' ? null : Number(localData.assignment_1),
        exam: localData.exam === '' ? null : Number(localData.exam),
      };

      const total = computeTotal(scores);
      // Only assign grade letter if there's at least one score entered
      const hasAnyScore = Object.values(scores).some(v => v !== null);
      const grade_letter = hasAnyScore ? getGradeLetter(total) : null;
      const remark = grade_letter ? getGradeRemark(grade_letter) : null;

      const record: any = {
        student_id: localData.student_id,
        class_subject_id: selectedAssignmentId,
        term: selectedTerm,
        session: activeSession?.name || '2024/2025',
        ...scores,
        total: hasAnyScore ? total : null,
        grade_letter,
        remark
      };

      if (localData.id) record.id = localData.id;
      return record;
    });

    await saveGrades.mutateAsync(payload);
  };

  const getBadgeColor = (letter: string | null) => {
    if (!letter) return 'bg-muted text-muted-foreground';
    if (letter.startsWith('A')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';
    if (letter.startsWith('B')) return 'bg-navy-100 text-navy-700 dark:bg-navy-900/40 dark:text-navy-400';
    if (letter.startsWith('C') || letter.startsWith('D') || letter.startsWith('E')) return 'bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-400';
    if (letter.startsWith('F')) return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
    return 'bg-muted text-muted-foreground';
  };

  const exportToCSV = () => {
    if (!students.length || !grades.length) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Student Name', 'Admission Number', 'Test 1', 'Test 2', 'Project 1', 'Assignment 1', 'Exam', 'Total', 'Grade', 'Remark'];
    const csvData = students.map(student => {
      const grade = grades.find(g => g.student_id === student.id);
      return [
        student.full_name,
        student.admission_number,
        grade?.test_1 || '',
        grade?.test_2 || '',
        grade?.project_1 || '',
        grade?.assignment_1 || '',
        grade?.exam || '',
        grade?.total || '',
        grade?.grade_letter || '',
        grade?.remark || ''
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grades_${targetAssignment?.classes?.name}_${targetAssignment?.subjects?.name}_${selectedTerm}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Grades exported successfully');
  };

  const isReady = selectedAssignmentId && selectedTerm && !loadingStudents && !loadingGrades;
  const maxScores = targetAssignment?.classes?.tier ? getMaxScores(targetAssignment.classes.tier) : null;

  return (
    <CustomSessionGuard role="teacher">
      <DashboardLayout role="teacher">
        <PageHeader title="Input Grades" />

        <div className="bg-card rounded-xl border border-border shadow-sm mb-6 p-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 w-full md:w-64">
              <Label>Class & Subject</Label>
              <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                <SelectTrigger><SelectValue placeholder="Select Assignment" /></SelectTrigger>
                <SelectContent>
                  {assignments.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.classes?.name} - {a.subjects?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          </div>
        </div>

        {!selectedAssignmentId ? (
          <div className="h-64 flex flex-col items-center justify-center border border-dashed rounded-xl bg-muted/30">
            <Filter className="w-8 h-8 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Select a class and subject to input grades.</p>
          </div>
        ) : loadingStudents || loadingGrades ? (
          <div className="h-64 flex items-center justify-center border border-border rounded-xl bg-card">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : students.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center border border-dashed rounded-xl bg-muted/30">
            <p className="text-muted-foreground">No students enrolled in this class.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/30 rounded-xl border border-border">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium mr-2">Bulk Fill:</span>
                <Select value={bulkColumn} onValueChange={setBulkColumn}>
                  <SelectTrigger className="w-[140px] h-9 bg-background"><SelectValue placeholder="Select Col" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test_1">Test 1 (Max {maxScores?.test_1})</SelectItem>
                    <SelectItem value="test_2">Test 2 (Max {maxScores?.test_2})</SelectItem>
                    <SelectItem value="project_1">Project (Max {maxScores?.project_1})</SelectItem>
                    <SelectItem value="assignment_1">Assign. (Max {maxScores?.assignment_1})</SelectItem>
                    <SelectItem value="exam">Exam (Max {maxScores?.exam})</SelectItem>
                  </SelectContent>
                </Select>
                <Input 
                  type="number" 
                  placeholder="Score" 
                  className="w-20 h-9 bg-background"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                />
                <Button variant="secondary" size="sm" className="h-9" onClick={handleBulkFill}>
                  <Zap className="w-4 h-4 mr-2" /> Fill
                </Button>
                <div className="w-px h-6 bg-border mx-2" />
                <Button variant="outline" size="sm" className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleClearAll}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Clear All
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={exportToCSV} variant="outline" size="sm" className="h-9">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button onClick={handleSaveAll} disabled={saveGrades.isPending} className="bg-navy-700 hover:bg-navy-800 text-white shadow-sm">
                  {saveGrades.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save All Grades
                </Button>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
              <Table className="w-full min-w-[800px]">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[200px] sticky left-0 bg-muted/50 z-20 shadow-[1px_0_0_0_var(--color-border)]">Student Name</TableHead>
                    <TableHead className="text-center">
                      <div className="flex flex-col items-center">
                        <span>Test 1</span>
                        <span className="text-xs text-muted-foreground font-normal">Max {maxScores?.test_1}</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex flex-col items-center">
                        <span>Test 2</span>
                        <span className="text-xs text-muted-foreground font-normal">Max {maxScores?.test_2}</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex flex-col items-center">
                        <span>Project</span>
                        <span className="text-xs text-muted-foreground font-normal">Max {maxScores?.project_1}</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex flex-col items-center">
                        <span>Assgn.</span>
                        <span className="text-xs text-muted-foreground font-normal">Max {maxScores?.assignment_1}</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex flex-col items-center">
                        <span>Exam</span>
                        <span className="text-xs text-muted-foreground font-normal">Max {maxScores?.exam}</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center w-[80px]">Total</TableHead>
                    <TableHead className="text-center w-[80px]">Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map(student => {
                    const localData = localGrades[student.id] || {};
                    
                    // Live computation for UI feedback
                    const scores = {
                      test_1: localData.test_1 === '' ? null : Number(localData.test_1),
                      test_2: localData.test_2 === '' ? null : Number(localData.test_2),
                      project_1: localData.project_1 === '' ? null : Number(localData.project_1),
                      assignment_1: localData.assignment_1 === '' ? null : Number(localData.assignment_1),
                      exam: localData.exam === '' ? null : Number(localData.exam),
                    };
                    const hasAnyScore = Object.values(scores).some(v => v !== null);
                    const total = computeTotal(scores);
                    const gradeLetter = hasAnyScore ? getGradeLetter(total) : null;

                    return (
                      <TableRow key={student.id} className="group">
                        <TableCell className="font-medium sticky left-0 bg-card group-hover:bg-muted/50 z-10 shadow-[1px_0_0_0_var(--color-border)]">
                          {student.full_name}
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            className="h-9 w-20 mx-auto text-center" 
                            value={localData.test_1 ?? ''} 
                            onChange={e => handleScoreChange(student.id, 'test_1', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            className="h-9 w-20 mx-auto text-center" 
                            value={localData.test_2 ?? ''} 
                            onChange={e => handleScoreChange(student.id, 'test_2', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            className="h-9 w-20 mx-auto text-center" 
                            value={localData.project_1 ?? ''} 
                            onChange={e => handleScoreChange(student.id, 'project_1', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            className="h-9 w-20 mx-auto text-center" 
                            value={localData.assignment_1 ?? ''} 
                            onChange={e => handleScoreChange(student.id, 'assignment_1', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            className="h-9 w-20 mx-auto text-center border-primary/30 focus-visible:ring-primary/50" 
                            value={localData.exam ?? ''} 
                            onChange={e => handleScoreChange(student.id, 'exam', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-navy-700 dark:text-navy-300">
                            {hasAnyScore ? total : '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${getBadgeColor(gradeLetter)}`}>
                            {gradeLetter || '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DashboardLayout>
    </CustomSessionGuard>
  );
}
