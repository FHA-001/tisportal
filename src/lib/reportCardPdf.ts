import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { SCHOOL } from './app-config';
import { getGradeRemark, type GradeLetter, getMaxScores } from './auth-utils';
import { getClassTeacherRemark, getPrincipalRemark } from './remarks';
import { isGradeRowCompletelyBlank, isSeniorSecondary } from './reportCardData';

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

type LayoutMode = 'spacious' | 'normal' | 'compact';

interface LayoutConfig {
  baseFontSize: number;
  tableFontSize: number;
  headerFontSize: number;
  tableCellPadding: number;
  tableMinCellHeight: number;
  metadataHeight: number;
  summaryHeight: number;
  gradingHeight: number;
  remarksHeight: number;
  sectionGap: number;
}

const LAYOUT_CONFIGS: Record<LayoutMode, LayoutConfig> = {
  spacious: {
    baseFontSize: 11.5,
    tableFontSize: 10.5,
    headerFontSize: 9.5,
    tableCellPadding: 1.75,
    tableMinCellHeight: 7.5,
    metadataHeight: 15,
    summaryHeight: 15,
    gradingHeight: 12,
    remarksHeight: 29,
    sectionGap: 4,
  },
  normal: {
    baseFontSize: 11,
    tableFontSize: 10,
    headerFontSize: 9,
    tableCellPadding: 1.45,
    tableMinCellHeight: 6.7,
    metadataHeight: 15,
    summaryHeight: 14,
    gradingHeight: 11,
    remarksHeight: 27,
    sectionGap: 3.5,
  },
  compact: {
    baseFontSize: 10,
    tableFontSize: 9,
    headerFontSize: 8.2,
    tableCellPadding: 1.05,
    tableMinCellHeight: 5.8,
    metadataHeight: 14,
    summaryHeight: 13,
    gradingHeight: 10,
    remarksHeight: 24,
    sectionGap: 3,
  },
};

function getLayoutMode(subjectCount: number): LayoutMode {
  if (subjectCount <= 9) return 'spacious';
  if (subjectCount <= 11) return 'normal';
  return 'compact';
}

// -----------------------------------------------------------------------------
// Colours
// -----------------------------------------------------------------------------

const NAVY_BLUE: [number, number, number] = [30, 58, 138];
const NAVY_BLUE_DARK: [number, number, number] = [15, 23, 42];
const LIGHT_BLUE_ALT: [number, number, number] = [248, 250, 252];
const WHITE: [number, number, number] = [255, 255, 255];
const GRAY: [number, number, number] = [80, 80, 80];
const GRAY_LIGHT: [number, number, number] = [125, 125, 125];
const BORDER: [number, number, number] = [205, 213, 224];
const DARK_TEXT: [number, number, number] = [30, 41, 59];

function gradeColor(
  letter: string | null | undefined,
): [number, number, number] {
  if (!letter) return GRAY;
  if (letter.startsWith('A')) return [0, 100, 0];
  if (letter.startsWith('B')) return NAVY_BLUE;
  if (letter.startsWith('C')) return [160, 115, 0];
  if (letter.startsWith('D') || letter.startsWith('E')) {
    return [165, 90, 20];
  }
  return [185, 40, 40];
}

function formatTimestamp(date: Date): string {
  const datePart = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const timePart = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `Generated ${datePart}, ${timePart}`;
}

function safeText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : '-';
}

// -----------------------------------------------------------------------------
// PDF builder
// -----------------------------------------------------------------------------

export async function buildReportCardDoc(
  student: ReportCardStudent,
  term: string,
  session: string | undefined,
  grades: ReportCardGradeRow[],
  cumulative_average?: number | null,
): Promise<jsPDF> {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Keep a consistent printable border around the page.
  const marginX = 10;
  const topMargin = 8;
  const bottomMargin = 10;

  const contentWidth = pageWidth - marginX * 2;
  const centerX = pageWidth / 2;

  // Defensive filtering: for SSS students, filter out completely blank grade rows
  // This ensures that even if a caller forgets to filter, blank SSS subjects won't render
  const filteredGrades = isSeniorSecondary(student.tier)
    ? grades.filter(grade => !isGradeRowCompletelyBlank(grade))
    : grades;

  const subjectCount = filteredGrades.length;
  const layoutMode = getLayoutMode(subjectCount);
  const config = LAYOUT_CONFIGS[layoutMode];

  const isSenior = student.tier.toLowerCase().includes('senior');
  const maxScores = getMaxScores(student.tier);

  let y = topMargin;

  // ---------------------------------------------------------------------------
  // Timestamp
  // ---------------------------------------------------------------------------

  const generatedAt = formatTimestamp(new Date());

  doc.setFont('times', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY_LIGHT);
  doc.text(generatedAt, pageWidth - marginX, y + 1, {
    align: 'right',
  });

  // ---------------------------------------------------------------------------
  // School logo
  // ---------------------------------------------------------------------------

const logoUrl = 'https://i.ibb.co/vxyHnfg1/TIS-LOGO.png';
  const logoWidth = 22;
  const logoHeight = 22;
  const logoX = centerX - logoWidth / 2;

  try {
    await doc.addImage(
      logoUrl,
      'PNG',
      logoX,
      y,
      logoWidth,
      logoHeight,
    );
  } catch (error) {
    // Do not break report generation if the remote logo is unavailable.
    console.warn('Unable to load report-card logo:', error);
  }

  y += logoHeight + 2.5;

  // ---------------------------------------------------------------------------
  // School header
  // ---------------------------------------------------------------------------

  doc.setFont('times', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...NAVY_BLUE_DARK);
  doc.text(SCHOOL.name.toUpperCase(), centerX, y, {
    align: 'center',
  });

  y += 5;

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...DARK_TEXT);
  doc.text(SCHOOL.address, centerX, y, {
    align: 'center',
  });

  y += 4;

  doc.setFont('times', 'italic');
  doc.setFontSize(9.5);
  doc.setTextColor(...GRAY);

  const mottoLine = SCHOOL.mottoTranslation
    ? SCHOOL.mottoTranslation.split(/\s+and\s+/i).join(' • ')
    : SCHOOL.motto;

  doc.text(mottoLine, centerX, y, {
    align: 'center',
  });

  y += 4;

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...DARK_TEXT);

  const contactLine = [
    SCHOOL.phone,
    SCHOOL.email,
    SCHOOL.website,
  ]
    .filter(Boolean)
    .join(' | ');

  doc.text(contactLine, centerX, y, {
    align: 'center',
  });

  y += 5;

  // ---------------------------------------------------------------------------
  // Report title
  // ---------------------------------------------------------------------------

  const reportTitle = isSenior
    ? 'SENIOR SCHOOL RESULT SHEET'
    : 'JUNIOR SCHOOL RESULT SHEET';

  doc.setFont('times', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...NAVY_BLUE_DARK);
  doc.text(reportTitle, centerX, y, {
    align: 'center',
  });

  y += 4;

  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...DARK_TEXT);

  const subtitle = session
    ? `${term.toUpperCase()} - ${session} ACADEMIC SESSION`
    : term.toUpperCase();

  doc.text(subtitle, centerX, y, {
    align: 'center',
  });

  y += 5;

  doc.setDrawColor(...NAVY_BLUE_DARK);
  doc.setLineWidth(0.7);
  doc.line(marginX, y, pageWidth - marginX, y);

  y += 5;

  // ---------------------------------------------------------------------------
  // Student details
  //
  // Admission number is intentionally NOT displayed.
  // ---------------------------------------------------------------------------

  type MetadataField = [string, string];

  const metadataFields: MetadataField[] = [
    ['Student Name', safeText(student.full_name)],
    ['Class', safeText(student.class_name)],
    ['Term', safeText(term)],
    ['Session', safeText(session)],
  ];

  const metadataColWidth = contentWidth / metadataFields.length;

  metadataFields.forEach(([label, value], index) => {
    const x = marginX + index * metadataColWidth;

    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(label, x, y);

    doc.setFont('times', 'bold');
    doc.setFontSize(config.baseFontSize);
    doc.setTextColor(...NAVY_BLUE_DARK);

    const maxWidth = metadataColWidth - 3;
    const valueLines = doc.splitTextToSize(value, maxWidth);

    doc.text(valueLines.slice(0, 1), x, y + 5);
  });

  y += config.metadataHeight;

  // ---------------------------------------------------------------------------
  // Results table
  // ---------------------------------------------------------------------------

  const tableHead = [
    [
      'Subject',
      '1st Ass',
      '2nd Ass',
      '1st Test',
      '2nd Test',
      'Exam',
      'Total',
      'Grade',
      'Remark',
    ],
    [
      '',
      `(${maxScores.assignment_1})`,
      `(${maxScores.project_1})`,
      `(${maxScores.test_1})`,
      `(${maxScores.test_2})`,
      `(${maxScores.exam})`,
      '(100)',
      '',
      '',
    ],
  ];

  /*
   * Widths deliberately reserve enough room for assessment labels while
   * preventing the Subject column from consuming excessive horizontal space.
   *
   * Total fixed width:
   * 54 + 16 + 16 + 17 + 17 + 15 + 15 + 14 + 26 = 190 mm
   *
   * Available content width on A4 with 10 mm margins = 190 mm.
   */
  const subjectWidth = 54;
  const assWidth = 16;
  const testWidth = 17;
  const examWidth = 15;
  const totalWidth = 15;
  const gradeWidth = 14;
  const remarkWidth = 26;

  autoTable(doc, {
    startY: y,

    margin: {
      left: marginX,
      right: marginX,
      top: topMargin,
      bottom: bottomMargin,
    },

    head: tableHead,

    body: filteredGrades.map((grade) => {
      const remark =
        grade.remark ||
        getGradeRemark(
          (grade.grade_letter as GradeLetter) || 'F9',
        );

      return [
        grade.subject,
        grade.assignment_1 ?? '-',
        grade.project_1 ?? '-',
        grade.test_1 ?? '-',
        grade.test_2 ?? '-',
        grade.exam ?? '-',
        grade.total ?? '-',
        grade.grade_letter ?? '-',
        remark,
      ];
    }),

    theme: 'grid',

    styles: {
      font: 'times',
      fontSize: config.tableFontSize,
      textColor: DARK_TEXT,
      lineColor: BORDER,
      lineWidth: 0.15,
      cellPadding: config.tableCellPadding,
      minCellHeight: config.tableMinCellHeight,
      valign: 'middle',
      overflow: 'linebreak',
    },

    headStyles: {
      fillColor: NAVY_BLUE_DARK,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: config.headerFontSize,
      halign: 'center',
      valign: 'middle',
      lineColor: WHITE,
      lineWidth: 0.15,
      cellPadding: 1.2,
    },

    bodyStyles: {
      fontStyle: 'normal',
    },

    alternateRowStyles: {
      fillColor: LIGHT_BLUE_ALT,
    },

    columnStyles: {
      0: {
        cellWidth: subjectWidth,
        halign: 'left',
      },
      1: {
        cellWidth: assWidth,
        halign: 'center',
      },
      2: {
        cellWidth: assWidth,
        halign: 'center',
      },
      3: {
        cellWidth: testWidth,
        halign: 'center',
      },
      4: {
        cellWidth: testWidth,
        halign: 'center',
      },
      5: {
        cellWidth: examWidth,
        halign: 'center',
      },
      6: {
        cellWidth: totalWidth,
        halign: 'center',
        fontStyle: 'bold',
      },
      7: {
        cellWidth: gradeWidth,
        halign: 'center',
        fontStyle: 'bold',
      },
      8: {
        cellWidth: remarkWidth,
        halign: 'left',
        fontStyle: 'bold',
      },
    },

    rowPageBreak: 'avoid',

    didParseCell: (data) => {
      if (data.section !== 'body') return;

      const rowGrade = filteredGrades[data.row.index];
      if (!rowGrade) return;

      if (data.column.index === 6) {
        data.cell.styles.textColor = NAVY_BLUE;
        data.cell.styles.fontStyle = 'bold';
      }

      if (data.column.index === 7) {
        data.cell.styles.textColor = gradeColor(
          rowGrade.grade_letter,
        );
        data.cell.styles.fontStyle = 'bold';
      }

      if (data.column.index === 8) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // @ts-expect-error jspdf-autotable augments jsPDF at runtime
  let finalY = (doc.lastAutoTable?.finalY ?? y) + config.sectionGap;

  // ---------------------------------------------------------------------------
  // Calculate average
  // ---------------------------------------------------------------------------

  const validGrades = filteredGrades.filter(
    (grade) => grade.total !== null,
  );

  const totalScored = validGrades.reduce(
    (sum, grade) => sum + (grade.total ?? 0),
    0,
  );

  const average =
    validGrades.length > 0
      ? totalScored / validGrades.length
      : 0;

  // ---------------------------------------------------------------------------
  // Academic summary
  // ---------------------------------------------------------------------------

  doc.setDrawColor(...NAVY_BLUE);
  doc.setLineWidth(0.45);
  doc.setFillColor(...LIGHT_BLUE_ALT);

  doc.roundedRect(
    marginX,
    finalY,
    contentWidth,
    config.summaryHeight,
    1.5,
    1.5,
    'FD',
  );

  const summaryColWidth = contentWidth / 2;
  const summaryCenterY =
    finalY + config.summaryHeight / 2;

  // Divider.
  doc.setDrawColor(...NAVY_BLUE);
  doc.setLineWidth(0.25);

  doc.line(
    marginX + summaryColWidth,
    finalY + 2.5,
    marginX + summaryColWidth,
    finalY + config.summaryHeight - 2.5,
  );

  // Term average.
  doc.setFont('times', 'bold');
  doc.setFontSize(config.baseFontSize);
  doc.setTextColor(...NAVY_BLUE_DARK);

  doc.text(
    'TERM AVERAGE',
    marginX + summaryColWidth / 2,
    summaryCenterY - 2.5,
    {
      align: 'center',
    },
  );

  doc.setFontSize(config.baseFontSize + 2);

  doc.text(
    `${average.toFixed(1)}%`,
    marginX + summaryColWidth / 2,
    summaryCenterY + 3.5,
    {
      align: 'center',
    },
  );

  // Cumulative average.
  doc.setFontSize(config.baseFontSize);
  doc.text(
    'CUMULATIVE AVERAGE',
    marginX + summaryColWidth + summaryColWidth / 2,
    summaryCenterY - 2.5,
    {
      align: 'center',
    },
  );

  doc.setFontSize(config.baseFontSize + 2);

  const cumulativeText =
    cumulative_average !== null &&
    cumulative_average !== undefined
      ? `${cumulative_average.toFixed(1)}%`
      : '-';

  doc.text(
    cumulativeText,
    marginX + summaryColWidth + summaryColWidth / 2,
    summaryCenterY + 3.5,
    {
      align: 'center',
    },
  );

  finalY += config.summaryHeight + config.sectionGap;

  // ---------------------------------------------------------------------------
  // Grading scale
  // ---------------------------------------------------------------------------

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.setFillColor(...WHITE);

  doc.roundedRect(
    marginX,
    finalY,
    contentWidth,
    config.gradingHeight,
    1,
    1,
    'FD',
  );

  const gradingLabelX = marginX + 3;
  doc.setFont('times', 'bold');
doc.setFontSize(config.baseFontSize - 1);

const gradingLabelWidth = doc.getTextWidth('GRADING SCALE:');
const gradingTextX = gradingLabelX + gradingLabelWidth + 5;

  doc.setFont('times', 'bold');
  doc.setFontSize(config.baseFontSize - 1);
  doc.setTextColor(...NAVY_BLUE_DARK);

  doc.text(
    'GRADING SCALE:',
    gradingLabelX,
    finalY + 4.3,
  );

  doc.setFont('times', 'normal');
  doc.setFontSize(config.baseFontSize - 1.5);
  doc.setTextColor(...DARK_TEXT);

  const gradingRow1 =
    'A1 75-100 | B2 70-74.99 | B3 65-69.99 | C4 60-64.99 | C5 55-59.99';

  const gradingRow2 =
    'C6 50-54.99 | D7 45-49.99 | E8 40-44.99 | F9 0-39.99';

  doc.text(
    gradingRow1,
    gradingTextX,
    finalY + 4.3,
  );

  doc.text(
    gradingRow2,
    gradingTextX,
    finalY + 8.5,
  );

  finalY += config.gradingHeight + config.sectionGap;

  // ---------------------------------------------------------------------------
  // Remarks
  // ---------------------------------------------------------------------------

  const remarksGap = 4;
  const remarksWidth =
    (contentWidth - remarksGap) / 2;

  /*
   * If the table is unusually tall, protect the one-page contract by using
   * only the space that remains above the bottom margin.
   */
  const remainingPageSpace =
    pageHeight - bottomMargin - finalY;

  const actualRemarksHeight = Math.max(
    18,
    Math.min(
      config.remarksHeight,
      remainingPageSpace,
    ),
  );

  const classTeacherName =
    student.class_teacher_name?.trim() ||
    'Not Assigned';

  const teacherRemark =
    getClassTeacherRemark(average);

  const principalRemark =
    getPrincipalRemark(average);

  const remarkBoxes = [
    {
      title: "CLASS TEACHER'S REMARK",
      teacherName: classTeacherName,
      text: teacherRemark,
    },
    {
      title: "PRINCIPAL'S REMARK",
      teacherName: '',
      text: principalRemark,
    },
  ];

  remarkBoxes.forEach((box, index) => {
    const boxX =
      marginX +
      index * (remarksWidth + remarksGap);

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.45);
    doc.setFillColor(...WHITE);

    doc.roundedRect(
      boxX,
      finalY,
      remarksWidth,
      actualRemarksHeight,
      1.5,
      1.5,
      'FD',
    );

    // Heading.
    doc.setFont('times', 'bold');
    doc.setFontSize(config.baseFontSize - 0.5);
    doc.setTextColor(...NAVY_BLUE_DARK);

    doc.text(
      box.title,
      boxX + 3,
      finalY + 4.5,
    );

    let textY = finalY + 9;

    // Class teacher name.
    if (box.teacherName) {
      doc.setFont('times', 'bold');
      doc.setFontSize(config.baseFontSize);
      doc.setTextColor(...DARK_TEXT);

      const teacherNameLines =
        doc.splitTextToSize(
          box.teacherName,
          remarksWidth - 6,
        );

      doc.text(
        teacherNameLines,
        boxX + 3,
        textY,
      );

      textY +=
        teacherNameLines.length * 4.2 + 1;
    }

    // Remark text.
    doc.setFont('times', 'italic');
    doc.setFontSize(config.baseFontSize);
    doc.setTextColor(...DARK_TEXT);

    const remarkLines =
      doc.splitTextToSize(
        box.text,
        remarksWidth - 6,
      );

    doc.text(
      remarkLines,
      boxX + 3,
      textY,
    );
  });

  /*
   * Intentionally no:
   * - Class Teacher / Principal author labels
   * - Signature lines
   * - Signature dates
   * - computer-generated disclaimer
   *
   * The generated timestamp at the top-right is the only generation metadata.
   */

  return doc;
}

// -----------------------------------------------------------------------------
// Download
// -----------------------------------------------------------------------------

export async function generateReportCardPdf(
  student: ReportCardStudent,
  term: string,
  session: string | undefined,
  grades: ReportCardGradeRow[],
  cumulative_average?: number | null,
): Promise<void> {
  const doc = await buildReportCardDoc(
    student,
    term,
    session,
    grades,
    cumulative_average,
  );

  const studentName = student.full_name
    .trim()
    .replace(/\s+/g, '_');

  const termName = term
    .trim()
    .replace(/\s+/g, '_');

  const fileName =
    `ReportCard_${studentName}_${termName}.pdf`;

  doc.save(fileName);
}