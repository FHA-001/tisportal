import { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useParentChildren } from '@/hooks/use-parents';
import { useGrades } from '@/hooks/use-records';
import { getCustomSession } from '@/lib/auth-utils';
import { generateReportCardPdf, buildReportCardDoc } from '@/lib/reportCardPdf';
import { Award, Loader2, ChevronDown, User, Download, Printer } from 'lucide-react';
import { getGradeLetter, getGradeRemark } from '@/lib/auth-utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { SCHOOL_CONFIG } from '@/lib/app-config';

export default function ParentGrades() {
  const session = getCustomSession();
  const { data: children = [], isLoading: childrenLoading } = useParentChildren();
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('First Term');
  const [showChildDropdown, setShowChildDropdown] = useState(false);

  const selectedChild = children.find((c: any) => c.students?.id === selectedChildId);
  
  // Set first child as default when children load
  if (children.length > 0 && !selectedChildId && children[0].students) {
    setSelectedChildId(children[0].students.id);
  }

  const { data: grades = [], isLoading: gradesLoading } = useGrades({
    student_id: selectedChildId
  });

  const handleDownloadPdf = async () => {
    if (!selectedChild || !selectedChild.students || grades.length === 0) {
      toast.error('No grades available to download for this child.');
      return;
    }

    try {
      toast.loading('Generating report card...', { id: 'pdf-gen' });

      // Fetch a few extra fields (gender, DOB) not carried in the student data
      const { data: directoryRow } = await supabase
        .from('students_directory')
        .select('gender, date_of_birth, class_id')
        .eq('id', selectedChild.students.id)
        .maybeSingle();

      const classId = directoryRow?.class_id || selectedChild.students.class_id;

      const pdfGrades = grades.map(g => ({
        subject: g.class_subjects?.subjects?.name || 'Unknown',
        test_1: g.test_1,
        test_2: g.test_2,
        project_1: g.project_1,
        assignment_1: g.assignment_1,
        exam: g.exam,
        total: g.total,
        grade_letter: g.grade_letter,
        remark: g.remark,
      }));

      // Find class name from the first grade record
      const className = grades[0]?.class_subjects?.classes?.name || selectedChild.students.classes?.name || 'Unknown Class';

      const studentInfo = {
        full_name: selectedChild.students.full_name,
        admission_number: selectedChild.students.admission_number,
        class_name: className,
        tier: selectedChild.students.tier,
      };

      await generateReportCardPdf(studentInfo, selectedTerm || 'First Term', 'Current Session', pdfGrades);
      toast.success('Report card downloaded.', { id: 'pdf-gen' });
    } catch (err) {
      toast.error('Failed to generate report card.', { id: 'pdf-gen' });
    }
  };

  const handlePrint = async () => {
    if (!selectedChild || !selectedChild.students || grades.length === 0) {
      toast.error('No grades available to print for this child.');
      return;
    }

    try {
      toast.loading('Generating report card for printing...', { id: 'pdf-print' });

      const pdfGrades = grades.map(g => ({
        subject: g.class_subjects?.subjects?.name || 'Unknown',
        test_1: g.test_1,
        test_2: g.test_2,
        project_1: g.project_1,
        assignment_1: g.assignment_1,
        exam: g.exam,
        total: g.total,
        grade_letter: g.grade_letter,
        remark: g.remark,
      }));

      // Find class name from the first grade record
      const className = grades[0]?.class_subjects?.classes?.name || selectedChild.students.classes?.name || 'Unknown Class';

      const studentInfo = {
        full_name: selectedChild.students.full_name,
        admission_number: selectedChild.students.admission_number,
        class_name: className,
        tier: selectedChild.students.tier,
      };

      const doc = await buildReportCardDoc(studentInfo, selectedTerm || 'First Term', 'Current Session', pdfGrades);
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
      toast.success('Report card opened for printing.', { id: 'pdf-print' });
    } catch (err) {
      toast.error('Failed to generate report card for printing.', { id: 'pdf-print' });
    }
  };

  // Group grades by term/session
  const groupedGrades = grades.reduce((acc: any, grade: any) => {
    const key = `${grade.session} - ${grade.term}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(grade);
    return acc;
  }, {});

  return (
    <CustomSessionGuard role="parent">
      <DashboardLayout role="parent">
        <PageHeader 
          title="Academic Results" 
          subtitle="View your children's grades and academic performance."
          actions={
            selectedChild && selectedChild.students && grades.length > 0 && (
              <div className="flex gap-2 w-full md:w-auto">
                <Button variant="outline" onClick={handlePrint} className="shrink-0 bg-background" title="Print format">
                  <Printer className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Print</span>
                </Button>
                <Button onClick={handleDownloadPdf} className="bg-navy-700 hover:bg-navy-800 text-white shrink-0">
                  <Download className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Download PDF</span>
                </Button>
              </div>
            )
          }
        />

        <Card className="card-premium border-border mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Select Child & Term
            </CardTitle>
            <CardDescription>
              Choose which child and academic term to view results for.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="text-sm font-medium mb-2 block">Child</label>
                {childrenLoading ? (
                  <div className="flex items-center justify-center py-4 border rounded-lg">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : children.length === 0 ? (
                  <div className="text-muted-foreground text-center py-4 border rounded-lg">
                    No children linked to your account.
                  </div>
                ) : (
                  <div className="relative">
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => setShowChildDropdown(!showChildDropdown)}
                    >
                      {selectedChild && selectedChild.students ? (
                        <span>{selectedChild.students.full_name} ({selectedChild.students.admission_number})</span>
                      ) : (
                        <span>Select a child</span>
                      )}
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    
                    {showChildDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                        {children.map((child: any) => (
                          <button
                            key={child.id}
                            className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b last:border-b-0"
                            onClick={() => {
                              if (child.students) {
                                setSelectedChildId(child.students.id);
                                setShowChildDropdown(false);
                              }
                            }}
                          >
                            {child.students ? (
                              <>
                                <div className="font-medium">{child.students.full_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {child.students.admission_number} • {child.students.classes?.name}
                                </div>
                              </>
                            ) : (
                              <div className="text-muted-foreground">Student data not available</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Academic Term</label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Select Term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="First Term">First Term</SelectItem>
                    <SelectItem value="Second Term">Second Term</SelectItem>
                    <SelectItem value="Third Term">Third Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedChild && selectedChild.students && (
          <>
            <Card className="card-premium border-border mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  {selectedChild.students.full_name}'s Performance Summary
                </CardTitle>
                <CardDescription>
                  {selectedChild.students.classes?.name} • {selectedChild.students.classes?.tier}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {gradesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : grades.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No grades recorded yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Total Subjects</div>
                      <div className="text-2xl font-bold">{Object.keys(groupedGrades).length}</div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Average Score</div>
                      <div className="text-2xl font-bold">
                        {grades.length > 0 
                          ? (grades.reduce((sum: number, g: any) => sum + (g.total || 0), 0) / grades.length).toFixed(1)
                          : '0'}
                      </div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Grade Entries</div>
                      <div className="text-2xl font-bold">{grades.length}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {Object.entries(groupedGrades).map(([sessionTerm, sessionGrades]: [string, any]) => (
              <Card key={sessionTerm} className="card-premium border-border mb-6">
                <CardHeader>
                  <CardTitle>{sessionTerm}</CardTitle>
                  <CardDescription>
                    {sessionGrades.length} grade entries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Subject</th>
                          <th className="text-left py-3 px-4 font-medium">Test 1</th>
                          <th className="text-left py-3 px-4 font-medium">Test 2</th>
                          <th className="text-left py-3 px-4 font-medium">Project</th>
                          <th className="text-left py-3 px-4 font-medium">Assignment</th>
                          <th className="text-left py-3 px-4 font-medium">Exam</th>
                          <th className="text-left py-3 px-4 font-medium">Total</th>
                          <th className="text-left py-3 px-4 font-medium">Grade</th>
                          <th className="text-left py-3 px-4 font-medium">Remark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionGrades.map((grade: any) => (
                          <tr key={grade.id} className="border-b last:border-b-0">
                            <td className="py-3 px-4 font-medium">
                              {grade.class_subjects?.subjects?.name}
                            </td>
                            <td className="py-3 px-4">{grade.test_1 || '-'}</td>
                            <td className="py-3 px-4">{grade.test_2 || '-'}</td>
                            <td className="py-3 px-4">{grade.project_1 || '-'}</td>
                            <td className="py-3 px-4">{grade.assignment_1 || '-'}</td>
                            <td className="py-3 px-4">{grade.exam || '-'}</td>
                            <td className="py-3 px-4 font-bold">{grade.total || '-'}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                getGradeLetter(grade.total || 0).startsWith('A') || getGradeLetter(grade.total || 0).startsWith('B')
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : getGradeLetter(grade.total || 0).startsWith('C')
                                  ? 'bg-blue-100 text-blue-800'
                                  : getGradeLetter(grade.total || 0).startsWith('D')
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {getGradeLetter(grade.total || 0)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">
                              {getGradeRemark(getGradeLetter(grade.total || 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </DashboardLayout>
    </CustomSessionGuard>
  );
}
