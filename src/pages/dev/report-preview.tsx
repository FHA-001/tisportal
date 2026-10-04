import { useEffect, useRef, useState } from 'react';
import { buildReportCardDoc, type ReportCardStudent, type ReportCardGradeRow } from '@/lib/reportCardPdf';

const jssStudent: ReportCardStudent = {
  full_name: 'Faisal Habib',
  admission_number: 'jss1001',
  class_name: 'JSS 2A',
  tier: 'Junior Secondary',
  class_teacher_name: 'Mrs. Amina Mohammed',
};

const sssStudent: ReportCardStudent = {
  full_name: 'Aisha Ibrahim',
  admission_number: 'sss2001',
  class_name: 'SSS 1B',
  tier: 'Senior Secondary',
  class_teacher_name: 'Mr. John Okafor',
};

const jssSubjects: ReportCardGradeRow[] = [
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
  { subject: 'French Language', test_1: 15, test_2: 13, project_1: 6, assignment_1: 7, exam: 29, total: 70, grade_letter: 'B2', remark: 'Very Good' },
  { subject: 'Home Economics', test_1: 16, test_2: 12, project_1: 5, assignment_1: 6, exam: 27, total: 66, grade_letter: 'B3', remark: 'Good' },
];

const sssSubjects: ReportCardGradeRow[] = [
  { subject: 'Physics', test_1: 8, test_2: 9, project_1: 4, assignment_1: 5, exam: 58, total: 84, grade_letter: 'A1', remark: 'Excellent' },
  { subject: 'Chemistry', test_1: 7, test_2: 8, project_1: 5, assignment_1: 4, exam: 55, total: 79, grade_letter: 'A1', remark: 'Excellent' },
  { subject: 'Biology', test_1: 9, test_2: 8, project_1: 3, assignment_1: 5, exam: 52, total: 77, grade_letter: 'A1', remark: 'Excellent' },
  { subject: 'Mathematics', test_1: 8, test_2: 7, project_1: 4, assignment_1: 4, exam: 50, total: 73, grade_letter: 'B2', remark: 'Very Good' },
  { subject: 'English Language', test_1: 9, test_2: 9, project_1: 5, assignment_1: 5, exam: 56, total: 84, grade_letter: 'A1', remark: 'Excellent' },
  { subject: 'Economics', test_1: 7, test_2: 8, project_1: 4, assignment_1: 4, exam: 49, total: 72, grade_letter: 'B2', remark: 'Very Good' },
  { subject: 'Geography', test_1: 8, test_2: 7, project_1: 3, assignment_1: 5, exam: 48, total: 71, grade_letter: 'B2', remark: 'Very Good' },
  { subject: 'Government', test_1: 9, test_2: 8, project_1: 5, assignment_1: 4, exam: 51, total: 77, grade_letter: 'A1', remark: 'Excellent' },
  { subject: 'Civic Education', test_1: 10, test_2: 9, project_1: 5, assignment_1: 5, exam: 54, total: 83, grade_letter: 'A1', remark: 'Excellent' },
  { subject: 'Literature in English', test_1: 7, test_2: 8, project_1: 4, assignment_1: 4, exam: 47, total: 70, grade_letter: 'B2', remark: 'Very Good' },
  { subject: 'Computer Studies', test_1: 9, test_2: 9, project_1: 5, assignment_1: 5, exam: 57, total: 85, grade_letter: 'A1', remark: 'Excellent' },
  { subject: 'Islamic Religious Studies', test_1: 8, test_2: 8, project_1: 4, assignment_1: 4, exam: 50, total: 74, grade_letter: 'B2', remark: 'Very Good' },
  { subject: 'French Language', test_1: 7, test_2: 7, project_1: 3, assignment_1: 4, exam: 46, total: 67, grade_letter: 'B3', remark: 'Good' },
  { subject: 'Agricultural Science', test_1: 8, test_2: 7, project_1: 4, assignment_1: 4, exam: 45, total: 68, grade_letter: 'B3', remark: 'Good' },
];

function getGradesByCount(count: number, tier: string): ReportCardGradeRow[] {
  const subjects = tier.toLowerCase().includes('senior') ? sssSubjects : jssSubjects;
  return subjects.slice(0, count);
}

export default function ReportPreview() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [subjectCount, setSubjectCount] = useState(9);
  const [tier, setTier] = useState<'jss' | 'sss'>('jss');

  useEffect(() => {
    const loadPdf = async () => {
      const student = tier === 'sss' ? sssStudent : jssStudent;
      const grades = getGradesByCount(subjectCount, student.tier);
      const doc = await buildReportCardDoc(student, 'First Term', '2026/2027', grades, 72.5);
      const url = doc.output('datauristring');
      if (iframeRef.current) iframeRef.current.src = url;
    };
    loadPdf();
  }, [subjectCount, tier]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ padding: '10px', background: '#f0f0f0', borderBottom: '1px solid #ccc' }}>
        <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Dev Preview:</label>
        <label style={{ marginRight: '5px' }}>Tier:</label>
        <button
          onClick={() => setTier('jss')}
          style={{ padding: '5px 10px', marginRight: '15px', background: tier === 'jss' ? '#1E3A8A' : '#fff', color: tier === 'jss' ? '#fff' : '#000', border: '1px solid #ccc', cursor: 'pointer' }}
        >
          JSS
        </button>
        <button
          onClick={() => setTier('sss')}
          style={{ padding: '5px 10px', marginRight: '15px', background: tier === 'sss' ? '#1E3A8A' : '#fff', color: tier === 'sss' ? '#fff' : '#000', border: '1px solid #ccc', cursor: 'pointer' }}
        >
          SSS
        </button>
        <label style={{ marginRight: '5px' }}>Subjects:</label>
        <button
          onClick={() => setSubjectCount(9)}
          style={{ padding: '5px 10px', marginRight: '5px', background: subjectCount === 9 ? '#1E3A8A' : '#fff', color: subjectCount === 9 ? '#fff' : '#000', border: '1px solid #ccc', cursor: 'pointer' }}
        >
          9
        </button>
        <button
          onClick={() => setSubjectCount(11)}
          style={{ padding: '5px 10px', marginRight: '5px', background: subjectCount === 11 ? '#1E3A8A' : '#fff', color: subjectCount === 11 ? '#fff' : '#000', border: '1px solid #ccc', cursor: 'pointer' }}
        >
          11
        </button>
        <button
          onClick={() => setSubjectCount(14)}
          style={{ padding: '5px 10px', background: subjectCount === 14 ? '#1E3A8A' : '#fff', color: subjectCount === 14 ? '#fff' : '#000', border: '1px solid #ccc', cursor: 'pointer' }}
        >
          14
        </button>
      </div>
      <iframe ref={iframeRef} style={{ flex: 1, border: 'none' }} title="preview" />
    </div>
  );
}
