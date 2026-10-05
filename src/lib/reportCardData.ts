// Report Card Data Utilities
// Provides cumulative average calculation and term-averaging utilities

export type TermGrades = {
  term: string;
  grades: Array<{ total: number | null }>;
};

/**
 * Determines if a grade row is completely blank (all assessment fields are NULL).
 * Used for SSS optional subject filtering: a completely blank grade row indicates
 * the student does not offer the subject and should not appear on their report card.
 *
 * IMPORTANT: This checks for NULL values only. A score of 0 is a valid entered score
 * and will return false (the subject should remain visible).
 *
 * @param grade - The grade row to check
 * @returns true if ALL assessment fields are NULL, false otherwise
 */
export function isGradeRowCompletelyBlank(grade: {
  test_1: number | null;
  test_2: number | null;
  project_1: number | null;
  assignment_1: number | null;
  exam: number | null;
}): boolean {
  return (
    grade.test_1 === null &&
    grade.test_2 === null &&
    grade.project_1 === null &&
    grade.assignment_1 === null &&
    grade.exam === null
  );
}

/**
 * Determines if a student is in Senior Secondary (SSS).
 * SSS students have optional subjects that need filtering.
 *
 * @param tier - The student's tier string
 * @returns true if the student is in Senior Secondary, false otherwise
 */
export function isSeniorSecondary(tier: string): boolean {
  return tier.toLowerCase().includes('senior');
}

/**
 * Calculate term average from grades
 * Uses the same formula as the existing report-card system:
 * sum(subject totals) / number of graded subjects
 */
export function calculateTermAverage(grades: Array<{ total: number | null }>): number | null {
  const validGrades = grades.filter(g => g.total !== null);
  if (validGrades.length === 0) return null;

  const totalScored = validGrades.reduce((sum, g) => sum + (g.total || 0), 0);
  return totalScored / validGrades.length;
}

/**
 * Calculate cumulative average across multiple terms
 * STRICT RULE: Only include available term averages up to and including currentTerm
 * Missing terms are EXCLUDED (never treated as zero)
 *
 * Rules:
 * - Calculate term averages for First, Second, Third
 * - Only terms up to and including currentTerm are eligible
 * - Collect only non-null term averages from eligible terms
 * - Average the available term averages
 * - If no eligible term averages exist, return null
 *
 * Examples:
 * - First Term, First=80 => 80
 * - Second Term, First=80, Second=70 => 75
 * - Second Term, First missing, Second=70 => 70
 * - Third Term, First=80, Second missing, Third=90 => 85
 * - Third Term, First=80, Second=70, Third=90 => 80
 * - Third Term, First missing, Second missing, Third=90 => 90
 * - No grades => null
 */
export function calculateCumulativeAverage(gradesByTerm: Map<string, Array<{ total: number | null }>>, currentTerm: string): number | null {
  const firstTermGrades = gradesByTerm.get('First Term') || [];
  const secondTermGrades = gradesByTerm.get('Second Term') || [];
  const thirdTermGrades = gradesByTerm.get('Third Term') || [];

  const firstTermAvg = calculateTermAverage(firstTermGrades);
  const secondTermAvg = calculateTermAverage(secondTermGrades);
  const thirdTermAvg = calculateTermAverage(thirdTermGrades);

  // Determine eligible term averages based on currentTerm
  const eligibleAverages: number[] = [];

  if (currentTerm === 'First Term') {
    // Only First Term is eligible
    if (firstTermAvg !== null) eligibleAverages.push(firstTermAvg);
  } else if (currentTerm === 'Second Term') {
    // First and Second Terms are eligible
    if (firstTermAvg !== null) eligibleAverages.push(firstTermAvg);
    if (secondTermAvg !== null) eligibleAverages.push(secondTermAvg);
  } else if (currentTerm === 'Third Term') {
    // First, Second, and Third Terms are eligible
    if (firstTermAvg !== null) eligibleAverages.push(firstTermAvg);
    if (secondTermAvg !== null) eligibleAverages.push(secondTermAvg);
    if (thirdTermAvg !== null) eligibleAverages.push(thirdTermAvg);
  } else {
    // Unknown term
    return null;
  }

  // If no eligible term averages exist, return null
  if (eligibleAverages.length === 0) {
    return null;
  }

  // Average the available term averages
  const sum = eligibleAverages.reduce((acc, avg) => acc + avg, 0);
  return sum / eligibleAverages.length;
}

/**
 * Group grades by term for cumulative calculation
 * Filters by academic session to prevent cross-session mixing
 */
export function groupGradesByTerm(
  grades: Array<{ term: string; session: string | null; total: number | null }>,
  session: string
): Map<string, Array<{ total: number | null }>> {
  const grouped = new Map<string, Array<{ total: number | null }>>();

  grades.forEach(grade => {
    // Only include grades from the specified session
    if (grade.session !== session) return;

    const term = grade.term;
    if (!grouped.has(term)) {
      grouped.set(term, []);
    }
    grouped.get(term)!.push({ total: grade.total });
  });

  return grouped;
}
