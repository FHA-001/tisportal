import { useEffect, useRef } from 'react';
import { buildReportCardDoc, type ReportCardStudent, type ReportCardGradeRow } from '@/lib/reportCardPdf';

const student: ReportCardStudent = {
  full_name: 'Faisal Habib',
  admission_number: 'jss1001',
  class_name: 'JSS 2A',
  tier: 'Junior Secondary',
  class_teacher_name: 'Mrs. Amina Mohammed',
};

const grades: ReportCardGradeRow[] = [
  { subject: 'Basic Technology', test_1: 20, test_2: 15, project_1: 5, assignment_1: 8, exam: 27, total: 75, grade_letter: 'A1', remark: 'Excellent' },
  { subject: 'English Language', test_1: 12, test_2: 15, project_1: 9, assignment_1: 6, exam: 40, total: 82, grade_letter: 'A1', remark: 'Excellent' },
  { subject: 'Civic Education', test_1: 20, test_2: 10, project_1: 2, assignment_1: 7, exam: 28, total: 67, grade_letter: 'B3', remark: 'Good' },
  { subject: 'Hausa Language', test_1: 17, test_2: 15, project_1: 9, assignment_1: 8, exam: 27, total: 76, grade_letter: 'A1', remark: 'Excellent' },
  { subject: 'Mathematics', test_1: 20, test_2: 12, project_1: 4, assignment_1: 1, exam: 27, total: 64, grade_letter: 'C4', remark: 'Credit' },
  { subject: 'Basic Science', test_1: 18, test_2: 15, project_1: 8, assignment_1: 8, exam: 27, total: 76, grade_letter: 'A1', remark: 'Excellent' },
  { subject: 'Social Studies', test_1: 15, test_2: 12, project_1: 6, assignment_1: 7, exam: 30, total: 70, grade_letter: 'B2', remark: 'Very Good' },
  { subject: 'Physical & Health Education', test_1: 19, test_2: 14, project_1: 7, assignment_1: 8, exam: 25, total: 73, grade_letter: 'B2', remark: 'Very Good' },
  { subject: 'Business Studies', test_1: 16, test_2: 13, project_1: 5, assignment_1: 6, exam: 28, total: 68, grade_letter: 'B3', remark: 'Good' },
  { subject: 'Computer Studies', test_1: 20, test_2: 16, project_1: 8, assignment_1: 9, exam: 29, total: 82, grade_letter: 'A1', remark: 'Excellent' },
  { subject: 'Agricultural Science', test_1: 14, test_2: 11, project_1: 6, assignment_1: 5, exam: 26, total: 62, grade_letter: 'C4', remark: 'Credit' },
  { subject: 'Islamic Religious Studies', test_1: 18, test_2: 14, project_1: 7, assignment_1: 8, exam: 28, total: 75, grade_letter: 'A1', remark: 'Excellent' },
];

export default function ReportPreview() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const loadPdf = async () => {
      const doc = await buildReportCardDoc(student, 'First Term', '2026/2027', grades, 72.5);
      const url = doc.output('datauristring');
      if (iframeRef.current) iframeRef.current.src = url;
    };
    loadPdf();
  }, []);

  return <iframe ref={iframeRef} style={{ width: '100vw', height: '100vh', border: 'none' }} title="preview" />;
}
