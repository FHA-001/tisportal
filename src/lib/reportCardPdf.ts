import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SCHOOL } from './app-config';
import { getGradeRemark, type GradeLetter } from './auth-utils';

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

function autoRemark(average: number): string {
  if (average >= 75) return 'Excellent performance. Keep up the outstanding work.';
  if (average >= 65) return 'Very good result. Continue striving for excellence.';
  if (average >= 55) return 'Good performance. Consistent effort will yield improvement.';
  if (average >= 45) return 'Fair result. More commitment needed for better performance.';
  return 'Needs significant improvement. Extra support recommended.';
}

function autoPrincipalRemark(average: number): string {
  if (average >= 75) return 'Outstanding achievement. Keep it up!';
  if (average >= 65) return 'Very good performance. Well done.';
  if (average >= 55) return 'Satisfactory progress. Room for growth.';
  if (average >= 45) return 'More effort required next term.';
  return 'Needs close attention and support.';
}

// Builds the report card jsPDF document without saving it (used by the
// downloader and by internal previews/tests).
export async function buildReportCardDoc(
  student: ReportCardStudent,
  term: string,
  session: string | undefined,
  grades: ReportCardGradeRow[],
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const marginX = 12;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - marginX * 2;
  const centerX = pageWidth / 2;
  let y = 10;

  // ---- School Logo -----------------------------------------------------------
  const logoUrl = 'https://i.ibb.co/273KSyLM/5902013719250669943.jpg';
  try {
    const logoImage = await doc.addImage(logoUrl, 'JPEG', centerX - 18, y, 36, 36);
    y += 40;
  } catch (error) {
    // Fallback if image fails to load
    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...NAVY_BLUE);
    doc.text(SCHOOL.name.toUpperCase(), centerX, y + 18, { align: 'center' });
    y += 26;
  }

  // ---- Header (Times New Roman for school name) -----------------------------
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...NAVY_BLUE);
  doc.text(SCHOOL.name.toUpperCase(), centerX, y, { align: 'center' });
  y += 5;

  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  const mottoLine = SCHOOL.mottoTranslation
    ? SCHOOL.mottoTranslation.split(/\s+and\s+/i).join(' • ')
    : SCHOOL.motto;
  doc.text(mottoLine, centerX, y, { align: 'center' });
  y += 6;

  // ---- School Contact Details -----------------------------------------------
  doc.setFont('times', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text('KM 20, Abuja–Keffi Road, Kuchikau', centerX, y, { align: 'center' });
  y += 4;
  doc.text('0706 264 1324 | tritonintschool@gmail.com | www.triton.edu.ng', centerX, y, { align: 'center' });
  y += 6;

  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...NAVY_BLUE_DARK);
  doc.text('STUDENT ACADEMIC REPORT CARD', centerX, y, { align: 'center' });
  y += 4;

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  const subtitle = session ? `${session} Academic Session — ${term}` : term;
  doc.text(subtitle, centerX, y, { align: 'center' });
  y += 6;

  doc.setDrawColor(...NAVY_BLUE);
  doc.setLineWidth(1.2);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 8;

  // ---- Student Metadata Grid (No Photo) ------------------------------------
  const gridHeight = 18;
  const colWidth = contentWidth / 4;

  type MetadataField = [string, string];
  const metadataFields: MetadataField[] = [
    ['Student Name', student.full_name],
    ['Admission No.', student.admission_number],
    ['Class', student.class_name],
    ['Academic Year', session || '—'],
  ];

  metadataFields.forEach(([label, value], i) => {
    const x = marginX + i * colWidth;
    doc.setFont('times', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...DARK_TEXT);
    doc.text(label, x, y);
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY_BLUE);
    doc.text(value, x, y + 5);
  });

  y += gridHeight + 5;

  // ---- Subjects Table (Cambria for body, optimized for 14+ subjects) --------
  // Calculate CA score (sum of test_1, test_2, assignment_1, project_1)
  const calculateCA = (g: ReportCardGradeRow): number => {
    return (g.test_1 || 0) + (g.test_2 || 0) + (g.assignment_1 || 0) + (g.project_1 || 0);
  };

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX, top: 0, bottom: 12 },
    head: [['Subject', 'CA Score', 'Exam Score', 'Total Score', 'Grade', 'Remarks']],
    body: grades.map((g) => {
      const caScore = calculateCA(g);
      const remark = g.remark || getGradeRemark((g.grade_letter as GradeLetter) || 'F9');
      return [
        g.subject,
        caScore || '-',
        g.exam || '-',
        g.total || '-',
        g.grade_letter || '-',
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
      fontSize: 8.5,
      halign: 'center',
      valign: 'middle',
      lineColor: BORDER,
      lineWidth: 0.1,
    },
    bodyStyles: { 
      fontSize: 8.5, 
      textColor: DARK_TEXT,
      fontStyle: 'normal',
    },
    alternateRowStyles: { fillColor: LIGHT_BLUE_ALT },
    columnStyles: {
      0: { fontStyle: 'normal', halign: 'left', cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
      4: { halign: 'center', cellWidth: 17, fontStyle: 'bold' },
      5: { halign: 'left', cellWidth: 'auto', fontStyle: 'bold' },
    },
    rowPageBreak: 'avoid',
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const rowGrade = grades[data.row.index];
      if (!rowGrade) return;
      if (data.column.index === 4) {
        data.cell.styles.textColor = gradeColor(rowGrade.grade_letter);
      }
      if (data.column.index === 3) {
        data.cell.styles.textColor = NAVY_BLUE;
      }
    },
  });

  // @ts-expect-error jspdf-autotable augments doc with lastAutoTable at runtime
  let finalY = (doc.lastAutoTable?.finalY ?? y) + 5;

  const validGrades = grades.filter((g) => g.total !== null);
  const totalScored = validGrades.reduce((sum, g) => sum + (g.total ?? 0), 0);
  const average = validGrades.length > 0 ? totalScored / validGrades.length : 0;

  // ---- Summary Section (Bold with Distinct Borders) -------------------------
  const summaryHeight = 15;
  doc.setDrawColor(...NAVY_BLUE);
  doc.setLineWidth(0.8);
  doc.setFillColor(...LIGHT_BLUE_ALT);
  doc.roundedRect(marginX, finalY, contentWidth, summaryHeight, 2, 2, 'FD');

  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY_BLUE);
  
  const summaryX = marginX + 6;
  doc.text(`Total Marks: ${totalScored}`, summaryX, finalY + 6);
  doc.text(`Percentage: ${average.toFixed(1)}%`, summaryX + 55, finalY + 6);
  
  const teacherRemark = autoRemark(average);
  doc.setFontSize(8);
  doc.text(`Comment: ${teacherRemark}`, summaryX, finalY + 11);

  finalY += summaryHeight + 6;

  // ---- Remarks Section ------------------------------------------------------
  const remarkGap = 5;
  const remarkWidth = (contentWidth - remarkGap) / 2;
  const remarkHeight = 22;
  const principalRemarkText = autoPrincipalRemark(average);

  const remarkBoxes: { title: string; text: string; author: string }[] = [
    { title: "CLASS TEACHER'S REMARK", text: teacherRemark, author: 'Class Teacher' },
    { title: "PRINCIPAL'S REMARK", text: principalRemarkText, author: 'Principal' },
  ];

  remarkBoxes.forEach((box, i) => {
    const bx = marginX + i * (remarkWidth + remarkGap);
    doc.setDrawColor(...BORDER);
    doc.setFillColor(...WHITE);
    doc.setLineWidth(0.8);
    doc.roundedRect(bx, finalY, remarkWidth, remarkHeight, 2, 2, 'FD');

    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...NAVY_BLUE);
    doc.text(box.title, bx + 4, finalY + 5);

    doc.setFont('times', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(box.text, remarkWidth - 8);
    doc.text(lines, bx + 4, finalY + 11);

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.4);
    doc.line(bx + 4, finalY + remarkHeight - 5, bx + remarkWidth - 4, finalY + remarkHeight - 5);
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(box.author, bx + 4, finalY + remarkHeight - 2);
  });

  finalY += remarkHeight + 8;

  // ---- Signature Lines ------------------------------------------------------
  const sigWidth = (contentWidth - remarkGap) / 2;
  [0, 1].forEach((i) => {
    const sx = marginX + i * (sigWidth + remarkGap);
    doc.setDrawColor(...NAVY_BLUE);
    doc.setLineWidth(0.6);
    doc.line(sx, finalY, sx + sigWidth, finalY);
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(
      i === 0 ? "Class Teacher's Signature & Date" : "Principal's Signature & Date",
      sx + sigWidth / 2,
      finalY + 5,
      { align: 'center' },
    );
  });

  // ---- Footer ---------------------------------------------------------------
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont('times', 'italic');
    doc.setFontSize(6);
    doc.setTextColor(...GRAY);
    doc.text(
      `This result is computer-generated and valid without a stamp. Generated on ${new Date().toLocaleDateString()}`,
      centerX,
      288,
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
): Promise<void> {
  const doc = await buildReportCardDoc(student, term, session, grades);
  const fileName = `ReportCard_${student.full_name.replace(/\s+/g, '_')}_${term.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}
