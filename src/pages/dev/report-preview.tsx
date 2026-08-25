import { useEffect, useRef } from 'react';
import { buildReportCardDoc, type ReportCardStudent, type ReportCardGradeRow } from '@/lib/reportCardPdf';

const student: ReportCardStudent = {
  full_name: 'Faisal Habib',
  admission_number: 'jss1001',
  class_name: 'JSS 2A',
  tier: 'Junior Secondary',
};

const grades: ReportCardGradeRow[] = [
  { subject: 'Basic Technology', test_1: 20, test_2: 15, project_1: 5, assignment_1: 8, exam: 27, total: 75, grade_letter: 'A1', remark: 'Excellent' },
  { subject: 'English', test_1: 12, test_2: 1, project_1: 9, assignment_1: 6, exam: 40, total: 68, grade_letter: 'B3', remark: 'Good' },
  { subject: 'Civic Education', test_1: 20, test_2: 10, project_1: 2, assignment_1: 7, exam: 28, total: 67, grade_letter: 'B3', remark: 'Good' },
  { subject: 'Hausa', test_1: 17, test_2: 15, project_1: 9, assignment_1: 8, exam: 27, total: 76, grade_letter: 'A1', remark: 'Excellent' },
  { subject: 'Mathematics', test_1: 20, test_2: 12, project_1: 4, assignment_1: 1, exam: 27, total: 64, grade_letter: 'C4', remark: 'Credit' },
  { subject: 'Basic Science', test_1: 3, test_2: 15, project_1: 8, assignment_1: 8, exam: 27, total: 61, grade_letter: 'C4', remark: 'Credit' },
];

export default function ReportPreview() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const loadPdf = async () => {
      const doc = await buildReportCardDoc(student, 'First Term', '2026/2027', grades);
      const url = doc.output('datauristring');
      if (iframeRef.current) iframeRef.current.src = url;
    };
    loadPdf();
  }, []);

  return <iframe ref={iframeRef} style={{ width: '100vw', height: '100vh', border: 'none' }} title="preview" />;
}
