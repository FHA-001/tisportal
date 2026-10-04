import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SCHOOL } from './app-config';
import { getGradeRemark, type GradeLetter } from './auth-utils';
import { getClassTeacherRemark, getPrincipalRemark } from './remarks';

export type ReportCardGradeRow = {
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

export type ReportCardStudent = {
  full_name: string;
  admission_number: string;
  class_name: string;
  tier: string;
  class_teacher_name?: string;
};

// ---------------------------------------------------------------------------
// Modern Color Palette (White, Light Blue, Deep Navy Blue)
// ---------------------------------------------------------------------------
const NAVY_BLUE: [number, number, number] = [30, 58, 138]; // #1E3A8A
const NAVY_BLUE_DARK: [number, number, number] = [15, 23, 42]; // #0F172A
const LIGHT_BLUE: [number, number, number] = [235, 245, 255];
const LIGHT_BLUE_ALT: [number, number, number] = [248, 250, 252]; // #F8FAFC
const WHITE: [number, number, number] = [255, 255, 255];
const GRAY: [number, number, number] = [80, 80, 80];
const GRAY_LIGHT: [number, number, number] = [150, 150, 150];
const BORDER: [number, number, number] = [226, 232, 240]; // #E2E8F0
const DARK_TEXT: [number, number, number] = [30, 41, 59]; // #1E293B
const BLACK: [number, number, number] = [0, 0, 0];

function gradeColor(letter: string | null | undefined): [number, number, number] {
  if (!letter) return GRAY;
  if (letter.startsWith('A')) return [0, 100, 0];
  if (letter.startsWith('B')) return NAVY_BLUE;
  if (letter.startsWith('C')) return [200, 150, 0];
  if (letter.startsWith('D') || letter.startsWith('E')) return [180, 100, 20];
  return [200, 50, 50];
}

// Builds the report card jsPDF document without saving it (used by the
// downloader and by internal previews/tests).
export async function buildReportCardDoc(
  student: ReportCardStudent,
  term: string,
  session: string | undefined,
  grades: ReportCardGradeRow[],
  cumulative_average?: number | null,
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const marginX = 10;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - marginX * 2;
  const centerX = pageWidth / 2;
  let y = 8;

  // ---- School Logo -----------------------------------------------------------
  const logoUrl = 'https://i.ibb.co/273KSyLM/5902013719250669943.jpg';
  try {
    await doc.addImage(logoUrl, 'JPEG', centerX - 15, y, 30, 30);
    y += 32;
  } catch (error) {
    // Fallback if image fails to load
    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...NAVY_BLUE);
    doc.text(SCHOOL.name.toUpperCase(), centerX, y + 15, { align: 'center' });
    y += 20;
  }

  // ---- Header (Times New Roman for school name) -----------------------------
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...NAVY_BLUE);
  doc.text(SCHOOL.name.toUpperCase(), centerX, y, { align: 'center' });
  y += 4;

  doc.setFont('times', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  const mottoLine = SCHOOL.mottoTranslation
    ? SCHOOL.mottoTranslation.split(/\s+and\s+/i).join(' • ')
    : SCHOOL.motto;
  doc.text(mottoLine, centerX, y, { align: 'center' });
  y += 4;

  // ---- School Contact Details -----------------------------------------------
  doc.setFont('times', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY);
  doc.text('KM 20, Abuja–Keffi Road, Kuchikau', centerX, y, { align: 'center' });
  y += 3;
  doc.text('0706 264 1324 | tritonintschool@gmail.com | www.triton.edu.ng', centerX, y, { align: 'center' });
  y += 4;

  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY_BLUE_DARK);
  doc.text('STUDENT ACADEMIC REPORT CARD', centerX, y, { align: 'center' });
  y += 3;

  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  const subtitle = session ? `${session} — ${term}` : term;
  doc.text(subtitle, centerX, y, { align: 'center' });
  y += 5;

  doc.setDrawColor(...NAVY_BLUE);
  doc.setLineWidth(1);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 6;

  // ---- Student Metadata Grid (Compact) ------------------------------------
  const gridHeight = 14;
  const colWidth = contentWidth / 4;

  type MetadataField = [string, string];
  const metadataFields: MetadataField[] = [
    ['Student Name', student.full_name],
    ['Admission No.', student.admission_number],
    ['Class', student.class_name],
    ['Session', session || '—'],
  ];

  metadataFields.forEach(([label, value], i) => {
    const x = marginX + i * colWidth;
    doc.setFont('times', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...DARK_TEXT);
    doc.text(label, x, y);
    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...NAVY_BLUE);
    doc.text(value, x, y + 4);
  });

  y += gridHeight + 4;

  // ---- Subjects Table (Full detail, compact) --------
  // Calculate CA score (sum of test_1, test_2, assignment_1, project_1)
  const calculateCA = (g: ReportCardGradeRow): number => {
    return (g.test_1 || 0) + (g.test_2 || 0) + (g.assignment_1 || 0) + (g.project_1 || 0);
  };

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX, top: 0, bottom: 10 },
    head: [['Subject', 'T1', 'T2', 'Proj', 'Asgn', 'Exam', 'Total', 'Grade', 'Remark']],
    body: grades.map((g) => {
      const caScore = calculateCA(g);
      const remark = g.remark || getGradeRemark((g.grade_letter as GradeLetter) || 'F9');
      return [
        g.subject,
        g.test_1 ?? '-',
        g.test_2 ?? '-',
        g.project_1 ?? '-',
        g.assignment_1 ?? '-',
        g.exam ?? '-',
        g.total ?? '-',
        g.grade_letter ?? '-',
        remark,
      ];
    }),
    styles: {
      lineColor: BORDER,
      lineWidth: 0.1,
      font: 'times',
    },
    headStyles: {
      fillColor: NAVY_BLUE,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
      valign: 'middle',
      lineColor: BORDER,
      lineWidth: 0.1,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: DARK_TEXT,
      fontStyle: 'normal',
    },
    alternateRowStyles: { fillColor: LIGHT_BLUE_ALT },
    columnStyles: {
      0: { fontStyle: 'normal', halign: 'left', cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 12 },
      2: { halign: 'center', cellWidth: 12 },
      3: { halign: 'center', cellWidth: 12 },
      4: { halign: 'center', cellWidth: 12 },
      5: { halign: 'center', cellWidth: 12 },
      6: { halign: 'center', cellWidth: 12, fontStyle: 'bold' },
      7: { halign: 'center', cellWidth: 14, fontStyle: 'bold' },
      8: { halign: 'left', cellWidth: 'auto', fontStyle: 'normal' },
    },
    rowPageBreak: 'avoid',
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const rowGrade = grades[data.row.index];
      if (!rowGrade) return;
      if (data.column.index === 7) {
        data.cell.styles.textColor = gradeColor(rowGrade.grade_letter);
      }
      if (data.column.index === 6) {
        data.cell.styles.textColor = NAVY_BLUE;
      }
    },
  });

  // @ts-expect-error jspdf-autotable augments doc with lastAutoTable at runtime
  let finalY = (doc.lastAutoTable?.finalY ?? y) + 4;

  const validGrades = grades.filter((g) => g.total !== null);
  const totalScored = validGrades.reduce((sum, g) => sum + (g.total ?? 0), 0);
  const average = validGrades.length > 0 ? totalScored / validGrades.length : 0;

  // ---- Performance Summary Section (Compact) -------------------------
  const summaryHeight = 12;
  doc.setDrawColor(...NAVY_BLUE);
  doc.setLineWidth(0.6);
  doc.setFillColor(...LIGHT_BLUE_ALT);
  doc.roundedRect(marginX, finalY, contentWidth, summaryHeight, 1.5, 1.5, 'FD');

  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...NAVY_BLUE);

  const summaryX = marginX + 5;
  doc.text(`Term Avg: ${average.toFixed(1)}%`, summaryX, finalY + 5);

  if (cumulative_average !== null && cumulative_average !== undefined) {
    doc.text(`Cumulative: ${cumulative_average.toFixed(1)}%`, summaryX + 35, finalY + 5);
  }

  finalY += summaryHeight + 4;

  // ---- Remarks Section (Compact, side-by-side) ----------------------
  const remarkGap = 4;
  const remarkWidth = (contentWidth - remarkGap) / 2;
  const remarkHeight = 26;

  const classTeacherName = student.class_teacher_name || 'Not Assigned';
  const teacherRemark = getClassTeacherRemark(average);
  const principalRemarkText = getPrincipalRemark(average);

  const remarkBoxes: { title: string; teacherName: string; text: string; author: string }[] = [
    {
      title: "CLASS TEACHER'S REMARK",
      teacherName: classTeacherName,
      text: teacherRemark,
      author: 'Class Teacher'
    },
    {
      title: "PRINCIPAL'S REMARK",
      teacherName: '',
      text: principalRemarkText,
      author: 'Principal'
    },
  ];

  remarkBoxes.forEach((box, i) => {
    const bx = marginX + i * (remarkWidth + remarkGap);
    doc.setDrawColor(...BORDER);
    doc.setFillColor(...WHITE);
    doc.setLineWidth(0.6);
    doc.roundedRect(bx, finalY, remarkWidth, remarkHeight, 1.5, 1.5, 'FD');

    doc.setFont('times', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...NAVY_BLUE);
    doc.text(box.title, bx + 3, finalY + 4);

    if (box.teacherName) {
      doc.setFont('times', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...GRAY);
      doc.text(box.teacherName, bx + 3, finalY + 8);
    }

    doc.setFont('times', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(box.text, remarkWidth - 6);
    const startY = box.teacherName ? finalY + 12 : finalY + 9;
    doc.text(lines, bx + 3, startY);

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.4);
    doc.line(bx + 3, finalY + remarkHeight - 5, bx + remarkWidth - 3, finalY + remarkHeight - 5);
    doc.setFont('times', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(box.author, bx + 3, finalY + remarkHeight - 2);
  });

  finalY += remarkHeight + 6;

  // ---- Signature Lines (Compact) --------------------------------------
  const sigWidth = (contentWidth - remarkGap) / 2;
  [0, 1].forEach((i) => {
    const sx = marginX + i * (sigWidth + remarkGap);
    doc.setDrawColor(...NAVY_BLUE);
    doc.setLineWidth(0.5);
    doc.line(sx, finalY, sx + sigWidth, finalY);
    doc.setFont('times', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(
      i === 0 ? "Class Teacher's Signature & Date" : "Principal's Signature & Date",
      sx + sigWidth / 2,
      finalY + 4,
      { align: 'center' },
    );
  });

  // ---- Footer ---------------------------------------------------------------
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont('times', 'italic');
    doc.setFontSize(5.5);
    doc.setTextColor(...GRAY);
    doc.text(
      `This result is computer-generated and valid without a stamp. Generated on ${new Date().toLocaleDateString()}`,
      centerX,
      285,
      { align: 'center' },
    );
  }

  return doc;
}

// Generates and downloads a report card PDF for one student/term.
// File name: ReportCard_[StudentName]_[Term].pdf
export async function generateReportCardPdf(
  student: ReportCardStudent,
  term: string,
  session: string | undefined,
  grades: ReportCardGradeRow[],
  cumulative_average?: number | null,
): Promise<void> {
  const doc = await buildReportCardDoc(student, term, session, grades, cumulative_average);
  const fileName = `ReportCard_${student.full_name.replace(/\s+/g, '_')}_${term.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}
