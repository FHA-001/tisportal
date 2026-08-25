import { supabase } from './supabaseClient';

// ---------------------------------------------------------------------------
// Class-wide ranking helpers for the report card PDF: overall class position
// (sum of totals across all subjects) and per-subject position, computed
// client-side from the class's grades for a given term/session.
// ---------------------------------------------------------------------------

export type RankInfo = { position: number; outOf: number };

export type ClassRankings = {
  overall: Map<string, RankInfo>;
  bySubject: Map<string, Map<string, RankInfo>>;
};

function rankMap(totals: Map<string, number>): Map<string, RankInfo> {
  const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  const result = new Map<string, RankInfo>();
  let lastScore: number | null = null;
  let lastRank = 0;
  sorted.forEach(([studentId, score], idx) => {
    if (score !== lastScore) {
      lastRank = idx + 1;
      lastScore = score;
    }
    result.set(studentId, { position: lastRank, outOf: sorted.length });
  });
  return result;
}

export async function computeClassRankings(
  classId: string,
  term: string,
  session: string,
): Promise<ClassRankings> {
  const { data, error } = await supabase
    .from('grades')
    .select('student_id, class_subject_id, total, class_subjects!inner(class_id)')
    .eq('term', term)
    .eq('session', session)
    .eq('class_subjects.class_id', classId);

  if (error) throw error;

  const overallTotals = new Map<string, number>();
  const subjectTotals = new Map<string, Map<string, number>>();

  for (const row of data || []) {
    const total = (row as any).total ?? 0;
    const studentId = (row as any).student_id as string;
    const classSubjectId = (row as any).class_subject_id as string;

    overallTotals.set(studentId, (overallTotals.get(studentId) || 0) + total);

    if (!subjectTotals.has(classSubjectId)) subjectTotals.set(classSubjectId, new Map());
    subjectTotals.get(classSubjectId)!.set(studentId, total);
  }

  const bySubject = new Map<string, Map<string, RankInfo>>();
  for (const [classSubjectId, totals] of subjectTotals.entries()) {
    bySubject.set(classSubjectId, rankMap(totals));
  }

  return { overall: rankMap(overallTotals), bySubject };
}

export function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}
