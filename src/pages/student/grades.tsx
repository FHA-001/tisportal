import { useState } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { CustomSessionGuard } from '@/components/shared/custom-session-guard';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useStudentGrades } from '@/hooks/use-records';
import { useAcademicSessions } from '@/hooks/use-academics';
import { getCustomSession } from '@/lib/auth-utils';
import { generateReportCardPdf, buildReportCardDoc } from '@/lib/reportCardPdf';
import { Download, Loader2, Award, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { SCHOOL_CONFIG } from '@/lib/app-config';

export default function StudentGrades() {
  const session = getCustomSession() as any;
  const { data: sessions = [] } = useAcademicSessions();
  const activeSession = sessions.find(s => s.is_active);

  const [selectedTerm, setSelectedTerm] = useState<string>(activeSession?.current_term || 'First Term');

  const { data: grades = [], isLoading } = useStudentGrades({
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

  const validGrades = grades.filter(g => g.total !== null);
  const totalScored = validGrades.reduce((sum, g) => sum + (g.total || 0), 0);
  const average = validGrades.length > 0 ? (totalScored / validGrades.length).toFixed(1) : '0.0';

  const handleDownloadPdf = async () => {
    if (grades.length === 0) {
      toast.error('No grades available to download for this term.');
      return;
    }

    try {
      toast.loading('Generating report card...', { id: 'pdf-gen' });

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
      const className = grades[0]?.class_subjects?.classes?.name || 'Unknown Class';

      const studentInfo = {
        full_name: session.full_name,
        admission_number: session.admission_number,
        class_name: className,
        tier: session.tier,
      };

      await generateReportCardPdf(studentInfo, selectedTerm, activeSession?.name, pdfGrades);
      toast.success('Report card downloaded.', { id: 'pdf-gen' });
    } catch (err) {
      toast.error('Failed to generate report card.', { id: 'pdf-gen' });
    }
  };

  const handlePrint = async () => {
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
      const className = grades[0]?.class_subjects?.classes?.name || 'Unknown Class';

      const studentInfo = {
        full_name: session.full_name,
        admission_number: session.admission_number,
        class_name: className,
        tier: session.tier,
      };

      const doc = await buildReportCardDoc(studentInfo, selectedTerm, activeSession?.name, pdfGrades);
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
      toast.success('Report card opened for printing.', { id: 'pdf-print' });
    } catch (err) {
      toast.error('Failed to generate report card for printing.', { id: 'pdf-print' });
    }
  };

  return (
    <CustomSessionGuard role="student">
      <DashboardLayout role="student">
        {/* Printable Header - hidden on screen, visible on print */}
        <div className="hidden no-print print:block print:mb-8 print:text-center">
          <h1 className="text-2xl font-bold text-black mb-1 uppercase tracking-wider">{SCHOOL_CONFIG.name}</h1>
          <p className="text-gray-600 text-sm mb-4">{SCHOOL_CONFIG.location}</p>
          <div className="border-b-2 border-black w-full mb-4"></div>
          <h2 className="text-xl font-bold mb-6">{selectedTerm} Report Card - {activeSession?.name}</h2>
          
          <div className="flex justify-between text-left mb-6 border p-4 bg-gray-50">
            <div>
              <p className="font-bold">Student: <span className="font-normal">{session?.full_name}</span></p>
              <p className="font-bold">Admission #: <span className="font-normal">{session?.admission_number}</span></p>
            </div>
            <div>
              <p className="font-bold">Tier: <span className="font-normal">{session?.tier}</span></p>
            </div>
          </div>
        </div>

        <div className="print:hidden">
          <PageHeader 
            title="My Grades" 
            actions={
              <div className="flex gap-2 w-full md:w-auto">
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger className="w-[160px] bg-background">
                    <SelectValue placeholder="Select Term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="First Term">First Term</SelectItem>
                    <SelectItem value="Second Term">Second Term</SelectItem>
                    <SelectItem value="Third Term">Third Term</SelectItem>
                  </SelectContent>
                </Select>
                {grades.length > 0 && (
                  <>
                    <Button variant="outline" onClick={handlePrint} className="shrink-0 bg-background" title="Print format">
                      <Printer className="w-4 h-4 md:mr-2" />
                      <span className="hidden md:inline">Print</span>
                    </Button>
                    <Button onClick={handleDownloadPdf} className="bg-navy-700 hover:bg-navy-800 text-white shrink-0">
                      <Download className="w-4 h-4 md:mr-2" />
                      <span className="hidden md:inline">Download PDF</span>
                    </Button>
                  </>
                )}
              </div>
            }
          />
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center border border-border rounded-xl bg-card print:hidden">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : grades.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center border border-dashed rounded-xl bg-muted/30 print:hidden">
            <Award className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
            <p className="text-muted-foreground font-medium">No grades available for {selectedTerm}.</p>
            <p className="text-sm text-muted-foreground mt-1">Grades will appear here once published by your teachers.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
              <Card className="bg-gradient-to-br from-navy-800 to-navy-900 text-white border-0 shadow-md">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-navy-200 font-medium mb-1">Term Average</p>
                    <h3 className="text-4xl font-heading font-bold tracking-tight">{average}%</h3>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                    <Award className="w-8 h-8 text-white" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border shadow-sm">
                <CardContent className="p-6 flex items-center justify-between h-full">
                  <div>
                    <p className="text-muted-foreground font-medium mb-1">Subjects Graded</p>
                    <h3 className="text-3xl font-heading font-bold text-foreground">{validGrades.length} <span className="text-lg text-muted-foreground font-normal">/ {grades.length}</span></h3>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto print:border-0 print:shadow-none">
              <Table className="w-full min-w-[700px] print:w-full print:min-w-0">
                <TableHeader className="bg-muted/50 print:bg-gray-100">
                  <TableRow>
                    <TableHead className="w-[250px]">Subject</TableHead>
                    <TableHead className="text-center">T1</TableHead>
                    <TableHead className="text-center">T2</TableHead>
                    <TableHead className="text-center hidden md:table-cell print:table-cell">Proj</TableHead>
                    <TableHead className="text-center hidden md:table-cell print:table-cell">Asgn</TableHead>
                    <TableHead className="text-center">Exam</TableHead>
                    <TableHead className="text-center font-bold text-navy-800 print:text-black">Total</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                    <TableHead className="text-left hidden sm:table-cell print:table-cell">Remark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades.map(g => (
                    <TableRow key={g.id} className="print:border-b-gray-200">
                      <TableCell className="font-medium text-foreground print:text-black">
                        {g.class_subjects?.subjects?.name}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground print:text-black">{g.test_1 ?? '-'}</TableCell>
                      <TableCell className="text-center text-muted-foreground print:text-black">{g.test_2 ?? '-'}</TableCell>
                      <TableCell className="text-center text-muted-foreground hidden md:table-cell print:table-cell print:text-black">{g.project_1 ?? '-'}</TableCell>
                      <TableCell className="text-center text-muted-foreground hidden md:table-cell print:table-cell print:text-black">{g.assignment_1 ?? '-'}</TableCell>
                      <TableCell className="text-center text-muted-foreground print:text-black">{g.exam ?? '-'}</TableCell>
                      <TableCell className="text-center font-bold text-navy-700 dark:text-navy-300 print:text-black">{g.total ?? '-'}</TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm print:bg-transparent print:text-black print:p-0 ${getBadgeColor(g.grade_letter)}`}>
                          {g.grade_letter || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-left text-sm text-muted-foreground hidden sm:table-cell print:table-cell print:text-black">
                        {g.remark || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Print Footer Summary */}
            <div className="hidden print:block mt-8 border-t border-black pt-4">
              <div className="flex justify-between font-bold text-lg mb-16">
                <span>Overall Average: {average}%</span>
                <span>Subjects Graded: {validGrades.length}</span>
              </div>
              <div className="flex justify-between text-sm mt-24">
                <div className="w-64 border-t border-black pt-2 text-center">Class Teacher's Signature</div>
                <div className="w-64 border-t border-black pt-2 text-center">Principal's Signature</div>
              </div>
            </div>

          </div>
        )}
      </DashboardLayout>
    </CustomSessionGuard>
  );
}
